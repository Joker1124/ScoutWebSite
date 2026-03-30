import { openDB } from 'idb';

const DB_NAME = 'offline_db';
const STORES = [
  'users', 'units', 'teams', 'tracking_fields', 'attendance', 'communities',
  'community_posts', 'progress_cards', 'progress_card_items', 'progress',
  'user_cards', 'progress_card_requests', 'tracking_rules', 'violation_acknowledgments',
  'badges', 'badge_requests', 'badge_requirements_progress', 'inventory_items',
  'inventory_log', 'inventory_custodianship', 'funds', 'transactions', 'external_supplies',
  'queue', 'points_log', 'pending_rpc'
];

export const openLocalDB = async () => {
  return openDB(DB_NAME, 3, {
    upgrade(db) {
      STORES.forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      });
    }
  });
};

export const getTable = async (table: string) => {
  const db = await openLocalDB();
  return db.getAll(table);
};

export const setTable = async (table: string, rows: any[]) => {
  const db = await openLocalDB();
  const tx = db.transaction(table, 'readwrite');
  await tx.store.clear();
  for (const row of rows) await tx.store.put(row);
  await tx.done;
};

export const upsertRows = async (table: string, itemOrArray: any | any[]) => {
  const db = await openLocalDB();
  const items = Array.isArray(itemOrArray) ? itemOrArray : [itemOrArray];
  const tx = db.transaction(table, 'readwrite');
  for (const item of items) {
    const row = { ...item };
    if (!row.id) row.id = crypto.randomUUID();
    await tx.store.put(row);
  }
  await tx.done;
  console.log(`[DB:UPSERT] ${table}`, items.length);
  window.dispatchEvent(new CustomEvent('local-db-updated', { detail: { table } }));
};

export const getById = async (table: string, id: string) => {
  const db = await openLocalDB();
  return db.get(table, id);
};

export const deleteById = async (table: string, id: string) => {
  const db = await openLocalDB();
  await db.delete(table, id);
  window.dispatchEvent(new CustomEvent('local-db-updated', { detail: { table } }));
};

export const deleteByMatch = async (table: string, match: any) => {
  const db = await openLocalDB();
  const tx = db.transaction(table, 'readwrite');
  const all = await tx.store.getAll();
  const keysToDelete = all.filter(item => {
    return Object.keys(match).every(key => item[key] === match[key]);
  }).map(item => item.id);
  
  for (const key of keysToDelete) {
    await tx.store.delete(key);
  }
  await tx.done;
  window.dispatchEvent(new CustomEvent('local-db-updated', { detail: { table } }));
};
