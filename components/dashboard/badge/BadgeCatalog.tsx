
import React, { useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { User, Badge, BadgeRequest, hasPermission, PERMISSIONS, BadgeRequirementProgress, Unit } from '../../../types';
import { Award, Clock, Plus, Trash2, PenSquare, Check, Circle, CheckCircle, UserPlus, FileSpreadsheet, Filter } from 'lucide-react';
import { BulkUploadModal } from '../../shared/BulkUploadModal';

interface BadgeCatalogProps {
    badges: Badge[];
    requests: BadgeRequest[];
    reqProgress: BadgeRequirementProgress[];
    currentUser: User;
    handleOpenModal: (mode: 'create' | 'edit', badge?: Badge) => void;
    promptDelete: (badge: Badge) => void;
    fetchInitialData: () => Promise<void>;
    handleOpenAssignmentModal?: (badge: Badge) => void;
    units?: Unit[];
}

export const BadgeCatalog: React.FC<BadgeCatalogProps> = ({ badges, requests, reqProgress, currentUser, handleOpenModal, promptDelete, fetchInitialData, handleOpenAssignmentModal, units = [] }) => {
    const canManage = hasPermission(currentUser, PERMISSIONS.MANAGE_BADGE_SYSTEM) && currentUser.role !== 'priest';
    const isScout = currentUser.role === 'scout';
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [filterUnit, setFilterUnit] = useState<string>('all'); // 'all', 'general', or unit_id
    
    // Filter Logic
    const filteredBadges = badges.filter(badge => {
        if (filterUnit === 'all') return true;
        if (filterUnit === 'general') return !badge.unit_id;
        return badge.unit_id === filterUnit;
    });

    // Calculate counts for tabs
    const getCount = (type: string) => {
        if (type === 'all') return badges.length;
        if (type === 'general') return badges.filter(b => !b.unit_id).length;
        return badges.filter(b => b.unit_id === type).length;
    };

    return (
    <div className="animate-in fade-in duration-500">
        <BulkUploadModal 
            isOpen={showBulkUpload} 
            onClose={() => setShowBulkUpload(false)} 
            type="badges" 
            units={units || []}
            onSuccess={() => {
                setShowBulkUpload(false);
                fetchInitialData();
            }}
        />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h2 className="text-2xl font-black flex items-center gap-3 dark:text-white mb-2">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl text-yellow-600 dark:text-yellow-400">
                        <Award size={24}/>
                    </div>
                    {isScout ? 'شاراتي المتاحة' : 'دليل الشارات الكشفية'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium pr-1">
                    {isScout ? 'استعرض الشارات التي يمكنك اكتسابها' : 'إدارة شارات الهواية والجدارة لجميع الأفراد'}
                </p>
            </div>
            {canManage && (
                <div className="flex gap-3 w-full md:w-auto">
                    {currentUser.role === 'group_leader' && (
                        <button 
                            onClick={() => setShowBulkUpload(true)} 
                            className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 transition-all active:scale-95"
                        >
                            <FileSpreadsheet size={18}/> رفع Excel
                        </button>
                    )}
                    <button 
                        onClick={() => handleOpenModal('create')} 
                        className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                    >
                        <Plus size={18}/> تعريف شارة جديدة
                    </button>
                </div>
            )}
        </div>
        
        {/* Unit Filters */}
        <div className="flex flex-wrap gap-3 mb-8 pb-2 overflow-x-auto no-scrollbar">
            <FilterTab 
                active={filterUnit === 'all'} 
                onClick={() => setFilterUnit('all')} 
                label="الكل" 
                count={getCount('all')}
            />
            <FilterTab 
                active={filterUnit === 'general'} 
                onClick={() => setFilterUnit('general')} 
                label="شارات عامة" 
                count={getCount('general')}
            />
            {units.map(u => {
                const count = getCount(u.id);
                if (count === 0 && currentUser.role !== 'group_leader') return null; // Hide empty units for non-admins if preferred
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredBadges.map(badge => {
                const myRequest = isScout ? requests.find(r => r.badge_id === badge.id && r.user_id === currentUser.id) : null;
                const requirements = badge.requirements || [];
                const completedCount = reqProgress.filter(p => p.badge_id === badge.id).length;
                const isCompleted = completedCount === requirements.length && requirements.length > 0;
                const isTracking = myRequest?.status === 'approved';
                const badgeUnitName = badge.unit_id ? units.find(u => u.id === badge.unit_id)?.name : 'شارة عامة';

                return (
                    <div key={badge.id} className="glass-panel p-6 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col group transition-all hover:scale-[1.02] hover:shadow-xl relative overflow-hidden">
                        {canManage && (
                            <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 translate-x-4 group-hover:translate-x-0">
                                <button 
                                    onClick={() => handleOpenAssignmentModal && handleOpenAssignmentModal(badge)} 
                                    className="bg-green-50 dark:bg-green-900/50 text-green-600 dark:text-green-400 p-2.5 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                    title="إسناد لأفراد"
                                >
                                    <UserPlus size={18}/>
                                </button>
                                <button 
                                    onClick={() => handleOpenModal('edit', badge)} 
                                    className="bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    title="تعديل"
                                >
                                    <PenSquare size={18}/>
                                </button>
                                <button 
                                    onClick={() => promptDelete(badge)} 
                                    className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-2.5 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                    title="حذف"
                                >
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-4">
                             <div className="flex-1">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg mb-2 inline-block ${badge.unit_id ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300'}`}>
                                    {badgeUnitName}
                                </span>
                                <h3 className="font-black text-xl text-gray-800 dark:text-white leading-tight">{badge.title}</h3>
                             </div>
                        </div>
                        
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex-1 line-clamp-3 leading-relaxed font-medium">{badge.description}</p>
                        
                        {isScout && (isTracking || isCompleted) && (
                            <div className="mb-6 bg-gray-50/50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 max-h-48 overflow-y-auto custom-scrollbar">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">المتطلبات المنجزة</h4>
                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">{completedCount}/{requirements.length}</span>
                                </div>
                                <div className="space-y-2">
                                    {requirements.map((req, idx) => {
                                        const isDone = reqProgress.some(p => p.badge_id === badge.id && p.requirement_index === idx);
                                        return (
                                            <div key={idx} className={`flex items-start gap-2.5 text-xs font-medium transition-colors ${isDone ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                                <div className={`mt-0.5 shrink-0 ${isDone ? 'text-green-500' : 'text-gray-300'}`}>
                                                    {isDone ? <CheckCircle size={14} strokeWidth={3}/> : <Circle size={14}/>}
                                                </div>
                                                <span className={isDone ? 'line-through opacity-70' : ''}>{req}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700/50">
                           {isScout ? (
                                !myRequest ? (
                                    <button 
                                        onClick={async () => {
                                            await supabase.from('badge_requests').insert({ user_id: currentUser.id, badge_id: badge.id, status: 'pending' });
                                            fetchInitialData();
                                        }} 
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Plus size={18}/> تقديم طلب ترشيح
                                    </button>
                                ) : myRequest.status === 'pending' ? (
                                    <div className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-900/30">
                                        <Clock size={18}/> طلبك قيد المراجعة
                                    </div>
                                ) : (
                                    isCompleted ? (
                                        <div className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-900/30">
                                            <CheckCircle size={18}/> شارة مكتسبة
                                        </div>
                                    ) : (
                                        <div className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                            <PenSquare size={18}/> جاري العمل
                                        </div>
                                    )
                                )
                           ) : (
                               <div className="flex items-center justify-between text-xs font-medium text-gray-400">
                                   <span>{requirements.length} متطلبات</span>
                                   {requests.filter(r => r.badge_id === badge.id).length > 0 && (
                                       <span className="text-blue-500">{requests.filter(r => r.badge_id === badge.id).length} مسجلين</span>
                                   )}
                               </div>
                           )}
                        </div>
                    </div>
                );
            })}
            
            {filteredBadges.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-16 bg-gray-50 dark:bg-gray-800/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-center">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-400">
                        <Filter size={40}/>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">لا توجد شارات في هذا التصنيف</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">جرب تغيير الفلتر أو إضافة شارات جديدة</p>
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
            px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2
            ${active 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 scale-105' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }
        `}
    >
        {label}
        {count > 0 && (
            <span className={`
                px-2 py-0.5 rounded-lg text-[10px] font-black
                ${active 
                    ? 'bg-white/20 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }
            `}>
                {count}
            </span>
        )}
    </button>
);
