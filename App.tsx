
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { User, Unit } from './types';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { authService } from './src/services/authService';
import { recoverSession } from './src/utils/sessionRecovery';
import { initSyncEngine, processQueue, openLocalDB } from './src/offline';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
        try {
            // 1. استعادة الجلسة
            const user = await recoverSession();
            if (user) {
                setCurrentUser(user);
                if (user.role !== 'group_leader') {
                    setSelectedUnitId(user.unit_id || null);
                }
            }

            // 2. جلب الوحدات
            const { data, error } = await supabase.from('units').select('*');
            if (data) setUnits(data as Unit[]);
            
            // 3. ربط المزامنة
            await openLocalDB();
            initSyncEngine({ supabase });
            await processQueue({ supabase }).catch(console.error);
        } catch (e) {
            console.log("Database not ready yet");
        }
        setAppReady(true);
    };
    initializeApp();
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role !== 'group_leader') {
        setSelectedUnitId(user.unit_id || null);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setSelectedUnitId(null);
  };

  if (!appReady) return <div className="flex h-screen items-center justify-center">جاري التحميل...</div>;

  return (
    <>
      {!currentUser ? (
        <Auth onLogin={handleLogin} units={units} />
      ) : (
        <Layout user={currentUser} onLogout={handleLogout} units={units} selectedUnitId={selectedUnitId} onSelectUnit={setSelectedUnitId}>
          <Dashboard currentUser={currentUser} units={units} onUnitsChange={setUnits} selectedUnitId={selectedUnitId} />
        </Layout>
      )}
    </>
  );
}
