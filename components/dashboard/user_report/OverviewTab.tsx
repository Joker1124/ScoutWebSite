
import React from 'react';
import { User, Attendance, ProgressCard, ProgressCardItem, Progress, BadgeRequest } from '../../../types';

interface OverviewTabProps {
    user: User;
    attendanceData: Attendance[];
    progressCards: ProgressCard[];
    cardItems: ProgressCardItem[];
    userProgress: Progress[];
    userBadgeRequests: BadgeRequest[];
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ user, attendanceData, progressCards, cardItems, userProgress, userBadgeRequests }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
        <StatBox label="إجمالي الحضور" value={attendanceData.filter(a => a.user_id === user.id && a.status).length} color="green" />
        <StatBox label="بطاقات المنهج المكتملة" value={progressCards.filter(c => {
            const items = cardItems.filter(i => i.card_id === c.id);
            return items.length > 0 && items.every(i => userProgress.some(p => p.user_id === user.id && p.card_item_id === i.id && p.value > 0));
        }).length} color="blue" />
        <StatBox label="الشارات المكتسبة" value={userBadgeRequests.filter(br => br.status === 'approved').length} color="yellow" />
    </div>
);

const StatBox = ({ label, value, color }: {label: string, value: number, color: string}) => (
    <div className={`p-6 rounded-2xl border-2 text-center transition-all ${color === 'green' ? 'bg-green-50/50 border-green-100 dark:bg-green-900/20 dark:border-green-900 shadow-lg shadow-green-500/5' : color === 'yellow' ? 'bg-yellow-50/50 border-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-900 shadow-lg shadow-yellow-500/5' : 'bg-blue-50/50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900 shadow-lg shadow-blue-500/5'}`}>
        <span className="text-[10px] font-black block opacity-50 mb-2 uppercase tracking-widest">{label}</span>
        <span className="text-4xl font-black dark:text-white tracking-tighter">{value}</span>
    </div>
);
