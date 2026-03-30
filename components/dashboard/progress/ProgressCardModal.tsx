
import React, { useState, useEffect } from 'react';
import { ProgressCard, ProgressCardItem, User, Unit } from '../../../types';
import { Shield, X, Trash2, Save, RefreshCw } from 'lucide-react';

interface ProgressCardModalProps {
    mode: 'create' | 'edit';
    card: ProgressCard | null;
    items: ProgressCardItem[];
    onClose: () => void;
    onSave: (data: { name: string; type: string; items: string[], unitId: string | null }) => Promise<void>;
    isProcessing: boolean;
    currentUser: User;
    units: Unit[];
    selectedUnitId: string | null;
}

export const ProgressCardModal: React.FC<ProgressCardModalProps> = ({ mode, card, items, onClose, onSave, isProcessing, currentUser, units, selectedUnitId }) => {
    const [cardData, setCardData] = useState({
        name: '',
        type: '',
        items: [''],
        unitId: selectedUnitId,
    });

    useEffect(() => {
        if (mode === 'edit' && card) {
            setCardData({
                name: card.name,
                type: card.type || '',
                items: items.length > 0 ? items.map(i => i.name) : [''],
                unitId: card.unit_id || null,
            });
        } else {
            setCardData({ 
                name: '', 
                type: '', 
                items: [''],
                unitId: selectedUnitId,
            });
        }
    }, [mode, card, items, selectedUnitId]);

    const handleSaveClick = () => {
        onSave(cardData);
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-10">
                    <h3 className="text-xl font-black dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                            <Shield size={24}/> 
                        </div>
                        {mode === 'create' ? 'إنشاء بطاقة تقدم جديدة' : 'تعديل بيانات البطاقة'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 hover:text-red-500 transition-all">
                        <X size={24}/>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {currentUser.role === 'group_leader' && (
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400">الشعبة المسؤولة</label>
                            <select 
                                className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white p-4 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-bold appearance-none"
                                value={cardData.unitId || ''}
                                onChange={e => setCardData({...cardData, unitId: e.target.value || null})}
                            >
                                <option value="">بطاقة عامة (لكل الشعب)</option>
                                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400">اسم البطاقة</label>
                            <input 
                                className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white p-4 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-bold placeholder:font-normal" 
                                placeholder="مثلاً: بطاقة القبول" 
                                value={cardData.name} 
                                onChange={e => setCardData({...cardData, name: e.target.value})} 
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400">النوع / التصنيف</label>
                            <input 
                                className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white p-4 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-bold placeholder:font-normal" 
                                placeholder="مثال: ديني، كشفي" 
                                value={cardData.type} 
                                onChange={e => setCardData({...cardData, type: e.target.value})} 
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400">بنود البطاقة</label>
                            <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg">
                                {cardData.items.length} بنود
                            </span>
                        </div>
                        
                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {cardData.items.map((item, i) => (
                                <div key={i} className="flex gap-3 group animate-in slide-in-from-right-2 duration-300">
                                    <div className="flex-1 relative">
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 select-none">{i + 1}.</span>
                                        <input 
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white p-3 pr-8 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" 
                                            placeholder={`أدخل نص البند رقم ${i+1}`} 
                                            value={item} 
                                            onChange={e => {
                                                const updated = [...cardData.items];
                                                updated[i] = e.target.value;
                                                setCardData({...cardData, items: updated});
                                            }} 
                                        />
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const newItems = cardData.items.filter((_, idx) => idx !== i);
                                            setCardData({...cardData, items: newItems});
                                        }} 
                                        className="w-10 h-10 flex items-center justify-center rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-100 dark:hover:border-red-900/30 transition-all"
                                        title="حذف البند"
                                    >
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            ))}
                        </div>
                        
                        <button 
                            onClick={() => setCardData({...cardData, items: [...cardData.items, '']})} 
                            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="text-lg leading-none">+</span> إضافة بند جديد
                        </button>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-3xl flex gap-4 sticky bottom-0 z-10">
                    <button 
                        onClick={handleSaveClick} 
                        disabled={isProcessing} 
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? <RefreshCw className="animate-spin" size={20}/> : <Save size={20}/>}
                        {mode === 'create' ? 'حفظ البطاقة' : 'حفظ التغييرات'}
                    </button>
                    <button 
                        onClick={onClose} 
                        className="flex-1 bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 py-3.5 rounded-xl font-bold transition-all active:scale-95"
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
};
