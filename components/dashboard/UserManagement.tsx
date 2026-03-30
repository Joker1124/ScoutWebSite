
import React, { useState } from 'react';
import { User, USER_ROLES, USER_RANKS, Unit, Team, ProgressCard, UserCard, PERMISSIONS, hasPermission, UNIT_LABELS, UserRole } from '../../types';
import { Eye, ShieldAlert, ChevronDown, ChevronRight, Users, Search, Star, UserPlus, X, Trash2, RefreshCw, AlertTriangle, AlertCircle, Edit, FileSpreadsheet } from 'lucide-react';
import { BulkUploadModal } from '../shared/BulkUploadModal';

interface UserManagementProps {
  currentUser: User;
  users: User[];
  units: Unit[];
  teams: Team[];
  progressCards: ProgressCard[];
  userCards: UserCard[];
  setUserCards: React.Dispatch<React.SetStateAction<UserCard[]>>;
  onUpdateSubordinate: (user: User, updates: Partial<User>) => void;
  onViewReport: (user: User) => void;
  onDeleteUserProp: (id: string) => void;
  onAddUser?: (user: Partial<User>) => void;
  processingId?: string | null;
  onRefresh: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  currentUser, users, units, teams, onViewReport, onAddUser, onDeleteUserProp, processingId, onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUnits, setExpandedUnits] = useState<string[]>(['general', 'incomplete']);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // New User Form State
  const [newUser, setNewUser] = useState<Partial<User>>({
      name: '', email: '', password_hash: '', role: 'scout', national_id: '', birthdate: ''
  });

  // Security Check
  const visibleUsers = (currentUser.role === 'scout' && currentUser.rank === 'scout') 
    ? users.filter(u => u.id === currentUser.id)
    : users;

  const toggleUnit = (id: string) => {
    setExpandedUnits(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]);
  };

  const filteredUsers = visibleUsers.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // --- Classification Logic ---
  const generalLeaders = filteredUsers.filter(u => 
      u.role === 'group_leader' || 
      u.role === 'priest' || 
      u.role === 'unit_leader'
  );

  const incompleteUsers = filteredUsers.filter(u => {
      if (u.role === 'group_leader' || u.role === 'priest' || u.role === 'unit_leader') return false;
      if (!u.unit_id) return true; // Only condition: Missing Unit
      return false;
  });

  const canAddUsers = currentUser.role === 'group_leader' || hasPermission(currentUser, PERMISSIONS.APPROVE_USERS);
  const canDeleteUsers = currentUser.role === 'group_leader';

  const handleSubmitNewUser = (e: React.FormEvent) => {
      e.preventDefault();
      if(onAddUser) {
          const userToSubmit = { ...newUser };
          // Ensure priests and group leaders don't have a unit assigned
          if (userToSubmit.role === 'group_leader' || userToSubmit.role === 'priest') {
              delete userToSubmit.unit_id;
          }
          
          onAddUser(userToSubmit);
          setShowAddModal(false);
          setNewUser({ name: '', email: '', password_hash: '', role: 'scout', national_id: '', birthdate: '' });
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
        <BulkUploadModal 
            isOpen={showBulkUpload} 
            onClose={() => setShowBulkUpload(false)} 
            type="users" 
            units={units}
            onSuccess={() => {
                setShowBulkUpload(false);
                onRefresh();
            }}
        />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <h2 className="text-2xl font-black flex items-center gap-3 text-gray-800 dark:text-white">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl text-yellow-600 dark:text-yellow-400">
                    <Star size={24}/>
                </div>
                إدارة الهيكل البشري
            </h2>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {canAddUsers && (
                    <>
                        <button 
                            onClick={() => setShowBulkUpload(true)}
                            className="bg-green-700 hover:bg-green-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 shadow-lg shadow-green-700/20"
                        >
                            <FileSpreadsheet size={18}/> رفع ملف Excel
                        </button>
                        <button 
                            onClick={() => setShowAddModal(true)}
                            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 shadow-lg shadow-green-600/20"
                        >
                            <UserPlus size={18}/> تسجيل عضو جديد
                        </button>
                    </>
                )}
                {currentUser.role !== 'scout' && (
                    <div className="relative flex-1 md:w-72 group">
                        <Search className="absolute right-4 top-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18}/>
                        <input 
                            placeholder="بحث باسم الفرد..." 
                            className="w-full pr-12 pl-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all dark:text-white shadow-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}
            </div>
        </div>

        <div className="space-y-6">
            
            {/* --- Incomplete Data Section --- */}
            {incompleteUsers.length > 0 && currentUser.role !== 'scout' && (
                <div className="bg-red-50/50 dark:bg-red-900/10 border-2 border-red-100 dark:border-red-900/30 rounded-3xl overflow-hidden shadow-sm">
                    <button 
                        onClick={() => toggleUnit('incomplete')}
                        className="w-full flex items-center justify-between p-5 bg-red-100/50 dark:bg-red-900/40 hover:bg-red-200/50 transition-colors group"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full transition-colors ${expandedUnits.includes('incomplete') ? 'bg-red-200 text-red-700' : 'bg-white/50 text-red-400'}`}>
                                {expandedUnits.includes('incomplete') ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
                            </div>
                            <div className="text-right">
                                <span className="font-black text-lg text-red-900 dark:text-red-200 block group-hover:translate-x-1 transition-transform">بيانات بحاجة لاستكمال</span>
                                <span className="text-xs font-bold text-red-600 dark:text-red-300 uppercase tracking-wide">غير محدد الشعبة ({incompleteUsers.length})</span>
                            </div>
                        </div>
                        <AlertTriangle className="text-red-500" size={24}/>
                    </button>
                    {expandedUnits.includes('incomplete') && (
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in slide-in-from-top-4">
                            {incompleteUsers.map(user => (
                                <UserMiniCard 
                                    key={user.id} 
                                    user={user} 
                                    onView={() => onViewReport(user)} 
                                    canDelete={canDeleteUsers} 
                                    onDelete={() => onDeleteUserProp(user.id)} 
                                    isDeleting={processingId === `deleting-${user.id}`}
                                    warning="غير محدد الشعبة"
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* --- General Leaders Section --- */}
            {generalLeaders.length > 0 && currentUser.role !== 'scout' && (
                <div className="glass-panel border-2 border-yellow-400/20 dark:border-yellow-600/20 rounded-3xl overflow-hidden">
                    <button 
                        onClick={() => toggleUnit('general')}
                        className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-yellow-50/80 to-transparent dark:from-yellow-900/20 hover:from-yellow-100/80 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full transition-colors ${expandedUnits.includes('general') ? 'bg-yellow-200 text-yellow-800' : 'bg-yellow-100 text-yellow-600'}`}>
                                {expandedUnits.includes('general') ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
                            </div>
                            <div className="text-right">
                                <span className="font-black text-lg text-yellow-900 dark:text-yellow-300 block group-hover:translate-x-1 transition-transform">مجلس قيادة المجموعة</span>
                                <span className="text-xs font-bold text-yellow-700 dark:text-yellow-500 uppercase tracking-wide">الإدارة العليا والمركزية</span>
                            </div>
                        </div>
                        <Star className="text-yellow-500 fill-yellow-500" size={24}/>
                    </button>
                    {expandedUnits.includes('general') && (
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in slide-in-from-top-4">
                            {generalLeaders.map(leader => (
                                <UserMiniCard 
                                    key={leader.id} 
                                    user={leader} 
                                    onView={() => onViewReport(leader)} 
                                    isTop 
                                    canDelete={canDeleteUsers} 
                                    onDelete={() => onDeleteUserProp(leader.id)} 
                                    isDeleting={processingId === `deleting-${leader.id}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* --- Units Section --- */}
            {units.map(unit => {
                const validUnitUsers = filteredUsers.filter(u => 
                    !incompleteUsers.map(i => i.id).includes(u.id) &&
                    (u.unit_id === unit.id || u.service_unit_id === unit.id) &&
                    u.role !== 'group_leader' && u.role !== 'priest' && u.role !== 'unit_leader'
                );
                
                const unitTeams = teams.filter(t => t.unit_id === unit.id);
                
                const isExpanded = expandedUnits.includes(unit.id) || searchTerm !== '' || (currentUser.role === 'scout' && currentUser.unit_id === unit.id);
                const labels = UNIT_LABELS[unit.type] || UNIT_LABELS.troop;

                if (validUnitUsers.length === 0 && searchTerm === '') return null;
                
                const leadershipRoles = ['scout_leader', 'assistant'];
                
                const unitLeaders = validUnitUsers.filter(u => 
                    (leadershipRoles.includes(u.role) && u.unit_id === unit.id) || 
                    (u.role === 'scout' && u.service_unit_id === unit.id)
                );
                
                const teamBasedMembers = validUnitUsers.filter(u => 
                    u.unit_id === unit.id && u.role === 'scout'
                );

                return (
                    <div key={unit.id} className="glass-panel rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-lg">
                        <button 
                            onClick={() => toggleUnit(unit.id)}
                            className="w-full flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-full transition-colors ${isExpanded ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                    {isExpanded ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
                                </div>
                                <div className="text-right">
                                    <span className="font-black text-lg text-blue-900 dark:text-blue-300 block group-hover:translate-x-1 transition-transform">{unit.name}</span>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{labels.unit} • {validUnitUsers.length} عضو</span>
                                </div>
                            </div>
                        </button>

                        {isExpanded && (
                            <div className="p-6 space-y-8 animate-in slide-in-from-top-4">
                                {unitLeaders.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-black text-gray-400 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center gap-2 uppercase tracking-wider">
                                            <ShieldAlert size={14} className="text-blue-500"/> قيادة الشعبة
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {unitLeaders.map(leader => (
                                                <UserMiniCard 
                                                    key={leader.id} 
                                                    user={leader} 
                                                    onView={() => onViewReport(leader)} 
                                                    canDelete={canDeleteUsers} 
                                                    onDelete={() => onDeleteUserProp(leader.id)} 
                                                    isDeleting={processingId === `deleting-${leader.id}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    {unitTeams.map(team => {
                                        const teamUsers = teamBasedMembers.filter(u => u.team_id === team.id);
                                        if(teamUsers.length === 0) return null;
                                        return (
                                            <div key={team.id} className="bg-gray-50/50 dark:bg-gray-900/30 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                                                <h5 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                                                    {labels.team}: {team.name}
                                                </h5>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                    {teamUsers.map(member => (
                                                        <UserMiniCard 
                                                            key={member.id} 
                                                            user={member} 
                                                            onView={() => onViewReport(member)} 
                                                            canDelete={canDeleteUsers} 
                                                            onDelete={() => onDeleteUserProp(member.id)} 
                                                            isDeleting={processingId === `deleting-${member.id}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {teamBasedMembers.filter(u => !u.team_id).length > 0 && (
                                        <div className="p-5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                            <h5 className="font-bold text-xs text-gray-400 mb-4 flex items-center gap-2">
                                                <AlertCircle size={14}/> أفراد غير موزعين على {labels.team}
                                            </h5>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                {teamBasedMembers.filter(u => !u.team_id).map(member => (
                                                    <UserMiniCard 
                                                        key={member.id} 
                                                        user={member} 
                                                        onView={() => onViewReport(member)} 
                                                        canDelete={canDeleteUsers} 
                                                        onDelete={() => onDeleteUserProp(member.id)} 
                                                        isDeleting={processingId === `deleting-${member.id}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* Add User Modal */}
        {showAddModal && (
            <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border dark:border-gray-800">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold dark:text-white flex items-center gap-2"><UserPlus size={20}/> إضافة عضو جديد</h3>
                        <button onClick={() => setShowAddModal(false)}><X size={20} className="text-gray-400 hover:text-red-500"/></button>
                    </div>
                    <form onSubmit={handleSubmitNewUser} className="space-y-4">
                        <input className="w-full p-3 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl outline-none" placeholder="الاسم الكامل" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
                        <input className="w-full p-3 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl outline-none" placeholder="الرقم القومي" value={newUser.national_id} onChange={e => setNewUser({...newUser, national_id: e.target.value})} required />
                        <div className="grid grid-cols-2 gap-2">
                             <input type="date" className="w-full p-3 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl outline-none" value={newUser.birthdate} onChange={e => setNewUser({...newUser, birthdate: e.target.value})} required />
                             <select className="w-full p-3 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl outline-none" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}>
                                {Object.entries(USER_ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                             </select>
                        </div>
                        {newUser.role !== 'group_leader' && newUser.role !== 'priest' && (
                             <select className="w-full p-3 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl outline-none" value={newUser.unit_id || ''} onChange={e => setNewUser({...newUser, unit_id: e.target.value})} required>
                                <option value="">اختر الشعبة...</option>
                                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                             </select>
                        )}
                        <input className="w-full p-3 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl outline-none" placeholder="البريد الإلكتروني (اسم المستخدم)" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
                        <input className="w-full p-3 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl outline-none" type="password" placeholder="كلمة المرور" value={newUser.password_hash} onChange={e => setNewUser({...newUser, password_hash: e.target.value})} required />
                        <button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-green-600/20">تأكيد وإضافة</button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

interface UserMiniCardProps {
  user: User;
  onView: () => void;
  isTop?: boolean;
  canDelete?: boolean;
  onDelete?: () => void;
  isDeleting?: boolean;
  warning?: string;
}

const UserMiniCard: React.FC<UserMiniCardProps> = ({ user, onView, isTop, canDelete, onDelete, isDeleting, warning }) => {
    const displayRole = USER_ROLES[user.role];
    const displayRank = user.rank && user.rank !== 'scout' ? ` (${USER_RANKS[user.rank]})` : '';
    const serviceBadge = user.service_unit_id ? ' (جوال في الخدمة)' : '';

    return (
        <div className={`
            flex flex-col p-4 rounded-2xl border transition-all duration-300 group
            ${isTop 
                ? 'bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-900/20 dark:to-gray-800 border-yellow-200 dark:border-yellow-700/50 shadow-sm hover:shadow-yellow-500/10' 
                : warning 
                    ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20' 
                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-md'
            }
        `}>
            <div className="flex items-center gap-4">
                <div className={`
                    w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 shadow-sm transition-transform group-hover:scale-110
                    ${isTop 
                        ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' 
                        : warning 
                            ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300' 
                            : 'bg-gradient-to-br from-blue-500 to-blue-700 text-white'
                    }
                `}>
                    {user.name.charAt(0)}
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="font-bold text-base truncate dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{user.name}</p>
                    <div className="flex gap-1.5 flex-wrap mt-1.5">
                        {warning ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-100 text-red-700 font-bold flex items-center gap-1 border border-red-200">
                                <AlertCircle size={10}/> {warning}
                            </span>
                        ) : (
                            <>
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 font-medium">
                                    {displayRole}
                                </span>
                                {displayRank && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-100 dark:border-purple-800 font-medium">
                                        {USER_RANKS[user.rank!]}
                                    </span>
                                )}
                                {serviceBadge && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 font-medium">
                                        جوال خدمة
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Action Bar */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50 opacity-80 group-hover:opacity-100 transition-opacity">
                <button 
                    type="button"
                    onClick={(e) => { 
                        e.stopPropagation();
                        onView();
                    }}
                    className="flex-1 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                    <Edit size={14}/> <span>تعديل</span>
                </button>
                {canDelete && (
                    <button 
                        type="button"
                        onClick={(e) => { 
                             e.preventDefault();
                             e.stopPropagation();
                             if(onDelete) onDelete();
                        }} 
                        disabled={isDeleting}
                        className="w-10 bg-gray-50 dark:bg-gray-700/50 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 py-2 rounded-xl transition-all flex items-center justify-center disabled:opacity-50"
                        title="حذف"
                    >
                        {isDeleting ? <RefreshCw className="animate-spin" size={14}/> : <Trash2 size={14}/>}
                    </button>
                )}
            </div>
        </div>
    );
};
