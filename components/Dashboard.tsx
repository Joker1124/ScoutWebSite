
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { User, Unit, Team, TrackingField, Attendance, Progress, Community, ProgressCard, ProgressCardItem, TrackingRule, ViolationAcknowledgment, UserCard, PERMISSIONS, hasPermission, Badge, BadgeRequest, ProgressCardRequest, USER_ROLES } from '../types';
import { CheckSquare, BarChart2, MessageSquare, Settings, Shield, UserCog, Award, Database, UserCheck, Activity, Trash2, AlertTriangle, Music, Archive, Award as RankingIcon, DollarSign } from 'lucide-react';
import { writeInsert, writeUpsert, writeUpdate, writeDelete } from '../src/offline';
import { Overview } from './dashboard/Overview';
import { AttendanceView } from './dashboard/AttendanceView';
import { ProgressView } from './dashboard/ProgressView';
import { CommunityView } from './dashboard/CommunityView';
import { Configuration } from './dashboard/Configuration';
import { ProfileView } from './dashboard/ProfileView';
import { BadgeView } from './dashboard/BadgeView';
import { DatabaseExplorer } from './dashboard/DatabaseExplorer';
import { UserReportModal } from './dashboard/UserReportModal';
import { UserManagement } from './dashboard/UserManagement';
import { ChantsView } from './dashboard/ChantsView';
import { InventoryView } from './dashboard/InventoryView';
import { RankingView } from './dashboard/RankingView';
import { FinanceView } from './dashboard/FinanceView';
import { useRealtimeSync } from '../hooks/useRealtimeSync';

// Points Configuration
export const POINTS_CONFIG = {
    ATTENDANCE: 10,
    PROGRESS_ITEM: 25,
    BADGE: 100,
};

interface DashboardProps {
  currentUser: User;
  units: Unit[];
  selectedUnitId: string | null;
  onUnitsChange: (units: Unit[]) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ currentUser, units, selectedUnitId, onUnitsChange }) => {
  const { data: syncedData, loading: syncLoading, refresh: refreshData } = useRealtimeSync(currentUser);
  const [activeTab, setActiveTab] = useState('overview');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, userId: string | null, userName: string}>({
    isOpen: false, userId: null, userName: ''
  });

  const [selectedReportUser, setSelectedReportUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Derived data with filtering logic
  const filteredData = useMemo(() => {
    const isServiceRanger = currentUser.role === 'scout' && !!currentUser.service_unit_id;
    
    let filteredUsers = syncedData.users;
    if (currentUser.role === 'group_leader' || currentUser.role === 'priest') {
        if (selectedUnitId) {
            filteredUsers = filteredUsers.filter(u => u.unit_id === selectedUnitId || u.service_unit_id === selectedUnitId || u.role === 'group_leader' || u.role === 'priest');
        }
    } else if (currentUser.role === 'scout' && (currentUser.rank === 'team_leader' || currentUser.rank === 'chief_leader')) {
        if (currentUser.team_id) {
            filteredUsers = filteredUsers.filter(u => u.team_id === currentUser.team_id);
        } else {
            filteredUsers = filteredUsers.filter(u => u.id === currentUser.id);
        }
    } else if (isServiceRanger) {
        filteredUsers = filteredUsers.filter(u => u.unit_id === currentUser.unit_id || u.service_unit_id === currentUser.service_unit_id || u.unit_id === currentUser.service_unit_id);
    } else {
        const targetUnit = currentUser.unit_id;
        if (targetUnit) {
            filteredUsers = filteredUsers.filter(u => u.unit_id === targetUnit || u.service_unit_id === targetUnit);
        }
    }

    const relevantUserIds = filteredUsers.map(u => u.id);
    
    return {
        users: filteredUsers,
        teams: syncedData.teams,
        trackingFields: syncedData.trackingFields,
        attendanceData: syncedData.attendance.filter(a => relevantUserIds.includes(a.user_id)),
        communities: syncedData.communities,
        progressCards: syncedData.progressCards.filter(card => {
            const unitIdForFilter = selectedUnitId || ((currentUser.role !== 'group_leader' && currentUser.role !== 'priest') ? currentUser.unit_id : null);
            return !unitIdForFilter || card.unit_id === unitIdForFilter || !card.unit_id;
        }),
        cardItems: syncedData.progressCardItems,
        userProgress: syncedData.progress.filter(p => relevantUserIds.includes(p.user_id)),
        userCards: syncedData.userCards.filter(uc => relevantUserIds.includes(uc.user_id)),
        cardRequests: syncedData.progressCardRequests,
        trackingRules: syncedData.trackingRules,
        violations: syncedData.violations.filter(v => relevantUserIds.includes(v.user_id)),
        badges: syncedData.badges,
        badgeRequests: syncedData.badgeRequests,
        badgeRequirementProgress: syncedData.badgeRequirementProgress,
        communityPosts: syncedData.communityPosts,
        inventoryItems: syncedData.inventoryItems,
        inventoryLogs: syncedData.inventoryLogs,
        inventoryCustodianships: syncedData.inventoryCustodianships,
        funds: syncedData.funds,
        transactions: syncedData.transactions,
        externalSupplies: syncedData.externalSupplies
    };
  }, [syncedData, currentUser, selectedUnitId]);

  const { users, teams, trackingFields, attendanceData, communities, communityPosts, progressCards, cardItems, userProgress, userCards, cardRequests, trackingRules, violations, badges, badgeRequests, badgeRequirementProgress } = filteredData;

  const contextualCurrentUser = useMemo(() => {
    return users.find(u => u.id === currentUser.id) || currentUser;
  }, [users, currentUser]);

  const showMessage = (type: 'success' | 'error', text: string) => {
      setMessage({ type, text });
      setTimeout(() => setMessage(null), 3000);
  };

  const awardPoints = async (userId: string, points: number, reason: string, relatedId?: string) => {
    try {
        await writeInsert('points_log', {
            user_id: userId,
            points_awarded: points,
            reason: reason,
            related_id: relatedId,
        }, { optimisticTable: 'points_log' });
        
        const user = users.find(u => u.id === userId);
        if (user) {
            await writeUpdate('users', { total_points: (user.total_points || 0) + points }, { id: userId }, { optimisticTable: 'users' });
        }
    } catch (e) {
        console.error("Failed to award points:", e);
    }
  };

  const fetchData = async () => {
      // Data is now handled by useRealtimeSync
  };

  const handleAttendance = async (userId: string, fieldId: string, currentlyChecked: boolean) => {
    const actionId = `att-${userId}-${fieldId}`;
    if (processingId) return; 
    setProcessingId(actionId);
    
    try {
        const newStatus = !currentlyChecked;
        const existing = filteredData.attendance.find(a => a.user_id === userId && a.field_id === fieldId && a.date === selectedDate);
        await writeUpsert('attendance', { 
            id: existing?.id || crypto.randomUUID(),
            user_id: userId, 
            field_id: fieldId, 
            date: selectedDate, 
            status: newStatus
        }, { optimisticTable: 'attendance' });
        
        // Award/remove points
        if (newStatus) {
            await awardPoints(userId, POINTS_CONFIG.ATTENDANCE, 'حضور', fieldId);
        }
    } catch (e: any) {
        console.error("Attendance Error", e);
        showMessage('error', 'حدث خطأ في تحديث الحضور.');
    } finally {
        setProcessingId(null);
    }
  };

  const handleProgress = async (userId: string, itemId: string, currentlyDone: boolean) => {
    const actionId = `prog-${userId}-${itemId}`;
    if (processingId) return;
    setProcessingId(actionId);
    
    try {
        if (currentlyDone) {
            const row = userProgress.find(p => p.user_id === userId && p.card_item_id === itemId);
            if (row && row.id) await writeDelete('progress', { id: row.id }, { optimisticTable: 'progress' });
        } else {
            await writeUpsert('progress', {
                user_id: userId,
                card_item_id: itemId,
                value: 1,
                updated_at: new Date().toISOString()
            }, { optimisticTable: 'progress' });
            await awardPoints(userId, POINTS_CONFIG.PROGRESS_ITEM, 'بند منهج', itemId);
        }
    } catch (e: any) {
        console.error("Progress Error", e);
        showMessage('error', 'فشل تحديث التقدم: ' + e.message);
    } finally {
        setProcessingId(null);
    }
  };

  const onUpdateSubordinate = async (user: User, updates: Partial<User>) => {
      await writeUpdate('users', updates, { id: user.id }, { optimisticTable: 'users' });
      showMessage('success', 'تم تحديث البيانات');
  };

  const handleAddUser = async (newUser: Partial<User>) => {
      await writeInsert('users', {
          ...newUser,
          id: crypto.randomUUID(),
          status: 'active',
          created_at: new Date().toISOString()
      }, { optimisticTable: 'users' });
      showMessage('success', 'تم إضافة الفرد وتفعيل حسابه بنجاح');
  };

  // 1. Prompt Deletion (Opens Modal)
  const promptDeleteUser = (userId: string) => {
      const user = users.find(u => u.id === userId);
      setDeleteModal({
          isOpen: true,
          userId: userId,
          userName: user?.name || 'مستخدم'
      });
  };

  // 2. Execute Deletion (Called by Modal)
  const executeDeleteUser = async () => {
      if (!deleteModal.userId) return;
      
      const userId = deleteModal.userId;
      setDeleteModal({ ...deleteModal, isOpen: false });
      setProcessingId(`deleting-${userId}`);
      
      try {
          const tablesToDeleteFrom = ['attendance', 'progress', 'user_cards', 'badge_requests', 'badge_requirements_progress', 'violation_acknowledgments', 'community_posts', 'progress_card_requests', 'points_log', 'inventory_log'];

          for (const table of tablesToDeleteFrom) {
              await writeDelete(table, { user_id: userId });
          }
          
          await writeDelete('users', { id: userId });
          
          showMessage('success', 'تم حذف المستخدم بنجاح تام.');

      } catch (e: any) {
          console.error("Delete Error", e);
          showMessage('error', 'فشل الحذف: ' + (e.message || 'خطأ غير معروف'));
      } finally {
          setProcessingId(null);
      }
  };

  const onAcknowledgeViolation = async (userId: string, ruleId: string, date: string) => {
    try {
        await writeInsert('violation_acknowledgments', {
            user_id: userId,
            rule_id: ruleId,
            violation_date: date,
            acknowledged_at: new Date().toISOString()
        }, { optimisticTable: 'violation_acknowledgments' });
        
        showMessage('success', 'تم مسح التنبيه');
    } catch (e: any) {
        showMessage('error', 'فشل توثيق الإجراء: ' + e.message);
    }
  };

  const isScout = ['scout'].includes(contextualCurrentUser.role);
  const attendanceLabel = isScout && contextualCurrentUser.rank === 'scout' ? "المتابعة الشخصية" : "الحصص";
  const progressLabel = isScout && contextualCurrentUser.rank === 'scout' ? "بطاقات التقدم" : "التقدم";

  return (
    <div className="space-y-6 text-gray-800 dark:text-gray-100" dir="rtl">
        {message && <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full shadow-2xl z-[100] text-white font-bold animate-in fade-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{message.text}</div>}

        <div className="glass-panel p-2 rounded-2xl flex flex-wrap gap-2 justify-center sticky top-4 z-30 mx-4 mb-6 transition-all duration-300 shadow-lg backdrop-blur-xl border-white/40 dark:border-gray-700/50">
            <NavBtn id="overview" label="الرئيسية" icon={<BarChart2 size={18}/>} active={activeTab} set={setActiveTab} />
            {(!isScout || contextualCurrentUser.rank === 'team_leader' || contextualCurrentUser.rank === 'chief_leader') && <NavBtn id="personnel" label="الأفراد" icon={<UserCheck size={18}/>} active={activeTab} set={setActiveTab} />}
            <NavBtn id="attendance" label={attendanceLabel} icon={isScout && contextualCurrentUser.rank === 'scout' ? <Activity size={18}/> : <CheckSquare size={18}/>} active={activeTab} set={setActiveTab} />
            <NavBtn id="progress" label={progressLabel} icon={<Shield size={18}/>} active={activeTab} set={setActiveTab} />
            <NavBtn id="badges" label="الشارات" icon={<Award size={18}/>} active={activeTab} set={setActiveTab} />
            <NavBtn id="chants" label="الصيحات" icon={<Music size={18}/>} active={activeTab} set={setActiveTab} />
            {hasPermission(contextualCurrentUser, PERMISSIONS.MANAGE_INVENTORY) && <NavBtn id="inventory" label="المخزن" icon={<Archive size={18}/>} active={activeTab} set={setActiveTab} />}
            {hasPermission(contextualCurrentUser, PERMISSIONS.MANAGE_FINANCE) && <NavBtn id="finance" label="المالية" icon={<DollarSign size={18}/>} active={activeTab} set={setActiveTab} />}
            <NavBtn id="ranking" label="الترتيب" icon={<RankingIcon size={18}/>} active={activeTab} set={setActiveTab} />
            <NavBtn id="community" label="المجتمع" icon={<MessageSquare size={18}/>} active={activeTab} set={setActiveTab} />
            {currentUser.role === 'group_leader' && <NavBtn id="db" label="البحث (الهيكل)" icon={<Database size={18}/>} active={activeTab} set={setActiveTab} />}
            {hasPermission(contextualCurrentUser, PERMISSIONS.MANAGE_TEAMS) && <NavBtn id="config" label="الإعدادات" icon={<Settings size={18}/>} active={activeTab} set={setActiveTab} />}
            <NavBtn id="profile" label="حسابي" icon={<UserCog size={18}/>} active={activeTab} set={setActiveTab} />
        </div>

        <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-3xl shadow-sm border border-white/20 dark:border-gray-800 p-6 min-h-[600px] transition-colors mx-4">
            {activeTab === 'overview' && <Overview currentUser={contextualCurrentUser} users={users} attendanceData={attendanceData} communities={communities} selectedDate={selectedDate} units={units} trackingFields={trackingFields} trackingRules={trackingRules} violations={violations} onAcknowledge={onAcknowledgeViolation} onRefresh={refreshData} userProgress={userProgress} cardItems={cardItems} />}
            {activeTab === 'personnel' && (!isScout || contextualCurrentUser.rank === 'team_leader' || contextualCurrentUser.rank === 'chief_leader') && <UserManagement currentUser={contextualCurrentUser} users={users} units={units} teams={teams} progressCards={progressCards} userCards={userCards} setUserCards={() => {}} onUpdateSubordinate={onUpdateSubordinate} onViewReport={setSelectedReportUser} onDeleteUserProp={promptDeleteUser} onAddUser={handleAddUser} processingId={processingId} onRefresh={refreshData} />}
            {activeTab === 'attendance' && <AttendanceView currentUser={contextualCurrentUser} users={users} trackingFields={trackingFields} trackingRules={trackingRules} attendanceData={attendanceData} violations={violations} selectedDate={selectedDate} setSelectedDate={setSelectedDate} handleAttendance={handleAttendance} onAcknowledge={onAcknowledgeViolation} processingId={processingId} />}
            {activeTab === 'progress' && <ProgressView currentUser={contextualCurrentUser} users={users} progressCards={progressCards} cardItems={cardItems} userProgress={userProgress} userCards={userCards} cardRequests={cardRequests} handleProgress={handleProgress} onViewReport={setSelectedReportUser} processingId={processingId} onRefresh={refreshData} showMessage={showMessage} setProgressCards={() => {}} setCardItems={() => {}} units={units} selectedUnitId={selectedUnitId} />}
            {activeTab === 'badges' && <BadgeView currentUser={contextualCurrentUser} users={users} onRefresh={refreshData} selectedUnitId={selectedUnitId} units={units} showMessage={showMessage} onAwardPoints={awardPoints} syncedBadges={badges} syncedBadgeRequests={badgeRequests} syncedBadgeRequirementProgress={badgeRequirementProgress} />}
            {activeTab === 'chants' && <ChantsView currentUser={contextualCurrentUser} showMessage={showMessage}/>}
            {activeTab === 'inventory' && hasPermission(contextualCurrentUser, PERMISSIONS.MANAGE_INVENTORY) && <InventoryView currentUser={contextualCurrentUser} users={users} units={units} showMessage={showMessage} selectedUnitId={selectedUnitId} syncedInventoryItems={filteredData.inventoryItems} syncedInventoryLogs={filteredData.inventoryLogs} syncedInventoryCustodianships={filteredData.inventoryCustodianships} />}
            {activeTab === 'finance' && hasPermission(contextualCurrentUser, PERMISSIONS.MANAGE_FINANCE) && <FinanceView currentUser={contextualCurrentUser} users={users} units={units} selectedUnitId={selectedUnitId} showMessage={showMessage} syncedFunds={filteredData.funds} syncedTransactions={filteredData.transactions} syncedExternalSupplies={filteredData.externalSupplies} />}
            {activeTab === 'ranking' && <RankingView users={users} teams={teams} />}
            {activeTab === 'community' && <CommunityView currentUser={contextualCurrentUser} users={users} communities={communities} syncedPosts={communityPosts} />}
            {activeTab === 'db' && currentUser.role === 'group_leader' && <DatabaseExplorer />}
            {activeTab === 'profile' && <ProfileView currentUser={currentUser} showMessage={showMessage} />}
            {activeTab === 'config' && <Configuration currentUser={contextualCurrentUser} units={units} teams={teams} trackingFields={trackingFields} communities={communities} setUnits={onUnitsChange} setTeams={() => {}} setTrackingFields={() => {}} setCommunities={() => {}} showMessage={showMessage} selectedGlobalUnitId={selectedUnitId} />}
        </div>

        {selectedReportUser && (
            <UserReportModal 
                user={selectedReportUser} 
                onClose={() => setSelectedReportUser(null)}
                units={units}
                teams={teams}
                trackingFields={trackingFields}
                trackingRules={trackingRules}
                attendanceData={attendanceData}
                progressCards={progressCards}
                cardItems={cardItems}
                userProgress={userProgress}
                badges={badges}
                badgeRequests={badgeRequests}
                currentUser={contextualCurrentUser}
                onUpdateUser={onUpdateSubordinate}
                onRefresh={fetchData}
            />
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal.isOpen && (
            <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border-2 border-red-100 dark:border-red-900">
                    <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                        <Trash2 size={28} />
                    </div>
                    <h3 className="text-lg font-black text-center mb-2 dark:text-white">تأكيد الحذف النهائي</h3>
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
                        هل أنت متأكد من حذف المستخدم <b>"{deleteModal.userName}"</b>؟ <br/>
                        سيتم مسح كافة البيانات المرتبطة به (الحضور، التقدم، الشارات) ولا يمكن التراجع عن هذا الإجراء.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={executeDeleteUser} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition-all">نعم، احذف نهائياً</button>
                        <button onClick={() => setDeleteModal(prev => ({...prev, isOpen: false}))} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-bold transition-all">إلغاء</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

const NavBtn = ({id, label, icon, active, set}: any) => (
    <button 
        onClick={() => set(id)} 
        className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 text-xs font-bold whitespace-nowrap
            ${active === id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white hover:scale-105'
            }
        `}
    >
        {icon} <span>{label}</span>
    </button>
);
