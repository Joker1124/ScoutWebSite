
import React, { useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { User, Badge, BadgeRequest } from '../../../types';
import { Award, Clock, Check, Ban, RefreshCw } from 'lucide-react';
import { POINTS_CONFIG } from '../../Dashboard';

interface BadgeRequestsProps {
    requests: BadgeRequest[];
    users: User[];
    badges: Badge[];
    fetchInitialData: () => Promise<void>;
    onAwardPoints?: (userId: string, points: number, reason: string, relatedId?: string) => Promise<void>;
    currentUser: User;
}

export const BadgeRequests: React.FC<BadgeRequestsProps> = ({ requests, users, badges, fetchInitialData, onAwardPoints, currentUser }) => {
    const [procId, setProcId] = useState<string | null>(null);

    const handleAction = async (req: BadgeRequest, action: 'approved' | 'rejected') => {
        setProcId(req.id);
        try {
            if (action === 'approved') {
                await supabase.from('badge_requests').update({ status: 'approved' }).eq('id', req.id);
                // Award points
                await onAwardPoints(req.user_id, POINTS_CONFIG.BADGE, 'اكتساب شارة', req.badge_id);
            } else {
                await supabase.from('badge_requests').delete().eq('id', req.id);
            }
            fetchInitialData();
        } catch(e) {
            console.error("Error handling badge request", e);
        } finally {
            setProcId(null);
        }
    }

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                    <Clock size={24}/>
                </div>
                <h3 className="font-black text-xl dark:text-white">طلبات الاعتماد المقدمة حديثاً</h3>
            </div>
            
            <div className="grid gap-4">
                {requests.filter(r => r.status === 'pending').map(req => {
                    const scout = users.find(u => u.id === req.user_id);
                    const badge = badges.find(b => b.id === req.badge_id);
                    if (!scout || !badge) return null;
                    const isLoading = procId === req.id;
                    return (
                        <div key={req.id} className="glass-panel p-5 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center transition-all hover:bg-blue-50/50 dark:hover:bg-gray-800/50 shadow-sm hover:shadow-md gap-4 group">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center font-black text-lg text-blue-600 dark:text-blue-300 shadow-inner">
                                    {scout.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-lg dark:text-white leading-tight">{scout.name}</p>
                                    <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        <span>يطلب الحصول على شارة:</span>
                                        <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">{badge.title}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                {currentUser.role !== 'priest' ? (
                                    <>
                                        <button 
                                            disabled={isLoading}
                                            onClick={() => handleAction(req, 'approved')} 
                                            className="flex-1 md:flex-none bg-green-500 hover:bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? <RefreshCw className="animate-spin" size={18}/> : <Check size={18}/>} قبول
                                        </button>
                                        <button 
                                            disabled={isLoading}
                                            onClick={() => handleAction(req, 'rejected')} 
                                            className="flex-1 md:flex-none bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Ban size={18}/> رفض
                                        </button>
                                    </>
                                ) : (
                                    <div className="w-full text-center py-2.5 text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-xl px-6">
                                        للاطلاع فقط
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {requests.filter(r => r.status === 'pending').length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 bg-gray-50 dark:bg-gray-800/30 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-400">
                            <Award size={32}/>
                        </div>
                        <p className="font-bold text-gray-500 dark:text-gray-400">لا توجد طلبات اعتماد معلقة حالياً</p>
                    </div>
                )}
            </div>
        </div>
    );
};
