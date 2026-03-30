
import React, { useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { User, ProgressCard, ProgressCardRequest } from '../../../types';
import { Shield, Clock, Check, Ban, RefreshCw } from 'lucide-react';

interface ProgressCardRequestsProps {
    cardRequests: ProgressCardRequest[];
    users: User[];
    progressCards: ProgressCard[];
    onRefresh: () => void;
    currentUser: User;
}

export const ProgressCardRequests: React.FC<ProgressCardRequestsProps> = ({ cardRequests, users, progressCards, onRefresh, currentUser }) => {
    const [procId, setProcId] = useState<string | null>(null);

    const handleAction = async (requestId: string, userId: string, cardId: string, action: 'approved' | 'rejected') => {
        setProcId(requestId);
        try {
            if (action === 'approved') {
                await supabase.from('user_cards').insert({ user_id: userId, card_id: cardId });
                await supabase.from('progress_card_requests').update({ status: 'approved' }).eq('id', requestId);
            } else {
                await supabase.from('progress_card_requests').delete().eq('id', requestId);
            }
            onRefresh();
        } catch (e) {
            alert('حدث خطأ');
        } finally {
            setProcId(null);
        }
    };

    const pendingRequests = cardRequests.filter(r => r.status === 'pending');

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl text-yellow-600 dark:text-yellow-400">
                    <Clock size={24}/>
                </div>
                <div>
                    <h3 className="font-black text-xl text-gray-800 dark:text-white">طلبات تسجيل البطاقات</h3>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">مراجعة واعتماد طلبات الأفراد للبدء في بطاقات جديدة</p>
                </div>
            </div>

            <div className="grid gap-4">
                {pendingRequests.map(req => {
                    const scout = users.find(u => u.id === req.user_id);
                    const card = progressCards.find(c => c.id === req.card_id);
                    if (!scout || !card) return null;
                    
                    return (
                        <div key={req.id} className="glass-panel p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row justify-between items-center gap-4 group">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                                    {scout.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-black text-base text-gray-800 dark:text-white mb-1">{scout.name}</h4>
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                                        <span>يرغب في البدء بـ:</span>
                                        <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">{card.name}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 w-full md:w-auto">
                                {currentUser.role !== 'priest' ? (
                                    <>
                                        <button
                                            disabled={!!procId}
                                            onClick={() => handleAction(req.id, req.user_id, req.card_id, 'approved')}
                                            className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg shadow-green-600/20 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            {procId === req.id ? <RefreshCw className="animate-spin" size={16}/> : <Check size={16}/>} قبول
                                        </button>
                                        <button
                                            disabled={!!procId}
                                            onClick={() => handleAction(req.id, req.user_id, req.card_id, 'rejected')}
                                            className="flex-1 md:flex-none bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 px-6 py-2.5 rounded-xl text-xs font-black transition-all border border-red-100 dark:border-red-800/50 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Ban size={16}/> رفض
                                        </button>
                                    </>
                                ) : (
                                    <p className="text-gray-500 text-xs font-bold">للعرض فقط</p>
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {pendingRequests.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 dark:bg-gray-800/30 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl">
                        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4 text-gray-300 dark:text-gray-600">
                            <Shield size={40}/>
                        </div>
                        <p className="font-bold text-gray-400 text-sm">لا توجد طلبات تسجيل معلقة حالياً</p>
                    </div>
                )}
            </div>
        </div>
    );
};
