
import React, { useState, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { User, USER_ROLES, Attendance, Community, Unit, TrackingField, UNIT_LABELS, TrackingRule, ViolationAcknowledgment, Progress, ProgressCardItem } from '../../types';
import { AlertCircle, Bell, Users, Calendar, CheckCircle2, RefreshCw, Check, Trash2, TrendingUp, BarChartHorizontal, Activity, Award } from 'lucide-react';

interface OverviewProps {
  currentUser: User;
  users: User[];
  attendanceData: Attendance[];
  communities: Community[];
  selectedDate: string;
  units: Unit[];
  trackingFields: TrackingField[];
  trackingRules: TrackingRule[];
  violations: ViolationAcknowledgment[];
  onAcknowledge: (userId: string, ruleId: string, date: string) => void;
  onRefresh: () => void;
  userProgress: Progress[];
  cardItems: ProgressCardItem[];
}

export const Overview: React.FC<OverviewProps> = ({ 
  currentUser, users, attendanceData, communities, selectedDate, units, trackingFields, trackingRules, violations, onAcknowledge, onRefresh, userProgress, cardItems
}) => {
  const [procId, setProcId] = useState<string | null>(null);
  const myUnit = units.find(u => u.id === currentUser.unit_id);
  const labels = myUnit ? UNIT_LABELS[myUnit.type] : UNIT_LABELS.troop;
  const scouts = users.filter(u => u.role === 'scout');

  // --- Analytics Calculations ---
  const attendanceStats = useMemo(() => {
    const recordsInLast30Days = attendanceData.filter(a => {
        const date = new Date(a.date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return date >= thirtyDaysAgo;
    });
    const presentCount = recordsInLast30Days.filter(a => a.status).length;
    const absentCount = recordsInLast30Days.length - presentCount;
    const total = presentCount + absentCount;
    const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;
    return { present: presentCount, absent: absentCount, rate: rate };
  }, [attendanceData]);

  const progressStats = useMemo(() => {
      const totalItems = cardItems.length;
      if (totalItems === 0 || scouts.length === 0) return { rate: 0, completed: 0, total: 0 };

      const totalPossibleProgress = totalItems * scouts.length;
      const actualProgress = userProgress.length;
      const rate = totalPossibleProgress > 0 ? Math.round((actualProgress / totalPossibleProgress) * 100) : 0;
      return { rate, completed: actualProgress, total: totalPossibleProgress };
  }, [userProgress, cardItems, scouts]);

  const topScoutsByPoints = useMemo(() => {
      return [...scouts]
          .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
          .slice(0, 5);
  }, [scouts]);


  const handleStatusChange = async (userId: string, newStatus: 'active' | 'rejected') => {
      setProcId(userId);
      try {
          if (newStatus === 'rejected') {
              const { error } = await supabase.from('users').delete().eq('id', userId);
              if (error) throw error;
          } else {
              const { error } = await supabase.from('users').update({ status: 'active' }).eq('id', userId);
              if (error) throw error;
          }
          onRefresh();
      } catch (e: any) {
          console.error("Status Update Error:", e);
          alert("خطأ في تحديث الحالة: " + (e.message || "تأكد من صلاحيات قاعدة البيانات (RLS)"));
      } finally {
          setProcId(null);
      }
  };

  // Calculate REAL Tracking Violations based on Rules
  const operationalAlerts = useMemo(() => {
    const alerts: any[] = [];
    const targets = users.filter(user => user.role === 'scout'); // Check scouts only

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
                    if (!isAck) {
                         alerts.push({ 
                             id: `${user.id}-${rule.id}-${latestAbsenceDate}`,
                             userId: user.id,
                             userName: user.name, 
                             fieldName: field.name,
                             ruleAction: rule.violation_action,
                             ruleId: rule.id,
                             date: latestAbsenceDate,
                             count,
                             threshold: rule.violation_threshold
                         });
                    }
                }
            });
        });
    });
    return alerts;
  }, [users, trackingFields, trackingRules, attendanceData, violations]);

  const handleClearAllAlerts = async () => {
      if (!window.confirm('هل أنت متأكد من مسح جميع التنبيهات الحالية؟')) return;
      for (const alert of operationalAlerts) {
          onAcknowledge(alert.userId, alert.ruleId, alert.date);
      }
  };

  return (
    <div className="space-y-8" dir="rtl">
       <div className="flex justify-between items-center bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-3xl shadow-2xl shadow-blue-900/20 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
           <div className="relative z-10">
               <h2 className="text-3xl font-black mb-2">
                   {currentUser.role === 'priest' ? `مرحباً قدس ابونا ${currentUser.name} 👋` : `مرحباً يا ${currentUser.name} 👋`}
               </h2>
               <p className="text-blue-200 text-base font-medium flex items-center gap-2">
                   <span className="bg-blue-700/50 px-3 py-1 rounded-lg border border-blue-600/50">
                       {currentUser.role === 'priest' ? 'الاب الراعي' : labels.leader}
                   </span>
                   <span>-</span>
                   <span>{myUnit?.name || 'الإدارة العامة'}</span>
               </p>
           </div>
           <Calendar className="text-blue-400/20 w-24 h-24 absolute -bottom-4 -left-4 rotate-12" />
       </div>

        {/* Analytics Section */}
        <div className="glass-panel p-6 rounded-3xl border border-gray-200 dark:border-gray-700">
            <h3 className="font-black text-xl mb-6 flex items-center gap-3 text-gray-800 dark:text-white">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                    <BarChartHorizontal size={24}/>
                </div>
                مؤشرات الأداء (آخر 30 يوم)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <AnalyticsCard
                    title="معدل الحضور العام"
                    value={`${attendanceStats.rate}%`}
                    data={[
                        { label: 'حضور', value: attendanceStats.present, color: 'bg-green-500' },
                        { label: 'غياب', value: attendanceStats.absent, color: 'bg-red-400' }
                    ]}
                />
                 <AnalyticsCard
                    title="معدل إنجاز المنهج"
                    value={`${progressStats.rate}%`}
                    data={[
                        { label: 'تم', value: progressStats.completed, color: 'bg-blue-500' },
                        { label: 'متبقي', value: progressStats.total - progressStats.completed, color: 'bg-gray-300 dark:bg-gray-700' }
                    ]}
                />
                 <div className="bg-gray-50/50 dark:bg-gray-800/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-300">
                     <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                         <Award size={16} className="text-yellow-500"/> الأفراد الأكثر نقاطاً
                     </h4>
                     <div className="space-y-3">
                        {topScoutsByPoints.map((scout, idx) => (
                            <div key={scout.id} className="flex justify-between items-center text-sm group">
                                <div className="flex items-center gap-3">
                                    <span className={`
                                        w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold
                                        ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-transparent text-gray-400'}
                                    `}>
                                        {idx + 1}
                                    </span>
                                    <span className="font-bold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 transition-colors">{scout.name}</span>
                                </div>
                                <span className="font-mono font-bold bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-lg text-xs shadow-sm border border-gray-100 dark:border-gray-600">{scout.total_points || 0}</span>
                            </div>
                        ))}
                     </div>
                 </div>
            </div>
        </div>

       
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {(currentUser.role === 'group_leader' || currentUser.role === 'unit_leader') && (
               <div className="glass-panel p-6 rounded-3xl border border-gray-200 dark:border-gray-700 h-full">
                   <h3 className="font-black text-xl mb-6 flex items-center gap-3 text-gray-800 dark:text-white">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                          <Users size={24}/>
                      </div>
                      طلبات الانضمام
                   </h3>
                   <div className="space-y-4">
                       {users.filter(u => u.status === 'pending').length === 0 ? 
                           <div className="text-center py-12 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700">
                               <Users size={48} className="mx-auto text-gray-300 mb-3"/>
                               <p className="text-gray-400 text-sm font-medium">لا توجد طلبات معلقة حالياً</p>
                           </div>
                           : 
                           users.filter(u => u.status === 'pending').map(u => (
                               <div key={u.id} className="flex justify-between items-center p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-300">
                                   <div>
                                       <p className="font-bold text-gray-900 dark:text-white text-lg">{u.name}</p>
                                       <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">{USER_ROLES[u.role]}</p>
                                   </div>
                                   <div className="flex gap-2">
                                       <button 
                                          disabled={procId === u.id}
                                          onClick={() => handleStatusChange(u.id, 'active')}
                                          className="btn-primary text-xs px-5 py-2.5 flex items-center gap-2"
                                       >
                                           {procId === u.id ? <RefreshCw className="animate-spin" size={14}/> : <Check size={16}/>}
                                           <span>قبول</span>
                                       </button>
                                       <button 
                                          disabled={procId === u.id}
                                          onClick={() => handleStatusChange(u.id, 'rejected')}
                                          className="px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors"
                                       >
                                           رفض
                                       </button>
                                   </div>
                               </div>
                           ))
                       }
                   </div>
               </div>
           )}

           <div className="glass-panel p-6 rounded-3xl border border-gray-200 dark:border-gray-700 flex flex-col h-full">
               <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-xl flex items-center gap-3 text-gray-800 dark:text-white">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400">
                            <Bell size={24}/>
                        </div>
                        التنبيهات التشغيلية
                    </h3>
                    {operationalAlerts.length > 0 && (
                        <button onClick={handleClearAllAlerts} className="text-xs font-bold text-gray-400 hover:text-red-500 flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                            <Trash2 size={14}/> مسح الكل
                        </button>
                    )}
               </div>
               
               <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar pr-2">
                   {operationalAlerts.length === 0 ? 
                       <div className="text-center py-12 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700 h-full flex flex-col justify-center items-center">
                           <CheckCircle2 size={48} className="text-green-500 mb-3 opacity-50"/>
                           <p className="text-gray-400 text-sm font-medium">سجل نظيف! لا توجد تنبيهات.</p>
                       </div>
                       : 
                       operationalAlerts.map((alert: any) => (
                           <div key={alert.id} className="flex justify-between items-start p-4 rounded-2xl border-r-4 border-orange-500 bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-100/50 transition-colors group">
                               <div>
                                   <div className="flex items-center gap-2 mb-1">
                                       <span className="font-bold text-gray-900 dark:text-white">{alert.userName}</span>
                                       <span className="text-[10px] font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-md text-gray-500 uppercase tracking-wide">{alert.fieldName}</span>
                                   </div>
                                   <p className="text-xs text-orange-800 dark:text-orange-300 font-medium leading-relaxed">
                                       تجاوز الحد ({alert.count}/{alert.threshold}) <br/>
                                       <span className="font-bold">الإجراء المطلوب:</span> {alert.ruleAction}
                                   </p>
                               </div>
                               <button 
                                    onClick={() => onAcknowledge(alert.userId, alert.ruleId, alert.date)}
                                    className="p-2 bg-white dark:bg-gray-800 hover:bg-orange-500 hover:text-white text-gray-400 rounded-xl shadow-sm transition-all duration-300 opacity-0 group-hover:opacity-100"
                                    title="تم الإطلاع / مسح التنبيه"
                                >
                                   <Check size={18}/>
                               </button>
                           </div>
                       ))
                   }
               </div>
           </div>
       </div>
    </div>
  );
};

const AnalyticsCard = ({title, value, data}: {title: string, value: string, data: {label: string, value: number, color: string}[]}) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return (
        <div className="bg-gray-50/50 dark:bg-gray-800/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</span>
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{value}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 flex overflow-hidden mb-4">
                {data.map(item => {
                    const width = total > 0 ? (item.value / total) * 100 : 0;
                    return <div key={item.label} className={item.color} style={{width: `${width}%`}} title={`${item.label}: ${item.value}`}></div>
                })}
            </div>
             <div className="flex justify-between text-[10px] font-bold">
                {data.map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${item.color}`}></div>
                        <span className="text-gray-500 dark:text-gray-400">{item.label}: <span className="text-gray-900 dark:text-white text-xs">{item.value}</span></span>
                    </div>
                ))}
            </div>
        </div>
    )
};
