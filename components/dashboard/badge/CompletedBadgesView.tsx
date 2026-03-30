
import React from 'react';
import { User, Badge, BadgeRequest, BadgeRequirementProgress } from '../../../types';
import { Award, Users } from 'lucide-react';

interface CompletedBadgesViewProps {
    users: User[];
    badges: Badge[];
    requests: BadgeRequest[];
    reqProgress: BadgeRequirementProgress[];
}

export const CompletedBadgesView: React.FC<CompletedBadgesViewProps> = ({ users, badges, requests, reqProgress }) => {

    const completedData = badges
        .map(badge => {
            const requirements = badge.requirements || [];
            if (requirements.length === 0) return null;

            const approvedUserIds = requests.filter(r => r.badge_id === badge.id && r.status === 'approved').map(r => r.user_id);
            
            const completedUsers = approvedUserIds.map(userId => {
                const user = users.find(u => u.id === userId);
                if (!user) return null;

                const userProgressForBadge = reqProgress.filter(p => p.user_id === userId && p.badge_id === badge.id);
                const completedCount = userProgressForBadge.length;
                
                if (completedCount === requirements.length) {
                    return user;
                }
                return null;
            }).filter(Boolean) as User[];

            if (completedUsers.length > 0) {
                return { badge, completedUsers };
            }
            return null;
        })
        .filter(Boolean);

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            <h3 className="font-black text-lg flex items-center gap-2"><Award className="text-yellow-500"/> الشارات المكتملة</h3>
            {completedData.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/20 border-2 border-dashed dark:border-gray-700 rounded-2xl opacity-40">
                    <Award size={32} className="mx-auto mb-3"/>
                    <p className="font-bold text-sm">لم يكمل أي فرد أي شارة بعد.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {completedData.map(data => (
                        <div key={data!.badge.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border-2 dark:border-gray-700">
                            <h4 className="font-bold text-yellow-800 dark:text-yellow-300 mb-3">{data!.badge.title}</h4>
                            <div className="flex flex-wrap gap-2">
                                {data!.completedUsers.map(user => (
                                    <span key={user.id} className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1">
                                        <Users size={12}/> {user.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
