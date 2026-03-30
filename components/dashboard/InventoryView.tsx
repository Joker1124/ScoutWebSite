
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { User, InventoryItem, InventoryLog, InventoryCustodianship, Unit, PERMISSIONS } from '../../types';
import { Archive, Plus, Edit2, Trash2, Box, PackageCheck, PackageOpen, RefreshCw, ChevronDown, ChevronRight, User as UserIcon, Calendar, Info, BarChart3, FileSpreadsheet, Wrench, Users, Shield, Save, CheckCircle, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ConfirmModal } from '../shared/ConfirmModal';
import { writeInsert, writeUpsert, writeUpdate, writeDelete } from '../../src/offline';


interface InventoryViewProps {
    currentUser: User;
    users: User[];
    units: Unit[];
    showMessage: (type: 'success' | 'error', text: string) => void;
    selectedUnitId: string | null;
    syncedInventoryItems?: InventoryItem[];
    syncedInventoryLogs?: InventoryLog[];
    syncedInventoryCustodianships?: InventoryCustodianship[];
}

export const InventoryView: React.FC<InventoryViewProps> = ({ 
    currentUser, users, units, showMessage, selectedUnitId,
    syncedInventoryItems, syncedInventoryLogs, syncedInventoryCustodianships
}) => {
    const [activeTab, setActiveTab] = useState('current'); // 'current', 'custodians', 'reports'
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [logs, setLogs] = useState<(InventoryLog & { person_name: string, item_name: string, issuer_name: string })[]>([]);
    const [custodianships, setCustodianships] = useState<InventoryCustodianship[]>([]);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState<{ mode: 'add' | 'edit' | 'assign', data: any }>({ mode: 'add', data: null });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [procId, setProcId] = useState<string | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ show: boolean, itemId: string | null, itemName: string }>({ show: false, itemId: null, itemName: '' });
    const [returnModal, setReturnModal] = useState<{ show: boolean, log: any }>({ show: false, log: null });
    const [repairModal, setRepairModal] = useState<{ show: boolean, item: any }>({ show: false, item: null });

    const targetUnitId = currentUser.role === 'group_leader' ? selectedUnitId : currentUser.unit_id;

    useEffect(() => {
        if (syncedInventoryItems) setItems(syncedInventoryItems);
        if (syncedInventoryCustodianships) setCustodianships(syncedInventoryCustodianships);
        
        if (syncedInventoryLogs) {
            // Enrich logs with names
            const enriched = syncedInventoryLogs.map(log => {
                const person = users.find(u => u.id === log.user_id);
                const item = syncedInventoryItems?.find(i => i.id === log.item_id);
                const issuer = users.find(u => u.id === log.checked_out_by);
                return {
                    ...log,
                    person_name: person?.name || log.external_person_name || 'غير معروف',
                    item_name: item?.name || 'صنف محذوف',
                    issuer_name: issuer?.name || 'غير معروف'
                };
            });
            setLogs(enriched as any);
        }
    }, [syncedInventoryItems, syncedInventoryLogs, syncedInventoryCustodianships, users]);

    const fetchInventoryData = async (fullRefresh = true) => {
        // Data is now handled by useRealtimeSync in Dashboard
    };

    const openModal = (mode: 'add' | 'edit' | 'assign', data: any = null) => {
        setModal({ mode, data });
        setIsModalOpen(true);
    };

    const handleSave = async (itemData: Partial<InventoryItem>) => {
        setProcId('saving');
        try {
            const id = modal.mode === 'add' ? crypto.randomUUID() : modal.data.id;
            const finalData = { ...itemData, id };
            
            if (modal.mode === 'add') {
                await writeInsert('inventory_items', finalData);
            } else {
                await writeUpdate('inventory_items', finalData, { id: finalData.id });
            }
            
            showMessage('success', modal.mode === 'add' ? 'تم إضافة العهدة محلياً' : 'تم تحديث العهدة محلياً');
            setIsModalOpen(false);
        } catch (e: any) {
            showMessage('error', 'فشل الحفظ: ' + e.message);
        } finally {
            setProcId(null);
        }
    };

    const handleAssign = async (payload: { userId: string | null; externalPersonName: string | null; notes: string; quantity: number }) => {
        if (!modal.data) return;
        setProcId('assigning');
        try {
            const logRecord = { 
                id: crypto.randomUUID(),
                item_id: modal.data.id, 
                user_id: payload.userId, 
                external_person_name: payload.externalPersonName,
                notes: payload.notes,
                quantity_checked_out: payload.quantity,
                checked_out_by: currentUser.id,
                checked_out_at: new Date().toISOString()
            };

            await writeInsert('inventory_log', logRecord);
            
            setIsModalOpen(false);
            showMessage('success', 'تم تسليم العهدة محلياً');
        } catch (e: any) {
             showMessage('error', 'فشل التسليم: ' + e.message);
        } finally {
            setProcId(null);
        }
    };

    const handleProcessReturn = async (payload: { returned: number, damaged: number, maintenance: number }) => {
        const { log } = returnModal;
        const item = items.find(i => i.id === log.item_id);
        if (!log || !item) return;
        setProcId(log.id);
        try {
            const newReturned = (log.quantity_returned || 0) + payload.returned;
            const newDamaged = (log.quantity_damaged || 0) + payload.damaged;
            const totalResolved = newReturned + newDamaged;
            
            const updatedLog = {
                ...log,
                quantity_returned: newReturned,
                quantity_damaged: newDamaged,
                fully_checked_in_at: totalResolved >= (log.quantity_checked_out || 1) ? new Date().toISOString() : null
            };

            const updatedItem = {
                ...item,
                quantity: item.quantity - payload.damaged,
                quantity_in_maintenance: (item.quantity_in_maintenance || 0) + payload.maintenance
            };

            await writeUpdate('inventory_log', updatedLog, { id: updatedLog.id });
            await writeUpdate('inventory_items', updatedItem, { id: updatedItem.id });

            showMessage('success', 'تم تسجيل عملية الاستلام محلياً');
            setReturnModal({ show: false, log: null });
        } catch(e: any) {
            showMessage('error', 'فشل تسجيل الاستلام: ' + e.message);
        } finally {
            setProcId(null);
        }
    };

    const handleRepair = async (quantity: number) => {
        const { item } = repairModal;
        if (!item) return;
        setProcId(item.id);
        try {
            const newMaintenanceQty = Math.max(0, (item.quantity_in_maintenance || 0) - quantity);
            const updatedItem = { ...item, quantity_in_maintenance: newMaintenanceQty };
            
            await writeUpdate('inventory_items', updatedItem, { id: updatedItem.id });
            
            showMessage('success', 'تم تحديث رصيد الصيانة محلياً');
            setRepairModal({ show: false, item: null });
        } catch (e: any) {
            showMessage('error', 'فشل التحديث: ' + e.message);
        } finally {
            setProcId(null);
        }
    };
    
    const promptDelete = (itemId: string, itemName: string) => setDeleteModal({ show: true, itemId, itemName });

    const executeDelete = async () => {
        if (!deleteModal.itemId) return;
        setProcId(deleteModal.itemId);
        try {
            const item = items.find(i => i.id === deleteModal.itemId);
            if (item) {
                // حذف السجلات المرتبطة أولاً
                const relatedLogs = logs.filter(l => l.item_id === deleteModal.itemId);
                for (const log of relatedLogs) {
                    await writeDelete('inventory_log', { id: log.id });
                }

                await writeDelete('inventory_items', { id: deleteModal.itemId });
                showMessage('success', 'تم الحذف محلياً');
            }
        } catch(e: any) {
             showMessage('error', 'فشل الحذف: ' + e.message);
        } finally {
            setProcId(null);
            setDeleteModal({ show: false, itemId: null, itemName: '' });
        }
    };

    const filteredItems = useMemo(() => {
        if (currentUser.role === 'group_leader' && !targetUnitId) return items;
        return items.filter(item => item.unit_id === null || item.unit_id === targetUnitId);
    }, [items, targetUnitId, currentUser.role]);

    const filteredLogs = useMemo(() => {
        const itemIds = filteredItems.map(i => i.id);
        return logs.filter(log => itemIds.includes(log.item_id));
    }, [logs, filteredItems]);
    
    if (currentUser.role !== 'group_leader' && !currentUser.unit_id) {
        return <div className="text-center p-10 bg-gray-50 dark:bg-gray-800/50 rounded-xl"><Info size={24} className="mx-auto text-gray-400 mb-2"/>لا يوجد لديك شعبة محددة لعرض المخزن.</div>;
    }

    const availableItems = filteredItems.map(item => {
        const totalCheckedOut = filteredLogs.filter(log => log.item_id === item.id && !log.fully_checked_in_at).reduce((sum, log) => sum + (log.quantity_checked_out || 1) - ((log.quantity_returned || 0) + (log.quantity_damaged || 0)), 0);
        const availableQuantity = item.quantity - (item.quantity_in_maintenance || 0) - totalCheckedOut;
        return { ...item, availableQuantity };
    }).filter(item => item.availableQuantity > 0);

    const checkedOutItems = filteredLogs.filter(l => !l.fully_checked_in_at);
    const maintenanceItems = filteredItems.filter(i => (i.quantity_in_maintenance || 0) > 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-orange-100 to-white dark:from-orange-900/20 dark:to-gray-900/20 p-8 rounded-3xl border border-orange-100 dark:border-orange-900/30 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="relative z-10 mb-6 md:mb-0 text-center md:text-right">
                    <h2 className="text-3xl font-black text-orange-900 dark:text-orange-300 flex items-center justify-center md:justify-start gap-3 mb-2">
                        <div className="p-2 bg-orange-200 dark:bg-orange-800/50 rounded-xl"><Archive size={32}/></div>
                        إدارة المخزن والعهدة
                    </h2>
                    <p className="text-base text-orange-700 dark:text-orange-400 opacity-80 font-medium">متابعة العهدة، المسؤولين، وحركة المخزن</p>
                </div>

                <div className="flex items-center gap-4 relative z-10">
                    {activeTab === 'current' && currentUser.role !== 'priest' && (
                        <button onClick={() => openModal('add')} className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-orange-600/20 hover:bg-orange-700 transition-all active:scale-95 flex items-center gap-2 group">
                            <Plus size={20} className="group-hover:rotate-90 transition-transform"/> إضافة عهدة
                        </button>
                    )}
                </div>
            </div>
            
            <div className="flex bg-white/50 dark:bg-gray-800/50 p-1.5 rounded-2xl border border-white/20 dark:border-gray-700 backdrop-blur-sm w-fit mx-auto md:mx-0 shadow-inner">
                <TabBtn active={activeTab === 'current'} onClick={() => setActiveTab('current')} label="العهدة الحالية" icon={<Box size={16}/>} />
                {currentUser.role === 'group_leader' && <TabBtn active={activeTab === 'custodians'} onClick={() => setActiveTab('custodians')} label="مسؤولو العهدة" icon={<Shield size={16}/>} />}
                <TabBtn active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} label="التقارير" icon={<FileSpreadsheet size={16}/>} />
            </div>

            {activeTab === 'current' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    <InventorySection title="العهدة المتاحة" icon={<PackageCheck className="text-green-500"/>} items={availableItems} action="assign" onAction={openModal} onDelete={promptDelete} procId={procId} custodianships={custodianships} allUsers={users} currentUser={currentUser}/>
                    <InventorySection title="العهدة المسلمة" icon={<PackageOpen className="text-yellow-500"/>} items={checkedOutItems} action="return" onAction={(log) => setReturnModal({show: true, log})} procId={procId} custodianships={custodianships} allUsers={users} currentUser={currentUser}/>
                    <InventorySection title="عهدة في الصيانة" icon={<Wrench className="text-indigo-500"/>} items={maintenanceItems} action="repair" onAction={(item) => setRepairModal({show: true, item})} procId={procId} custodianships={custodianships} allUsers={users} currentUser={currentUser}/>
                </div>
            )}
            
            {activeTab === 'custodians' && <CustodiansManagement currentUser={currentUser} users={users} units={units} custodianships={custodianships} onRefresh={() => fetchInventoryData(false)} showMessage={showMessage}/>}
            {activeTab === 'reports' && <InventoryReports logs={filteredLogs} items={filteredItems} />}

            {isModalOpen && <ActionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} mode={modal.mode} data={modal.data} onSave={handleSave} onAssign={handleAssign} users={users} units={units} currentUser={currentUser} isProcessing={!!procId} />}
            {returnModal.show && <ReturnModal isOpen={returnModal.show} onClose={() => setReturnModal({show:false, log: null})} log={returnModal.log} item={items.find(i => i.id === returnModal.log.item_id)} onConfirm={handleProcessReturn} isProcessing={procId === returnModal.log.id}/>}
            {repairModal.show && <RepairModal isOpen={repairModal.show} onClose={() => setRepairModal({show:false, item: null})} item={repairModal.item} onConfirm={handleRepair} isProcessing={procId === repairModal.item.id}/>}
            
            {deleteModal.show && (
                <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border-2 border-red-100 dark:border-red-900 transform scale-100 transition-all">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-400 shadow-inner">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-black text-center mb-3 dark:text-white">حذف عهدة</h3>
                        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                            هل أنت متأكد من حذف <br/><b className="text-gray-900 dark:text-white text-lg">"{deleteModal.itemName}"</b>؟ <br/>
                            <span className="text-red-500 text-xs mt-2 block">لا يمكن التراجع عن هذا الإجراء.</span>
                        </p>
                        <div className="flex gap-3">
                            <button onClick={executeDelete} disabled={!!procId} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 active:scale-95">
                                {procId === deleteModal.itemId ? <RefreshCw className="animate-spin" size={20}/> : 'نعم، احذف'}
                            </button>
                            <button onClick={() => setDeleteModal({ show: false, itemId: null, itemName: '' })} disabled={!!procId} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-3.5 rounded-xl font-bold transition-all active:scale-95">
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TabBtn = ({ active, onClick, label, icon }: any) => (
    <button 
        onClick={onClick} 
        className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${active ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-lg shadow-orange-500/10 scale-105' : 'text-gray-500 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-700/30'}`}
    >
        {icon} {label}
    </button>
);

const InventorySection: React.FC<any> = ({ title, icon, items, action, onAction, onDelete, procId, custodianships, allUsers, currentUser }) => {
    const [expanded, setExpanded] = useState<string[]>([]);
    
    const toggleExpand = (id: string) => {
        setExpanded(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    return (
        <div className="glass-panel p-6 rounded-3xl border border-white/20 dark:border-gray-700 h-full flex flex-col">
            <h3 className="font-black text-lg mb-6 flex items-center gap-3 text-gray-800 dark:text-white pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">{icon}</div> 
                {title} 
                <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg text-gray-500">{items.length}</span>
            </h3>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar flex-1 pr-2">
                {items.length === 0 && (
                    <div className="text-center py-12 opacity-50">
                        <Box size={40} className="mx-auto mb-2 text-gray-300"/>
                        <p className="text-sm font-bold text-gray-400">لا توجد عناصر</p>
                    </div>
                )}
                {items.map((item: any) => {
                    const isExpanded = expanded.includes(item.id);
                    const itemUnitId = action === 'return' ? item.unit_id : item.unit_id;
                    const unitCustodianships = custodianships.filter((c: any) => c.unit_id === itemUnitId);
                    const generalCustodianships = custodianships.filter((c: any) => c.unit_id === null);
                    const allCustodianships = [...unitCustodianships, ...generalCustodianships];
                    const custodianUserIds = [...new Set(allCustodianships.map((c:any) => c.user_id))];
                    const itemCustodians = custodianUserIds.map(userId => allUsers.find((u: any) => u.id === userId)?.name).filter(Boolean);

                    return (
                        <div key={item.id} className={`bg-white dark:bg-gray-800/50 rounded-2xl border transition-all duration-300 ${isExpanded ? 'border-orange-200 dark:border-orange-900 shadow-md' : 'border-gray-100 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-900'}`}>
                            <div className="p-4 flex justify-between items-center">
                                <button onClick={() => toggleExpand(item.id)} className="flex items-center gap-3 text-sm font-bold text-gray-800 dark:text-gray-100 flex-1 text-right group">
                                    <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-500'}`}>
                                        {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                    </div>
                                    <span className="line-clamp-1">{action === 'return' ? item.item_name : item.name}</span>
                                </button>
                                
                                <div className="flex items-center gap-2">
                                    {currentUser.role !== 'priest' && (
                                        action === 'assign' ? (
                                            <>
                                                <button onClick={() => onAction('assign', item)} className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors">تسليم</button>
                                                <button onClick={() => onAction('edit', item)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={14}/></button>
                                                <button onClick={() => onDelete(item.id, item.name)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14}/></button>
                                            </>
                                        ) : action === 'return' ? (
                                            <button onClick={() => onAction(item)} className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors">استلام</button>
                                        ) : (
                                            <button onClick={() => onAction(item)} className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors">تم الإصلاح</button>
                                        )
                                    )}
                                </div>
                            </div>
                            
                            {isExpanded && (
                                <div className="px-4 pb-4 pt-0 text-xs text-gray-500 dark:text-gray-400 space-y-2 animate-in slide-in-from-top-2">
                                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                                        <p className="mb-1"><span className="font-bold text-gray-700 dark:text-gray-300">الوصف:</span> {item.description || 'لا يوجد'}</p>
                                        {itemCustodians.length > 0 && (
                                            <p className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <Users size={12} className="text-orange-500"/> 
                                                <span className="font-bold text-gray-700 dark:text-gray-300">المسؤولون:</span> {itemCustodians.join(', ')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ActionModal: React.FC<any> = ({ isOpen, onClose, mode, data, onSave, onAssign, users, units, currentUser, isProcessing }) => {
    const [formData, setFormData] = useState<any>({});
    const [assignMode, setAssignMode] = useState<'internal' | 'external'>('internal');

    useEffect(() => {
        if (mode === 'edit' && data) {
            setFormData({ name: data.name, description: data.description, quantity: data.quantity, is_consumable: data.is_consumable || false, unit_id: data.unit_id || '' });
        } else if (mode === 'assign' && data) {
            setFormData({ user_id: '', notes: '', external_person_name: '', quantity: 1 });
            setAssignMode('internal');
        } else {
            setFormData({ name: '', description: '', quantity: 1, is_consumable: false, unit_id: currentUser.unit_id || '' });
        }
    }, [mode, data, currentUser]);
    
    const handleSaveClick = () => onSave({ name: formData.name, description: formData.description, quantity: formData.quantity, is_consumable: formData.is_consumable, unit_id: formData.unit_id || null });
    const handleAssignClick = () => onAssign({ userId: assignMode === 'internal' ? formData.user_id : null, externalPersonName: assignMode === 'external' ? formData.external_person_name : null, notes: formData.notes, quantity: formData.quantity || 1 });
    const title = mode === 'add' ? 'إضافة عهدة' : mode === 'edit' ? 'تعديل عهدة' : `تسليم عهدة: ${data?.name || ''}`;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-white/20 dark:border-gray-700 animate-in zoom-in-95 duration-300">
                <h3 className="text-2xl font-black mb-6 text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400">
                        {mode === 'add' ? <Plus size={24}/> : mode === 'edit' ? <Edit2 size={24}/> : <PackageCheck size={24}/>}
                    </div>
                    {title}
                </h3>
                
                <div className="space-y-5">
                    {mode === 'assign' ? (
                        <>
                            <div className="flex gap-2 bg-gray-100 dark:bg-gray-900 p-1.5 rounded-xl">
                                <button onClick={() => setAssignMode('internal')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${assignMode === 'internal' ? 'bg-white dark:bg-gray-700 shadow-md text-orange-600 dark:text-orange-400' : 'text-gray-500'}`}>عضو مسجل</button>
                                <button onClick={() => setAssignMode('external')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${assignMode === 'external' ? 'bg-white dark:bg-gray-700 shadow-md text-orange-600 dark:text-orange-400' : 'text-gray-500'}`}>شخص خارجي</button>
                            </div>
                            
                            {assignMode === 'internal' ? (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">تسليم إلى</label>
                                    <select value={formData.user_id} onChange={e => setFormData({...formData, user_id: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-bold text-gray-700 dark:text-gray-200">
                                        <option value="">اختر فرد</option>
                                        {users.map((u: User) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">اسم الشخص المستلم</label>
                                    <input value={formData.external_person_name} onChange={e => setFormData({...formData, external_person_name: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-bold text-gray-700 dark:text-gray-200" placeholder="الاسم الكامل"/>
                                </div>
                            )}
                            
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">الكمية المسلمة (المتاح: {data?.availableQuantity || 0})</label>
                                <input type="number" min="1" max={data?.availableQuantity} value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-bold text-gray-700 dark:text-gray-200" />
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">ملاحظات</label>
                                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-700 dark:text-gray-200 h-24 resize-none" placeholder="أي ملاحظات إضافية..."/>
                            </div>
                        </>
                    ) : (
                        <>
                            {currentUser.role === 'group_leader' && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">الشعبة</label>
                                    <select value={formData.unit_id} onChange={e => setFormData({...formData, unit_id: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-bold text-gray-700 dark:text-gray-200">
                                        <option value="">عهدة عامة (للمجموعة)</option>
                                        {units.map((u: Unit) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">اسم العهدة</label>
                                <input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-bold text-gray-700 dark:text-gray-200" placeholder="مثلاً: خيمة 4 أشخاص"/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">وصف (اختياري)</label>
                                <input value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-700 dark:text-gray-200" placeholder="وصف تفصيلي للعهدة..."/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">الكمية الإجمالية</label>
                                <input type="number" min="1" value={formData.quantity || 1} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-bold text-gray-700 dark:text-gray-200" />
                            </div>
                            <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                                <input type="checkbox" id="is_consumable" checked={formData.is_consumable} onChange={e => setFormData({...formData, is_consumable: e.target.checked})} className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500"/>
                                <label htmlFor="is_consumable" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer select-none">عهدة مستهلكة (استخدام مرة واحدة)</label>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={() => mode === 'assign' ? handleAssignClick() : handleSaveClick()} disabled={isProcessing} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 active:scale-95">
                        {isProcessing ? <RefreshCw className="animate-spin" size={20}/> : <><Save size={20}/> حفظ</>}
                    </button>
                    <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-3.5 rounded-xl font-bold transition-all active:scale-95">
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    )
};

const ReturnModal: React.FC<any> = ({ isOpen, onClose, log, item, onConfirm, isProcessing }) => {
    const outstandingQty = (log.quantity_checked_out || 1) - ((log.quantity_returned || 0) + (log.quantity_damaged || 0));
    const [returned, setReturned] = useState(outstandingQty);
    const [damaged, setDamaged] = useState(0);
    const [maintenance, setMaintenance] = useState(0);

    const handleConfirm = () => {
        if(returned + damaged + maintenance > outstandingQty) {
            alert('إجمالي الكميات المدخلة أكبر من المتبقي!');
            return;
        }
        onConfirm({ returned, damaged, maintenance });
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white/20 dark:border-gray-700 animate-in zoom-in-95 duration-300">
                <h3 className="text-2xl font-black mb-2 text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl text-yellow-600 dark:text-yellow-400">
                        <PackageOpen size={24}/>
                    </div>
                    تسجيل استلام
                </h3>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-6 mr-14">
                    العهدة: <span className="text-gray-800 dark:text-gray-200">{log.item_name}</span> <br/>
                    المتبقي مع <span className="text-gray-800 dark:text-gray-200">{log.person_name}</span>: <span className="text-orange-600 font-black text-lg">{outstandingQty}</span>
                </p>
                
                <div className="space-y-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                    {item?.is_consumable ? (
                         <div>
                             <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">الكمية المستهلكة</label>
                             <input type="number" value={damaged} onChange={e => setDamaged(parseInt(e.target.value))} min="0" max={outstandingQty} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3 rounded-xl font-bold text-center text-lg outline-none focus:border-yellow-500 transition-colors"/>
                         </div>
                    ) : (
                        <>
                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">كمية سليمة (ستعود للمخزن)</label>
                            <input type="number" value={returned} onChange={e => setReturned(parseInt(e.target.value))} min="0" max={outstandingQty} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3 rounded-xl font-bold text-center text-lg outline-none focus:border-green-500 transition-colors"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">كمية تالفة / مفقودة (سيتم شطبها)</label>
                            <input type="number" value={damaged} onChange={e => setDamaged(parseInt(e.target.value))} min="0" max={outstandingQty} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3 rounded-xl font-bold text-center text-lg outline-none focus:border-red-500 transition-colors"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">كمية تحتاج صيانة</label>
                            <input type="number" value={maintenance} onChange={e => setMaintenance(parseInt(e.target.value))} min="0" max={outstandingQty} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3 rounded-xl font-bold text-center text-lg outline-none focus:border-indigo-500 transition-colors"/>
                        </div>
                        </>
                    )}
                </div>
                
                <div className="flex gap-3 mt-6">
                    <button onClick={handleConfirm} disabled={isProcessing} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 active:scale-95">
                        {isProcessing ? <RefreshCw className="animate-spin" size={20}/> : 'تأكيد الاستلام'}
                    </button>
                    <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-3.5 rounded-xl font-bold transition-all active:scale-95">
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    )
};

const RepairModal: React.FC<any> = ({isOpen, onClose, item, onConfirm, isProcessing}) => {
    const [repairedQty, setRepairedQty] = useState(item?.quantity_in_maintenance || 1);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-white/20 dark:border-gray-700 animate-in zoom-in-95 duration-300">
                <h3 className="text-2xl font-black mb-2 text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <Wrench size={24}/>
                    </div>
                    تسجيل إصلاح
                </h3>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-6 mr-14">
                    العهدة: <span className="text-gray-800 dark:text-gray-200">{item.name}</span> <br/>
                    في الصيانة: <span className="text-indigo-600 font-black text-lg">{item.quantity_in_maintenance}</span>
                </p>
                
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 mb-6">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">الكمية التي تم إصلاحها</label>
                    <input type="number" min="1" max={item.quantity_in_maintenance} value={repairedQty} onChange={e => setRepairedQty(parseInt(e.target.value))} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3 rounded-xl font-bold text-center text-lg outline-none focus:border-indigo-500 transition-colors"/>
                </div>

                <div className="flex gap-3">
                    <button onClick={() => onConfirm(repairedQty)} disabled={isProcessing} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-95">
                        {isProcessing ? <RefreshCw className="animate-spin" size={20}/> : 'تأكيد'}
                    </button>
                    <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-3.5 rounded-xl font-bold transition-all active:scale-95">
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    )
}

const InventoryReports: React.FC<{logs: any[], items: InventoryItem[]}> = ({ logs, items }) => {
    const [filters, setFilters] = useState({ startDate: '', endDate: '', itemId: 'all' });
    const filteredLogs = useMemo(() => logs.filter(log => {
        const checkoutDate = new Date(log.checked_out_at);
        if (filters.startDate && checkoutDate < new Date(filters.startDate)) return false;
        if (filters.endDate && checkoutDate > new Date(filters.endDate)) return false;
        if (filters.itemId !== 'all' && log.item_id !== filters.itemId) return false;
        return true;
    }), [logs, filters]);
    const exportToExcel = () => {
        const dataToExport = filteredLogs.map(log => ({'العهدة': log.item_name,'المستلم': log.person_name, 'القائد المسلِّم': log.issuer_name, 'الكمية': log.quantity_checked_out || 1,'تاريخ التسليم': new Date(log.checked_out_at).toLocaleString(),'تاريخ الاستلام': log.fully_checked_in_at ? new Date(log.fully_checked_in_at).toLocaleString() : 'لم تستلم بالكامل','ملاحظات': log.notes || ''}));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Inventory Report"); XLSX.writeFile(wb, "inventory_report.xlsx");
    };
    return (
        <div className="glass-panel p-6 rounded-3xl border border-white/20 dark:border-gray-700 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h3 className="font-black text-xl flex items-center gap-3 text-gray-800 dark:text-white">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                        <BarChart3 size={24}/>
                    </div>
                    سجل الحركة والتقارير
                </h3>
                <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 text-sm font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-green-500/20 active:scale-95">
                    <FileSpreadsheet size={18}/> تصدير إلى Excel
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 mb-6">
                <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">من تاريخ</label>
                    <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-2.5 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">إلى تاريخ</label>
                    <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-2.5 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">العهدة</label>
                    <select value={filters.itemId} onChange={e => setFilters({...filters, itemId: e.target.value})} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-2.5 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-colors">
                        <option value="all">كل العهد</option>
                        {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto custom-scrollbar rounded-xl border border-gray-100 dark:border-gray-700">
                <table className="w-full text-sm text-right">
                    <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10">
                        <tr>
                            <th className="p-3 text-gray-600 dark:text-gray-300 font-bold">العهدة</th>
                            <th className="p-3 text-gray-600 dark:text-gray-300 font-bold">المستلم</th>
                            <th className="p-3 text-gray-600 dark:text-gray-300 font-bold">القائد المسلِّم</th>
                            <th className="p-3 text-gray-600 dark:text-gray-300 font-bold text-center">الكمية</th>
                            <th className="p-3 text-gray-600 dark:text-gray-300 font-bold">تاريخ التسليم</th>
                            <th className="p-3 text-gray-600 dark:text-gray-300 font-bold">تاريخ الاستلام</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900/30">
                        {filteredLogs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{log.item_name}</td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{log.person_name}</td>
                                <td className="p-3 text-gray-500 dark:text-gray-400 text-xs">{log.issuer_name}</td>
                                <td className="p-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">{log.quantity_checked_out || 1}</td>
                                <td className="p-3 font-mono text-xs text-gray-600 dark:text-gray-400">{new Date(log.checked_out_at).toLocaleDateString()}</td>
                                <td className="p-3">
                                    {log.fully_checked_in_at ? 
                                        <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                                            <CheckCircle size={12}/> مستلمة بالكامل
                                        </span> 
                                        : 
                                        <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                                            <Clock size={12}/> قيد التسليم
                                        </span>
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredLogs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <FileSpreadsheet size={48} className="mb-4 opacity-20"/>
                        <p className="text-sm font-medium">لا توجد سجلات تطابق الفلتر.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const CustodiansManagement: React.FC<any> = ({ currentUser, users, units, custodianships, onRefresh, showMessage }) => {
    const [newUser, setNewUser] = useState<{ [key: string]: string }>({});
    const [deleteCustodianModal, setDeleteCustodianModal] = useState<{ show: boolean; user: User | null; unitId: string | null; }>({ show: false, user: null, unitId: null });
    const [isDeletingCustodian, setIsDeletingCustodian] = useState(false);

    if (currentUser.role !== 'group_leader' && currentUser.role !== 'priest') {
        return (
            <div className="glass-panel p-10 rounded-3xl border border-white/20 dark:border-gray-700 mt-8 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <Info size={32}/>
                </div>
                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">صلاحيات محدودة</h3>
                <p className="text-gray-500 dark:text-gray-400">هذا القسم متاح لقائد المجموعة فقط لإدارة مسؤولي العهد.</p>
            </div>
        );
    }

    const handleAdd = async (unitId: string | null) => {
        const userId = newUser[unitId || 'general'];
        if (!userId) return;
        try {
            // Step 1: Grant permission
            const { data: user, error: userError } = await supabase.from('users').select('custom_permissions').eq('id', userId).single();
            if (userError) throw userError;
            
            const currentPerms = user?.custom_permissions || [];
            if (!currentPerms.includes(PERMISSIONS.MANAGE_INVENTORY)) {
                const newPerms = [...currentPerms, PERMISSIONS.MANAGE_INVENTORY];
                const { error: updateError } = await supabase.from('users').update({ custom_permissions: newPerms }).eq('id', userId);
                if (updateError) throw updateError;
            }

            // Step 2: Add to custodianship table
            const { error } = await supabase.from('inventory_custodianship').insert({ user_id: userId, unit_id: unitId });
            if (error && error.code === '23505') { 
                showMessage('info', 'هذا المستخدم مسؤول بالفعل.');
                return;
            };
            if (error) throw error;
            
            onRefresh();
            showMessage('success', 'تم إضافة المسؤول ومنحه الصلاحية بنجاح');
            setNewUser(prev => ({...prev, [unitId || 'general']: ''}));
        } catch (e: any) { 
            showMessage('error', 'فشل إضافة المسؤول: ' + e.message); 
        }
    };
    
    const promptRemove = (user: User, unitId: string | null) => {
        setDeleteCustodianModal({ show: true, user, unitId });
    };

    const executeRemove = async () => {
        const { user: userToRemove, unitId } = deleteCustodianModal;
        if (!userToRemove) return;

        setIsDeletingCustodian(true);
        try {
            // Step 1: Conditionally revoke permission
            const hasPermissionByRole = ['group_leader', 'unit_leader', 'scout_leader'].includes(userToRemove.role);
            
            if (!hasPermissionByRole) {
                const { data: user, error: userError } = await supabase.from('users').select('custom_permissions').eq('id', userToRemove.id).single();
                if (userError) throw userError;

                const currentPerms = user?.custom_permissions || [];
                if (currentPerms.includes(PERMISSIONS.MANAGE_INVENTORY)) {
                    const newPerms = currentPerms.filter(p => p !== PERMISSIONS.MANAGE_INVENTORY);
                    const { error: updateError } = await supabase.from('users').update({ custom_permissions: newPerms }).eq('id', userToRemove.id);
                    if (updateError) throw updateError;
                }
            }

            // Step 2: Remove from custodianship table
            let query = supabase.from('inventory_custodianship').delete().eq('user_id', userToRemove.id);
            if (unitId === null) {
                query = query.is('unit_id', null);
            } else {
                query = query.eq('unit_id', unitId);
            }
            const { error } = await query;
            if (error) throw error;

            onRefresh();
            showMessage('success', 'تمت إزالة المسؤول وسحب الصلاحية المخصصة');
        } catch (e: any) {
            showMessage('error', 'فشل إزالة المسؤول: ' + e.message);
        } finally {
            setDeleteCustodianModal({ show: false, user: null, unitId: null });
            setIsDeletingCustodian(false);
        }
    };

    const generalCustodians = custodianships.filter((c:any) => c.unit_id === null).map((c:any) => users.find(u => u.id === c.user_id)).filter(Boolean);
    const availableGeneralUsers = users.filter(u => !generalCustodians.some(gc => gc.id === u.id));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-8">
            <div className="glass-panel p-6 rounded-3xl border border-white/20 dark:border-gray-700 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-orange-500"></div>
                <h3 className="font-black text-xl mb-6 flex items-center gap-3 text-gray-900 dark:text-white">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl text-yellow-600 dark:text-yellow-400">
                        <Shield size={24}/>
                    </div>
                    المسؤولون العامون (على كل العهد)
                </h3>
                
                <div className="flex gap-3 mb-6 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                    {currentUser.role !== 'priest' && (
                        <>
                            <select 
                                value={newUser['general'] || ''}
                                onChange={e => setNewUser(p => ({...p, general: e.target.value}))} 
                                className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3 rounded-xl font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                            >
                                <option value="">اختر مسؤول جديد لإضافته...</option>
                                {availableGeneralUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                            <button onClick={() => handleAdd(null)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-yellow-500/20 active:scale-95 flex items-center gap-2">
                                <Plus size={20}/> إضافة
                            </button>
                        </>
                    )}
                    {currentUser.role === 'priest' && <p className="text-gray-500 w-full text-center">للعرض فقط</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {generalCustodians.map(u => (
                        <div key={u.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center text-yellow-600 dark:text-yellow-400 font-bold">
                                    {u.name.charAt(0)}
                                </div>
                                <span className="font-bold text-gray-800 dark:text-gray-200">{u.name}</span>
                            </div>
                            {currentUser.role !== 'priest' && (
                                <button onClick={() => promptRemove(u, null)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                    <Trash2 size={18}/>
                                </button>
                            )}
                        </div>
                    ))}
                    {generalCustodians.length === 0 && (
                        <p className="col-span-2 text-center text-gray-400 py-4 text-sm font-medium">لا يوجد مسؤولون عامون حالياً.</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {units.map(unit => {
                    const unitCustodians = custodianships.filter((c:any) => c.unit_id === unit.id).map((c:any) => users.find(u => u.id === c.user_id)).filter(Boolean);
                    const availableUnitUsers = users.filter(u => !unitCustodians.some(uc => uc.id === u.id));
                    return (
                        <div key={unit.id} className="glass-panel p-6 rounded-3xl border border-white/20 dark:border-gray-700 hover:border-indigo-500/30 transition-all duration-300">
                             <h3 className="font-black text-lg mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                                <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                                {unit.name}
                             </h3>
                             
                             <div className="flex gap-2 mb-4">
                                {currentUser.role !== 'priest' ? (
                                    <>
                                        <select 
                                            value={newUser[unit.id] || ''}
                                            onChange={e => setNewUser(p => ({...p, [unit.id]: e.target.value}))} 
                                            className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 outline-none focus:border-indigo-500 transition-all"
                                        >
                                            <option value="">اختر مسؤول...</option>
                                            {availableUnitUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select>
                                        <button onClick={() => handleAdd(unit.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
                                            <Plus size={18}/>
                                        </button>
                                    </>
                                ) : (
                                    <p className="text-gray-500 text-sm w-full text-center py-2">للعرض فقط</p>
                                )}
                             </div>

                             <div className="space-y-2">
                                {unitCustodians.map(u => (
                                    <div key={u.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 group">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                                                {u.name.charAt(0)}
                                            </div>
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{u.name}</span>
                                        </div>
                                        {currentUser.role !== 'priest' && (
                                            <button onClick={() => promptRemove(u, unit.id)} className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 size={16}/>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {unitCustodians.length === 0 && (
                                    <p className="text-center text-gray-400 py-2 text-xs">لا يوجد مسؤولون لهذه الشعبة.</p>
                                )}
                             </div>
                        </div>
                    )
                })}
            </div>
            
            <ConfirmModal
                isOpen={deleteCustodianModal.show}
                onClose={() => setDeleteCustodianModal({ show: false, user: null, unitId: null })}
                onConfirm={executeRemove}
                title="تأكيد سحب الصلاحية"
                message={
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                            <Shield size={32}/>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-2">هل أنت متأكد من إزالة <b>{deleteCustodianModal.user?.name}</b> من مسؤولية العهدة؟</p>
                        <p className="text-xs text-gray-500">سيتم سحب صلاحية إدارة المخزون إذا لم يكن لديه أدوار قيادية أخرى.</p>
                    </div>
                }
                isProcessing={isDeletingCustodian}
                confirmText="نعم، إزالة وسحب الصلاحية"
            />
        </div>
    );
};