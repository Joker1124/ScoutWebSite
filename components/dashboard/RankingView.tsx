
import React, { useState, useMemo } from 'react';
import { User, Team } from '../../types';
import { Award, Users, Shield, Star, Crown } from 'lucide-react';

interface RankingViewProps {
    users: User[];
    teams: Team[];
}

export const RankingView: React.FC<RankingViewProps> = ({ users, teams }) => {
    const [viewMode, setViewMode] = useState<'individual' | 'team'>('individual');
    
    const scouts = useMemo(() => {
        return users
            .filter(u => u.role === 'scout')
            .sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
    }, [users]);

    const teamScores = useMemo(() => {
        return teams.map(team => {
            const members = scouts.filter(s => s.team_id === team.id);
            const totalPoints = members.reduce((sum, member) => sum + (member.total_points || 0), 0);
            return {
                ...team,
                memberCount: members.length,
                totalPoints,
            };
        }).sort((a, b) => b.totalPoints - a.totalPoints);
    }, [teams, scouts]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-yellow-100 to-white dark:from-yellow-900/20 dark:to-gray-900/20 p-6 rounded-3xl border border-yellow-100 dark:border-yellow-900/30 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="relative z-10 mb-4 md:mb-0 text-center md:text-right">
                    <h2 className="text-2xl font-black text-yellow-900 dark:text-yellow-300 flex items-center justify-center md:justify-start gap-3 mb-1">
                        <div className="p-2 bg-yellow-200 dark:bg-yellow-800/50 rounded-xl"><Award size={24}/></div>
                        لوحة الشرف والترتيب
                    </h2>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400 opacity-80 font-medium">ترتيب الأفراد والطلائع بناءً على النقاط المكتسبة</p>
                </div>

                <div className="flex bg-white/50 dark:bg-gray-800/50 p-1.5 rounded-2xl border border-white/20 dark:border-gray-700 backdrop-blur-sm relative z-10 shadow-inner">
                    <button 
                        onClick={() => setViewMode('individual')} 
                        className={`px-4 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${viewMode === 'individual' ? 'bg-white dark:bg-gray-700 text-yellow-600 dark:text-yellow-400 shadow-lg shadow-yellow-500/10 scale-105' : 'text-gray-500 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-700/30'}`}
                    >
                        <Users size={16}/> ترتيب الأفراد
                    </button>
                    <button 
                        onClick={() => setViewMode('team')} 
                        className={`px-4 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${viewMode === 'team' ? 'bg-white dark:bg-gray-700 text-yellow-600 dark:text-yellow-400 shadow-lg shadow-yellow-500/10 scale-105' : 'text-gray-500 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-700/30'}`}
                    >
                        <Shield size={16}/> ترتيب الطلائع
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {viewMode === 'individual' ? (
                    scouts.map((scout, index) => (
                        <RankingCard key={scout.id} rank={index + 1} name={scout.name} points={scout.total_points || 0} />
                    ))
                ) : (
                    teamScores.map((team, index) => (
                        // @ts-ignore
                        <RankingCard key={team.id} rank={index + 1} name={team.name} points={team.totalPoints} isTeam members={team.memberCount}/>
                    ))
                )}
            </div>
        </div>
    );
};

const RankingCard: React.FC<{rank: number, name: string, points: number, isTeam?: boolean, members?: number}> = ({ rank, name, points, isTeam, members }) => {
    const isTop3 = rank <= 3;
    
    let rankStyle = '';
    let rankIcon = null;
    let cardBorder = 'border-white/20 dark:border-gray-700';
    let cardBg = 'glass-panel';

    if (rank === 1) {
        rankStyle = 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-white shadow-yellow-500/40';
        rankIcon = <Crown size={24} fill="currentColor" className="text-yellow-100"/>;
        cardBorder = 'border-yellow-400 dark:border-yellow-600 shadow-yellow-500/20';
        cardBg = 'bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-900/20 dark:to-gray-800';
    } else if (rank === 2) {
        rankStyle = 'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-gray-400/40';
        rankIcon = <Star size={24} fill="currentColor" className="text-gray-100"/>;
        cardBorder = 'border-gray-300 dark:border-gray-500 shadow-gray-400/20';
        cardBg = 'bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/40 dark:to-gray-800';
    } else if (rank === 3) {
        rankStyle = 'bg-gradient-to-br from-orange-300 to-orange-500 text-white shadow-orange-500/40';
        rankIcon = <Shield size={24} fill="currentColor" className="text-orange-100"/>;
        cardBorder = 'border-orange-300 dark:border-orange-600 shadow-orange-500/20';
        cardBg = 'bg-gradient-to-b from-orange-50 to-white dark:from-orange-900/20 dark:to-gray-800';
    } else {
        rankStyle = 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400';
    }

    return (
        <div className={`
            ${cardBg} p-4 rounded-2xl border ${cardBorder} 
            transition-all duration-300 hover:scale-[1.02] hover:shadow-xl relative overflow-hidden group
            ${isTop3 ? 'shadow-lg' : 'shadow-sm'}
        `}>
            {isTop3 && <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>}
            
            <div className="flex items-center gap-4 relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shrink-0 shadow-lg ${rankStyle} transform group-hover:rotate-6 transition-transform`}>
                    {rankIcon || rank}
                </div>
                
                <div className="flex-1 min-w-0">
                    <p className="font-black text-base truncate dark:text-white mb-0.5">{name}</p>
                    <p className={`text-[10px] font-bold flex items-center gap-1 ${isTeam ? 'text-blue-500' : 'text-gray-400'}`}>
                        {isTeam ? <Users size={10}/> : <Users size={10}/>}
                        {isTeam ? `${members} أعضاء` : 'كشاف'}
                    </p>
                </div>

                <div className="text-center bg-white/50 dark:bg-gray-900/50 p-2 rounded-xl backdrop-blur-sm border border-white/40 dark:border-gray-700 min-w-[60px]">
                    <span className={`block text-lg font-black leading-none ${rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-500' : rank === 3 ? 'text-orange-500' : 'text-blue-600 dark:text-blue-400'}`}>
                        {points}
                    </span>
                    <span className="block text-[9px] font-bold text-gray-400 mt-0.5 uppercase tracking-wider">نقطة</span>
                </div>
            </div>
        </div>
    );
};
