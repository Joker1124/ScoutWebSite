
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { User, Badge, BadgeRequest, BadgeRequirementProgress, hasPermission, PERMISSIONS, Unit } from '../../types';
import { Trash2 } from 'lucide-react';
import { writeInsert, writeUpsert, writeUpdate, writeDelete } from '../../src/offline';

import { BadgeCatalog } from './badge/BadgeCatalog';
import { BadgeRequests } from './badge/BadgeRequests';
import { BadgeTracking } from './badge/BadgeTracking';
import { BadgeModal } from './badge/BadgeModal';
import { AssignmentModal } from '../shared/AssignmentModal';
import { CompletedBadgesView } from './badge/CompletedBadgesView';
import { ConfirmModal } from '../shared/ConfirmModal';

interface BadgeViewProps {
  currentUser: User;
  users: User[];
  onRefresh: () => void;
  selectedUnitId: string | null;
  units: Unit[];
  showMessage: (type: 'success' | 'error', text: string) => void;
  onAwardPoints?: (userId: string, points: number, reason: string, relatedId?: string) => Promise<void>;
  syncedBadges?: Badge[];
  syncedBadgeRequests?: BadgeRequest[];
  syncedBadgeRequirementProgress?: BadgeRequirementProgress[];
}

export const BadgeView: React.FC<BadgeViewProps> = ({ 
  currentUser, users, onRefresh, selectedUnitId, units, showMessage, onAwardPoints,
  syncedBadges, syncedBadgeRequests, syncedBadgeRequirementProgress
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'tracking' | 'requests' | 'completed'>('catalog');
  const [loading, setLoading] = useState(false);
  const [procId, setProcId] = useState<string | null>(null);
  const [selectedScoutId, setSelectedScoutId] = useState<string>('');

  const badges = syncedBadges || [];
  const requests = syncedBadgeRequests || [];
  
  const myReqProgress = React.useMemo(() => 
    (syncedBadgeRequirementProgress || []).filter(p => p.user_id === currentUser.id),
    [syncedBadgeRequirementProgress, currentUser.id]
  );

  const reqProgress = React.useMemo(() => 
    selectedScoutId 
      ? (syncedBadgeRequirementProgress || []).filter(p => p.user_id === selectedScoutId)
      : [],
    [syncedBadgeRequirementProgress, selectedScoutId]
  );
  
  const [badgeModal, setBadgeModal] = useState<{show: boolean, mode: 'create' | 'edit', data: Badge | null}>({
      show: false, mode: 'create', data: null
  });

  const [deleteModal, setDeleteModal] = useState<{show: boolean, badgeId: string | null, badgeTitle: string}>({
      show: false, badgeId: null, badgeTitle: ''
  });
  
  const [unenrollModal, setUnenrollModal] = useState({ show: false, userId: '', badgeId: '', userName: '', badgeName: '' });

  const [assignmentModal, setAssignmentModal] = useState<{ show: boolean; itemId: string | null; itemName: string | null; itemUnitId: string | null; }>({
    show: false, itemId: null, itemName: null, itemUnitId: null
  });

  const fetchInitialData = async () => {
    // Handled by useRealtimeSync
  };

  const fetchScoutProgress = async (userId: string) => {
    // Handled by useMemo above
  };

  const toggleRequirement = async (badgeId: string, index: number, current: boolean) => {
    const actionId = `req-${badgeId}-${index}`;
    if (procId) return;
    setProcId(actionId);
    
    try {
        if (current) {
            // Find the record to delete
            const record = reqProgress.find(p => p.user_id === selectedScoutId && p.badge_id === badgeId && p.requirement_index === index);
            if (record && record.id) {
                await writeDelete('badge_requirements_progress', { id: record.id }, { optimisticTable: 'badge_requirements_progress' });
            }
        } else {
            const progressRecord = { 
                id: crypto.randomUUID(),
                user_id: selectedScoutId, 
                badge_id: badgeId, 
                requirement_index: index, 
                completed: true,
                updated_at: new Date().toISOString()
            };
            await writeUpsert('badge_requirements_progress', progressRecord, { optimisticTable: 'badge_requirements_progress' });
        }
    } catch (e) {
        console.error("Toggle Requirement Error", e);
    } finally {
        setProcId(null);
    }
  };

  const handleOpenModal = (mode: 'create' | 'edit', badge?: Badge) => setBadgeModal({ show: true, mode, data: badge || null });
  const handleCloseModal = () => setBadgeModal({ show: false, mode: 'create', data: null });
  const handleOpenAssignmentModal = (badge: Badge) => setAssignmentModal({ show: true, itemId: badge.id, itemName: badge.title, itemUnitId: badge.unit_id || null });

  const handleSaveBadge = async (badgeData: { title: string, description: string, requirements: string[], unitId: string | null }) => {
      if (!badgeData.title.trim()) return;
      setProcId('saving-badge');
      console.log('[BadgeView] Saving badge:', badgeData, 'Mode:', badgeModal.mode);
      try {
          const payload = { 
              title: badgeData.title, 
              description: badgeData.description, 
              requirements: badgeData.requirements.filter(r => r.trim() !== ''),
              unit_id: badgeData.unitId
          };
          
          if (badgeModal.mode === 'edit' && badgeModal.data) {
              const updatedBadge = { ...badgeModal.data, ...payload };
              console.log('[BadgeView] Updating badge:', updatedBadge);
              await writeUpdate('badges', updatedBadge, { id: updatedBadge.id });
          } else {
              const newBadge = { id: crypto.randomUUID(), ...payload };
              console.log('[BadgeView] Inserting badge:', newBadge);
              await writeInsert('badges', newBadge);
          }
          handleCloseModal();
          onRefresh(); // Explicitly refresh after save
      } catch (e) {
          console.error('[BadgeView] Error saving badge:', e);
          showMessage('error', 'حدث خطأ أثناء حفظ الشارة');
      } finally {
          setProcId(null);
      }
  };

  const handleAssignUsers = async (userIds: string[]) => {
    if (!assignmentModal.itemId) return;
    setProcId('assigning-users');
    try {
        for (const userId of userIds) {
            const requestRecord = {
                id: crypto.randomUUID(),
                user_id: userId,
                badge_id: assignmentModal.itemId!,
                status: 'approved',
                created_at: new Date().toISOString()
            };
            await writeInsert('badge_requests', requestRecord);
        }
        setAssignmentModal({ show: false, itemId: null, itemName: null, itemUnitId: null });
    } finally {
        setProcId(null);
    }
  };

    const promptUnenrollFromBadge = (userId: string, badgeId: string) => {
        const user = users.find(u => u.id === userId);
        const badge = badges.find(b => b.id === badgeId);
        if (user && badge) {
            setUnenrollModal({ show: true, userId, badgeId, userName: user.name, badgeName: badge.title });
        }
    };

    const executeUnenrollFromBadge = async () => {
        const { userId, badgeId } = unenrollModal;
        if (!userId || !badgeId) return;

        setProcId(`unenroll-${userId}-${badgeId}`);
        try {
            // Delete progress
            const userProgress = syncedBadgeRequirementProgress?.filter(p => p.user_id === userId && p.badge_id === badgeId) || [];
            for (const p of userProgress) {
                if (p.id) await writeDelete('badge_requirements_progress', { id: p.id }, { optimisticTable: 'badge_requirements_progress' });
            }
            // Delete request
            const request = syncedBadgeRequests?.find(r => r.user_id === userId && r.badge_id === badgeId);
            if (request && request.id) {
                await writeDelete('badge_requests', { id: request.id }, { optimisticTable: 'badge_requests' });
            }
            
            showMessage('success', 'تم إلغاء التسجيل محلياً');
        } catch (e: any) {
            showMessage('error', `فشل إلغاء التسجيل: ${e.message}`);
        } finally {
            setProcId(null);
            setUnenrollModal({ show: false, userId: '', badgeId: '', userName: '', badgeName: '' });
        }
    };

  const handleApproveBadge = async (badgeId: string) => {
      setProcId(`approve-${badgeId}`);
      try {
          // Check if request exists
          const existing = requests.find(r => r.user_id === selectedScoutId && r.badge_id === badgeId);
          const requestRecord = { 
              id: existing?.id || crypto.randomUUID(),
              user_id: selectedScoutId, 
              badge_id: badgeId, 
              status: 'approved',
              updated_at: new Date().toISOString()
          };
          await writeUpsert('badge_requests', requestRecord, { optimisticTable: 'badge_requests' });
      } finally {
          setProcId(null);
      }
  };

  const promptDeleteBadge = (badge: Badge) => setDeleteModal({ show: true, badgeId: badge.id, badgeTitle: badge.title });
  const executeDeleteBadge = async () => {
      if (!deleteModal.badgeId) return;
      const badgeId = deleteModal.badgeId;
      setDeleteModal({ show: false, badgeId: null, badgeTitle: '' });
      setProcId(`deleting-${badgeId}`);
      try {
          // Delete requests
          const badgeRequests = syncedBadgeRequests?.filter(r => r.badge_id === badgeId) || [];
          for (const r of badgeRequests) {
              if (r.id) await writeDelete('badge_requests', { id: r.id }, { optimisticTable: 'badge_requests' });
          }
          // Delete progress
          const badgeProgress = syncedBadgeRequirementProgress?.filter(p => p.badge_id === badgeId) || [];
          for (const p of badgeProgress) {
              if (p.id) await writeDelete('badge_requirements_progress', { id: p.id }, { optimisticTable: 'badge_requirements_progress' });
          }
          // Delete badge
          await writeDelete('badges', { id: badgeId }, { optimisticTable: 'badges' });
      } catch (e) {
          alert('فشل حذف الشارة.');
      } finally {
          setProcId(null);
      }
  };

  const isLeader = !['scout'].includes(currentUser.role);

  return (
    <div className="space-y-8 text-gray-900 dark:text-white transition-colors" dir="rtl">
      {isLeader && (
        <div className="glass-panel p-2 rounded-2xl w-full md:w-fit border border-gray-200 dark:border-gray-700 shadow-sm mx-auto md:mx-0 flex flex-wrap justify-center md:justify-start gap-1">
            <TabBtn active={activeTab === 'catalog'} onClick={() => setActiveTab('catalog')} label="دليل الشارات" />
            <TabBtn active={activeTab === 'tracking'} onClick={() => setActiveTab('tracking')} label="إدارة إنجاز الأفراد" />
            <TabBtn active={activeTab === 'completed'} onClick={() => setActiveTab('completed')} label="إنجازات مكتملة" />
            <TabBtn active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} label="طلبات الاعتماد" count={requests.filter(r => r.status === 'pending').length} />
        </div>
      )}

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[500px]">
          {activeTab === 'catalog' || !isLeader ? (
              <BadgeCatalog 
                badges={badges} 
                requests={requests} 
                reqProgress={myReqProgress} 
                currentUser={currentUser} 
                handleOpenModal={handleOpenModal} 
                promptDelete={promptDeleteBadge}
                fetchInitialData={fetchInitialData}
                handleOpenAssignmentModal={handleOpenAssignmentModal}
                units={units}
              />
          ) : activeTab === 'requests' ? (
              <BadgeRequests requests={requests} users={users} badges={badges} fetchInitialData={fetchInitialData} currentUser={currentUser} />
          ) : activeTab === 'tracking' ? (
              <BadgeTracking users={users} selectedScoutId={selectedScoutId} setSelectedScoutId={setSelectedScoutId} badges={badges} requests={requests} reqProgress={reqProgress} procId={procId} toggleRequirement={toggleRequirement} handleApproveBadge={handleApproveBadge} onUnenroll={promptUnenrollFromBadge} currentUser={currentUser} />
          ) : (
              <CompletedBadgesView users={users} badges={badges} requests={requests} reqProgress={reqProgress} />
          )}
      </div>

      {badgeModal.show && (
          <BadgeModal
              mode={badgeModal.mode}
              badge={badgeModal.data}
              onClose={handleCloseModal}
              onSave={handleSaveBadge}
              isProcessing={!!procId}
              currentUser={currentUser}
              units={units}
              selectedUnitId={selectedUnitId}
          />
      )}
      {assignmentModal.show && (
            <AssignmentModal
                isOpen={assignmentModal.show}
                onClose={() => setAssignmentModal({ show: false, itemId: null, itemName: null, itemUnitId: null })}
                title={assignmentModal.itemName || ''}
                itemType="badge"
                allUsers={users}
                alreadyAssignedUserIds={requests.filter(r => r.badge_id === assignmentModal.itemId).map(r => r.user_id)}
                onAssign={handleAssignUsers}
                isProcessing={procId === 'assigning-users'}
                itemUnitId={assignmentModal.itemUnitId}
            />
      )}
      {deleteModal.show && (
            <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-700 transform scale-100 animate-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500 dark:text-red-400">
                        <Trash2 size={32} />
                    </div>
                    <h3 className="text-xl font-black text-center mb-3 dark:text-white">حذف الشارة</h3>
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                        هل أنت متأكد من حذف شارة <span className="font-bold text-gray-800 dark:text-gray-200">"{deleteModal.badgeTitle}"</span>؟
                        <br/>
                        <span className="text-red-500 text-xs mt-2 block">سيتم حذف الشارة وجميع السجلات المرتبطة بها نهائياً.</span>
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={executeDeleteBadge} 
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-red-600/20 active:scale-95"
                        >
                            نعم، احذف
                        </button>
                        <button 
                            onClick={() => setDeleteModal(prev => ({...prev, show: false}))} 
                            className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-3.5 rounded-xl font-bold transition-all active:scale-95"
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
      )}
      {unenrollModal.show && (
        <ConfirmModal
            isOpen={unenrollModal.show}
            onClose={() => setUnenrollModal({ ...unenrollModal, show: false })}
            onConfirm={executeUnenrollFromBadge}
            title="تأكيد الإخراج"
            message={
                <p>هل أنت متأكد من إخراج الفرد <b>{unenrollModal.userName}</b> من شارة <b>{unenrollModal.badgeName}</b>؟ سيتم حذف كل تقدمه فيها نهائياً.</p>
            }
            isProcessing={!!procId && procId.startsWith('unenroll-')}
            confirmText="نعم، إخراج"
        />
       )}
    </div>
  );
};

const TabBtn = ({ active, onClick, label, count }: any) => (
    <button 
        onClick={onClick} 
        className={`
            relative px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 overflow-hidden
            ${active 
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-300'
            }
        `}
    >
        <span className="relative z-10">{label}</span>
        {count !== undefined && count > 0 && (
            <span className={`
                text-[10px] px-2 py-0.5 rounded-full font-black min-w-[20px] text-center relative z-10
                ${active 
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }
            `}>
                {count}
            </span>
        )}
        {active && (
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/50 to-transparent dark:from-blue-900/10 opacity-50" />
        )}
    </button>
);
