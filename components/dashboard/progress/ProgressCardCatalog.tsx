
import React, { useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { User, ProgressCard, ProgressCardItem, UserCard, ProgressCardRequest, hasPermission, PERMISSIONS, Progress, Unit } from '../../../types';
import { Shield, Clock, Plus, Trash2, PenSquare, Check, Circle, CheckCircle, UserPlus, FileSpreadsheet, Filter } from 'lucide-react';
import { BulkUploadModal } from '../../shared/BulkUploadModal';

interface ProgressCardCatalogProps {
    progressCards: ProgressCard[];
    cardItems: ProgressCardItem[];
    userCards: UserCard[];
    cardRequests: ProgressCardRequest[];
    userProgress: Progress[];
    currentUser: User;
    isLeader: boolean;
    handleOpenModal: (mode: 'create' | 'edit', card?: ProgressCard) => void;
    promptDelete: (card: ProgressCard) => void;
    onRefresh: () => void;
    handleOpenAssignmentModal?: (card: ProgressCard) => void;
    selectedUnitId: string | null;
    units: Unit[];
}

export const ProgressCardCatalog: React.FC<ProgressCardCatalogProps> = ({
    progressCards, cardItems, userCards, cardRequests, userProgress, currentUser, isLeader, handleOpenModal, promptDelete, onRefresh, handleOpenAssignmentModal, selectedUnitId, units = []
}) => {
    const canManage = hasPermission(currentUser, PERMISSIONS.MANAGE_PROGRESS_SYSTEM) && currentUser.role !== 'priest';
    const isScout = currentUser.role === 'scout';
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [filterUnit, setFilterUnit] = useState<string>('all'); // 'all', 'general', or unit_id

    const handleRequest = async (cardId: string) => {
        await supabase.from('progress_card_requests').insert({ user_id: currentUser.id, card_id: cardId, status: 'pending' });
        onRefresh();
    };

    // Filter Logic
    const filteredCards = progressCards.filter(card => {
        if (filterUnit === 'all') return true;
        if (filterUnit === 'general') return !card.unit_id;
        return card.unit_id === filterUnit;
    });

    // Calculate counts for tabs
    const getCount = (type: string) => {
        if (type === 'all') return progressCards.length;
        if (type === 'general') return progressCards.filter(c => !c.unit_id).length;
        return progressCards.filter(c => c.unit_id === type).length;
    };

    return (
        <div className="animate-in fade-in duration-500 space-y-8">
            <BulkUploadModal 
                isOpen={showBulkUpload} 
                onClose={() => setShowBulkUpload(false)} 
                type="cards" 
                units={units}
                onSuccess={() => {
                    setShowBulkUpload(false);
                    onRefresh();
                }}
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-3 text-gray-800 dark:text-white mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                            <Shield size={24}/>
                        </div>
                        {isScout ? 'بطاقاتي المتاحة' : 'دليل بطاقات التقدم'}
                    </h2>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
                        {isScout ? 'استعرض البطاقات التي يمكنك إنجازها ومتابعة تقدمك فيها' : 'إدارة شاملة لبطاقات المنهج والتقدم لجميع الأفراد، مع إمكانية التعديل والإسناد'}
                    </p>
                </div>
                {canManage && (
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        {currentUser.role === 'group_leader' && (
                            <button 
                                onClick={() => setShowBulkUpload(true)} 
                                className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-green-600/20 transition-all hover:scale-105 active:scale-95"
                            >
                                <FileSpreadsheet size={18}/> رفع Excel
                            </button>
                        )}
                        <button 
                            onClick={() => handleOpenModal('create')} 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95"
                        >
                            <Plus size={18}/> إنشاء بطاقة جديدة
                        </button>
                    </div>
                )}
            </div>

             {/* Unit Filters */}
             <div className="flex flex-wrap gap-3 mb-8 pb-2 overflow-x-auto custom-scrollbar">
                <FilterTab 
                    active={filterUnit === 'all'} 
                    onClick={() => setFilterUnit('all')} 
                    label="الكل" 
                    count={getCount('all')}
                />
                <FilterTab 
                    active={filterUnit === 'general'} 
                    onClick={() => setFilterUnit('general')} 
                    label="بطاقات عامة" 
                    count={getCount('general')}
                />
                {units.map(u => {
                    const count = getCount(u.id);
                    if (count === 0 && currentUser.role !== 'group_leader') return null;
                    return (
                        <FilterTab 
                            key={u.id}
                            active={filterUnit === u.id} 
                            onClick={() => setFilterUnit(u.id)} 
                            label={u.name} 
                            count={count}
                        />
                    );
                })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCards.map(card => {
                    const myRequest = isScout ? cardRequests.find(r => r.card_id === card.id && r.user_id === currentUser.id) : null;
                    const isAssigned = userCards.some(uc => uc.card_id === card.id && uc.user_id === currentUser.id);
                    const items = cardItems.filter(i => i.card_id === card.id);
                    const completedCount = userProgress.filter(p => items.some(i => i.id === p.card_item_id) && p.user_id === currentUser.id).length;
                    const isCompleted = completedCount === items.length && items.length > 0;
                    const cardUnitName = card.unit_id ? units.find(u => u.id === card.unit_id)?.name : 'بطاقة عامة';

                    return (
                        <div key={card.id} className="glass-panel p-0 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 group relative overflow-hidden flex flex-col">
                            <div className="p-6 flex-1 flex flex-col relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg mb-2 inline-block ${!card.unit_id ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                            {cardUnitName}
                                        </span>
                                        <h3 className="font-black text-xl text-gray-800 dark:text-white leading-tight mb-1">{card.name}</h3>
                                        <p className="text-xs font-medium text-gray-400">{card.type || 'تصنيف عام'}</p>
                                    </div>
                                    {canManage && (
                                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                                            <button onClick={() => handleOpenAssignmentModal && handleOpenAssignmentModal(card)} className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-2 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm" title="إسناد"><UserPlus size={16}/></button>
                                            <button onClick={() => handleOpenModal('edit', card)} className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="تعديل"><PenSquare size={16}/></button>
                                            <button onClick={() => promptDelete(card)} className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-2 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm" title="حذف"><Trash2 size={16}/></button>
                                        </div>
                                    )}
                                </div>

                                {isScout && isAssigned && (
                                    <div className="mt-4 mb-6 bg-gray-50/50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 max-h-48 overflow-y-auto custom-scrollbar">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider">الإنجاز ({completedCount}/{items.length})</h4>
                                            <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{Math.round((completedCount / items.length) * 100)}%</div>
                                        </div>
                                        <div className="space-y-2">
                                            {items.map(item => {
                                                const isDone = userProgress.some(p => p.card_item_id === item.id && p.user_id === currentUser.id);
                                                return (
                                                    <div key={item.id} className={`flex items-start gap-2.5 text-xs transition-colors ${isDone ? 'text-green-600 dark:text-green-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                                                        <div className={`mt-0.5 shrink-0 transition-all ${isDone ? 'text-green-500 scale-110' : 'text-gray-300'}`}>
                                                            {isDone ? <CheckCircle size={14}/> : <Circle size={14}/>}
                                                        </div>
                                                        <span className={isDone ? 'line-through opacity-70' : ''}>{item.name}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700/50 mt-auto relative z-10">
                                {isScout ? (
                                    !isAssigned && !myRequest ? (
                                        <button onClick={() => handleRequest(card.id)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-95 flex items-center justify-center gap-2">
                                            <Plus size={16}/> طلب تسجيل
                                        </button>
                                    ) : myRequest?.status === 'pending' ? (
                                        <div className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50">
                                            <Clock size={16}/> طلبك قيد المراجعة
                                        </div>
                                    ) : (
                                        isCompleted ? (
                                            <div className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50">
                                                <CheckCircle size={16}/> بطاقة مكتملة
                                            </div>
                                        ) : (
                                            <div className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                                                <Clock size={16}/> قيد العمل
                                            </div>
                                        )
                                    )
                                ) : (
                                    <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                                        <span>{items.length} بند</span>
                                        <span>{card.points || 0} نقطة</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Decorative Background Pattern */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-bl-full pointer-events-none"></div>
                        </div>
                    );
                })}
                 {filteredCards.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 bg-gray-50/50 dark:bg-gray-800/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4 text-gray-300 dark:text-gray-600">
                            <Filter size={40}/>
                        </div>
                        <p className="text-gray-400 font-bold text-base">لا توجد بطاقات في هذا التصنيف</p>
                        <p className="text-gray-400 text-xs mt-1">جرب تغيير الفلتر أو إضافة بطاقات جديدة</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const FilterTab = ({ active, onClick, label, count }: any) => (
    <button 
        onClick={onClick}
        className={`
            px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2
            ${active 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' 
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:text-gray-900 dark:hover:text-white'
            }
        `}
    >
        {label}
        {count > 0 && (
            <span className={`
                px-2 py-0.5 rounded-full text-[10px] font-black
                ${active ? 'bg-white text-blue-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}
            `}>
                {count}
            </span>
        )}
    </button>
);
