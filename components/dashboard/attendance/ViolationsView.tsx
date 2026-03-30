
import React from 'react';
import { User, TrackingField, TrackingRule } from '../../../types';
import { AlertTriangle, CheckCircle2, Clock, AlertOctagon } from 'lucide-react';

interface Violation {
    user: User;
    field: TrackingField;
    rule: TrackingRule;
    count: number;
    dates: string[];
}

interface ViolationsViewProps {
    detectedViolations: Violation[];
    onAcknowledge: (userId: string, ruleId: string, date: string) => void;
    currentUser: User;
}

export const ViolationsView: React.FC<ViolationsViewProps> = ({ detectedViolations, onAcknowledge, currentUser }) => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Alert */}
            <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-start gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                    <AlertTriangle size={24}/>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-red-900 dark:text-red-100">سجل المخالفات النشطة</h3>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1 opacity-80">
                        هذه القائمة تعرض الأفراد الذين تجاوزوا حدود الغياب المسموح بها وفقاً للقواعد المحددة. يرجى اتخاذ الإجراء المناسب وتأكيده.
                    </p>
                </div>
            </div>

            {detectedViolations.length === 0 ? (
                <div className="text-center py-24 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <CheckCircle2 size={64} className="mx-auto mb-4 text-green-500 opacity-50"/>
                    <h4 className="text-lg font-bold text-gray-700 dark:text-gray-200">سجل نظيف!</h4>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">لا توجد مخالفات نشطة حالياً. التزام ممتاز.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {detectedViolations.map((v, index) => (
                        <div key={index} className="group bg-white dark:bg-gray-800 p-5 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm hover:shadow-md hover:border-red-200 dark:hover:border-red-800 transition-all duration-300 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 dark:bg-red-900/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500"></div>
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-bold text-lg text-gray-900 dark:text-white">{v.user.name}</h4>
                                        <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded-md uppercase tracking-wide">
                                            {v.field.name}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                                        <span className="text-xl font-black leading-none">{v.count}</span>
                                        <span className="text-[9px] font-bold uppercase">غياب</span>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-5">
                                    <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 p-2.5 rounded-lg">
                                        <AlertOctagon size={14} className="text-red-500 mt-0.5 shrink-0"/>
                                        <span>
                                            <span className="font-bold block text-gray-700 dark:text-gray-200 mb-0.5">الإجراء المطلوب:</span>
                                            {v.rule.violation_action}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 px-1">
                                        <Clock size={14}/>
                                        <span>
                                            {v.rule.is_consecutive ? 'مرات متتالية' : `خلال ${v.rule.timeframe_days} يوم`}
                                            {' • '}
                                            آخر غياب: <span className="font-mono font-bold">{v.dates[0]}</span>
                                        </span>
                                    </div>
                                </div>

                                {currentUser.role !== 'priest' && (
                                    <button 
                                        onClick={() => onAcknowledge(v.user.id, v.rule.id, v.dates[0])}
                                        className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 size={16}/>
                                        تأكيد اتخاذ الإجراء
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
