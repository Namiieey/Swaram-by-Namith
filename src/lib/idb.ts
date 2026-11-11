import type { LyricsResult, Track } from "./types";

export type DownloadMeta = {
  id: string;
  track: Track;
  size: number;
  quality: string;
  savedAt: number;
  lyrics?: LyricsResult;
};

const DB_NAME = "swaram-offline";
const META = "meta";
const BLOBS = "blobs";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: "id" });
      if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listDownloads(): Promise<DownloadMeta[]> {
  const db = await open();
  const all = await wrap(db.transaction(META).objectStore(META).getAll() as IDBRequest<DownloadMeta[]>);
  db.close();
  return all.sort((a, b) => b.savedAt - a.savedAt);
}

export async function saveDownload(meta: DownloadMeta, blob: Blob): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([META, BLOBS], "readwrite");
    tx.objectStore(META).put(meta);
    tx.objectStore(BLOBS).put(blob, meta.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

export async function getDownloadBlob(id: string): Promise<Blob | undefined> {
  const db = await open();
  const blob = await wrap(db.transaction(BLOBS).objectStore(BLOBS).get(id) as IDBRequest<Blob | undefined>);
  db.close();
  return blob;
}

export async function getDownloadMeta(id: string): Promise<DownloadMeta | undefined> {
  const db = await open();
  const m = await wrap(db.transaction(META).objectStore(META).get(id) as IDBRequest<DownloadMeta | undefined>);
  db.close();
  return m;
}

export async function removeDownload(id: string): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([META, BLOBS], "readwrite");
    tx.objectStore(META).delete(id);
    tx.objectStore(BLOBS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
