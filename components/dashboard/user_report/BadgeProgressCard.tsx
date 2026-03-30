
import React from 'react';
import { Badge, BadgeRequest, BadgeRequirementProgress } from '../../../types';
import { Check, CheckCircle } from 'lucide-react';

interface BadgeProgressCardProps {
    badge: Badge;
    userBadgeRequest?: BadgeRequest;
    reqProgress: BadgeRequirementProgress[];
}

export const BadgeProgressCard: React.FC<BadgeProgressCardProps> = ({ badge, userBadgeRequest, reqProgress }) => {
    const isApprovedForTracking = userBadgeRequest?.status === 'approved';
    const badgeReqs = badge.requirements || [];
    const completedCount = reqProgress.filter(p => p.badge_id === badge.id).length;
    const progressPercent = badgeReqs.length > 0 ? Math.round((completedCount / badgeReqs.length) * 100) : 0;
    const isCompleted = progressPercent === 100 && badgeReqs.length > 0;

    let statusText = 'غير مرشح';
    let statusBg = 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400';

    if(userBadgeRequest?.status === 'pending') {
        statusText = 'طلب معلق';
        statusBg = 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300';
    } else if (isCompleted) {
        statusText = 'شارة مكتملة';
        statusBg = 'bg-green-500 text-white';
    } else if (isApprovedForTracking) {
        statusText = 'قيد الإنجاز';
        statusBg = 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400';
    }

    return (
        <div className={`p-4 rounded-xl border-2 transition-all flex flex-col ${isCompleted ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800 shadow-lg shadow-green-500/5' : 'bg-gray-50/50 border-gray-100 dark:bg-gray-800/40 dark:border-gray-800 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <h4 className="font-black text-gray-900 dark:text-blue-100 text-sm">{badge.title}</h4>
                    <span className={`text-[8px] font-black uppercase mt-1 px-1.5 py-0.5 rounded-full inline-block ${statusBg}`}>
                        {statusText}
                    </span>
                </div>
                {isCompleted && <CheckCircle size={20} className="text-green-500" strokeWidth={3}/>}
            </div>

            <div className="mb-3">
                <div className="flex justify-between text-[9px] font-black mb-1 opacity-50 uppercase tracking-widest">
                    <span>نسبة الإتمام</span>
                    <span className={isCompleted ? 'text-green-600' : 'text-blue-600'}>{progressPercent}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                    <div className={`h-full transition-all duration-1000 ${isCompleted ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-blue-500 shadow-lg shadow-blue-500/50'}`} style={{ width: `${progressPercent}%` }}></div>
                </div>
            </div>

            <div className="space-y-1.5 flex-1 opacity-80">
                {badgeReqs.map((reqText, idx) => {
                    const isDone = reqProgress.some(p => p.badge_id === badge.id && p.requirement_index === idx);
                    return (
                        <div key={idx} className={`flex items-center justify-between text-[10px] p-2 rounded-md border-2 transition-all ${isDone ? 'bg-white dark:bg-gray-900 border-green-200 dark:border-green-900 text-green-900 dark:text-green-300' : 'bg-white/50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-600'}`}>
                            <span className="font-bold leading-relaxed">{reqText}</span>
                            {isDone && <Check size={12} className="text-green-600" strokeWidth={3}/>}
                        </div>
                    )
                })}
                 {badgeReqs.length === 0 && <p className="text-xs text-center text-gray-400 italic">لا توجد بنود لهذه الشارة.</p>}
            </div>
        </div>
    );
};
