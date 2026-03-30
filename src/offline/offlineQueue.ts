import { openLocalDB } from './dbLocal';

const STORE = 'queue';

export const addOperation = async ({ table, op, payload, match }: any) => {
  const db = await openLocalDB();
  const opObj = {
    id: crypto.randomUUID(),
    table,
    op,
    payload,
    match,
    ts: Date.now()
  };
  await db.put(STORE, opObj);
  return opObj;
};

export const getOperations = async () => {
  const db = await openLocalDB();
  return db.getAll(STORE);
};

export const removeOperation = async (id: string) => {
  const db = await openLocalDB();
  await db.delete(STORE, id);
};

export const clearQueue = async () => {
  const db = await openLocalDB();
  await db.clear(STORE);
};
