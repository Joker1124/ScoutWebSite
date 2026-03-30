import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { User, Unit, Fund, Transaction, ExternalSupply, PERMISSIONS, hasPermission } from '../../types';
import { DollarSign, Plus, Minus, FileText, User as UserIcon, Settings, Wallet, ArrowUpRight, ArrowDownLeft, Calendar, Search, ExternalLink, Edit2, Trash2, RefreshCw, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getTable, setTable, writeInsert, writeUpdate, writeDelete } from '../../src/offline';
import { ConfirmModal } from '../shared/ConfirmModal';

interface FinanceViewProps {
    currentUser: User;
    users: User[];
    units: Unit[];
    selectedUnitId: string | null;
    showMessage: (type: 'success' | 'error', text: string) => void;
    syncedFunds?: Fund[];
    syncedTransactions?: Transaction[];
    syncedExternalSupplies?: ExternalSupply[];
}

export const FinanceView: React.FC<FinanceViewProps> = ({ 
    currentUser, users, units, selectedUnitId, showMessage,
    syncedFunds, syncedTransactions, syncedExternalSupplies
}) => {
    const [activeTab, setActiveTab] = useState<'funds' | 'external_supplies'>('funds');
    const [funds, setFunds] = useState<Fund[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [externalSupplies, setExternalSupplies] = useState<ExternalSupply[]>([]);
    const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
    
    // Modals
    const [transactionModal, setTransactionModal] = useState<{ isOpen: boolean, mode: 'add' | 'edit', data: Transaction | null }>({ isOpen: false, mode: 'add', data: null });
    const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
    const [isFundSettingsModalOpen, setIsFundSettingsModalOpen] = useState(false);
    const [deleteTransactionModal, setDeleteTransactionModal] = useState<{ isOpen: boolean, data: Transaction | null }>({ isOpen: false, data: null });

    useEffect(() => {
        const initData = async () => {
            const localFunds = await getTable('funds');
            const localTransactions = await getTable('transactions');
            const localSupplies = await getTable('external_supplies');
            if (localFunds) setFunds(localFunds);
            if (localTransactions) setTransactions(localTransactions);
            if (localSupplies) setExternalSupplies(localSupplies);
        };
        initData();
    }, []);

    useEffect(() => {
        if (syncedFunds) {
            setFunds(syncedFunds);
            setTable('funds', syncedFunds);
            if (!selectedFund && syncedFunds.length > 0) {
                setSelectedFund(syncedFunds[0]);
            } else if (selectedFund) {
                const updated = syncedFunds.find(f => f.id === selectedFund.id);
                if (updated) setSelectedFund(updated);
            }
        }
        if (syncedTransactions) {
            setTable('transactions', syncedTransactions);
            if (selectedFund) {
                setTransactions(syncedTransactions.filter(t => t.fund_id === selectedFund.id));
            } else {
                setTransactions(syncedTransactions);
            }
        }
        if (syncedExternalSupplies) {
            setExternalSupplies(syncedExternalSupplies);
            setTable('external_supplies', syncedExternalSupplies);
        }
    }, [syncedFunds, syncedTransactions, syncedExternalSupplies, selectedFund]);

    const fetchData = async () => {
        // Data is now handled by useRealtimeSync in Dashboard
    };

    // Transactions are now handled by the main useEffect using syncedTransactions


    const handleSaveTransaction = async (data: Partial<Transaction>) => {
        if (!selectedFund) return;
        try {
            let newBalance = selectedFund.balance || 0;

            if (transactionModal.mode === 'add') {
                const newTransaction = {
                    id: crypto.randomUUID(),
                    ...data,
                    fund_id: selectedFund.id,
                    created_by: currentUser.id,
                    date: new Date().toISOString()
                };
                await writeInsert('transactions', newTransaction);

                // Update Fund Balance
                newBalance += data.type === 'income' ? (data.amount || 0) : -(data.amount || 0);

            } else if (transactionModal.mode === 'edit' && transactionModal.data) {
                const oldTransaction = transactionModal.data;
                const updatedTransaction = {
                    ...oldTransaction,
                    ...data
                };
                await writeUpdate('transactions', updatedTransaction, { id: oldTransaction.id });

                // Revert old effect
                newBalance -= oldTransaction.type === 'income' ? oldTransaction.amount : -oldTransaction.amount;
                // Apply new effect
                newBalance += data.type === 'income' ? (data.amount || 0) : -(data.amount || 0);
            }

            await writeUpdate('funds', { balance: newBalance }, { id: selectedFund.id });

            showMessage('success', transactionModal.mode === 'add' ? 'تمت الإضافة بنجاح' : 'تم التعديل بنجاح');
            setTransactionModal({ isOpen: false, mode: 'add', data: null });
        } catch (e: any) {
            showMessage('error', 'فشل العملية: ' + e.message);
        }
    };

    const handleDeleteTransaction = async () => {
        const transaction = deleteTransactionModal.data;
        if (!transaction || !selectedFund) return;

        try {
            await writeDelete('transactions', { id: transaction.id });

            // Revert balance
            // If it was income (+), we subtract. If expense (-), we add.
            const balanceCorrection = transaction.type === 'income' ? -transaction.amount : transaction.amount;
            const newBalance = (selectedFund.balance || 0) + balanceCorrection;

            await writeUpdate('funds', { balance: newBalance }, { id: selectedFund.id });

            showMessage('success', 'تم الحذف بنجاح');
            setDeleteTransactionModal({ isOpen: false, data: null });
        } catch (e: any) {
            showMessage('error', 'فشل الحذف: ' + e.message);
        }
    };

    const handleAddSupply = async (data: Partial<ExternalSupply>) => {
        try {
            // 1. Insert Supply Record
            const newSupply = {
                id: crypto.randomUUID(),
                ...data,
                created_by: currentUser.id,
                unit_id: selectedUnitId,
                received_date: new Date().toISOString()
            };
            await writeInsert('external_supplies', newSupply);

            // 2. Add as Income to the selected Fund
            if (data.fund_id && data.amount) {
                const fund = funds.find(f => f.id === data.fund_id);
                if (fund) {
                    const newTransaction = {
                        id: crypto.randomUUID(),
                        fund_id: fund.id,
                        amount: data.amount,
                        type: 'income',
                        category: 'إمدادات خارجية',
                        description: `إمداد خارجي من: ${data.source} - المستلم: ${users.find(u => u.id === data.recipient_id)?.name}`,
                        created_by: currentUser.id,
                        date: new Date().toISOString()
                    };
                    await writeInsert('transactions', newTransaction);
                    
                    // Update Fund Balance
                    const newBalance = (fund.balance || 0) + (data.amount || 0);
                    await writeUpdate('funds', { balance: newBalance }, { id: fund.id });
                }
            }

            showMessage('success', 'تم تسجيل الإمداد الخارجي');
            setIsSupplyModalOpen(false);
        } catch (e: any) {
            showMessage('error', 'فشل العملية: ' + e.message);
        }
    };

    const [resetModal, setResetModal] = useState({ isOpen: false, fundId: '' });

    const handleResetFund = async () => {
        const fundId = resetModal.fundId;
        if (!fundId) return;
        
        try {
            // Delete all transactions for this fund
            await writeDelete('transactions', { fund_id: fundId });
            // Reset balance to 0
            await writeUpdate('funds', { balance: 0 }, { id: fundId });
            
            showMessage('success', 'تم تصفير الصندوق بنجاح');
            setResetModal({ isOpen: false, fundId: '' });
            setIsFundSettingsModalOpen(false);
        } catch (e: any) {
            showMessage('error', 'فشل تصفير الصندوق: ' + e.message);
        }
    };

    const handleUpdateFundManager = async (fundId: string, managerId: string | null) => {
        try {
            await writeUpdate('funds', { manager_id: managerId }, { id: fundId });
            showMessage('success', 'تم تحديث مسؤول الصندوق');
        } catch (e: any) {
            showMessage('error', 'فشل التحديث: ' + e.message);
        }
    };

    const exportTransactions = () => {
        const ws = XLSX.utils.json_to_sheet(transactions.map(t => ({
            'التاريخ': new Date(t.date).toLocaleDateString('ar-EG'),
            'النوع': t.type === 'income' ? 'إيراد' : 'مصروف',
            'المبلغ': t.amount,
            'البند': t.category,
            'الوصف': t.description,
            'بواسطة': users.find(u => u.id === t.created_by)?.name || 'غير معروف'
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Transactions");
        XLSX.writeFile(wb, `transactions_${selectedFund?.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const canManageFund = (fund: Fund) => {
        if (currentUser.role === 'priest') return false;
        return hasPermission(currentUser, PERMISSIONS.MANAGE_FINANCE) || fund.manager_id === currentUser.id;
    };

    return (
        <div className="space-y-6">
            {/* Header Tabs */}
            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                <button 
                    onClick={() => setActiveTab('funds')}
                    className={`pb-2 px-4 font-bold transition-all duration-300 flex items-center gap-2 ${activeTab === 'funds' ? 'text-blue-600 border-b-2 border-blue-600 scale-105' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                    <Wallet className="w-4 h-4"/>
                    الخزنة
                </button>
                <button 
                    onClick={() => setActiveTab('external_supplies')}
                    className={`pb-2 px-4 font-bold transition-all duration-300 flex items-center gap-2 ${activeTab === 'external_supplies' ? 'text-blue-600 border-b-2 border-blue-600 scale-105' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                    <ExternalLink className="w-4 h-4"/>
                    الإمدادات الخارجية
                </button>
            </div>

            {activeTab === 'funds' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Sidebar: Funds List */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                <Wallet className="text-blue-600" size={20}/>
                                الصناديق
                            </h3>
                            {hasPermission(currentUser, PERMISSIONS.MANAGE_FINANCE) && (
                                <button onClick={() => setIsFundSettingsModalOpen(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors" title="إعدادات الصناديق">
                                    <Settings size={18} />
                                </button>
                            )}
                        </div>
                        <div className="space-y-3">
                            {funds.map(fund => (
                                <div 
                                    key={fund.id}
                                    onClick={() => setSelectedFund(fund)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${selectedFund?.id === fund.id ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700 shadow-md scale-[1.02]' : 'glass-panel hover:shadow-md hover:scale-[1.01]'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${fund.type === 'general' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'}`}>
                                            {fund.type === 'general' ? 'عام' : 'شعبة'}
                                        </span>
                                        {fund.manager_id && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                                                <UserIcon size={12}/>
                                                {users.find(u => u.id === fund.manager_id)?.name || 'غير معروف'}
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="font-bold text-gray-800 dark:text-gray-200">{fund.name}</h4>
                                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2 flex items-baseline gap-1">
                                        {fund.balance.toLocaleString()} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">ج.م</span>
                                    </p>
                                </div>
                            ))}
                            {funds.length === 0 && (
                                <div className="text-center p-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed dark:border-gray-700">
                                    لا توجد صناديق متاحة
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main: Transactions */}
                    <div className="lg:col-span-2 space-y-4">
                        {selectedFund ? (
                            <div className="animate-in fade-in duration-500">
                                <div className="flex justify-between items-center glass-panel p-4 mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                            {selectedFund.name}
                                            <span className="text-xs font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">سجل المعاملات</span>
                                        </h3>
                                    </div>
                                    <div className="flex gap-2">
                                        {hasPermission(currentUser, PERMISSIONS.MANAGE_FINANCE) && (
                                            <button 
                                                onClick={() => setResetModal({ isOpen: true, fundId: selectedFund.id })} 
                                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800 transition-colors" 
                                                title="تصفير الصندوق ومسح السجلات"
                                            >
                                                <RefreshCw size={18}/>
                                            </button>
                                        )}
                                        <button onClick={exportTransactions} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border dark:border-gray-600 transition-colors" title="تصدير إلى Excel">
                                            <FileText size={18}/>
                                        </button>
                                        {canManageFund(selectedFund) && (
                                            <button 
                                                onClick={() => setTransactionModal({ isOpen: true, mode: 'add', data: null })}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:scale-105"
                                            >
                                                <Plus size={18}/> إضافة معاملة
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="glass-panel overflow-hidden">
                                    <table className="w-full text-sm text-right">
                                        <thead className="bg-gray-50/50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 backdrop-blur-sm sticky top-0 z-10">
                                            <tr>
                                                <th className="p-4 font-bold">التاريخ</th>
                                                <th className="p-4 font-bold">النوع</th>
                                                <th className="p-4 font-bold">البند</th>
                                                <th className="p-4 font-bold">المبلغ</th>
                                                <th className="p-4 font-bold">بواسطة</th>
                                                <th className="p-4 font-bold">إجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y dark:divide-gray-700/50 text-gray-800 dark:text-gray-200">
                                            {transactions.map(t => (
                                                <tr key={t.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors group">
                                                    <td className="p-4 font-medium">{new Date(t.date).toLocaleDateString('ar-EG')}</td>
                                                    <td className="p-4">
                                                        <span className={`flex items-center gap-1.5 font-bold px-2 py-1 rounded-full w-fit text-xs ${t.type === 'income' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                            {t.type === 'income' ? <ArrowDownLeft size={14}/> : <ArrowUpRight size={14}/>}
                                                            {t.type === 'income' ? 'إيراد' : 'مصروف'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-bold">{t.category}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.description}</div>
                                                    </td>
                                                    <td className="p-4 font-bold text-base">
                                                        {t.amount.toLocaleString()} <span className="text-xs font-normal text-gray-500">ج.م</span>
                                                    </td>
                                                    <td className="p-4 text-gray-500 dark:text-gray-400">
                                                        <div className="flex items-center gap-1">
                                                            <UserIcon size={14} className="opacity-50"/>
                                                            {users.find(u => u.id === t.created_by)?.name || 'غير معروف'}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        {canManageFund(selectedFund) && (
                                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
                                                                <button 
                                                                    onClick={() => setTransactionModal({ isOpen: true, mode: 'edit', data: t })}
                                                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                                    title="تعديل"
                                                                >
                                                                    <Edit2 size={16}/>
                                                                </button>
                                                                <button 
                                                                    onClick={() => setDeleteTransactionModal({ isOpen: true, data: t })}
                                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                                    title="حذف"
                                                                >
                                                                    <Trash2 size={16}/>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {transactions.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center w-full">
                                                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                                            <FileText size={32} className="opacity-50"/>
                                                        </div>
                                                        <p>لا توجد معاملات مسجلة في هذا الصندوق</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/30 rounded-xl border-2 border-dashed dark:border-gray-700 p-12 animate-in fade-in">
                                <Wallet size={48} className="mb-4 opacity-20"/>
                                <p className="text-lg font-medium">اختر صندوقاً لعرض التفاصيل</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'external_supplies' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                            <ExternalLink className="text-blue-600" size={20}/>
                            سجل الإمدادات الخارجية
                        </h3>
                        {hasPermission(currentUser, PERMISSIONS.MANAGE_FINANCE) && currentUser.role !== 'priest' && (
                            <button 
                                onClick={() => setIsSupplyModalOpen(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:scale-105"
                            >
                                <Plus size={18}/> تسجيل إمداد جديد
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {externalSupplies.map(item => (
                            <div key={item.id} className="glass-panel p-5 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <h4 className="font-bold text-2xl text-blue-600 dark:text-blue-400">{item.amount.toLocaleString()} <span className="text-sm text-gray-500">ج.م</span></h4>
                                    <span className="bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                        <Calendar size={12}/>
                                        {new Date(item.received_date).toLocaleDateString('ar-EG')}
                                    </span>
                                </div>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                        <span className="text-gray-500 dark:text-gray-400">المصدر</span>
                                        <span className="font-bold dark:text-white">{item.source}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                        <span className="text-gray-500 dark:text-gray-400">المستلم</span>
                                        <span className="font-bold dark:text-white flex items-center gap-1">
                                            <UserIcon size={12}/>
                                            {users.find(u => u.id === item.recipient_id)?.name}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                        <span className="text-gray-500 dark:text-gray-400">الصندوق</span>
                                        <span className="font-bold dark:text-white">{funds.find(f => f.id === item.fund_id)?.name}</span>
                                    </div>
                                </div>
                                {item.notes && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 pt-3 border-t dark:border-gray-700/50 italic">
                                        "{item.notes}"
                                    </p>
                                )}
                            </div>
                        ))}
                        {externalSupplies.length === 0 && (
                            <div className="col-span-full text-center p-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/30 rounded-xl border-2 border-dashed dark:border-gray-700 flex flex-col items-center">
                                <ExternalLink size={48} className="mb-4 opacity-20"/>
                                <p>لا توجد إمدادات خارجية مسجلة</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Transaction Modal */}
            {transactionModal.isOpen && selectedFund && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border dark:border-gray-700 animate-in zoom-in-95">
                        <h3 className="font-bold text-xl mb-4 dark:text-white">
                            {transactionModal.mode === 'add' ? 'إضافة معاملة جديدة' : 'تعديل المعاملة'}
                        </h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            handleSaveTransaction({
                                amount: Number(formData.get('amount')),
                                type: formData.get('type') as 'income' | 'expense',
                                category: formData.get('category') as string,
                                description: formData.get('description') as string,
                            });
                        }} className="space-y-4">
                            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                <label className="flex-1 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="type" 
                                        value="income" 
                                        className="peer sr-only" 
                                        defaultChecked={transactionModal.mode === 'add' ? true : transactionModal.data?.type === 'income'} 
                                    />
                                    <div className="text-center py-2 rounded-md peer-checked:bg-green-500 peer-checked:text-white transition-all font-bold text-gray-600 dark:text-gray-400">إيراد</div>
                                </label>
                                <label className="flex-1 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="type" 
                                        value="expense" 
                                        className="peer sr-only" 
                                        defaultChecked={transactionModal.mode === 'edit' && transactionModal.data?.type === 'expense'}
                                    />
                                    <div className="text-center py-2 rounded-md peer-checked:bg-red-500 peer-checked:text-white transition-all font-bold text-gray-600 dark:text-gray-400">مصروف</div>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1 dark:text-gray-300">المبلغ</label>
                                <input 
                                    type="number" 
                                    name="amount" 
                                    required 
                                    min="0" 
                                    step="0.01" 
                                    defaultValue={transactionModal.data?.amount}
                                    className="w-full p-3 rounded-xl border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:border-blue-500 transition-colors" 
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1 dark:text-gray-300">البند</label>
                                <input 
                                    type="text" 
                                    name="category" 
                                    required 
                                    list="categories" 
                                    defaultValue={transactionModal.data?.category}
                                    className="w-full p-3 rounded-xl border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:border-blue-500 transition-colors" 
                                    placeholder="مثال: اشتراكات، أدوات..." 
                                />
                                <datalist id="categories">
                                    <option value="اشتراكات شهرية"/>
                                    <option value="تبرعات"/>
                                    <option value="أدوات ومعدات"/>
                                    <option value="أنشطة وحفلات"/>
                                    <option value="صيانة"/>
                                    <option value="نثريات"/>
                                </datalist>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1 dark:text-gray-300">الوصف</label>
                                <textarea 
                                    name="description" 
                                    className="w-full p-3 rounded-xl border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:border-blue-500 transition-colors" 
                                    rows={3}
                                    defaultValue={transactionModal.data?.description || ''}
                                ></textarea>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">حفظ</button>
                                <button type="button" onClick={() => setTransactionModal({ isOpen: false, mode: 'add', data: null })} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Transaction Confirmation Modal */}
            {deleteTransactionModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border dark:border-gray-700 animate-in zoom-in-95">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="font-bold text-xl text-center mb-2 dark:text-white">حذف المعاملة</h3>
                        <p className="text-center text-gray-500 dark:text-gray-400 mb-6 text-sm">
                            هل أنت متأكد من حذف هذه المعاملة؟ <br/>
                            سيتم عكس التأثير المالي على رصيد الصندوق.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={handleDeleteTransaction} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">نعم، احذف</button>
                            <button onClick={() => setDeleteTransactionModal({ isOpen: false, data: null })} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* External Supply Modal */}
            {isSupplyModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border dark:border-gray-700 animate-in zoom-in-95">
                        <h3 className="font-bold text-xl mb-4 dark:text-white">تسجيل إمداد خارجي</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            handleAddSupply({
                                amount: Number(formData.get('amount')),
                                recipient_id: formData.get('recipient_id') as string,
                                fund_id: formData.get('fund_id') as string,
                                source: formData.get('source') as string,
                                notes: formData.get('notes') as string,
                            });
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1 dark:text-gray-300">المبلغ</label>
                                <input type="number" name="amount" required min="1" className="w-full p-3 rounded-xl border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1 dark:text-gray-300">المصدر (من أين؟)</label>
                                <input type="text" name="source" required className="w-full p-3 rounded-xl border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:border-blue-500 transition-colors" placeholder="مثال: تبرع من فلان، دعم من الكنيسة..." />
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1 dark:text-gray-300">الشخص المستلم</label>
                                <select name="recipient_id" required className="w-full p-3 rounded-xl border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:border-blue-500 transition-colors">
                                    <option value="">اختر الفرد...</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1 dark:text-gray-300">الصندوق المودع فيه</label>
                                <select name="fund_id" required className="w-full p-3 rounded-xl border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:border-blue-500 transition-colors">
                                    <option value="">اختر الصندوق...</option>
                                    {funds.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1 dark:text-gray-300">ملاحظات</label>
                                <textarea name="notes" className="w-full p-3 rounded-xl border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:border-blue-500 transition-colors" rows={3}></textarea>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">تسجيل</button>
                                <button type="button" onClick={() => setIsSupplyModalOpen(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Fund Settings Modal (Assign Manager) */}
            {isFundSettingsModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-gray-200 dark:border-gray-700 transform scale-100 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black dark:text-white">إعدادات الصناديق</h3>
                            <button onClick={() => setIsFundSettingsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                            {funds.map(fund => (
                                <div key={fund.id} className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-lg dark:text-white">{fund.name}</h4>
                                        <button 
                                            onClick={() => setResetModal({ isOpen: true, fundId: fund.id })}
                                            className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                        >
                                            <Trash2 size={14} />
                                            تصفير الصندوق
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 mr-1">مسؤول الصندوق</label>
                                            <select 
                                                value={fund.manager_id || ''} 
                                                onChange={(e) => handleUpdateFundManager(fund.id, e.target.value || null)}
                                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                            >
                                                <option value="">لا يوجد مسؤول</option>
                                                {users.filter(u => u.role !== 'scout').map(u => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {resetModal.isOpen && (
                <ConfirmModal
                    isOpen={resetModal.isOpen}
                    onClose={() => setResetModal({ isOpen: false, fundId: '' })}
                    onConfirm={handleResetFund}
                    title="تصفير الصندوق"
                    message={
                        <div className="space-y-3">
                            <p>هل أنت متأكد من تصفير هذا الصندوق؟</p>
                            <p className="text-red-500 text-sm font-bold">سيتم مسح جميع سجلات العمليات المالية المرتبطة بهذا الصندوق نهائياً ولا يمكن التراجع عن هذا الإجراء.</p>
                        </div>
                    }
                    confirmText="نعم، تصفير ومسح"
                    isDanger
                />
            )}
        </div>
    );
};
