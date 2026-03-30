
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { User, Unit, ProgressCard, ProgressCardItem, Progress, UserCard, ProgressCardRequest, PERMISSIONS, hasPermission } from '../../types';
import { Trash2 } from 'lucide-react';

import { ProgressCardCatalog } from './progress/ProgressCardCatalog';
import { ProgressCardRequests } from './progress/ProgressCardRequests';
import { ProgressCardTracking } from './progress/ProgressCardTracking';
import { ProgressCardModal } from './progress/ProgressCardModal';
import { AssignmentModal } from '../shared/AssignmentModal';
import { CompletedCardsView } from './progress/CompletedCardsView';
import { ConfirmModal } from '../shared/ConfirmModal';
import { getTable, setTable, writeInsert, writeUpdate, writeDelete } from '../../src/offline';

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
  const { currentUser, onRefresh, selectedUnitId, users, units, handleProgress, processingId, progressCards, cardItems } = props;
  const [activeTab, setActiveTab] = useState<'catalog' | 'tracking' | 'requests' | 'completed'>('catalog');
  const [procId, setProcId] = useState<string | null>(null);
  const [selectedScoutId, setSelectedScoutId] = useState<string>('');
  
  const [deleteModal, setDeleteModal] = useState<{ show: boolean, cardId: string | null, cardName: string }>({
      show: false, cardId: null, cardName: ''
  });
  const [unenrollModal, setUnenrollModal] = useState({ show: false, userId: '', cardId: '', userName: '', cardName: '' });
  const [cardModal, setCardModal] = useState<{ show: boolean, mode: 'create' | 'edit', data: ProgressCard | null }>({
      show: false, mode: 'create', data: null
  });

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
            await writeUpdate('progress_cards', cardPayload, { id: cardId });
            
            // Delete existing items to replace them
            const itemsToDelete = cardItems.filter(i => i.card_id === cardId);
            for (const item of itemsToDelete) {
                await writeDelete('progress_card_items', { id: item.id });
            }
        } else {
            cardId = crypto.randomUUID();
            await writeInsert('progress_cards', { id: cardId, ...cardPayload, created_by: currentUser.id });
        }

        const newItems = data.items.filter(name => name.trim() !== '').map(name => ({
            id: crypto.randomUUID(), card_id: cardId, name: name
        }));

        for (const item of newItems) {
            await writeInsert('progress_card_items', item);
        }
        
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
        
        for (const assignment of assignmentsToInsert) {
            await writeInsert('user_cards', assignment);
        }
        
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
        const items = props.cardItems.filter(i => i.card_id === cardId);

        for (const item of items) {
            const progressRows = props.userProgress.filter(p => p.user_id === userId && p.card_item_id === item.id);
            for (const p of progressRows) {
                await writeDelete('progress', { id: p.id });
            }
        }

        const userCard = props.userCards.find(uc => uc.user_id === userId && uc.card_id === cardId);
        if (userCard) await writeDelete('user_cards', { id: userCard.id });
        
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
        const itemsToDelete = props.cardItems.filter(i => i.card_id === cardId);
        
        for (const item of itemsToDelete) {
            const progressRows = props.userProgress.filter(p => p.card_item_id === item.id);
            for (const p of progressRows) {
                await writeDelete('progress', { id: p.id });
            }
            await writeDelete('progress_card_items', { id: item.id });
        }

        const userCards = props.userCards.filter(uc => uc.card_id === cardId);
        for (const uc of userCards) await writeDelete('user_cards', { id: uc.id });
        
        const requests = props.cardRequests?.filter(r => r.card_id === cardId);
        if (requests) {
            for (const r of requests) await writeDelete('progress_card_requests', { id: r.id });
        }

        await writeDelete('progress_cards', { id: cardId });
        
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
            <div className="glass-panel p-2 rounded-2xl w-full md:w-fit border border-gray-200 dark:border-gray-700 shadow-sm mx-auto md:mx-0 flex flex-wrap justify-center md:justify-start gap-1">
                <TabBtn active={activeTab === 'catalog'} onClick={() => setActiveTab('catalog')} label="دليل البطاقات" />
                <TabBtn active={activeTab === 'tracking'} onClick={() => setActiveTab('tracking')} label="إدارة إنجاز الأفراد" />
                <TabBtn active={activeTab === 'completed'} onClick={() => setActiveTab('completed')} label="إنجازات مكتملة" />
                <TabBtn active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} label="طلبات التسجيل" count={props.cardRequests?.filter(r => r.status === 'pending').length} />
            </div>
        )}

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[500px]">
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
        </div>
        
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
            <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-700 transform scale-100 animate-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500 dark:text-red-400">
                        <Trash2 size={32} />
                    </div>
                    <h3 className="text-xl font-black text-center mb-3 dark:text-white">حذف بطاقة التقدم</h3>
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                        هل أنت متأكد من حذف بطاقة <span className="font-bold text-gray-800 dark:text-gray-200">"{deleteModal.cardName}"</span>؟
                        <br/>
                        <span className="text-red-500 text-xs mt-2 block">سيتم حذف البطاقة وجميع البنود وسجلات التقدم المرتبطة بها نهائياً.</span>
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={executeDeleteCard} 
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-red-600/20 active:scale-95"
                        >
                            نعم، احذف
                        </button>
                        <button 
                            onClick={() => setDeleteModal({ show: false, cardId: null, cardName: '' })} 
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
        className={`
            px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap
            ${active 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
            }
        `}
    >
        {label}
        {count !== undefined && count > 0 && (
            <span className={`
                text-[10px] px-2 py-0.5 rounded-full font-black shadow-sm
                ${active ? 'bg-white text-blue-600' : 'bg-red-500 text-white'}
            `}>
                {count}
            </span>
        )}
    </button>
);
