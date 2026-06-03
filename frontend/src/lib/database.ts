/**
 * IndexedDB wrapper for AutoTARA persistent storage.
 * Stores projects and per-project TARA data in a reliable database
 * that survives page reloads and browser restarts.
 */

const DB_NAME = 'autotara-db';
const DB_VERSION = 1;

// Store names
const PROJECTS_STORE = 'projects';
const TARA_DATA_STORE = 'tara-data';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
                db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(TARA_DATA_STORE)) {
                db.createObjectStore(TARA_DATA_STORE, { keyPath: 'projectId' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ─── Generic helpers ──────────────────────────────────────────

async function getAll<T>(storeName: string): Promise<T[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result as T[]);
        request.onerror = () => reject(request.error);
    });
}

async function getByKey<T>(storeName: string, key: string): Promise<T | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result as T | undefined);
        request.onerror = () => reject(request.error);
    });
}

async function putItem<T>(storeName: string, item: T): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function deleteItem(storeName: string, key: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function putAll<T>(storeName: string, items: T[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        items.forEach((item) => store.put(item));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// ─── Project APIs ─────────────────────────────────────────────

import { Project } from '@/types/tara';

export async function loadProjectsFromDB(): Promise<Project[]> {
    try {
        return await getAll<Project>(PROJECTS_STORE);
    } catch {
        return [];
    }
}

export async function saveProjectToDB(project: Project): Promise<void> {
    await putItem(PROJECTS_STORE, project);
}

export async function saveAllProjectsToDB(projects: Project[]): Promise<void> {
    await putAll(PROJECTS_STORE, projects);
}

export async function deleteProjectFromDB(id: string): Promise<void> {
    await deleteItem(PROJECTS_STORE, id);
    // Also remove associated TARA data
    await deleteItem(TARA_DATA_STORE, id).catch(() => { });
}

// ─── TARA Data APIs ───────────────────────────────────────────

export interface TaraDataSnapshot {
    projectId: string;
    assets: unknown[];
    threats: unknown[];
    impacts: unknown[];
    attackPaths: unknown[];
    feasibilities: unknown[];
    treatments: unknown[];
    savedAt: string;
}

export async function loadTaraDataFromDB(projectId: string): Promise<TaraDataSnapshot | undefined> {
    try {
        return await getByKey<TaraDataSnapshot>(TARA_DATA_STORE, projectId);
    } catch {
        return undefined;
    }
}

export async function saveTaraDataToDB(data: TaraDataSnapshot): Promise<void> {
    await putItem(TARA_DATA_STORE, data);
}
