
import React, { useState, useMemo } from 'react';
import { User } from '../../types';
import { X, UserPlus, Search, RefreshCw } from 'lucide-react';

interface AssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    itemType: 'badge' | 'card';
    allUsers: User[];
    alreadyAssignedUserIds: string[];
    onAssign: (userIds: string[]) => Promise<void>;
    isProcessing: boolean;
    itemUnitId: string | null;
}

export const AssignmentModal: React.FC<AssignmentModalProps> = ({ isOpen, onClose, title, itemType, allUsers, alreadyAssignedUserIds, onAssign, isProcessing, itemUnitId }) => {
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    const eligibleUsers = useMemo(() => {
        return allUsers
            .filter(u => {
                // Must be an unassigned scout
                if (u.role !== 'scout' || alreadyAssignedUserIds.includes(u.id)) {
                    return false;
                }

                // If the item is unit-specific, the user's HOME unit must match.
                // This naturally excludes them from being assigned as a scout in their service unit.
                if (itemUnitId) {
                    return u.unit_id === itemUnitId;
                }

                // If the item is global (no unit_id), all scouts are eligible.
                return true;
            })
            .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allUsers, alreadyAssignedUserIds, searchTerm, itemUnitId]);


    const handleToggleUser = (userId: string) => {
        const newSet = new Set(selectedUserIds);
        if (newSet.has(userId)) {
            newSet.delete(userId);
        } else {
            newSet.add(userId);
        }
        setSelectedUserIds(newSet);
    };

    const handleAssignClick = async () => {
        await onAssign(Array.from(selectedUserIds));
        setSelectedUserIds(new Set());
        setSearchTerm('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="glass-panel w-full max-w-lg max-h-[85vh] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex justify-between items-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-t-3xl z-10">
                    <h3 className="text-lg font-black dark:text-white flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${itemType === 'badge' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                            <UserPlus size={24}/>
                        </div>
                        <div>
                            <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">إسناد إلى</span>
                            <span className="block text-gray-800 dark:text-white">{title}</span>
                        </div>
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 hover:text-red-500 transition-all">
                        <X size={24}/>
                    </button>
                </div>

                <div className="p-6 flex-1 flex flex-col overflow-hidden">
                    <div className="relative mb-4">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18}/>
                        <input 
                            type="text"
                            placeholder="ابحث عن فرد..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3 pr-11 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:font-normal"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                        {eligibleUsers.length > 0 ? (
                            eligibleUsers.map(user => {
                                const isSelected = selectedUserIds.has(user.id);
                                return (
                                    <div 
                                        key={user.id} 
                                        onClick={() => handleToggleUser(user.id)}
                                        className={`
                                            flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all duration-200 group
                                            ${isSelected 
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                                                : 'bg-white dark:bg-gray-800/30 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                                            }
                                        `}
                                    >
                                        <div className={`
                                            w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                                            ${isSelected 
                                                ? 'bg-blue-600 border-blue-600 text-white' 
                                                : 'border-gray-300 dark:border-gray-600 group-hover:border-blue-400'
                                            }
                                        `}>
                                            {isSelected && <UserPlus size={12} strokeWidth={4}/>}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-black text-gray-500 dark:text-gray-400">
                                                {user.name.charAt(0)}
                                            </div>
                                            <span className={`font-bold text-sm ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {user.name}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3 text-gray-300 dark:text-gray-600">
                                    <Search size={32}/>
                                </div>
                                <p className="text-sm font-bold text-gray-400">لا يوجد أفراد مؤهلون للتسجيل.</p>
                                <p className="text-xs text-gray-400 mt-1">تأكد من البحث أو أن الأفراد غير مسجلين بالفعل.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-3xl flex gap-4">
                    <button 
                        onClick={handleAssignClick} 
                        disabled={isProcessing || selectedUserIds.size === 0} 
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        {isProcessing ? <RefreshCw className="animate-spin" size={20}/> : <UserPlus size={20}/>}
                        تسجيل المختارين ({selectedUserIds.size})
                    </button>
                    <button 
                        onClick={onClose} 
                        className="flex-1 bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 py-3.5 rounded-xl font-bold transition-all active:scale-95"
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
};
