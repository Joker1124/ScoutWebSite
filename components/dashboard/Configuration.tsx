
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { User, Unit, Team, TrackingField, Community, TrackingRule, CommunityType, hasPermission, PERMISSIONS, UserRole, USER_ROLES, UserRank, USER_RANKS } from '../../types';
import { Trash2, Plus, AlertCircle, PenSquare, X, Shield, UserCheck, BookOpen, MessageSquare, AlertTriangle, Save, FileSpreadsheet } from 'lucide-react';
import { BulkUploadModal } from '../shared/BulkUploadModal';

interface ConfigurationProps {
  currentUser: User;
  units: Unit[];
  teams: Team[];
  trackingFields: TrackingField[];
  communities: Community[];
  setUnits: React.Dispatch<React.SetStateAction<Unit[]>>;
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  setTrackingFields: React.Dispatch<React.SetStateAction<TrackingField[]>>;
  setCommunities: React.Dispatch<React.SetStateAction<Community[]>>;
  showMessage: (type: 'success' | 'error', text: string) => void;
  selectedGlobalUnitId?: string | null;
}

export const Configuration: React.FC<ConfigurationProps> = ({
  currentUser, units, teams, trackingFields, communities,
  setUnits, setTeams, setTrackingFields, setCommunities, showMessage,
  selectedGlobalUnitId
}) => {
  const [activeTab, setActiveTab] = useState<'structure' | 'personnel' | 'unit_settings' | 'communities'>('structure');
  
  const [selectedConfigUnitId, setSelectedConfigUnitId] = useState<string>('');
  
  const [personnelUsers, setPersonnelUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [newUnitName, setNewUnitName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldFreq, setNewFieldFreq] = useState('weekly');
  const [newRule, setNewRule] = useState<{threshold: number, action: string, is_consecutive: boolean, timeframe: number}>({ 
      threshold: 2, action: '', is_consecutive: true, timeframe: 30 
  });
  
  const [trackingRules, setTrackingRules] = useState<TrackingRule[]>([]);
  
  const [newCommName, setNewCommName] = useState('');
  const [newCommType, setNewCommType] = useState<CommunityType>('full_unit');
  const [newCommTeamId, setNewCommTeamId] = useState('');

  const [editItem, setEditItem] = useState<{type: string, data: any} | null>(null);
  const [deleteItem, setDeleteItem] = useState<{type: string, id: string, name: string} | null>(null);
  
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  useEffect(() => {
    if (currentUser.role !== 'group_leader') {
        setSelectedConfigUnitId(currentUser.unit_id || '');
        if (activeTab === 'structure' && !hasPermission(currentUser, PERMISSIONS.MANAGE_UNITS)) {
             setActiveTab('unit_settings');
        }
    } else {
        if (selectedGlobalUnitId) {
            setSelectedConfigUnitId(selectedGlobalUnitId);
            if (activeTab === 'structure') setActiveTab('personnel');
        } else {
            setSelectedConfigUnitId('');
        }
    }
  }, [selectedGlobalUnitId, currentUser, activeTab]);

  useEffect(() => {
      if (selectedConfigUnitId) {
          fetchUnitDetails(selectedConfigUnitId);
      }
  }, [selectedConfigUnitId]);

  const fetchUnitDetails = async (unitId: string) => {
      setLoadingUsers(true);
      const { data: rules } = await supabase.from('tracking_rules').select('*');
      if (rules) setTrackingRules(rules as TrackingRule[]);

      const { data: users } = await supabase.from('users').select('*').eq('unit_id', unitId);
      if (users) setPersonnelUsers(users as User[]);
      
      // Refresh fields too
      const { data: fields } = await supabase.from('tracking_fields').select('*');
      if(fields) setTrackingFields(fields as TrackingField[]);

      setLoadingUsers(false);
  };

  const openEditModal = (type: string, data: any) => {
      setEditItem({ type, data: { ...data } });
  };

  const handleSaveEdit = async () => {
      if (!editItem) return;
      const { type, data } = editItem;

      try {
          if (type === 'unit') {
              const { error } = await supabase.from('units').update({ name: data.name }).eq('id', data.id);
              if (error) throw error;
              setUnits(prev => prev.map(u => u.id === data.id ? { ...u, name: data.name } : u));
          }
          else if (type === 'team') {
              const { error } = await supabase.from('teams').update({ name: data.name }).eq('id', data.id);
              if (error) throw error;
              setTeams(prev => prev.map(t => t.id === data.id ? { ...t, name: data.name } : t));
          }
          else if (type === 'field') {
              const { error } = await supabase.from('tracking_fields').update({ name: data.name, frequency: data.frequency }).eq('id', data.id);
              if (error) throw error;
              setTrackingFields(prev => prev.map(f => f.id === data.id ? { ...f, name: data.name, frequency: data.frequency } : f));
          }
          else if (type === 'community') {
              const { error } = await supabase.from('communities').update({ name: data.name, type: data.type, description: data.description }).eq('id', data.id);
              if (error) throw error;
              setCommunities(prev => prev.map(c => c.id === data.id ? { ...c, name: data.name, type: data.type, description: data.description } : c));
          }

          showMessage('success', 'تم حفظ التعديلات بنجاح');
          setEditItem(null);
      } catch (e: any) {
          showMessage('error', 'فشل الحفظ: ' + e.message);
      }
  };

  const openDeleteModal = (type: string, id: string, name: string) => {
      setDeleteItem({ type, id, name });
  };

  const handleConfirmDelete = async () => {
      if (!deleteItem) return;
      const { type, id } = deleteItem;

      try {
          let table = '';
          switch (type) {
              case 'unit': table = 'units'; break;
              case 'team': table = 'teams'; break;
              case 'field': table = 'tracking_fields'; break;
              case 'rule': table = 'tracking_rules'; break;
              case 'community': table = 'communities'; break;
          }

          const { error } = await supabase.from(table).delete().eq('id', id);
          if (error) throw error;

          if (type === 'unit') setUnits(prev => prev.filter(x => x.id !== id));
          if (type === 'team') setTeams(prev => prev.filter(x => x.id !== id));
          if (type === 'field') setTrackingFields(prev => prev.filter(x => x.id !== id));
          if (type === 'rule') setTrackingRules(prev => prev.filter(x => x.id !== id));
          if (type === 'community') setCommunities(prev => prev.filter(x => x.id !== id));

          showMessage('success', 'تم الحذف بنجاح');
          setDeleteItem(null);
      } catch (e: any) {
          showMessage('error', 'فشل الحذف: ' + e.message);
      }
  };

  const addUnit = async () => {
      if (!newUnitName) return;
      const id = crypto.randomUUID();
      const newUnit: Unit = { id, name: newUnitName, leader_id: currentUser.id, type: 'troop' };
      const { error } = await supabase.from('units').insert(newUnit);
      if(!error) {
          setUnits(prev => [...prev, newUnit]);
          setNewUnitName('');
          showMessage('success', 'تم إنشاء الوحدة');
      }
  };

  const addTeamToUnit = async () => {
      if (!newTeamName || !selectedConfigUnitId) return;
      const id = crypto.randomUUID();
      const newTeam = { id, name: newTeamName, unit_id: selectedConfigUnitId };
      const { error } = await supabase.from('teams').insert(newTeam);
      if(!error) {
          setTeams(prev => [...prev, newTeam]);
          setNewTeamName('');
          showMessage('success', 'تم إضافة الطليعة');
      }
  };

  const assignUserTeam = async (userId: string, teamId: string) => {
      const { error } = await supabase.from('users').update({ team_id: teamId }).eq('id', userId);
      if(!error) {
          setPersonnelUsers(prev => prev.map(u => u.id === userId ? { ...u, team_id: teamId } : u));
          showMessage('success', 'تم تحديث طليعة الفرد');
      }
  };

  const handleRankChange = async (userId: string, newRank: UserRank) => {
      const { error } = await supabase.from('users').update({ rank: newRank }).eq('id', userId);
      if(!error) {
          setPersonnelUsers(prev => prev.map(u => u.id === userId ? { ...u, rank: newRank } : u));
          showMessage('success', `تم الترقية إلى ${USER_RANKS[newRank]}`);
      } else {
          showMessage('error', 'فشل تغيير الرتبة');
      }
  };

  const addTrackingField = async () => {
      if (!newFieldName || !selectedConfigUnitId) return;
      const id = crypto.randomUUID();
      const newField = { 
          id, name: newFieldName, frequency: newFieldFreq as any, visible: true, created_by: currentUser.id, unit_id: selectedConfigUnitId 
      };
      const { error } = await supabase.from('tracking_fields').insert(newField);
      if(!error) {
          setTrackingFields(prev => [...prev, newField]);
          setNewFieldName('');
          showMessage('success', 'تم إضافة البند');
      }
  };

  const addTrackingRule = async (fieldId: string) => {
      if (!newRule.action || newRule.threshold < 1) return;
      const id = crypto.randomUUID();
      const rule = {
          id, field_id: fieldId, violation_threshold: newRule.threshold, violation_action: newRule.action, 
          is_consecutive: newRule.is_consecutive, timeframe_days: newRule.is_consecutive ? null : newRule.timeframe
      };
      const { error } = await supabase.from('tracking_rules').insert(rule);
      if(!error) {
          setTrackingRules(prev => [...prev, rule as any]);
          setNewRule({ threshold: 2, action: '', is_consecutive: true, timeframe: 30 });
          showMessage('success', 'تم إضافة القاعدة');
      }
  };

  const addCommunity = async () => {
      if (!newCommName || !selectedConfigUnitId) return;
      const id = crypto.randomUUID();
      const newComm: Community = {
          id, name: newCommName, type: newCommType, unit_id: selectedConfigUnitId,
          parent_id: newCommType === 'team' ? newCommTeamId : null
      };
      const { error } = await supabase.from('communities').insert(newComm);
      if(!error) {
          setCommunities(prev => [...prev, newComm]);
          setNewCommName('');
          showMessage('success', 'تم إنشاء المجتمع');
      }
  };

  // ---------------- Render ----------------

  const renderUnitSelector = () => {
      if (currentUser.role !== 'group_leader') return null;

      if (selectedGlobalUnitId) {
          const u = units.find(x => x.id === selectedGlobalUnitId);
          return (
              <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center gap-2">
                  <AlertCircle className="text-blue-600 dark:text-blue-400" size={20}/>
                  <span className="text-blue-900 dark:text-blue-300 font-bold">يتم الآن تعديل إعدادات: {u?.name}</span>
              </div>
          );
      }
      return (
        <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 shadow-sm">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">اختر الوحدة للعمل عليها:</label>
            <select 
                value={selectedConfigUnitId} 
                onChange={e => setSelectedConfigUnitId(e.target.value)}
                className="w-full border dark:border-gray-600 p-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
            >
                <option value="">-- اختر الوحدة --</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
        </div>
      );
  };

  const renderUnassignedData = () => {
      if (!hasPermission(currentUser, PERMISSIONS.MANAGE_UNITS)) return null;
      if (selectedConfigUnitId && currentUser.role !== 'group_leader') return null;

      const legacyFields = trackingFields.filter(f => !f.unit_id);
      const legacyComms = communities.filter(c => !c.unit_id);

      if (legacyFields.length === 0 && legacyComms.length === 0) return null;

      return (
          <div className="mt-8 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
              <h4 className="font-bold text-orange-800 dark:text-orange-300 flex items-center gap-2 mb-4">
                  <AlertTriangle size={18}/> عناصر غير مخصصة (بيانات قديمة)
              </h4>
              <p className="text-xs text-orange-700 dark:text-orange-400 mb-4">
                  هذه العناصر لا تنتمي لأي وحدة. يمكنك حذفها أو تعديلها من هنا.
              </p>

              {legacyFields.length > 0 && (
                  <div className="mb-4">
                      <h5 className="font-bold text-sm mb-2 dark:text-white">بنود متابعة قديمة:</h5>
                      {legacyFields.map(f => (
                          <div key={f.id} className="flex justify-between items-center bg-white dark:bg-gray-700 p-2 rounded mb-1 border dark:border-gray-600">
                              <span className="dark:text-white">{f.name}</span>
                              <div className="flex gap-1">
                                <button onClick={() => openEditModal('field', f)} className="text-blue-500 hover:bg-blue-100 p-1 rounded"><PenSquare size={14}/></button>
                                <button onClick={() => openDeleteModal('field', f.id, f.name)} className="text-red-500 hover:bg-red-100 p-1 rounded"><Trash2 size={14}/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
              
              {legacyComms.length > 0 && (
                  <div>
                      <h5 className="font-bold text-sm mb-2 dark:text-white">مجتمعات قديمة:</h5>
                      {legacyComms.map(c => (
                          <div key={c.id} className="flex justify-between items-center bg-white dark:bg-gray-700 p-2 rounded mb-1 border dark:border-gray-600">
                              <span className="dark:text-white">{c.name}</span>
                              <div className="flex gap-1">
                                <button onClick={() => openEditModal('community', c)} className="text-blue-500 hover:bg-blue-100 p-1 rounded"><PenSquare size={14}/></button>
                                <button onClick={() => openDeleteModal('community', c.id, c.name)} className="text-red-500 hover:bg-red-100 p-1 rounded"><Trash2 size={14}/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      );
  };

  const assignableRoles: UserRole[] = ['scout'];

  return (
    <div className="space-y-6 text-gray-800 dark:text-gray-200 relative">
        <BulkUploadModal 
            isOpen={showBulkUpload} 
            onClose={() => setShowBulkUpload(false)} 
            type="fields" 
            units={units}
            onSuccess={() => {
                setShowBulkUpload(false);
                if(selectedConfigUnitId) fetchUnitDetails(selectedConfigUnitId);
                showMessage('success', 'تم رفع البيانات بنجاح');
            }}
        />

        {/* Modals are the same... */}
        {editItem && (
            <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl border dark:border-gray-700">
                    <h3 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
                        <PenSquare size={20}/> تعديل: {editItem.type === 'unit' ? 'الوحدة' : editItem.type === 'team' ? 'الطليعة' : editItem.type === 'field' ? 'البند' : 'العنصر'}
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm mb-1 dark:text-gray-300">الاسم</label>
                            <input 
                                value={editItem.data.name || ''} 
                                onChange={e => setEditItem({ ...editItem, data: { ...editItem.data, name: e.target.value } })}
                                className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {editItem.type === 'field' && (
                            <div>
                                <label className="block text-sm mb-1 dark:text-gray-300">التكرار</label>
                                <select 
                                    value={editItem.data.frequency || 'weekly'}
                                    onChange={e => setEditItem({ ...editItem, data: { ...editItem.data, frequency: e.target.value } })}
                                    className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 rounded outline-none"
                                >
                                    <option value="daily">يومي</option>
                                    <option value="weekly">أسبوعي</option>
                                    <option value="monthly">شهري</option>
                                </select>
                            </div>
                        )}

                         {editItem.type === 'community' && (
                            <>
                                <div>
                                    <label className="block text-sm mb-1 dark:text-gray-300">الوصف</label>
                                    <textarea 
                                        value={editItem.data.description || ''} 
                                        onChange={e => setEditItem({ ...editItem, data: { ...editItem.data, description: e.target.value } })}
                                        className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 rounded outline-none h-20"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex gap-2 mt-6">
                        <button onClick={handleSaveEdit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2"><Save size={16}/> حفظ</button>
                        <button onClick={() => setEditItem(null)} className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-2 rounded-lg font-bold">إلغاء</button>
                    </div>
                </div>
            </div>
        )}

        {deleteItem && (
            <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                 <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border-2 border-red-100 dark:border-red-900">
                    <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                        <Trash2 size={28} />
                    </div>
                    <h3 className="text-lg font-black text-center mb-2 dark:text-white">تأكيد الحذف</h3>
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
                        هل أنت متأكد من حذف <b>"{deleteItem.name}"</b>؟ <br/>
                        سيتم مسح كافة البيانات المرتبطة به ولا يمكن التراجع عنه.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={handleConfirmDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-500/20">نعم، احذف</button>
                        <button onClick={() => setDeleteItem(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-bold transition-all">إلغاء</button>
                    </div>
                 </div>
            </div>
        )}

        <div className="flex flex-wrap bg-white dark:bg-gray-800 rounded-lg p-1 border dark:border-gray-700 shadow-sm">
            {hasPermission(currentUser, PERMISSIONS.MANAGE_UNITS) && !selectedGlobalUnitId && currentUser.role === 'group_leader' && (
                <button onClick={() => setActiveTab('structure')} className={`flex-1 min-w-[120px] py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'structure' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                    1. الهيكل العام
                </button>
            )}
            <button onClick={() => setActiveTab('personnel')} className={`flex-1 min-w-[120px] py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'personnel' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                2. الأفراد والطلائع
            </button>
            <button onClick={() => setActiveTab('unit_settings')} className={`flex-1 min-w-[120px] py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'unit_settings' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                3. المتابعة والتقدم
            </button>
            <button onClick={() => setActiveTab('communities')} className={`flex-1 min-w-[120px] py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'communities' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                4. إدارة المجتمعات
            </button>
        </div>

        {activeTab === 'structure' && hasPermission(currentUser, PERMISSIONS.MANAGE_UNITS) && currentUser.role === 'group_leader' && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm">
                <h3 className="font-bold text-lg mb-4 text-blue-900 dark:text-blue-300 border-b dark:border-gray-700 pb-2">إنشاء وإدارة الوحدات</h3>
                <div className="flex gap-2 mb-6">
                    <input className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 rounded text-sm flex-1 outline-none" placeholder="اسم وحدة جديدة..." value={newUnitName} onChange={e => setNewUnitName(e.target.value)} />
                    <button onClick={addUnit} className="bg-blue-600 text-white px-6 rounded text-sm font-bold">إضافة وحدة</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {units.map(u => (
                        <div key={u.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border dark:border-gray-600 flex justify-between items-center group">
                            <span className="font-bold text-gray-800 dark:text-white">{u.name}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEditModal('unit', u)} className="text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 p-2 rounded"><PenSquare size={16}/></button>
                                <button onClick={() => openDeleteModal('unit', u.id, u.name)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900 p-2 rounded"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'personnel' && (
            <div>
                {hasPermission(currentUser, PERMISSIONS.MANAGE_UNITS) && renderUnitSelector()}

                {selectedConfigUnitId ? (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm space-y-8">
                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2"><Shield size={18}/> 1. طلائع الوحدة</h4>
                            <div className="flex gap-2 mb-3 max-w-md">
                                <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 rounded text-sm flex-1 outline-none" placeholder="اسم طليعة جديدة..."/>
                                <button onClick={addTeamToUnit} className="bg-green-600 text-white px-4 rounded text-sm"><Plus/></button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {teams.filter(t => t.unit_id === selectedConfigUnitId).map(t => (
                                    <div key={t.id} className="bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full text-sm font-bold border border-green-200 dark:border-green-800 flex items-center gap-2 group">
                                        {t.name}
                                        <div className="hidden group-hover:flex gap-1 mr-2">
                                            <button onClick={() => openEditModal('team', t)} className="text-blue-600 hover:text-blue-800"><PenSquare size={12}/></button>
                                            <button onClick={() => openDeleteModal('team', t.id, t.name)} className="text-red-600 hover:text-red-800"><Trash2 size={12}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2"><UserCheck size={18}/> 2. توزيع الأفراد والترقيات</h4>
                            {loadingUsers ? <p>جاري التحميل...</p> : (
                                <div className="overflow-x-auto border dark:border-gray-700 rounded-lg">
                                    <table className="w-full text-sm text-right bg-white dark:bg-gray-800">
                                        <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                            <tr>
                                                <th className="p-3">الاسم</th>
                                                <th className="p-3">الرتبة (الترقي)</th>
                                                <th className="p-3">الطليعة</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y dark:divide-gray-700">
                                            {personnelUsers.filter(u => assignableRoles.includes(u.role)).map(user => (
                                                <tr key={user.id} className="dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="p-3 font-bold">{user.name}</td>
                                                    <td className="p-3">
                                                        <select 
                                                            value={user.rank || 'scout'} 
                                                            onChange={(e) => handleRankChange(user.id, e.target.value as UserRank)}
                                                            className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-1 rounded text-xs w-32 outline-none"
                                                        >
                                                            {Object.entries(USER_RANKS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="p-3">
                                                        <select 
                                                            value={user.team_id || ''} 
                                                            onChange={(e) => assignUserTeam(user.id, e.target.value)}
                                                            className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-1 rounded text-xs w-32 outline-none"
                                                        >
                                                            <option value="">بدون طليعة</option>
                                                            {teams.filter(t => t.unit_id === selectedConfigUnitId).map(t => (
                                                                <option key={t.id} value={t.id}>{t.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                ) : <p className="text-center text-gray-500 py-10">الرجاء اختيار وحدة للبدء.</p>}
            </div>
        )}

         {activeTab === 'unit_settings' && (
            <div>
                {hasPermission(currentUser, PERMISSIONS.MANAGE_UNITS) && renderUnitSelector()}

                {selectedConfigUnitId ? (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><BookOpen size={18}/> بنود المتابعة (خاصة بالوحدة)</h4>
                                {currentUser.role === 'group_leader' && (
                                    <button onClick={() => setShowBulkUpload(true)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 transition-all">
                                        <FileSpreadsheet size={16}/> رفع Excel
                                    </button>
                                )}
                            </div>
                            
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 mb-4 flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="text-[10px] block mb-1 dark:text-gray-300">اسم البند</label>
                                    <input value={newFieldName} onChange={e => setNewFieldName(e.target.value)} className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-1.5 rounded text-sm w-full outline-none"/>
                                </div>
                                <div className="w-24">
                                    <label className="text-[10px] block mb-1 dark:text-gray-300">التكرار</label>
                                    <select value={newFieldFreq} onChange={e => setNewFieldFreq(e.target.value)} className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-1.5 rounded text-sm w-full outline-none">
                                        <option value="weekly">أسبوعي</option>
                                        <option value="daily">يومي</option>
                                        <option value="monthly">شهري</option>
                                    </select>
                                </div>
                                <button onClick={addTrackingField} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-bold">إضافة</button>
                            </div>

                            <div className="space-y-4">
                                {trackingFields.filter(f => f.unit_id === selectedConfigUnitId).map(field => (
                                    <div key={field.id} className="border dark:border-gray-700 rounded-lg p-3 relative bg-white dark:bg-gray-700/50">
                                        <div className="flex justify-between font-bold text-gray-800 dark:text-white border-b dark:border-gray-700 pb-2 mb-2">
                                            <span>{field.name} <span className="text-xs font-normal bg-gray-100 dark:bg-gray-600 px-2 rounded ml-1">{field.frequency}</span></span>
                                            <div className="flex gap-1">
                                                <button onClick={() => openEditModal('field', field)} className="text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 p-1 rounded"><PenSquare size={14}/></button>
                                                <button onClick={() => openDeleteModal('field', field.id, field.name)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900 p-1 rounded"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs space-y-2">
                                            {trackingRules.filter(r => r.field_id === field.id).map(r => (
                                                <div key={r.id} className="flex flex-wrap gap-2 items-center justify-between text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 p-1 rounded border border-red-100 dark:border-red-900">
                                                    <div className="flex gap-1">
                                                        <span>{r.is_consecutive ? `بعد ${r.violation_threshold} مرات متتالية:` : `بعد ${r.violation_threshold} مرات خلال ${r.timeframe_days} يوم:`}</span>
                                                        <span className="font-bold">{r.violation_action}</span>
                                                    </div>
                                                    <button onClick={() => openDeleteModal('rule', r.id, 'القاعدة')} className="text-red-400 hover:text-red-600"><X size={12}/></button>
                                                </div>
                                            ))}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 border-t dark:border-gray-700 pt-2">
                                                <div>
                                                    <select className="w-full border dark:border-gray-600 dark:bg-gray-800 dark:text-white p-1 rounded outline-none" value={newRule.is_consecutive ? 'consecutive' : 'period'} onChange={e => setNewRule({...newRule, is_consecutive: e.target.value === 'consecutive'})}>
                                                        <option value="consecutive">متتالي</option>
                                                        <option value="period">خلال فترة</option>
                                                    </select>
                                                </div>
                                                {!newRule.is_consecutive && (
                                                    <div><input type="number" className="w-full border dark:border-gray-600 dark:bg-gray-800 dark:text-white p-1 rounded outline-none" value={newRule.timeframe} onChange={e => setNewRule({...newRule, timeframe: parseInt(e.target.value)})}/></div>
                                                )}
                                                <div><input type="number" className="w-full border dark:border-gray-600 dark:bg-gray-800 dark:text-white p-1 rounded outline-none" value={newRule.threshold} onChange={e => setNewRule({...newRule, threshold: parseInt(e.target.value)})}/></div>
                                                <div><input placeholder="الإجراء" className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-1 rounded outline-none" value={newRule.action} onChange={e => setNewRule({...newRule, action: e.target.value})}/></div>
                                                <div className="col-span-full"><button onClick={() => addTrackingRule(field.id)} className="w-full bg-gray-800 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 text-white px-2 py-1 rounded text-xs">إضافة القاعدة</button></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : <p className="text-center text-gray-500 py-10">الرجاء اختيار وحدة للبدء.</p>}
                
                {renderUnassignedData()}
            </div>
        )}
        
        {activeTab === 'communities' && (
            <div>
                 {hasPermission(currentUser, PERMISSIONS.MANAGE_UNITS) && renderUnitSelector()}
                 
                 {selectedConfigUnitId ? (
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm">
                         <h4 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><MessageSquare size={18}/> إدارة مجتمعات الوحدة</h4>
                         <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 mb-6">
                             <h5 className="font-bold text-blue-900 dark:text-blue-300 text-sm mb-3">إنشاء قناة تواصل جديدة</h5>
                             <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                 <div><input value={newCommName} onChange={e => setNewCommName(e.target.value)} className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 rounded text-sm outline-none" placeholder="اسم القناة"/></div>
                                 <div><select value={newCommType} onChange={e => setNewCommType(e.target.value as CommunityType)} className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 rounded text-sm outline-none"><option value="full_unit">الوحدة بالكامل</option><option value="unit_leaders">قادة الوحدة</option><option value="team">طليعة</option><option value="all_leaders">كل القادة</option></select></div>
                                 {newCommType === 'team' && (
                                     <div><select value={newCommTeamId} onChange={e => setNewCommTeamId(e.target.value)} className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 rounded text-sm outline-none"><option value="">-- اختر --</option>{teams.filter(t => t.unit_id === selectedConfigUnitId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                                 )}
                                 <button onClick={addCommunity} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700">إنشاء</button>
                             </div>
                         </div>
                         <div className="space-y-3">
                             {communities.filter(c => c.unit_id === selectedConfigUnitId).map(c => (
                                 <div key={c.id} className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                     <div>
                                         <span className="font-bold text-gray-800 dark:text-white text-sm">{c.name}</span>
                                         <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded mr-2">{c.type}</span>
                                     </div>
                                     <div className="flex gap-1">
                                        <button onClick={() => openEditModal('community', c)} className="text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 p-1.5 rounded"><PenSquare size={16}/></button>
                                        <button onClick={() => openDeleteModal('community', c.id, c.name)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900 p-1.5 rounded"><Trash2 size={16}/></button>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 ) : <p className="text-center text-gray-500 py-10">الرجاء اختيار وحدة للبدء.</p>}
                 {renderUnassignedData()}
            </div>
        )}
    </div>
  );
};
