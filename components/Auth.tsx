
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, UserRole, Unit, USER_ROLES } from '../types';
import { UserPlus, LogIn, Database, Copy, Check, AlertTriangle } from 'lucide-react';
import { authService } from '../src/services/authService';

interface AuthProps {
  onLogin: (user: User) => void;
  units: Unit[];
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [role, setRole] = useState<UserRole>('scout');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSql, setShowSql] = useState(false);

  useEffect(() => {
      const loadUnits = async () => {
          const { data } = await supabase.from('units').select('*');
          if (data) setAvailableUnits(data as Unit[]);
      };
      loadUnits();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (role !== 'group_leader' && role !== 'priest' && !selectedUnitId) throw new Error('يجب اختيار الوحدة');
        
        // التحقق من وجود قادة مجموعة سابقين
        const { data: glExists } = await supabase.from('users').select('id').eq('role', 'group_leader').limit(1);
        const shouldBeActive = role === 'group_leader' && (!glExists || glExists.length === 0);

        const newUser: Partial<User> = {
          id: crypto.randomUUID(),
          email: username.trim(),
          password_hash: password,
          name, 
          national_id: nationalId,
          birthdate: birthdate,
          role,
          status: shouldBeActive ? 'active' : 'pending', 
          unit_id: selectedUnitId || null,
          created_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase.from('users').insert(newUser);
        if (insertError) throw insertError;

        if (shouldBeActive) {
            alert('تم إنشاء حساب قائد المجموعة الأول وتفعيله تلقائياً!');
        } else {
            alert('تم إرسال طلبك. يرجى انتظار موافقة القائد.');
        }
        setIsRegister(false);

      } else {
        // استخدام خدمة المصادقة الجديدة
        const user = await authService.login(username.trim(), password);
        onLogin(user);
      }
    } catch (err: any) {
      setError(err.message || 'خطأ في المصادقة');
      if (err.message?.includes('column') || err.message?.includes('relation')) setShowSql(true);
    } finally {
      setLoading(false);
    }
  };

  const sqlScript = `
-- تحديث قاعدة البيانات لهيكلية الكشافة الكاملة (V12)
CREATE TABLE IF NOT EXISTS public.badges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    requirements jsonb DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS public.badge_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    badge_id uuid REFERENCES public.badges(id) ON DELETE CASCADE,
    status text DEFAULT 'pending',
    requested_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text NOT NULL,
    media_url text,
    unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.chants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON public.chants;
CREATE POLICY "Allow all access" ON public.chants FOR ALL USING (true) WITH CHECK (true);

-- إضافة أعمدة المتابعة التشغيلية
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tracking_fields' AND column_name='min_required') THEN
        ALTER TABLE public.tracking_fields ADD COLUMN min_required integer DEFAULT 1;
    END IF;
END $$;

-- تحديث جدول الوحدات لدعم النوع (عشيرة/فرقة)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='units' AND column_name='type') THEN
        ALTER TABLE public.units ADD COLUMN type text DEFAULT 'troop';
    END IF;
END $$;
`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 p-4" dir="rtl">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-blue-900 mb-6">منظومة الكشافة الكنسية</h1>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-xs">{error}</div>}
        
        <form onSubmit={handleAuth} className="space-y-4">
            {isRegister && (
                <>
                    <input className="w-full p-2 border rounded" placeholder="الاسم الكامل" value={name} onChange={e=>setName(e.target.value)} required />
                    <input className="w-full p-2 border rounded" placeholder="الرقم القومي" value={nationalId} onChange={e=>setNationalId(e.target.value)} required />
                    <input className="w-full p-2 border rounded" type="date" value={birthdate} onChange={e=>setBirthdate(e.target.value)} required />
                    <select className="w-full p-2 border rounded" value={role} onChange={e=>setRole(e.target.value as UserRole)}>
                        {Object.entries(USER_ROLES).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                    {role !== 'group_leader' && role !== 'priest' && (
                        <select className="w-full p-2 border rounded" value={selectedUnitId} onChange={e=>setSelectedUnitId(e.target.value)} required>
                            <option value="">اختر الشعبة...</option>
                            {availableUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    )}
                </>
            )}
            <input className="w-full p-2 border rounded" placeholder="اسم المستخدم" value={username} onChange={e=>setUsername(e.target.value)} required />
            <input className="w-full p-2 border rounded" type="password" placeholder="كلمة المرور" value={password} onChange={e=>setPassword(e.target.value)} required />
            <button className="w-full bg-blue-800 text-white py-2 rounded font-bold hover:bg-blue-900">
                {isRegister ? 'إنشاء حساب' : 'دخول'}
            </button>
        </form>
        <button onClick={()=>setIsRegister(!isRegister)} className="w-full text-center text-sm text-blue-600 mt-4 underline">
            {isRegister ? 'لديك حساب؟ سجل دخول' : 'ليس لديك حساب؟ سجل الآن'}
        </button>
      </div>
    </div>
  );
};
