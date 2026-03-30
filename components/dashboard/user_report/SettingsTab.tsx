
import React from 'react';
import { User, USER_ROLES, USER_RANKS, Unit, PERMISSIONS, PERMISSION_LABELS, hasPermission } from '../../../types';
import { AlertTriangle, Save, Key, Lock, Shield } from 'lucide-react';

interface SettingsTabProps {
    currentUser: User;
    editableData: Partial<User> & { password_hash: string };
    setEditableData: React.Dispatch<React.SetStateAction<Partial<User> & { password_hash: string }>>;
    units: Unit[];
    handleSave: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ currentUser, editableData, setEditableData, units, handleSave }) => {
    
    const canManageRoles = hasPermission(currentUser, PERMISSIONS.MANAGE_ROLES_PERMISSIONS);
    const canEditPersonalData = hasPermission(currentUser, PERMISSIONS.EDIT_USERS) || currentUser.role === 'scout'; // Scout can edit basic info

    const handlePermissionToggle = (permission: string) => {
        if (!canManageRoles) return;
        const currentPerms = editableData.custom_permissions || [];
        const newPerms = currentPerms.includes(permission)
            ? currentPerms.filter(p => p !== permission)
            : [...currentPerms, permission];
        setEditableData(prev => ({ ...prev, custom_permissions: newPerms }));
    };

    return (
        <div className="max-w-2xl mx-auto py-4 space-y-10 animate-in slide-in-from-bottom-4 duration-500">
            {canManageRoles && (
                <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-[2.5rem] border-2 border-red-100 dark:border-red-900/50 flex gap-6 items-center">
                    <AlertTriangle className="text-red-600 shrink-0" size={40}/>
                    <p className="text-xs text-red-900 dark:text-red-300 font-bold leading-relaxed">
                        تنبيه إداري: أي تعديل على الهيكل التنظيمي أو الصلاحيات سيؤثر على وصول الفرد للنظام فوراً.
                    </p>
                </div>
            )}
            
            {canEditPersonalData && (
                 <div className="space-y-4">
                    <h3 className="text-lg font-black dark:text-white px-2">تعديل البيانات الشخصية</h3>
                     <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border-2 dark:border-gray-800 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ConfigInput label="الاسم الكامل" value={editableData.name || ''} onChange={val => setEditableData(p => ({...p, name: val}))} />
                            <ConfigInput label="البريد الإلكتروني (اسم المستخدم)" value={editableData.email || ''} onChange={val => setEditableData(p => ({...p, email: val}))} />
                            <ConfigInput label="الرقم القومي" value={editableData.national_id || ''} onChange={val => setEditableData(p => ({...p, national_id: val}))} />
                            <ConfigInput type="date" label="تاريخ الميلاد" value={editableData.birthdate || ''} onChange={val => setEditableData(p => ({...p, birthdate: val}))} />
                        </div>
                        <div className="pt-2">
                             <label className="text-xs font-bold text-red-800 dark:text-red-300 flex items-center gap-1 mb-1"><Key size={14}/> تغيير كلمة المرور</label>
                             <ConfigInput type="password" placeholder="اتركه فارغاً للإبقاء على الحالية" value={editableData.password_hash || ''} onChange={val => setEditableData(p => ({...p, password_hash: val}))} />
                        </div>
                     </div>
                 </div>
            )}

            <div className="space-y-8 relative">
                {!canManageRoles && <div className="absolute inset-0 bg-gray-100/50 dark:bg-gray-900/50 z-10 rounded-3xl cursor-not-allowed flex items-center justify-center backdrop-blur-[1px]"><div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border dark:border-gray-700 flex items-center gap-2 text-xs font-bold"><Lock size={16}/> للعرض فقط</div></div>}
                
                <h3 className="text-lg font-black dark:text-white px-2">الهوية التنظيمية</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ConfigSelect disabled={!canManageRoles} label="نوع الحساب (الدور الأساسي)" value={editableData.role || 'scout'} options={Object.entries(USER_ROLES)} onChange={val => setEditableData(p => ({...p, role: val}))} />
                    
                    {editableData.role !== 'group_leader' && (
                        <ConfigSelect disabled={!canManageRoles} label="الشعبة الأصلية" value={editableData.unit_id || ''} options={units.map(u => [u.id, u.name])} onChange={val => setEditableData(p => ({...p, unit_id: val}))} placeholder="اختر الشعبة" />
                    )}
                </div>

                {editableData.role === 'scout' && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-800 space-y-4">
                         <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2"><Shield size={16}/> الترقيات والمهام الإضافية</h4>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <ConfigSelect 
                                disabled={!canManageRoles}
                                label="الرتبة الداخلية (الترقي)" 
                                value={editableData.rank || 'scout'} 
                                options={Object.entries(USER_RANKS)} 
                                onChange={val => setEditableData(p => ({...p, rank: val}))} 
                            />

                             <ConfigSelect 
                                disabled={!canManageRoles}
                                label="شعبة الخدمة (جوال في الخدمة)" 
                                value={editableData.service_unit_id || ''} 
                                options={units.map(u => [u.id, u.name])} 
                                onChange={val => setEditableData(p => ({...p, service_unit_id: val === '' ? null : val}))} 
                                placeholder="-- ليس جوال خدمة --" 
                            />
                         </div>
                         <p className="text-[10px] text-blue-800 dark:text-blue-400 opacity-70">
                             * تعيين "شعبة خدمة" يمنح الفرد تلقائياً صلاحيات "مساعد قائد" داخل تلك الشعبة فقط.
                         </p>
                    </div>
                )}
            
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block px-2">الصلاحيات المخصصة (استثناءات)</h4>
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border-2 dark:border-gray-800 space-y-3">
                    {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                        <label key={key} htmlFor={`perm-${key}`} className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${canManageRoles ? 'hover:bg-white dark:hover:bg-gray-900/50 cursor-pointer' : 'opacity-60'}`}>
                        <input
                            type="checkbox"
                            id={`perm-${key}`}
                            className="w-5 h-5 accent-blue-600"
                            checked={editableData.custom_permissions?.includes(key)}
                            onChange={() => handlePermissionToggle(key)}
                            disabled={!canManageRoles}
                        />
                        <span className="text-sm font-bold dark:text-white flex-1">{label}</span>
                        </label>
                    ))}
                    </div>
                </div>
            </div>

            <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[2rem] font-black shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-4 transition-all active:scale-95">
                <Save size={24}/> تحديث البيانات
            </button>
        </div>
    );
};

const ConfigInput = ({ label, value, onChange, type = 'text', placeholder = '' }: any) => (
    <div>
        {label && <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block px-2 mb-1">{label}</label>}
        <input 
            type={type}
            placeholder={placeholder}
            className="w-full bg-white dark:bg-gray-900 border-2 dark:border-gray-700 focus:border-blue-500 dark:text-white p-4 rounded-2xl outline-none transition-all font-bold text-sm"
            value={value}
            onChange={e => onChange(e.target.value)}
        />
    </div>
);

const ConfigSelect = ({ label, value, options, onChange, placeholder, disabled }: any) => (
    <div>
        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block px-2 mb-1">{label}</label>
        <select 
            disabled={disabled}
            className={`w-full bg-white dark:bg-gray-900 border-2 dark:border-gray-700 focus:border-blue-500 dark:text-white p-4 rounded-2xl outline-none transition-all font-bold text-sm ${disabled ? 'opacity-70 bg-gray-100 dark:bg-gray-800' : ''}`}
            value={value}
            onChange={e => onChange(e.target.value)}
        >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map(([val, label]: any) => <option key={val} value={val}>{label}</option>)}
        </select>
    </div>
);
