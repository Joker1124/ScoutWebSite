
import React from 'react';
import { User, TrackingField, Attendance, hasPermission, PERMISSIONS } from '../../../types';
import { Calendar, CheckCircle, RefreshCw, User as UserIcon } from 'lucide-react';

interface RegisterViewProps {
    currentUser: User;
    users: User[];
    trackingFields: TrackingField[];
    attendanceData: Attendance[];
    selectedDate: string;
    setSelectedDate: (date: string) => void;
    handleAttendance: (userId: string, fieldId: string, currentStatus: boolean) => void;
    processingId: string | null;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ currentUser, users, trackingFields, attendanceData, selectedDate, setSelectedDate, handleAttendance, processingId }) => {
    const canRegister = hasPermission(currentUser, PERMISSIONS.REGISTER_ATTENDANCE);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            {/* Header Card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h3 className="font-bold text-2xl mb-2">التسجيل الميداني</h3>
                        <p className="text-blue-100 text-sm opacity-90 max-w-md">
                            قم بتسجيل الحضور والغياب والمتابعة اليومية للأفراد. يتم حفظ البيانات تلقائياً واحتساب النقاط.
                        </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-xl flex items-center gap-3">
                         <Calendar className="text-blue-200" size={20}/>
                         <input 
                            type="date" 
                            value={selectedDate} 
                            onChange={e => setSelectedDate(e.target.value)} 
                            className="bg-transparent text-white font-bold outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                        />
                    </div>
                </div>
            </div>
            
            {/* Data Table */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 dark:bg-gray-800 z-20 min-w-[180px]">
                                    اسم الكشاف
                                </th>
                                {trackingFields.map(f => (
                                    <th key={f.id} className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[120px]">
                                        {f.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {users.filter(u => u.status === 'active' && u.role !== 'group_leader').map(user => (
                                <tr key={user.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors group">
                                    <td className="p-4 sticky right-0 bg-white dark:bg-gray-900 group-hover:bg-blue-50/30 dark:group-hover:bg-gray-700/30 z-10 border-l border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                                                <UserIcon size={14} />
                                            </div>
                                            <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{user.name}</span>
                                        </div>
                                    </td>
                                    {trackingFields.map(field => {
                                        const record = attendanceData.find(a => a.user_id === user.id && a.field_id === field.id && a.date === selectedDate);
                                        const isChecked = record?.status || false;
                                        const isThisLoading = processingId === `att-${user.id}-${field.id}`;

                                        return (
                                            <td key={field.id} className="p-3 text-center">
                                                <button 
                                                    disabled={!canRegister || !!processingId}
                                                    onClick={() => canRegister && handleAttendance(user.id, field.id, isChecked)} 
                                                    className={`
                                                        w-12 h-10 rounded-xl flex items-center justify-center mx-auto transition-all duration-200
                                                        ${isChecked 
                                                            ? 'bg-green-500 text-white shadow-md shadow-green-500/20 hover:bg-green-600 hover:scale-105' 
                                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                        }
                                                        ${!canRegister && 'opacity-50 cursor-not-allowed'}
                                                    `}
                                                >
                                                    {isThisLoading ? (
                                                        <RefreshCw className="animate-spin" size={18}/>
                                                    ) : (
                                                        isChecked ? <CheckCircle size={20} strokeWidth={2.5}/> : <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                                                    )}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
