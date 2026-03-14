#!/usr/bin/env python3
"""
Process FMA metadata CSVs directly and upload to Lovable Cloud.
No SQLite, no audio files, no heavy processing needed.

Prerequisites:
  1. Download & extract fma_metadata.zip (342 MB)
  2. pip install pandas requests tqdm

Usage:
  python scripts/process_fma_metadata.py \
    --metadata-dir /path/to/fma_metadata \
    --supabase-url https://ldehlfjbyxsqmbecvcxi.supabase.co \
    --supabase-key YOUR_SERVICE_ROLE_KEY

Or set env vars:
  export SUPABASE_URL=https://ldehlfjbyxsqmbecvcxi.supabase.co
  export SUPABASE_SERVICE_ROLE_KEY=your_key
"""

import argparse
import json
import os
import sys
import numpy as np

import pandas as pd
import requests
from tqdm import tqdm

# GEMS emotion dimensions we need
GEMS_KEYS = [
    "wonder", "transcendence", "tenderness", "nostalgia", "peacefulness",
    "joyful_activation", "power", "tension", "gems_sadness",
]


def load_tracks_csv(metadata_dir: str) -> pd.DataFrame:
    """Load tracks.csv with multi-level headers."""
    csv_path = os.path.join(metadata_dir, "tracks.csv")
    if not os.path.exists(csv_path):
        print(f"❌ {csv_path} not found")
        sys.exit(1)

    print(f"📂 Loading {csv_path}...")
    # FMA tracks.csv has 2 header rows
    tracks = pd.read_csv(csv_path, index_col=0, header=[0, 1])
    print(f"   Found {len(tracks)} tracks total")
    return tracks


def load_features_csv(metadata_dir: str) -> pd.DataFrame:
    """Load features.csv (librosa features)."""
    csv_path = os.path.join(metadata_dir, "features.csv")
    if not os.path.exists(csv_path):
        print(f"⚠️  {csv_path} not found — will use default GEMS values")
        return None

    print(f"📂 Loading {csv_path}...")
    features = pd.read_csv(csv_path, index_col=0, header=[0, 1, 2])
    print(f"   Found features for {len(features)} tracks")
    return features


def load_echonest_csv(metadata_dir: str) -> pd.DataFrame:
    """Load echonest.csv (Spotify audio features)."""
    csv_path = os.path.join(metadata_dir, "echonest.csv")
    if not os.path.exists(csv_path):
        print(f"⚠️  {csv_path} not found — skipping echonest features")
        return None

    print(f"📂 Loading {csv_path}...")
    echonest = pd.read_csv(csv_path, index_col=0, header=[0, 1, 2])
    print(f"   Found echonest features for {len(echonest)} tracks")
    return echonest


def approximate_gems_from_features(features: pd.DataFrame, track_ids: list) -> dict:
    """
    Derive approximate GEMS emotional scores from librosa features.
    Maps spectral/rhythmic features → emotional dimensions.
    """
    gems_map = {}

    for tid in track_ids:
        if features is not None and tid in features.index:
            try:
                row = features.loc[tid]

                # Extract key features (using mean values)
                spectral_centroid = float(row.get(("spectral_centroid", "mean", "01"), 0.5))
                spectral_rolloff = float(row.get(("spectral_rolloff", "mean", "01"), 0.5))
                mfcc_1 = float(row.get(("mfcc", "mean", "01"), 0))
                mfcc_2 = float(row.get(("mfcc", "mean", "02"), 0))
                zcr = float(row.get(("zcr", "mean", "01"), 0.5))
                rmse = float(row.get(("rmse", "mean", "01"), 0.3))
                tempo_feat = float(row.get(("spectral_bandwidth", "mean", "01"), 0.5))

                # Normalize to 0-1 range (approximate)
                def norm(v, lo, hi):
                    return max(0.0, min(1.0, (v - lo) / (hi - lo + 1e-8)))

                brightness = norm(spectral_centroid, 500, 5000)
                energy = norm(rmse, 0.0, 0.5)
                roughness = norm(zcr, 0.02, 0.15)

                # Map features → GEMS dimensions
                gems_map[tid] = {
                    "wonder": round(max(0.05, min(0.95, brightness * 0.6 + energy * 0.3 + 0.1)), 3),
                    "transcendence": round(max(0.05, min(0.95, (1 - roughness) * 0.5 + brightness * 0.3 + 0.1)), 3),
                    "tenderness": round(max(0.05, min(0.95, (1 - energy) * 0.5 + (1 - roughness) * 0.3 + 0.1)), 3),
                    "nostalgia": round(max(0.05, min(0.95, (1 - brightness) * 0.4 + (1 - energy) * 0.3 + 0.15)), 3),
                    "peacefulness": round(max(0.05, min(0.95, (1 - energy) * 0.5 + (1 - roughness) * 0.3 + 0.1)), 3),
                    "joyful_activation": round(max(0.05, min(0.95, energy * 0.5 + brightness * 0.3 + 0.1)), 3),
                    "power": round(max(0.05, min(0.95, energy * 0.6 + roughness * 0.3 + 0.05)), 3),
                    "tension": round(max(0.05, min(0.95, roughness * 0.5 + energy * 0.3 + 0.1)), 3),
                    "gems_sadness": round(max(0.05, min(0.95, (1 - brightness) * 0.4 + (1 - energy) * 0.4 + 0.1)), 3),
                }
            except Exception:
                gems_map[tid] = None
        else:
            gems_map[tid] = None

    return gems_map


def build_track_records(tracks_df: pd.DataFrame, features_df: pd.DataFrame, subset: str = "small") -> list:
    """Build upload-ready track records from CSVs."""

    # Filter to the requested subset
    try:
        subset_mask = tracks_df[("set", "subset")] == subset
        filtered = tracks_df[subset_mask]
        print(f"🎯 Filtered to '{subset}' subset: {len(filtered)} tracks")
    except KeyError:
        print(f"⚠️  Could not filter by subset, using all tracks")
        filtered = tracks_df

    track_ids = list(filtered.index)

    # Get GEMS approximations
    print("🧠 Approximating GEMS emotional scores from audio features...")
    gems_map = approximate_gems_from_features(features_df, track_ids)

    records = []
    for tid in tqdm(track_ids, desc="Building records"):
        try:
            row = filtered.loc[tid]

            # Extract metadata
            title = str(row.get(("track", "title"), "Untitled"))
            if title == "nan" or not title:
                title = "Untitled"

            artist = str(row.get(("artist", "name"), "Unknown"))
            if artist == "nan" or not artist:
                artist = "Unknown"

            genre = str(row.get(("track", "genre_top"), "Unknown"))
            if genre == "nan" or not genre:
                genre = "Unknown"

            # Get GEMS scores or defaults
            gems = gems_map.get(tid) or {k: 0.5 for k in GEMS_KEYS}

            # Build prompt fragment from genre + title
            prompt_fragment = f"{genre.lower()} track"
            if title != "Untitled":
                prompt_fragment = f'"{title}" — {prompt_fragment}'

            record = {
                "fma_track_id": str(tid),
                "title": title[:200],
                "artist": artist[:200],
                "genre": genre[:100],
                "tempo": 120.0,
                "key": "C",
                "mode": "major",
                "valence": round(gems["joyful_activation"] - gems["gems_sadness"], 3),
                "arousal": round(gems["power"] * 0.5 + gems["tension"] * 0.5, 3),
                "prompt_fragment": prompt_fragment[:500],
                "gems": gems,  # nested for edge function
            }
            records.append(record)
        except Exception as e:
            continue

    print(f"✅ Built {len(records)} track records")
    return records


def upload_to_supabase(records: list, base_url: str, api_key: str, batch_size: int = 200):
    """Upload track records via the upload-tracks edge function."""
    url = f"{base_url}/functions/v1/upload-tracks"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "apikey": api_key,
    }

    total = len(records)
    print(f"\n📤 Uploading {total} tracks in batches of {batch_size}...")

    uploaded = 0
    for i in tqdm(range(0, total, batch_size), desc="Upload batches"):
        batch = records[i:i + batch_size]
        # Format for the edge function
        payload = {"tracks": batch}

        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=60)
            if resp.status_code == 200:
                uploaded += len(batch)
            else:
                print(f"\n❌ Batch {i // batch_size + 1} failed ({resp.status_code}): {resp.text[:200]}")
        except Exception as e:
            print(f"\n❌ Batch {i // batch_size + 1} error: {e}")

    print(f"\n✅ Uploaded {uploaded}/{total} tracks to Lovable Cloud")


def upload_directly(records: list, base_url: str, api_key: str, batch_size: int = 500):
    """Upload directly via Supabase REST API (bypasses edge function)."""
    url = f"{base_url}/rest/v1/fma_tracks"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "apikey": api_key,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    total = len(records)
    print(f"\n📤 Uploading {total} tracks directly to database...")

    uploaded = 0
    for i in tqdm(range(0, total, batch_size), desc="Upload batches"):
        batch = records[i:i + batch_size]

        try:
            resp = requests.post(url, json=batch, headers=headers, timeout=60)
            if resp.status_code in (200, 201):
                uploaded += len(batch)
            else:
                print(f"\n❌ Batch {i // batch_size + 1} failed ({resp.status_code}): {resp.text[:200]}")
        except Exception as e:
            print(f"\n❌ Batch {i // batch_size + 1} error: {e}")

    print(f"\n✅ Uploaded {uploaded}/{total} tracks")


def main():
    parser = argparse.ArgumentParser(description="Process FMA metadata and upload to Lovable Cloud")
    parser.add_argument("--metadata-dir", required=True, help="Path to extracted fma_metadata folder")
    parser.add_argument("--subset", default="small", choices=["small", "medium", "large", "full"],
                        help="FMA subset to process (default: small = 8000 tracks)")
    parser.add_argument("--supabase-url", default=os.environ.get("SUPABASE_URL", "https://ldehlfjbyxsqmbecvcxi.supabase.co"))
    parser.add_argument("--supabase-key", default=os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""))
    parser.add_argument("--batch-size", type=int, default=500)
    parser.add_argument("--direct", action="store_true", help="Upload directly via REST API instead of edge function")
    args = parser.parse_args()

    if not args.supabase_key:
        print("❌ Set --supabase-key or SUPABASE_SERVICE_ROLE_KEY env var")
        print("   Find it in Lovable Cloud settings")
        sys.exit(1)

    # Load CSVs
    tracks_df = load_tracks_csv(args.metadata_dir)
    features_df = load_features_csv(args.metadata_dir)

    # Build records
    records = build_track_records(tracks_df, features_df, subset=args.subset)

    if not records:
        print("❌ No tracks to upload")
        sys.exit(1)

    # Upload
    if args.direct:
        upload_directly(records, args.supabase_url, args.supabase_key, args.batch_size)
    else:
        upload_to_supabase(records, args.supabase_url, args.supabase_key, args.batch_size)

    print("\n🎉 Done! Refresh MoodForge to see your tracks on the spider web.")


if __name__ == "__main__":
    main()
