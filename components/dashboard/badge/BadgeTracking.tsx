
import React from 'react';
import { User, Badge, BadgeRequest, BadgeRequirementProgress } from '../../../types';
import { RefreshCw, Check, Search, CheckCircle, UserX, User as UserIcon } from 'lucide-react';

interface BadgeTrackingProps {
    users: User[];
    selectedScoutId: string;
    setSelectedScoutId: (id: string) => void;
    badges: Badge[];
    requests: BadgeRequest[];
    reqProgress: BadgeRequirementProgress[];
    procId: string | null;
    toggleRequirement: (badgeId: string, index: number, current: boolean) => Promise<void>;
    handleApproveBadge: (badgeId: string) => Promise<void>;
    onUnenroll: (userId: string, badgeId: string) => void;
    currentUser: User;
}

export const BadgeTracking: React.FC<BadgeTrackingProps> = ({ users, selectedScoutId, setSelectedScoutId, badges, requests, reqProgress, procId, toggleRequirement, handleApproveBadge, onUnenroll, currentUser }) => {
    
    return (
    <div className="animate-in fade-in duration-500 space-y-8">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-900 dark:to-gray-900 p-8 rounded-3xl shadow-2xl shadow-blue-500/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50"></div>
            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
                <label className="block text-sm font-black text-blue-100 mb-4 uppercase tracking-widest flex items-center gap-2">
                    <Search size={18}/> حدد الفرد لمتابعة تقدمه
                </label>
                <div className="relative max-w-xl">
                    <select 
                        value={selectedScoutId}
                        onChange={e => setSelectedScoutId(e.target.value)}
                        className="w-full bg-white/10 backdrop-blur-md text-white border-2 border-white/20 focus:border-white/50 focus:bg-white/20 p-4 pr-12 rounded-2xl font-bold text-lg outline-none transition-all shadow-inner appearance-none cursor-pointer hover:bg-white/15"
                    >
                        <option value="" className="text-gray-900 dark:text-gray-100">-- اختر من قائمة الأفراد --</option>
                        {users.filter(u => u.role === 'scout' && u.status === 'active').map(u => (
                            <option key={u.id} value={u.id} className="text-gray-900 dark:text-gray-100">{u.name}</option>
                        ))}
                    </select>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-blue-200">
                        <UserIcon size={20}/>
                    </div>
                </div>
            </div>
        </div>

        {selectedScoutId && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in slide-in-from-top-6 duration-700">
                {badges.map(badge => {
                    const request = requests.find(r => r.badge_id === badge.id && r.user_id === selectedScoutId);
                    const requirements = badge.requirements || [];
                    const completed = reqProgress.filter(p => p.badge_id === badge.id).length;
                    const percent = requirements.length > 0 ? Math.round((completed / requirements.length) * 100) : 0;

                    const isApprovedForTracking = request?.status === 'approved';
                    const isCompleted = percent === 100 && requirements.length > 0;
                    
                    let statusText = 'لم يتم تقديم طلب';
                    let statusBg = 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';
                    let statusIcon = <Search size={12}/>;

                    if (request?.status === 'pending') {
                        statusText = 'طلب قيد المراجعة';
                        statusBg = 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400';
                        statusIcon = <RefreshCw size={12} className="animate-spin"/>;
                    } else if (isCompleted) {
                        statusText = 'شارة منجزة بالكامل';
                        statusBg = 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400';
                        statusIcon = <CheckCircle size={12}/>;
                    } else if (isApprovedForTracking) {
                        statusText = 'قيد تتبع البنود';
                        statusBg = 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400';
                        statusIcon = <Check size={12}/>;
                    }

                    return (
                        <div key={badge.id} className={`glass-panel p-6 rounded-3xl border transition-all duration-300 flex flex-col group hover:scale-[1.02] ${isCompleted ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800/50' : 'border-gray-200 dark:border-gray-700 hover:shadow-xl'}`}>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h4 className="font-black text-xl text-gray-800 dark:text-white mb-2">{badge.title}</h4>
                                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 ${statusBg}`}>
                                        {statusIcon}
                                        {statusText}
                                    </span>
                                </div>
                                {isApprovedForTracking ? (
                                    currentUser.role !== 'priest' && (
                                        <button 
                                            onClick={() => onUnenroll(selectedScoutId, badge.id)} 
                                            disabled={!!procId}
                                            className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100"
                                            title="إلغاء الإسناد"
                                        >
                                            <UserX size={18}/>
                                        </button>
                                    )
                                ) : (request?.status !== 'pending' && currentUser.role !== 'priest' &&
                                    <button 
                                        onClick={() => handleApproveBadge(badge.id)} 
                                        disabled={!!procId}
                                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100"
                                        title="اعتماد الشارة"
                                    >
                                        {procId === `approve-${badge.id}` ? <RefreshCw className="animate-spin" size={18}/> : <CheckCircle size={18}/>}
                                    </button>
                                )}
                            </div>
                            
                            <div className="mb-6 bg-white/50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                                <div className="flex justify-between text-xs font-black mb-2 text-gray-400 uppercase tracking-widest">
                                    <span>معدل الإتمام</span>
                                    <span>{percent}%</span>
                                </div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-1000 ease-out rounded-full ${isCompleted ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`} 
                                        style={{ width: `${percent}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="space-y-3 flex-1">
                                {requirements.map((req, idx) => {
                                    const isDone = reqProgress.some(p => p.badge_id === badge.id && p.requirement_index === idx);
                                    const isThisLoading = procId === `req-${badge.id}-${idx}`;
                                    const canToggle = isApprovedForTracking && !procId && currentUser.role !== 'priest';

                                    return (
                                        <button 
                                            key={idx}
                                            disabled={!canToggle}
                                            onClick={() => toggleRequirement(badge.id, idx, isDone)}
                                            className={`
                                                w-full text-right p-4 rounded-xl border transition-all flex justify-between items-center group/item relative overflow-hidden
                                                ${isDone 
                                                    ? 'bg-green-50/80 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800/50 dark:text-green-300' 
                                                    : 'bg-white/80 border-transparent text-gray-600 dark:bg-gray-800/50 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800'
                                                } 
                                                ${canToggle ? 'hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md cursor-pointer' : 'opacity-60 cursor-not-allowed'}
                                            `}
                                        >
                                            <span className={`text-xs font-bold leading-relaxed pr-1 relative z-10 ${isDone ? 'line-through opacity-70' : ''}`}>{req}</span>
                                            <div className={`
                                                w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all relative z-10
                                                ${isDone 
                                                    ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/30 scale-110' 
                                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-300 group-hover/item:border-blue-400 group-hover/item:text-blue-400'
                                                }
                                            `}>
                                                {isThisLoading ? <RefreshCw className="animate-spin" size={14}/> : (isDone && <Check size={16} strokeWidth={4}/>)}
                                            </div>
                                            {isDone && <div className="absolute inset-0 bg-green-500/5 pointer-events-none"></div>}
                                        </button>
                                    );
                                })}
                                {requirements.length === 0 && (
                                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                        <p className="text-xs font-bold text-gray-400">لا توجد بنود معرفة لهذه الشارة.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
);
}