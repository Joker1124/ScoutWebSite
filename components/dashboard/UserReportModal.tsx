
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { User, USER_ROLES, Unit, Team, TrackingField, TrackingRule, Attendance, ProgressCard, ProgressCardItem, Progress, Badge, BadgeRequest, BadgeRequirementProgress, PERMISSIONS, hasPermission } from '../../types';
import { X, ShieldCheck, MapPin, Save, Check } from 'lucide-react';

import { SettingsTab } from './user_report/SettingsTab';
import { BadgesTab } from './user_report/BadgesTab';
import { ProgressTab } from './user_report/ProgressTab';
import { OverviewTab } from './user_report/OverviewTab';

interface UserReportModalProps {
  user: User;
  onClose: () => void;
  units: Unit[];
  teams: Team[];
  trackingFields: TrackingField[];
  trackingRules: TrackingRule[];
  attendanceData: Attendance[];
  progressCards: ProgressCard[];
  cardItems: ProgressCardItem[];
  userProgress: Progress[];
  badges: Badge[];
  badgeRequests: BadgeRequest[];
  currentUser: User;
  onUpdateUser: (user: User, updates: Partial<User>) => void;
  onRefresh: () => void;
}

export const UserReportModal: React.FC<UserReportModalProps> = ({
  user, onClose, units, teams, trackingFields, trackingRules, attendanceData, progressCards, cardItems, userProgress, badges, badgeRequests, currentUser, onUpdateUser, onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'badges' | 'settings'>('overview');
  const [reqProgress, setReqProgress] = useState<BadgeRequirementProgress[]>([]);
  const [editableData, setEditableData] = useState({ ...user, password_hash: '' });

  useEffect(() => {
    fetchBadgeProgress();
  }, [user.id]);

  const fetchBadgeProgress = async () => {
    const { data } = await supabase.from('badge_requirements_progress').select('*').eq('user_id', user.id);
    if (data) setReqProgress(data);
  };

  const handleSave = () => {
      const isBecomingGL = editableData.role === 'group_leader';
      const updates: Partial<User> & { password_hash?: string } = {
          // Personal Data
          name: editableData.name,
          email: editableData.email,
          national_id: editableData.national_id,
          birthdate: editableData.birthdate,
          // Role & Structure
          role: editableData.role,
          rank: editableData.rank || 'scout', // Save Rank
          service_unit_id: editableData.service_unit_id || null, // Save Service Unit
          unit_id: isBecomingGL ? null : editableData.unit_id,
          team_id: (isBecomingGL || editableData.role === 'unit_leader' || editableData.role === 'scout_leader') ? null : user.team_id,
          custom_permissions: editableData.custom_permissions,
      };
      
      if (editableData.password_hash) {
          updates.password_hash = editableData.password_hash;
      }

      if (!isBecomingGL && !updates.unit_id) {
          alert('خطأ: يجب تحديد الشعبة التي سينتمي إليها الفرد لهذه الرتبة.');
          return;
      }
      onUpdateUser(user, updates);
      onClose();
  };

  const userBadgeRequests = badgeRequests.filter(br => br.user_id === user.id);

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-lg">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border-2 dark:border-gray-800 transition-colors">
          
          <div className="bg-blue-900 dark:bg-black text-white p-6 flex justify-between items-start shrink-0 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-700/20 via-transparent to-transparent"></div>
               <div className="flex gap-6 items-center relative z-10">
                   <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center font-black text-3xl border-2 border-white/20 shadow-inner">
                       {user.name.charAt(0)}
                   </div>
                   <div>
                       <h2 className="text-3xl font-black tracking-tight">{user.name}</h2>
                       <div className="flex flex-wrap gap-2 text-xs mt-3">
                           <span className="bg-white/20 dark:bg-blue-900/50 px-3 py-1 rounded-full flex items-center gap-1.5 font-bold uppercase"><ShieldCheck size={12}/> {USER_ROLES[user.role]}</span>
                           <span className="bg-white/20 dark:bg-blue-900/50 px-3 py-1 rounded-full flex items-center gap-1.5 font-bold uppercase"><MapPin size={12}/> {units.find(u => u.id === user.unit_id)?.name || 'القيادة المركزية'}</span>
                       </div>
                   </div>
               </div>
               <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-2xl transition-all relative z-10"><X size={24}/></button>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/80 p-1 flex gap-1 border-b-2 dark:border-gray-800 overflow-x-auto no-scrollbar shrink-0 transition-colors">
              <ModalTab id="overview" label="ملخص الإنجاز" active={activeTab} set={setActiveTab}/>
              <ModalTab id="progress" label="بطاقات المنهج" active={activeTab} set={setActiveTab}/>
              <ModalTab id="badges" label="دليل الشارات" active={activeTab} set={setActiveTab}/>
              {hasPermission(currentUser, PERMISSIONS.MANAGE_ROLES_PERMISSIONS) && <ModalTab id="settings" label="إعدادات الحساب" active={activeTab} set={setActiveTab}/>}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-12 dark:text-white bg-white dark:bg-gray-900 transition-colors">
               {activeTab === 'overview' && (
                   <OverviewTab 
                       user={user} 
                       attendanceData={attendanceData}
                       progressCards={progressCards}
                       cardItems={cardItems}
                       userProgress={userProgress}
                       userBadgeRequests={userBadgeRequests}
                   />
               )}
               {activeTab === 'badges' && <BadgesTab userBadgeRequests={userBadgeRequests} badges={badges} reqProgress={reqProgress} />}
               {activeTab === 'progress' && <ProgressTab user={user} progressCards={progressCards} cardItems={cardItems} userProgress={userProgress} />}
               {activeTab === 'settings' && (
                    <SettingsTab 
                        currentUser={currentUser}
                        editableData={editableData}
                        setEditableData={setEditableData}
                        units={units}
                        handleSave={handleSave}
                    />
               )}
          </div>
      </div>
    </div>
  );
};

const ModalTab = ({ id, label, active, set }: any) => (
    <button onClick={() => set(id)} className={`px-6 py-3 text-[10px] font-black transition-all border-b-2 uppercase tracking-tighter whitespace-nowrap ${active === id ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-white dark:bg-gray-900' : 'text-gray-500 border-transparent hover:text-gray-800 dark:hover:text-gray-300'}`}>
        {label}
    </button>
);
