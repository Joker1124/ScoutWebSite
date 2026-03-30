
import React from 'react';
import { User, ProgressCard, ProgressCardItem, UserCard, Progress } from '../../../types';
import { CheckCircle, Users } from 'lucide-react';

interface CompletedCardsViewProps {
    users: User[];
    progressCards: ProgressCard[];
    cardItems: ProgressCardItem[];
    userCards: UserCard[];
    userProgress: Progress[];
}

export const CompletedCardsView: React.FC<CompletedCardsViewProps> = ({ users, progressCards, cardItems, userCards, userProgress }) => {
    
    const completedData = progressCards
        .map(card => {
            const itemsForCard = cardItems.filter(i => i.card_id === card.id);
            if (itemsForCard.length === 0) return null;

            const assignedUserIds = userCards.filter(uc => uc.card_id === card.id).map(uc => uc.user_id);
            
            const completedUsers = assignedUserIds.map(userId => {
                const user = users.find(u => u.id === userId);
                if (!user) return null;

                const completedCount = userProgress.filter(p => p.user_id === userId && itemsForCard.some(i => i.id === p.card_item_id)).length;
                
                if (completedCount === itemsForCard.length) {
                    return user;
                }
                return null;
            }).filter(Boolean) as User[];

            if (completedUsers.length > 0) {
                return { card, completedUsers };
            }
            return null;
        })
        .filter(Boolean);

    return (
        <div className="animate-in fade-in duration-500 space-y-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
                    <CheckCircle size={24}/>
                </div>
                <div>
                    <h3 className="font-black text-xl text-gray-800 dark:text-white">البطاقات المكتملة</h3>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">سجل الأفراد الذين أتموا متطلبات البطاقات بنجاح</p>
                </div>
            </div>

            {completedData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 dark:bg-gray-800/30 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl">
                    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4 text-gray-300 dark:text-gray-600">
                        <CheckCircle size={40}/>
                    </div>
                    <p className="font-bold text-gray-400 text-sm">لم يكمل أي فرد أي بطاقة بعد.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {completedData.map((data: any) => (
                        <div key={data.card.id} className="glass-panel p-6 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 group">
                            <div className="flex justify-between items-start mb-6 border-b border-gray-100 dark:border-gray-700/50 pb-4">
                                <h4 className="font-black text-lg text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{data.card.name}</h4>
                                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 text-xs font-black rounded-lg flex items-center gap-1.5 shadow-sm">
                                    <CheckCircle size={14}/> {data.completedUsers.length} منجز
                                </span>
                            </div>
                            
                            <div className="space-y-3">
                                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Users size={12}/> الأفراد المنجزون
                                </h5>
                                <div className="flex flex-wrap gap-2">
                                    {data.completedUsers.map((user: User) => (
                                        <div key={user.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 pl-3 pr-1 py-1 rounded-full flex items-center gap-2 shadow-sm hover:shadow-md transition-all group/user">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                                                {user.name.charAt(0)}
                                            </div>
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover/user:text-blue-600 dark:group-hover/user:text-blue-400 transition-colors">
                                                {user.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
