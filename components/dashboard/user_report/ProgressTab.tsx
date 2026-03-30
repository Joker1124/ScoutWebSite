
import React from 'react';
import { User, ProgressCard, ProgressCardItem, Progress } from '../../../types';
import { Check } from 'lucide-react';

interface ProgressTabProps {
    user: User;
    progressCards: ProgressCard[];
    cardItems: ProgressCardItem[];
    userProgress: Progress[];
}

export const ProgressTab: React.FC<ProgressTabProps> = ({ user, progressCards, cardItems, userProgress }) => (
    <div className="animate-in fade-in duration-500 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {progressCards.filter(c => c.unit_id === user.unit_id).map(card => {
                const items = cardItems.filter(i => i.card_id === card.id);
                const completed = items.filter(i => userProgress.some(p => p.user_id === user.id && p.card_item_id === i.id && p.value > 0)).length;
                const percent = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
                return (
                    <div key={card.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border-2 dark:border-gray-700 shadow-sm">
                        <h4 className="font-black text-gray-800 dark:text-white mb-4 border-b dark:border-gray-700 pb-3 text-base">{card.name}</h4>
                        <div className="space-y-2 mb-4">
                                {items.map(item => {
                                    const isDone = userProgress.some(p => p.user_id === user.id && p.card_item_id === item.id && p.value > 0);
                                    return (
                                        <div key={item.id} className={`flex justify-between items-center p-2 rounded-lg ${isDone ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-gray-50 dark:bg-gray-900/40 text-gray-400'}`}>
                                            <span className="text-xs font-bold">{item.name}</span>
                                            {isDone && <Check size={12} strokeWidth={3}/>}
                                        </div>
                                    );
                                })}
                        </div>
                        <div className="flex justify-between text-[10px] font-black mb-1 opacity-50">
                                <span>التقدم المحرز</span>
                                <span>{percent}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-1000" style={{width: `${percent}%`}}></div>
                        </div>
                    </div>
                )
            })}
        </div>
    </div>
);
