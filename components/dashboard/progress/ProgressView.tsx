
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { User, Unit, ProgressCard, ProgressCardItem, Progress, UserCard, ProgressCardRequest, PERMISSIONS, hasPermission } from '../../../types';
import { Trash2 } from 'lucide-react';
import { writeInsert, writeUpsert, writeUpdate, writeDelete } from '../../../src/offline';

import { ProgressCardCatalog } from './ProgressCardCatalog';
import { ProgressCardRequests } from './ProgressCardRequests';
import { ProgressCardTracking } from './ProgressCardTracking';
import { ProgressCardModal } from './ProgressCardModal';
import { AssignmentModal } from '../../shared/AssignmentModal';
import { CompletedCardsView } from './CompletedCardsView';
import { ConfirmModal } from '../../shared/ConfirmModal';

interface ProgressViewProps {
  currentUser: User;
  users: User[];
  progressCards: ProgressCard[];
  cardItems: ProgressCardItem[];
  userProgress: Progress[];
  userCards: UserCard[];
  cardRequests?: ProgressCardRequest[];
  handleProgress: (userId: string, itemId: string, currentStatus: boolean) => void;
  onViewReport: (user: User) => void;
  processingId: string | null;
  onRefresh: () => void;
  showMessage: (type: 'success' | 'error', text: string) => void;
  setProgressCards: React.Dispatch<React.SetStateAction<ProgressCard[]>>;
  setCardItems: React.Dispatch<React.SetStateAction<ProgressCardItem[]>>;
  units: Unit[];
  selectedUnitId: string | null;
}

export const ProgressView: React.FC<ProgressViewProps> = (props) => {
  const { currentUser, onRefresh, selectedUnitId, users, units, handleProgress, processingId } = props;
  const [activeTab, setActiveTab] = useState<'catalog' | 'tracking' | 'requests' | 'completed'>('catalog');
  const [procId, setProcId] = useState<string | null>(null);
  const [selectedScoutId, setSelectedScoutId] = useState<string>('');

  const [cardModal, setCardModal] = useState<{ show: boolean, mode: 'create' | 'edit', data: ProgressCard | null }>({
    show: false, mode: 'create', data: null
  });
  const [deleteModal, setDeleteModal] = useState<{ show: boolean, cardId: string | null, cardName: string }>({
    show: false, cardId: null, cardName: ''
  });
  const [unenrollModal, setUnenrollModal] = useState({ show: false, userId: '', cardId: '', userName: '', cardName: '' });

  const [assignmentModal, setAssignmentModal] = useState<{ show: boolean; itemId: string | null; itemName: string | null; itemUnitId: string | null; }>({
    show: false, itemId: null, itemName: null, itemUnitId: null
  });

  const handleOpenModal = (mode: 'create' | 'edit', card?: ProgressCard) => setCardModal({ show: true, mode, data: card || null });
  const handleCloseModal = () => setCardModal({ show: false, mode: 'create', data: null });
  const handleOpenAssignmentModal = (card: ProgressCard) => setAssignmentModal({ show: true, itemId: card.id, itemName: card.name, itemUnitId: card.unit_id || null });

  const handleSaveCard = async (data: { name: string, type: string, unitId: string | null, items: string[] }) => {
    if (!data.name.trim()) return;
    setProcId('saving-card');
    try {
        let cardId: string;
        const cardPayload = {
            name: data.name,
            type: data.type,
            unit_id: currentUser.role === 'group_leader' ? data.unitId : (selectedUnitId || currentUser.unit_id)
        };

        if (cardModal.mode === 'edit' && cardModal.data) {
            cardId = cardModal.data.id;
            await supabase.from('progress_cards').update(cardPayload).eq('id', cardId);
            await supabase.from('progress_card_items').delete().eq('card_id', cardId);
        } else {
            cardId = crypto.randomUUID();
            await supabase.from('progress_cards').insert({ id: cardId, ...cardPayload, created_by: currentUser.id });
        }

        const newItems = data.items.filter(name => name.trim() !== '').map(name => ({
            id: crypto.randomUUID(), card_id: cardId, name: name
        }));

        if (newItems.length > 0) await supabase.from('progress_card_items').insert(newItems);
        
        onRefresh();
        handleCloseModal();
        props.showMessage('success', 'تم حفظ البطاقة بنجاح');
    } catch(e) {
        props.showMessage('error', 'حدث خطأ أثناء الحفظ');
    } finally {
        setProcId(null);
    }
  };

  const handleAssignUsers = async (userIds: string[]) => {
    if (!assignmentModal.itemId) return;
    setProcId('assigning-users');
    try {
        const assignmentsToInsert = userIds.map(userId => ({
            user_id: userId,
            card_id: assignmentModal.itemId!
        }));
        await supabase.from('user_cards').insert(assignmentsToInsert);
        onRefresh();
        setAssignmentModal({ show: false, itemId: null, itemName: null, itemUnitId: null });
    } finally {
        setProcId(null);
    }
  };

  const promptUnenrollFromCard = (userId: string, cardId: string) => {
    const user = props.users.find(u => u.id === userId);
    const card = props.progressCards.find(c => c.id === cardId);
    if (user && card) {
        setUnenrollModal({ show: true, userId, cardId, userName: user.name, cardName: card.name });
    }
  };

  const executeUnenrollFromCard = async () => {
    const { userId, cardId } = unenrollModal;
    if (!userId || !cardId) return;

    setProcId(`unenroll-${userId}-${cardId}`);
    try {
        const { data: items, error: itemsError } = await supabase
            .from('progress_card_items')
            .select('id')
            .eq('card_id', cardId);

        if (itemsError) throw itemsError;

        if (items && items.length > 0) {
            const itemIds = items.map(i => i.id);
            await supabase.from('progress').delete().eq('user_id', userId).in('card_item_id', itemIds);
        }

        await supabase.from('user_cards').delete().eq('user_id', userId).eq('card_id', cardId);
        
        props.showMessage('success', 'تم إلغاء التسجيل بنجاح');
        onRefresh();
    } catch (e: any) {
        props.showMessage('error', `فشل إلغاء التسجيل: ${e.message}`);
    } finally {
        setProcId(null);
        setUnenrollModal({ show: false, userId: '', cardId: '', userName: '', cardName: '' });
    }
  };


  const promptDeleteCard = (card: ProgressCard) => setDeleteModal({ show: true, cardId: card.id, cardName: card.name });
  const executeDeleteCard = async () => {
    if (!deleteModal.cardId) return;
    const cardId = deleteModal.cardId;
    setDeleteModal({ show: false, cardId: null, cardName: '' });
    setProcId(`deleting-${cardId}`);
    try {
        const { data: itemsToDelete, error: itemError } = await supabase.from('progress_card_items').select('id').eq('card_id', cardId);
        if(itemError) throw itemError;
        
        if (itemsToDelete && itemsToDelete.length > 0) {
            const itemIds = itemsToDelete.map(i => i.id);
            await supabase.from('progress').delete().in('card_item_id', itemIds);
        }

        await supabase.from('progress_card_items').delete().eq('card_id', cardId);
        await supabase.from('user_cards').delete().eq('card_id', cardId);
        await supabase.from('progress_card_requests').delete().eq('card_id', cardId);
        await supabase.from('progress_cards').delete().eq('id', cardId);
        
        onRefresh();
        props.showMessage('success', 'تم حذف البطاقة بنجاح');
    } catch(e: any) {
        props.showMessage('error', `فشل حذف البطاقة: ${e.message}`);
    } finally {
        setProcId(null);
    }
  };

  const isLeader = !['scout'].includes(currentUser.role);
  
  return (
    <div className="space-y-8 text-gray-900 dark:text-white transition-colors" dir="rtl">
        {isLeader && (
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit border-2 dark:border-gray-700 shadow-inner">
                <TabBtn active={activeTab === 'catalog'} onClick={() => setActiveTab('catalog')} label="دليل البطاقات" />
                <TabBtn active={activeTab === 'tracking'} onClick={() => setActiveTab('tracking')} label="إدارة إنجاز الأفراد" />
                <TabBtn active={activeTab === 'completed'} onClick={() => setActiveTab('completed')} label="إنجازات مكتملة" />
                <TabBtn active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} label="طلبات التسجيل" count={props.cardRequests?.filter(r => r.status === 'pending').length} />
            </div>
        )}

        {activeTab === 'catalog' || !isLeader ? (
            <ProgressCardCatalog
                {...props}
                cardRequests={props.cardRequests || []}
                isLeader={isLeader}
                handleOpenModal={handleOpenModal}
                promptDelete={promptDeleteCard}
                handleOpenAssignmentModal={handleOpenAssignmentModal}
            />
        ) : activeTab === 'requests' ? (
             <ProgressCardRequests {...props} cardRequests={props.cardRequests || []} />
        ) : activeTab === 'tracking' ? (
            <ProgressCardTracking
                {...props}
                selectedScoutId={selectedScoutId}
                setSelectedScoutId={setSelectedScoutId}
                procId={processingId || procId}
                onUnenroll={promptUnenrollFromCard}
            />
        ) : (
            <CompletedCardsView {...props} />
        )}
        
        {cardModal.show && (
            <ProgressCardModal
                mode={cardModal.mode}
                card={cardModal.data}
                items={props.cardItems.filter(i => i.card_id === cardModal.data?.id)}
                onClose={handleCloseModal}
                onSave={handleSaveCard}
                isProcessing={procId === 'saving-card'}
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
                itemType="card"
                allUsers={users}
                alreadyAssignedUserIds={props.userCards.filter(uc => uc.card_id === assignmentModal.itemId).map(uc => uc.user_id)}
                onAssign={handleAssignUsers}
                isProcessing={procId === 'assigning-users'}
                itemUnitId={assignmentModal.itemUnitId}
            />
        )}
        {deleteModal.show && (
            <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border-2 border-red-100 dark:border-red-900">
                    <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400"><Trash2 size={28} /></div>
                    <h3 className="text-lg font-black text-center mb-2 dark:text-white">حذف بطاقة التقدم</h3>
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">هل أنت متأكد من حذف بطاقة <b>"{deleteModal.cardName}"</b>؟ سيتم حذفها وكل بنودها نهائياً.</p>
                    <div className="flex gap-3">
                        <button onClick={executeDeleteCard} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold">نعم، احذف</button>
                        <button onClick={() => setDeleteModal({ show: false, cardId: null, cardName: '' })} className="flex-1 bg-gray-100 dark:bg-gray-800 py-3 rounded-xl font-bold">إلغاء</button>
                    </div>
                </div>
            </div>
        )}
        {unenrollModal.show && (
            <ConfirmModal
                isOpen={unenrollModal.show}
                onClose={() => setUnenrollModal({ ...unenrollModal, show: false })}
                onConfirm={executeUnenrollFromCard}
                title="تأكيد الإخراج"
                message={
                    <p>هل أنت متأكد من إخراج الفرد <b>{unenrollModal.userName}</b> من بطاقة <b>{unenrollModal.cardName}</b>؟ سيتم حذف كل تقدمه فيها نهائياً.</p>
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
        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${active ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-md scale-105 z-10' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
    >
        {label}
        {count !== undefined && count > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-lg shadow-red-500/50">{count}</span>}
    </button>
);
