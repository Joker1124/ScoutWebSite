import { getOperations, removeOperation } from './offlineQueue';
import { upsertRows, deleteById } from './dbLocal';

export const processQueue = async ({ supabase, onSuccess, onError }: any) => {
  const ops = await getOperations();
  console.log('[SYNC] Start', ops.length);
  for (const op of ops) {
    try {
      let query = supabase.from(op.table);
      let result;
      if (op.op === 'insert') result = await query.insert(op.payload).select();
      else if (op.op === 'upsert') result = await query.upsert(op.payload).select();
      else if (op.op === 'update') result = await query.update(op.payload).eq('id', op.match.id).select();
      else if (op.op === 'delete') result = await query.delete().eq('id', op.match.id).select();
      
      if (result.error) {
        console.warn('[SYNC:ERR]', op, result.error);
        if (onError) onError(op, result.error);
        continue;
      }
      
      // Always update local DB with returned data
      if (op.op === 'delete') {
        await deleteById(op.table, op.match.id);
      } else if (result.data) {
        await upsertRows(op.table, result.data);
      }
      
      await removeOperation(op.id);
      console.log('[SYNC:OK]', op);
      if (onSuccess) onSuccess(op);
    } catch (e) {
      console.warn('[SYNC:ERR]', op, e);
      if (onError) onError(op, e);
    }
  }
};

export const initSyncEngine = ({ supabase }: any) => {
  window.addEventListener('online', () => processQueue({ supabase }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') processQueue({ supabase });
  });
};
