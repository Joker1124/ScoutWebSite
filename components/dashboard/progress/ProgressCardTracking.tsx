
import React from 'react';
import type { User, ProgressCard, ProgressCardItem, UserCard, Progress } from '../../../types';
import { RefreshCw, Check, Search, CheckCircle, UserX, User as UserIcon, ChevronDown, Clock } from 'lucide-react';

interface ProgressCardTrackingProps {
    users: User[];
    selectedScoutId: string;
    setSelectedScoutId: (id: string) => void;
    progressCards: ProgressCard[];
    cardItems: ProgressCardItem[];
    userCards: UserCard[];
    userProgress: Progress[];
    procId: string | null;
    handleProgress: (userId: string, itemId: string, currentStatus: boolean) => void;
    onUnenroll: (userId: string, cardId: string) => void;
    currentUser: User;
}

export const ProgressCardTracking: React.FC<ProgressCardTrackingProps> = ({
    users, selectedScoutId, setSelectedScoutId, progressCards, cardItems, userCards, userProgress, procId, handleProgress, onUnenroll, currentUser
}) => {
    
    return (
        <div className="animate-in fade-in duration-500 space-y-8">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-900 dark:to-gray-900 p-8 rounded-3xl shadow-2xl shadow-blue-500/20 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50"></div>
                <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
                
                <div className="relative z-10">
                    <label className="block text-sm font-black text-blue-100 mb-4 uppercase tracking-widest flex items-center gap-2">
                        <UserIcon size={18}/> حدد الفرد لمتابعة تقدمه
                    </label>
                    <div className="relative max-w-xl">
                        <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none" size={22}/>
                        <select 
                            value={selectedScoutId}
                            onChange={e => setSelectedScoutId(e.target.value)}
                            className="w-full bg-white/10 backdrop-blur-md text-white border-2 border-white/20 focus:border-white/50 focus:bg-white/20 p-4 pr-14 rounded-2xl font-bold text-lg outline-none transition-all shadow-inner appearance-none cursor-pointer hover:bg-white/15"
                        >
                            <option value="" className="text-gray-900 dark:text-gray-100">-- اختر من قائمة الأفراد --</option>
                            {users.filter(u => u.role === 'scout' && u.status === 'active').map(u => (
                                <option key={u.id} value={u.id} className="text-gray-900 dark:text-gray-100">{u.name}</option>
                            ))}
                        </select>
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none text-blue-300">
                            <ChevronDown size={20}/>
                        </div>
                    </div>
                </div>
            </div>

            {selectedScoutId && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in slide-in-from-top-6 duration-700">
                    {progressCards
                        .filter(card => userCards.some(uc => uc.user_id === selectedScoutId && uc.card_id === card.id))
                        .map(card => {
                            const items = cardItems.filter(i => i.card_id === card.id);
                            const completed = userProgress.filter(p => p.user_id === selectedScoutId && items.some(i => i.id === p.card_item_id)).length;
                            const percent = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
                            const isCompleted = percent === 100 && items.length > 0;

                            return (
                                <div key={card.id} className={`glass-panel p-6 rounded-3xl border transition-all duration-300 flex flex-col group hover:scale-[1.02] ${isCompleted ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800/50' : 'border-gray-200 dark:border-gray-700 hover:shadow-xl'}`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h4 className="font-black text-xl text-gray-800 dark:text-white mb-2">{card.name}</h4>
                                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 ${isCompleted ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                                {isCompleted ? <CheckCircle size={12}/> : <Clock size={12}/>}
                                                {isCompleted ? 'مكتملة' : 'قيد الإنجاز'}
                                            </span>
                                        </div>
                                        {currentUser.role !== 'priest' && (
                                            <button 
                                                onClick={() => onUnenroll(selectedScoutId, card.id)} 
                                                disabled={!!procId}
                                                className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100"
                                                title="إلغاء الإسناد"
                                            >
                                                <UserX size={18}/>
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
                                        {items.map(item => {
                                            const isDone = userProgress.some(p => p.user_id === selectedScoutId && p.card_item_id === item.id);
                                            const isThisLoading = procId === `prog-${selectedScoutId}-${item.id}`;
                                            const canToggle = !procId && currentUser.role !== 'priest';

                                            return (
                                                <button 
                                                    key={item.id}
                                                    disabled={!canToggle}
                                                    onClick={() => handleProgress(selectedScoutId, item.id, isDone)}
                                                    className={`
                                                        w-full text-right p-4 rounded-xl border transition-all flex justify-between items-center group/item relative overflow-hidden
                                                        ${isDone 
                                                            ? 'bg-green-50/80 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800/50 dark:text-green-300' 
                                                            : 'bg-white/80 border-transparent text-gray-600 dark:bg-gray-800/50 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800'
                                                        } 
                                                        ${canToggle ? 'hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md cursor-pointer' : 'opacity-60 cursor-not-allowed'}
                                                    `}
                                                >
                                                    <span className={`text-xs font-bold leading-relaxed pr-1 relative z-10 ${isDone ? 'line-through opacity-70' : ''}`}>{item.name}</span>
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
                                        {items.length === 0 && (
                                            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                                <p className="text-xs font-bold text-gray-400">لا توجد بنود معرفة لهذه البطاقة.</p>
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
};