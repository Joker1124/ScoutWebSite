
import React, { useState, useEffect } from 'react';
import { Badge, User, Unit } from '../../../types';
import { Award, X, Trash2, Save, RefreshCw } from 'lucide-react';

interface BadgeModalProps {
    mode: 'create' | 'edit';
    badge: Badge | null;
    onClose: () => void;
    onSave: (data: { title: string; description: string; requirements: string[], unitId: string | null }) => Promise<void>;
    isProcessing: boolean;
    currentUser: User;
    units: Unit[];
    selectedUnitId: string | null;
}

export const BadgeModal: React.FC<BadgeModalProps> = ({ mode, badge, onClose, onSave, isProcessing, currentUser, units, selectedUnitId }) => {
    const [badgeData, setBadgeData] = useState({
        title: '',
        description: '',
        requirements: [''],
        unitId: selectedUnitId,
    });

    useEffect(() => {
        if (mode === 'edit' && badge) {
            setBadgeData({
                title: badge.title,
                description: badge.description,
                requirements: badge.requirements && badge.requirements.length > 0 ? badge.requirements : [''],
                unitId: badge.unit_id || null,
            });
        } else {
            setBadgeData({ 
                title: '', 
                description: '', 
                requirements: [''],
                unitId: selectedUnitId,
            });
        }
    }, [mode, badge, selectedUnitId]);

    const handleSaveClick = () => {
        onSave(badgeData);
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="glass-panel w-full max-w-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white/50 dark:bg-gray-800/50 backdrop-blur-md sticky top-0 z-10">
                    <h3 className="text-xl font-black dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl text-yellow-600 dark:text-yellow-400">
                            <Award size={24}/>
                        </div>
                        {mode === 'create' ? 'تعريف شارة جديدة' : 'تعديل بيانات الشارة'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:text-gray-400 rounded-xl transition-colors">
                        <X size={24}/>
                    </button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                    {currentUser.role === 'group_leader' && (
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400">الشعبة المسؤولة</label>
                            <select 
                                className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white p-4 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-bold appearance-none"
                                value={badgeData.unitId || ''}
                                onChange={e => setBadgeData({...badgeData, unitId: e.target.value || null})}
                            >
                                <option value="">شارة عامة (لكل الشعب)</option>
                                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">اسم الشارة</label>
                        <input 
                            className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white p-4 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-bold placeholder:text-gray-400" 
                            placeholder="مثلاً: هاوي حياة الخلاء" 
                            value={badgeData.title} 
                            onChange={e => setBadgeData({...badgeData, title: e.target.value})} 
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">الوصف العام</label>
                        <textarea 
                            className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white p-4 rounded-xl h-32 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium leading-relaxed resize-none placeholder:text-gray-400" 
                            placeholder="اكتب وصفاً مفصلاً للمهارات المطلوبة..." 
                            value={badgeData.description} 
                            onChange={e => setBadgeData({...badgeData, description: e.target.value})} 
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400">بنود الاختبار</label>
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-bold">{badgeData.requirements.length} بنود</span>
                        </div>
                        <div className="space-y-3">
                            {badgeData.requirements.map((req, i) => (
                                <div key={i} className="flex gap-3 group animate-in slide-in-from-right-2 duration-300">
                                    <div className="flex-1 relative">
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-300 pointer-events-none">#{i+1}</span>
                                        <input 
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white p-3 pr-10 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-all" 
                                            placeholder={`اكتب تفاصيل البند رقم ${i+1}`} 
                                            value={req} 
                                            onChange={e => {
                                                const updated = [...badgeData.requirements];
                                                updated[i] = e.target.value;
                                                setBadgeData({...badgeData, requirements: updated});
                                            }} 
                                        />
                                    </div>
                                    <button 
                                        onClick={() => setBadgeData({...badgeData, requirements: badgeData.requirements.filter((_, idx) => idx !== i)})} 
                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-3 rounded-xl transition-all"
                                        title="حذف البند"
                                    >
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button 
                            onClick={() => setBadgeData({...badgeData, requirements: [...badgeData.requirements, '']})} 
                            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm font-bold hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="text-lg leading-none">+</span> إضافة بند جديد
                        </button>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-md flex gap-4">
                    <button 
                        onClick={handleSaveClick} 
                        disabled={isProcessing} 
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? <RefreshCw className="animate-spin" size={20}/> : <Save size={20}/>}
                        {mode === 'create' ? 'حفظ الشارة' : 'حفظ التغييرات'}
                    </button>
                    <button 
                        onClick={onClose} 
                        className="flex-1 bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-3.5 rounded-xl font-bold border border-gray-200 dark:border-gray-700 transition-all active:scale-95"
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
};
