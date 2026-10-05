import { SavedVideo } from "@/lib/types";

const DATABASE_NAME = "streamly-offline";
const STORE_NAME = "snapshots";
const MAX_STORAGE_BYTES = 2 * 1024 * 1024;
const MAX_ITEMS = 60;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transact<T>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function saveOfflineVideos(
  key: string,
  videos: SavedVideo[],
): Promise<void> {
  const database = await openDatabase();
  try {
    const limited = videos.slice(0, MAX_ITEMS);
    while (
      limited.length > 0 &&
      new Blob([JSON.stringify(limited)]).size > MAX_STORAGE_BYTES
    ) {
      limited.pop();
    }
    await transact(database, "readwrite", (store) => store.put(limited, key));
  } finally {
    database.close();
  }
}

export async function loadOfflineVideos(key: string): Promise<SavedVideo[]> {
  const database = await openDatabase();
  try {
    return (await transact<SavedVideo[] | undefined>(
      database,
      "readonly",
      (store) => store.get(key),
    )) ?? [];
  } finally {
    database.close();
  }
}

export async function deleteOfflineVideos(key: string): Promise<void> {
  const database = await openDatabase();
  try {
    await transact(database, "readwrite", (store) => store.delete(key));
  } finally {
    database.close();
  }
}
