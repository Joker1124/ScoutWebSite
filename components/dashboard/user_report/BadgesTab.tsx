
import React from 'react';
import { Badge, BadgeRequest, BadgeRequirementProgress } from '../../../types';
import { Award } from 'lucide-react';
import { BadgeProgressCard } from './BadgeProgressCard';

interface BadgesTabProps {
    userBadgeRequests: BadgeRequest[];
    badges: Badge[];
    reqProgress: BadgeRequirementProgress[];
}

export const BadgesTab: React.FC<BadgesTabProps> = ({ userBadgeRequests, badges, reqProgress }) => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-center bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl border-2 border-yellow-100 dark:border-yellow-900/50">
            <div className="flex items-center gap-2">
                <Award className="text-yellow-600" size={20}/>
                <div>
                    <h3 className="text-sm font-black dark:text-yellow-100">سجل الشارات</h3>
                    <p className="text-xs text-yellow-800 dark:text-yellow-400">تقدم الفرد في الشارات</p>
                </div>
            </div>
            <div className="text-center bg-white dark:bg-gray-900 px-3 py-0.5 rounded-lg border-2 dark:border-gray-800 shadow-sm">
                <span className="block text-[8px] text-gray-400 font-bold uppercase">المكتسبة</span>
                <span className="text-lg font-black text-yellow-600">{userBadgeRequests.filter(br => br.status === 'approved').length}</span>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {badges.map(badge => (
                <BadgeProgressCard
                    key={badge.id}
                    badge={badge}
                    userBadgeRequest={userBadgeRequests.find(br => br.badge_id === badge.id)}
                    reqProgress={reqProgress}
                />
            ))}
            {badges.length === 0 && <p className="text-center text-gray-500 col-span-2">لم يتم تعريف أي شارات بعد.</p>}
        </div>
    </div>
);
