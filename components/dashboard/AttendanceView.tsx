
import React, { useState, useEffect } from 'react';
import { User, TrackingField, Attendance, TrackingRule, ViolationAcknowledgment, hasPermission, PERMISSIONS } from '../../types';
import { RegisterView } from './attendance/RegisterView';
import { LogView } from './attendance/LogView';
import { ViolationsView } from './attendance/ViolationsView';
import { ClipboardList, FileText, AlertOctagon } from 'lucide-react';
import { writeInsert, writeUpsert, writeUpdate, writeDelete, getTable, setTable } from '../../src/offline';

interface AttendanceViewProps {
  currentUser: User;
  users: User[];
  trackingFields: TrackingField[];
  trackingRules: TrackingRule[];
  attendanceData: Attendance[];
  violations: ViolationAcknowledgment[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  handleAttendance: (userId: string, fieldId: string, currentStatus: boolean) => void;
  onAcknowledge: (userId: string, ruleId: string, date: string) => void;
  processingId: string | null;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  currentUser, users, trackingFields, trackingRules, attendanceData, violations, selectedDate, setSelectedDate, handleAttendance, onAcknowledge, processingId
}) => {
  const canRegister = hasPermission(currentUser, PERMISSIONS.REGISTER_ATTENDANCE);
  const [viewMode, setViewMode] = useState<'register' | 'log' | 'violations'>(canRegister ? 'register' : 'log');

  const getActiveViolations = () => {
    const activeViolations: { user: User, field: TrackingField, rule: TrackingRule, count: number, dates: string[] }[] = [];
    
    // Filter users: if scout, only process themselves
    const targets = currentUser.role === 'scout' ? users.filter(u => u.id === currentUser.id) : users;

    targets.forEach(user => {
        trackingFields.forEach(field => {
            const rules = trackingRules.filter(r => r.field_id === field.id);
            rules.forEach(rule => {
                const records = attendanceData
                    .filter(a => a.user_id === user.id && a.field_id === field.id)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                
                let violationDetected = false;
                let absentDates: string[] = [];
                let count = 0;

                if (rule.is_consecutive !== false) {
                    for (let rec of records) { if (!rec.status) { count++; absentDates.push(rec.date); } else { break; } }
                    if (count >= rule.violation_threshold) violationDetected = true;
                } else {
                    const cutoffDate = new Date();
                    cutoffDate.setDate(cutoffDate.getDate() - (rule.timeframe_days || 30));
                    const relevantRecords = records.filter(r => new Date(r.date) >= cutoffDate);
                    const absences = relevantRecords.filter(r => !r.status);
                    count = absences.length;
                    absentDates = absences.map(r => r.date);
                    if (count >= rule.violation_threshold) violationDetected = true;
                }

                if (violationDetected) {
                    const latestAbsenceDate = absentDates[0];
                    const isAck = violations.some(v => v.user_id === user.id && v.rule_id === rule.id && v.violation_date === latestAbsenceDate);
                    if (!isAck) activeViolations.push({ user, field, rule, count, dates: absentDates });
                }
            });
        });
    });
    return activeViolations;
  };

  const detectedViolations = getActiveViolations();

  return (
    <div className="space-y-6 text-gray-900 dark:text-white transition-colors">
        {/* Navigation Tabs */}
        <div className="flex p-1 gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit mx-auto md:mx-0 border border-gray-200 dark:border-gray-700">
            {canRegister && (
                <TabButton 
                    id="register" 
                    active={viewMode} 
                    set={setViewMode} 
                    label="تسجيل الحضور" 
                    icon={<ClipboardList size={18}/>}
                />
            )}
            <TabButton 
                id="log" 
                active={viewMode} 
                set={setViewMode} 
                label={canRegister ? "السجل العام" : "سجلي الشخصي"} 
                icon={<FileText size={18}/>}
            />
            <TabButton 
                id="violations" 
                active={viewMode} 
                set={setViewMode} 
                label={canRegister ? "المخالفات" : "مخالفاتي"} 
                icon={<AlertOctagon size={18}/>}
                count={detectedViolations.length} 
                isDanger
            />
        </div>

        {/* Content Area */}
        <div className="min-h-[500px]">
            {viewMode === 'register' && canRegister && (
                <RegisterView 
                    currentUser={currentUser}
                    users={users} 
                    trackingFields={trackingFields} 
                    attendanceData={attendanceData}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    handleAttendance={handleAttendance}
                    processingId={processingId}
                />
            )}

            {viewMode === 'log' && (
                <LogView 
                    currentUser={currentUser}
                    users={users}
                    trackingFields={trackingFields}
                    attendanceData={attendanceData}
                />
            )}
            
            {viewMode === 'violations' && (
                <ViolationsView 
                    detectedViolations={detectedViolations}
                    onAcknowledge={onAcknowledge}
                    currentUser={currentUser}
                />
            )}
        </div>
    </div>
  );
};

const TabButton = ({id, active, set, label, count, icon, isDanger}: any) => {
    const isActive = active === id;
    return (
        <button 
            onClick={() => set(id)} 
            className={`
                relative px-5 py-2.5 text-sm font-bold rounded-xl flex items-center gap-2 transition-all duration-300
                ${isActive 
                    ? (isDanger 
                        ? 'bg-red-50 text-red-600 shadow-sm ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-900' 
                        : 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200 dark:bg-gray-700 dark:text-blue-400 dark:ring-gray-600') 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                }
            `}
        >
            {icon}
            <span>{label}</span>
            {count > 0 && (
                <span className={`
                    absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white shadow-sm
                    ${isDanger ? 'bg-red-500' : 'bg-blue-500'}
                `}>
                    {count}
                </span>
            )}
        </button>
    );
};
