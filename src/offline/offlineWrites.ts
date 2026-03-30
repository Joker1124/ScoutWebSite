import { supabase } from '../../supabaseClient';
import * as dbLocal from './dbLocal';
import { addOperation } from './offlineQueue';

export const writeInsert = async (table: string, rows: any, { optimisticTable = table }: any = {}) => {
  const payload = Array.isArray(rows) ? rows : [rows];
  payload.forEach(r => { if (!r.id) r.id = crypto.randomUUID(); });
  
  if (!navigator.onLine) {
    console.log('[WRITE:OFFLINE] insert', table);
    await addOperation({ table, op: 'insert', payload: payload });
    if (optimisticTable) await dbLocal.upsertRows(optimisticTable, payload);
    return { queued: true };
  }
  console.log('[WRITE:ONLINE] insert', table);
  try {
    const { data, error } = await supabase.from(table).insert(payload).select();
    if (error) throw error;
    if (optimisticTable) await dbLocal.upsertRows(optimisticTable, data || payload);
    return { success: true };
  } catch (error) {
    console.error('[WRITE:ERR]', error);
    await addOperation({ table, op: 'insert', payload: payload });
    return { queued: true };
  }
};

export const writeUpsert = async (table: string, rows: any, { optimisticTable = table }: any = {}) => {
  const payload = Array.isArray(rows) ? rows : [rows];
  payload.forEach(r => { if (!r.id) r.id = crypto.randomUUID(); });

  if (!navigator.onLine) {
    console.log('[WRITE:OFFLINE] upsert', table);
    await addOperation({ table, op: 'upsert', payload: payload });
    if (optimisticTable) await dbLocal.upsertRows(optimisticTable, payload);
    return { queued: true };
  }
  console.log('[WRITE:ONLINE] upsert', table);
  try {
    const { data, error } = await supabase.from(table).upsert(payload).select();
    if (error) throw error;
    if (optimisticTable) await dbLocal.upsertRows(optimisticTable, data || payload);
    return { success: true };
  } catch (error) {
    console.error('[WRITE:ERR]', error);
    await addOperation({ table, op: 'upsert', payload: payload });
    return { queued: true };
  }
};

export const writeUpdate = async (table: string, values: any, match: any, { optimisticTable = table }: any = {}) => {
  if (!match.id) {
    console.error('[WRITE:ERR] Update requires id', table, match);
    return { error: 'Update requires id' };
  }
  const payload = { ...values, id: match.id };

  if (!navigator.onLine) {
    console.log('[WRITE:OFFLINE] update', table);
    await addOperation({ table, op: 'update', payload, match: { id: match.id } });
    if (optimisticTable) await dbLocal.upsertRows(optimisticTable, payload);
    return { queued: true };
  }
  console.log('[WRITE:ONLINE] update', table);
  try {
    const { data, error } = await supabase.from(table).update(values).match(match).select();
    if (error) throw error;
    if (optimisticTable) await dbLocal.upsertRows(optimisticTable, data || payload);
    return { success: true };
  } catch (error) {
    console.error('[WRITE:ERR]', error);
    await addOperation({ table, op: 'update', payload, match: { id: match.id } });
    return { queued: true };
  }
};

export const writeDelete = async (table: string, match: any, { optimisticTable = table }: any = {}) => {
  if (!match || Object.keys(match).length === 0) {
    console.warn('[WRITE:WARN] Delete requires match criteria', table, match);
    return { error: 'Delete requires match criteria' };
  }
  if (!navigator.onLine) {
    console.log('[WRITE:OFFLINE] delete', table);
    await addOperation({ table, op: 'delete', payload: null, match });
    if (optimisticTable) await dbLocal.deleteByMatch(optimisticTable, match);
    return { queued: true };
  }
  console.log('[WRITE:ONLINE] delete', table);
  try {
    const { error } = await supabase.from(table).delete().match(match);
    if (error) throw error;
    if (optimisticTable) await dbLocal.deleteByMatch(optimisticTable, match);
    return { success: true };
  } catch (error) {
    console.error('[WRITE:ERR]', error);
    await addOperation({ table, op: 'delete', payload: null, match });
    return { queued: true };
  }
};
