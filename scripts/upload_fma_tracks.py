#!/usr/bin/env python3
"""
Bulk upload FMA tracks to Lovable Cloud.

Prerequisites:
  1. Download FMA small: https://os.unil.cloud.switch.ch/fma/fma_small.zip
  2. Run MoodForge GEMS extraction: python gems_extract.py
  3. Run enrichment: python enrich_tracks.py
  4. This script reads the moodforge.db SQLite and uploads to the cloud.

Usage:
  pip install requests tqdm
  python scripts/upload_fma_tracks.py \
    --db moodforge.db \
    --audio-dir fma/data/fma_small \
    --supabase-url https://ldehlfjbyxsqmbecvcxi.supabase.co \
    --supabase-key YOUR_SERVICE_ROLE_KEY

Or set environment variables:
  export SUPABASE_URL=https://ldehlfjbyxsqmbecvcxi.supabase.co
  export SUPABASE_SERVICE_ROLE_KEY=your_key
"""

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from tqdm import tqdm

GEMS_KEYS = [
    "wonder", "transcendence", "tenderness", "nostalgia", "peacefulness",
    "joyful_activation", "power", "tension", "gems_sadness",
]


def get_tracks_from_db(db_path: str) -> list[dict]:
    """Read all tracks with GEMS scores from MoodForge SQLite DB."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Try the enriched view first, fall back to raw tracks
    try:
        cursor.execute("""
            SELECT t.track_id, t.title, t.artist, t.genre,
                   e.wonder, e.transcendence, e.tenderness, e.nostalgia,
                   e.peacefulness, e.joyful_activation, e.power, e.tension,
                   e.gems_sadness, e.valence, e.arousal,
                   f.tempo, f.key, f.mode,
                   t.prompt_fragment
            FROM tracks t
            LEFT JOIN emotions e ON t.track_id = e.track_id
            LEFT JOIN features f ON t.track_id = f.track_id
            WHERE e.wonder IS NOT NULL
        """)
    except sqlite3.OperationalError:
        # Simpler schema
        cursor.execute("""
            SELECT track_id, title, artist, genre,
                   wonder, transcendence, tenderness, nostalgia,
                   peacefulness, joyful_activation, power, tension,
                   gems_sadness, valence, arousal,
                   tempo, key, mode, prompt_fragment
            FROM tracks
            WHERE wonder IS NOT NULL
        """)

    tracks = []
    for row in cursor:
        row = dict(row)
        gems = {k: float(row.get(k, 0.5) or 0.5) for k in GEMS_KEYS}
        tracks.append({
            "fma_track_id": str(row["track_id"]),
            "title": row.get("title") or "Untitled",
            "artist": row.get("artist") or "Unknown",
            "genre": row.get("genre") or "Unknown",
            "gems": gems,
            "valence": float(row.get("valence", 0) or 0),
            "arousal": float(row.get("arousal", 0) or 0),
            "tempo": float(row.get("tempo", 120) or 120),
            "key": row.get("key") or "C",
            "mode": row.get("mode") or "major",
            "prompt_fragment": row.get("prompt_fragment") or "",
        })

    conn.close()
    return tracks


def upload_metadata(tracks: list[dict], base_url: str, api_key: str, batch_size: int = 200):
    """Upload track metadata in batches."""
    url = f"{base_url}/functions/v1/upload-tracks"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "apikey": api_key,
    }

    total = len(tracks)
    print(f"\n📊 Uploading metadata for {total} tracks...")

    for i in tqdm(range(0, total, batch_size), desc="Metadata batches"):
        batch = tracks[i:i + batch_size]
        resp = requests.post(url, json={"tracks": batch}, headers=headers, timeout=60)
        if resp.status_code != 200:
            print(f"\n❌ Batch {i//batch_size + 1} failed: {resp.text}")
            sys.exit(1)

    print(f"✅ Metadata uploaded for {total} tracks")


def upload_audio_file(args):
    """Upload a single audio file."""
    fma_track_id, audio_path, base_url, api_key = args
    url = f"{base_url}/functions/v1/upload-tracks?action=audio"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "apikey": api_key,
    }

    try:
        with open(audio_path, "rb") as f:
            files = {"file": (f"{fma_track_id}.mp3", f, "audio/mpeg")}
            data = {"fma_track_id": fma_track_id}
            resp = requests.post(url, files=files, data=data, headers=headers, timeout=120)
            return fma_track_id, resp.status_code == 200, resp.text
    except Exception as e:
        return fma_track_id, False, str(e)


def upload_audio(tracks: list[dict], audio_dir: str, base_url: str, api_key: str, workers: int = 4):
    """Upload audio files in parallel."""
    audio_path = Path(audio_dir)
    tasks = []

    for track in tracks:
        tid = track["fma_track_id"]
        # FMA stores files as 000/000002.mp3
        padded = tid.zfill(6)
        mp3_path = audio_path / padded[:3] / f"{padded}.mp3"
        if mp3_path.exists():
            tasks.append((tid, str(mp3_path), base_url, api_key))

    print(f"\n🎵 Uploading {len(tasks)} audio files (of {len(tracks)} tracks)...")

    failed = 0
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(upload_audio_file, t): t[0] for t in tasks}
        for future in tqdm(as_completed(futures), total=len(futures), desc="Audio files"):
            tid, success, msg = future.result()
            if not success:
                failed += 1
                if failed <= 5:
                    print(f"\n⚠️  Failed {tid}: {msg}")

    print(f"✅ Audio upload complete. {len(tasks) - failed}/{len(tasks)} succeeded")
    if failed:
        print(f"⚠️  {failed} files failed")


def main():
    parser = argparse.ArgumentParser(description="Upload FMA tracks to Lovable Cloud")
    parser.add_argument("--db", default="moodforge.db", help="Path to MoodForge SQLite DB")
    parser.add_argument("--audio-dir", default="fma/data/fma_small", help="Path to FMA audio files")
    parser.add_argument("--supabase-url", default=os.environ.get("SUPABASE_URL", ""), help="Supabase project URL")
    parser.add_argument("--supabase-key", default=os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""), help="Supabase service role key")
    parser.add_argument("--metadata-only", action="store_true", help="Skip audio upload")
    parser.add_argument("--audio-only", action="store_true", help="Skip metadata upload")
    parser.add_argument("--workers", type=int, default=4, help="Parallel upload workers")
    parser.add_argument("--batch-size", type=int, default=200, help="Metadata batch size")
    args = parser.parse_args()

    if not args.supabase_url or not args.supabase_key:
        print("❌ Set --supabase-url and --supabase-key (or SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars)")
        sys.exit(1)

    tracks = get_tracks_from_db(args.db)
    print(f"📂 Found {len(tracks)} tracks in {args.db}")

    if not args.audio_only:
        upload_metadata(tracks, args.supabase_url, args.supabase_key, args.batch_size)

    if not args.metadata_only:
        upload_audio(tracks, args.audio_dir, args.supabase_url, args.supabase_key, args.workers)

    print("\n🎉 Done! Your tracks are now available in the MoodForge spider web.")


if __name__ == "__main__":
    main()
