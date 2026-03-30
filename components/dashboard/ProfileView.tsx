
import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { User } from '../../types';
import { UserCog, Key, Save } from 'lucide-react';

interface ProfileViewProps {
  currentUser: User;
  showMessage: (type: 'success' | 'error', text: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, showMessage }) => {
  const [profileData, setProfileData] = useState<Partial<User>>({
    name: currentUser.name,
    email: currentUser.email,
    national_id: currentUser.national_id,
    birthdate: currentUser.birthdate,
    password_hash: ''
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileData.national_id && (profileData.national_id.length !== 14 || isNaN(Number(profileData.national_id)))) {
        showMessage('error', 'الرقم القومي يجب أن يتكون من 14 رقم');
        return;
    }

    const updates: any = {
        name: profileData.name,
        birthdate: profileData.birthdate,
        national_id: profileData.national_id
    };
    if (profileData.password_hash) updates.password_hash = profileData.password_hash;
    
    const { error } = await supabase.from('users').update(updates).eq('id', currentUser.id);
    if (!error) {
        showMessage('success', 'تم تحديث بياناتك بنجاح');
        window.location.reload();
    } else {
        showMessage('error', 'حدث خطأ أثناء التحديث');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 dark:text-gray-200"><UserCog/> تعديل بياناتي</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">الاسم الثلاثي</label>
                    <input value={profileData.name || ''} onChange={e => setProfileData({...profileData, name: e.target.value})} className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 rounded w-full" required />
                </div>
                <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">الرقم القومي (14 رقم)</label>
                    <input 
                        value={profileData.national_id || ''} 
                        onChange={e => {
                            const val = e.target.value;
                            if (/^\d*$/.test(val) && val.length <= 14) setProfileData({...profileData, national_id: val});
                        }} 
                        className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 rounded w-full" 
                        maxLength={14} 
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">تاريخ الميلاد</label>
                    <input type="date" value={profileData.birthdate || ''} onChange={e => setProfileData({...profileData, birthdate: e.target.value})} className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 rounded w-full" />
                </div>
                <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">اسم المستخدم</label>
                    <input value={profileData.email || ''} className="border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 p-2 rounded w-full" disabled />
                </div>
                <div className="col-span-2 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-900">
                    <label className="block text-sm text-red-800 dark:text-red-300 font-bold mb-1"><Key size={14} className="inline"/> تغيير كلمة المرور (اتركه فارغاً للإبقاء على الحالية)</label>
                    <input type="password" placeholder="كلمة المرور الجديدة" value={profileData.password_hash || ''} onChange={e => setProfileData({...profileData, password_hash: e.target.value})} className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 rounded w-full" dir="ltr" />
                </div>
            </div>
            <button type="submit" className="bg-blue-600 text-white px-8 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700"><Save size={18}/> حفظ التعديلات</button>
        </form>
    </div>
  );
};
