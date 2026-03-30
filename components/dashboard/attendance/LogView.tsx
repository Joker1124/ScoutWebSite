
import React, { useState } from 'react';
import { User, TrackingField, Attendance } from '../../../types';
import { Search, Calendar, Filter, CheckCircle, XCircle, User as UserIcon } from 'lucide-react';

interface LogViewProps {
    currentUser: User;
    users: User[];
    trackingFields: TrackingField[];
    attendanceData: Attendance[];
}

type ViewMode = 'by_date' | 'by_user' | 'by_field';

export const LogView: React.FC<LogViewProps> = ({ currentUser, users, trackingFields, attendanceData }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('by_date');
    const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
    const [targetUserId, setTargetUserId] = useState('');
    const [targetFieldId, setTargetFieldId] = useState(trackingFields[0]?.id || '');

    // Security & Logic
    const isSimpleScout = currentUser.role === 'scout' && currentUser.rank === 'scout';
    const effectiveUsers = isSimpleScout 
        ? users.filter(u => u.id === currentUser.id) 
        : users.filter(u => u.role !== 'group_leader'); // Don't track group leaders

    // Initial setup for default selections
    React.useEffect(() => {
        if (effectiveUsers.length > 0 && !targetUserId) {
            setTargetUserId(effectiveUsers[0].id);
        }
        if (trackingFields.length > 0 && !targetFieldId) {
            setTargetFieldId(trackingFields[0].id);
        }
    }, [effectiveUsers, trackingFields]);

    // --- RENDERERS ---

    // 1. By Date: Rows = Users, Cols = Fields
    const renderByDate = () => {
        return (
            <div className="glass-panel rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 dark:bg-gray-800 z-20 min-w-[180px]">اسم الكشاف</th>
                                {trackingFields.map(f => (
                                    <th key={f.id} className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">{f.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {effectiveUsers.map(user => (
                                <tr key={user.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="p-4 sticky right-0 bg-white dark:bg-gray-900 z-10 border-l border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                                                <UserIcon size={14} />
                                            </div>
                                            <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{user.name}</span>
                                        </div>
                                    </td>
                                    {trackingFields.map(f => {
                                        const rec = attendanceData.find(a => a.user_id === user.id && a.field_id === f.id && a.date === targetDate);
                                        return (
                                            <td key={f.id} className="p-3 text-center">
                                                {rec ? (
                                                    rec.status ? <CheckCircle size={20} className="text-green-500 mx-auto"/> : <XCircle size={20} className="text-red-400 mx-auto opacity-50"/>
                                                ) : <span className="text-gray-300 dark:text-gray-600">-</span>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // 2. By User: Rows = Dates (Active), Cols = Fields
    const renderByUser = () => {
        // Find distinct dates where this user has ANY record
        const userDates = Array.from(new Set(
            attendanceData
                .filter(a => a.user_id === targetUserId)
                .map(a => a.date)
        )).sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());

        if (userDates.length === 0) return <EmptyState msg="لا توجد سجلات لهذا الفرد" />;

        return (
            <div className="glass-panel rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 dark:bg-gray-800 z-20">التاريخ</th>
                                {trackingFields.map(f => (
                                    <th key={f.id} className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">{f.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {userDates.map(date => (
                                <tr key={date} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="p-4 sticky right-0 bg-white dark:bg-gray-900 z-10 border-l border-gray-100 dark:border-gray-800 font-mono text-sm font-bold text-gray-700 dark:text-gray-300">{date}</td>
                                    {trackingFields.map(f => {
                                        const rec = attendanceData.find(a => a.user_id === targetUserId && a.field_id === f.id && a.date === date);
                                        return (
                                            <td key={f.id} className="p-3 text-center">
                                                {rec ? (
                                                    rec.status ? <CheckCircle size={20} className="text-green-500 mx-auto"/> : <XCircle size={20} className="text-red-400 mx-auto opacity-50"/>
                                                ) : <span className="text-gray-300 dark:text-gray-600">-</span>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // 3. By Field: Rows = Users, Cols = Dates (Active)
    const renderByField = () => {
        // Find distinct dates where ANY user has a record for this field
        const fieldDates = Array.from(new Set(
            attendanceData
                .filter(a => a.field_id === targetFieldId)
                .map(a => a.date)
        )).sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime()).slice(0, 15); // Limit columns for horizontal space

        if (fieldDates.length === 0) return <EmptyState msg="لا توجد بيانات لهذا البند" />;

        return (
            <div className="glass-panel rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 dark:bg-gray-800 z-20 min-w-[180px]">اسم الكشاف</th>
                                {fieldDates.map(date => (
                                    <th key={date} className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">{date}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {effectiveUsers.map(user => (
                                <tr key={user.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="p-4 sticky right-0 bg-white dark:bg-gray-900 z-10 border-l border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                                                <UserIcon size={14} />
                                            </div>
                                            <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{user.name}</span>
                                        </div>
                                    </td>
                                    {fieldDates.map(date => {
                                        const rec = attendanceData.find(a => a.user_id === user.id && a.field_id === targetFieldId && a.date === date);
                                        return (
                                            <td key={date} className="p-3 text-center">
                                                {rec ? (
                                                    rec.status ? <CheckCircle size={20} className="text-green-500 mx-auto"/> : <XCircle size={20} className="text-red-400 mx-auto opacity-50"/>
                                                ) : <span className="text-gray-300 dark:text-gray-600">-</span>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const EmptyState = ({msg}: {msg:string}) => (
        <div className="text-center py-16 bg-gray-50/50 dark:bg-gray-800/50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
            <Filter size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600"/>
            <p className="text-gray-500 dark:text-gray-400 font-medium">{msg}</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
             {/* Controls Header */}
             <div className="glass-panel p-4 rounded-2xl flex flex-wrap gap-4 items-end">
                 
                 <div className="flex-1 min-w-[200px]">
                     <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">طريقة العرض</label>
                     <div className="relative">
                         <select 
                            value={viewMode} 
                            onChange={e => setViewMode(e.target.value as ViewMode)}
                            className="input-field appearance-none"
                         >
                             <option value="by_date">عرض شامل بالتاريخ</option>
                             {!isSimpleScout && <option value="by_user">سجل فرد محدد</option>}
                             <option value="by_field">تحليل بند محدد</option>
                         </select>
                         <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16}/>
                     </div>
                 </div>

                 {viewMode === 'by_date' && (
                     <div className="flex-1 min-w-[200px]">
                         <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">تاريخ السجل</label>
                         <div className="relative">
                             <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="input-field pl-10"/>
                             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16}/>
                         </div>
                     </div>
                 )}

                 {viewMode === 'by_user' && (
                     <div className="flex-1 min-w-[200px]">
                         <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">اختر الفرد</label>
                         <div className="relative">
                             <select value={targetUserId} onChange={e => setTargetUserId(e.target.value)} className="input-field appearance-none">
                                 {effectiveUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                             </select>
                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16}/>
                         </div>
                     </div>
                 )}

                 {viewMode === 'by_field' && (
                     <div className="flex-1 min-w-[200px]">
                         <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">اختر البند</label>
                         <div className="relative">
                             <select value={targetFieldId} onChange={e => setTargetFieldId(e.target.value)} className="input-field appearance-none">
                                 {trackingFields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                             </select>
                             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16}/>
                         </div>
                     </div>
                 )}
             </div>

             {/* Content Area */}
             <div className="min-h-[300px]">
                 {viewMode === 'by_date' && renderByDate()}
                 {viewMode === 'by_user' && renderByUser()}
                 {viewMode === 'by_field' && renderByField()}
             </div>
        </div>
    );
};
