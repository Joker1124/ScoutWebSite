
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { User, Badge, BadgeRequest, BadgeRequirementProgress, hasPermission, PERMISSIONS, Unit } from '../../../types';
import { Trash2 } from 'lucide-react';

import { BadgeCatalog } from './BadgeCatalog';
import { BadgeRequests } from './BadgeRequests';
import { BadgeTracking } from './BadgeTracking';
import { BadgeModal } from './BadgeModal';
import { AssignmentModal } from '../../shared/AssignmentModal';
import { CompletedBadgesView } from './CompletedBadgesView';
import { ConfirmModal } from '../../shared/ConfirmModal';

interface BadgeViewProps {
  currentUser: User;
  users: User[];
  onRefresh: () => void;
  selectedUnitId: string | null;
  units: Unit[];
  showMessage: (type: 'success' | 'error', text: string) => void;
  onAwardPoints: (userId: string, points: number, reason: string, relatedId?: string) => Promise<void>;
}

export const BadgeView: React.FC<BadgeViewProps> = ({ currentUser, users, onRefresh, selectedUnitId, units, showMessage, onAwardPoints }) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'tracking' | 'requests' | 'completed'>('catalog');
  const [badges, setBadges] = useState<Badge[]>([]);
  const [requests, setRequests] = useState<BadgeRequest[]>([]);
  const [reqProgress, setReqProgress] = useState<BadgeRequirementProgress[]>([]);
  const [myReqProgress, setMyReqProgress] = useState<BadgeRequirementProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [procId, setProcId] = useState<string | null>(null);
  const [selectedScoutId, setSelectedScoutId] = useState<string>('');
  
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

  useEffect(() => {
    fetchInitialData();
  }, [selectedUnitId]);

  useEffect(() => {
    // This effect now fetches progress for ALL users, needed for CompletedBadgesView
    fetchAllProgress();
  }, [badges]); // Re-run if badges change

  useEffect(() => {
      if (selectedScoutId) {
          // We already have all progress, just filter it for the tracking tab
          // This avoids re-fetching from DB every time a scout is selected
      } else {
          // If no scout is selected, we don't need to show specific progress in tracking tab
      }
  }, [selectedScoutId]);


  const fetchInitialData = async () => {
    setLoading(true);
    try {
        let bQuery = supabase.from('badges').select('*');
        if (selectedUnitId && currentUser.role !== 'group_leader') {
             bQuery = bQuery.or(`unit_id.eq.${selectedUnitId},unit_id.is.null`);
        } else if (currentUser.role !== 'group_leader') {
             bQuery = bQuery.or(`unit_id.eq.${currentUser.unit_id},unit_id.is.null`);
        }
        
        const { data: bData } = await bQuery;
        const { data: rData } = await supabase.from('badge_requests').select('*');
        const { data: myProgressData } = await supabase.from('badge_requirements_progress').select('*').eq('user_id', currentUser.id);
        
        if (bData) setBadges(bData as Badge[]);
        if (rData) setRequests(rData as BadgeRequest[]);
        if (myProgressData) setMyReqProgress(myProgressData as BadgeRequirementProgress[]);

    } finally {
        setLoading(false);
    }
  };
  
  const fetchAllProgress = async () => {
      const badgeIds = badges.map(b => b.id);
      if (badgeIds.length === 0) return;
      
      const { data } = await supabase.from('badge_requirements_progress').select('*').in('badge_id', badgeIds);
      if (data) setReqProgress(data as BadgeRequirementProgress[]);
  }

  const toggleRequirement = async (badgeId: string, index: number, current: boolean) => {
    const actionId = `req-${badgeId}-${index}`;
    if (procId || !selectedScoutId) return;
    setProcId(actionId);
    
    try {
        if (current) {
            await supabase.from('badge_requirements_progress').delete().match({ user_id: selectedScoutId, badge_id: badgeId, requirement_index: index });
        } else {
            await supabase.from('badge_requirements_progress').upsert({ user_id: selectedScoutId, badge_id: badgeId, requirement_index: index, completed: true }, { onConflict: 'user_id,badge_id,requirement_index' });
        }
        await fetchAllProgress();
    } catch (e) {
        await fetchAllProgress();
        showMessage('error', 'فشل تحديث البند');
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
      try {
          const payload = { 
              title: badgeData.title, 
              description: badgeData.description, 
              requirements: badgeData.requirements.filter(r => r.trim() !== ''),
              unit_id: badgeData.unitId
          };
          
          if (badgeModal.mode === 'edit' && badgeModal.data) {
              await supabase.from('badges').update(payload).eq('id', badgeModal.data.id);
          } else {
              await supabase.from('badges').insert({ id: crypto.randomUUID(), ...payload });
          }
          await fetchInitialData();
          handleCloseModal();
      } finally {
          setProcId(null);
      }
  };

  const handleAssignUsers = async (userIds: string[]) => {
    if (!assignmentModal.itemId) return;
    setProcId('assigning-users');
    try {
        const requestsToInsert = userIds.map(userId => ({
            user_id: userId,
            badge_id: assignmentModal.itemId!,
            status: 'approved'
        }));
        await supabase.from('badge_requests').insert(requestsToInsert);
        onRefresh();
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
            await supabase.from('badge_requirements_progress').delete().eq('user_id', userId).eq('badge_id', badgeId);
            await supabase.from('badge_requests').delete().eq('user_id', userId).eq('badge_id', badgeId);
            
            await fetchInitialData();
            showMessage('success', 'تم إلغاء التسجيل بنجاح');
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
          await supabase.from('badge_requests').upsert({ user_id: selectedScoutId, badge_id: badgeId, status: 'approved' }, { onConflict: 'user_id,badge_id' });
          await fetchInitialData();
          onRefresh();
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
          await supabase.from('badge_requests').delete().eq('badge_id', badgeId);
          await supabase.from('badge_requirements_progress').delete().eq('badge_id', badgeId);
          await supabase.from('badges').delete().eq('id', badgeId);
          await fetchInitialData();
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
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit border-2 dark:border-gray-700 shadow-inner">
            <TabBtn active={activeTab === 'catalog'} onClick={() => setActiveTab('catalog')} label="دليل الشارات" />
            <TabBtn active={activeTab === 'tracking'} onClick={() => setActiveTab('tracking')} label="إدارة إنجاز الأفراد" />
            <TabBtn active={activeTab === 'completed'} onClick={() => setActiveTab('completed')} label="إنجازات مكتملة" />
            <TabBtn active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} label="طلبات الاعتماد" count={requests.filter(r => r.status === 'pending').length} />
        </div>
      )}

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
          <BadgeRequests requests={requests} users={users} badges={badges} fetchInitialData={fetchInitialData} onAwardPoints={onAwardPoints} />
      ) : activeTab === 'tracking' ? (
          <BadgeTracking users={users} selectedScoutId={selectedScoutId} setSelectedScoutId={setSelectedScoutId} badges={badges} requests={requests} reqProgress={reqProgress.filter(p => p.user_id === selectedScoutId)} procId={procId} toggleRequirement={toggleRequirement} handleApproveBadge={handleApproveBadge} onUnenroll={promptUnenrollFromBadge} />
      ) : (
          <CompletedBadgesView users={users} badges={badges} requests={requests} reqProgress={reqProgress} />
      )}

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
            <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border-2 border-red-100 dark:border-red-900">
                    <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                        <Trash2 size={28} />
                    </div>
                    <h3 className="text-lg font-black text-center mb-2 dark:text-white">حذف الشارة</h3>
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">هل أنت متأكد من حذف شارة <b>"{deleteModal.badgeTitle}"</b>؟ سيتم حذفها وجميع السجلات المرتبطة بها نهائياً.</p>
                    <div className="flex gap-3">
                        <button onClick={executeDeleteBadge} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold">نعم، احذف</button>
                        <button onClick={() => setDeleteModal(prev => ({...prev, show: false}))} className="flex-1 bg-gray-100 dark:bg-gray-800 py-3 rounded-xl font-bold">إلغاء</button>
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
        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${active ? 'bg-white dark:bg-gray-900 text-yellow-600 dark:text-yellow-400 shadow-md scale-105 z-10' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
    >
        {label}
        {count !== undefined && count > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-lg shadow-red-500/50">{count}</span>}
    </button>
);
