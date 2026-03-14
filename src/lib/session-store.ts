/**
 * IndexedDB persistence for audio sessions.
 * Stores stem audio blobs and metadata so sessions survive page reloads.
 */

const DB_NAME = "moodforge-sessions";
const DB_VERSION = 1;
const STEMS_STORE = "stems";
const META_STORE = "meta";

interface StoredStemVersion {
  id: string;
  versionNumber: number;
  label: string;
  blob: Blob;
  prompt: string;
  userFeedback: string | null;
  timestamp: number;
}

interface StoredStem {
  id: string;
  label: string;
  color: string;
  bgClass: string;
  versions: StoredStemVersion[];
  activeVersionIndex: number;
}

export interface StoredSession {
  generationPrompt: string | null;
  stems: StoredStem[];
  savedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STEMS_STORE)) {
        db.createObjectStore(STEMS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSession(session: StoredSession): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction([STEMS_STORE, META_STORE], "readwrite");

    // Clear old stems
    const stemsStore = tx.objectStore(STEMS_STORE);
    stemsStore.clear();

    // Save each stem with its audio blobs
    for (const stem of session.stems) {
      stemsStore.put(stem);
    }

    // Save metadata
    const metaStore = tx.objectStore(META_STORE);
    metaStore.put({
      key: "session",
      generationPrompt: session.generationPrompt,
      savedAt: session.savedAt,
    });

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
  } catch (err) {
    console.warn("Failed to save session:", err);
  }
}

export async function loadSession(): Promise<StoredSession | null> {
  try {
    const db = await openDb();
    const tx = db.transaction([STEMS_STORE, META_STORE], "readonly");

    const metaStore = tx.objectStore(META_STORE);
    const meta = await new Promise<any>((resolve, reject) => {
      const req = metaStore.get("session");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!meta) {
      db.close();
      return null;
    }

    const stemsStore = tx.objectStore(STEMS_STORE);
    const stems = await new Promise<StoredStem[]>((resolve, reject) => {
      const req = stemsStore.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    db.close();

    if (!stems.length) return null;

    return {
      generationPrompt: meta.generationPrompt,
      stems,
      savedAt: meta.savedAt,
    };
  } catch (err) {
    console.warn("Failed to load session:", err);
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction([STEMS_STORE, META_STORE], "readwrite");
    tx.objectStore(STEMS_STORE).clear();
    tx.objectStore(META_STORE).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn("Failed to clear session:", err);
  }
}
