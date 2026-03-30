
import React from 'react';
import { User, USER_ROLES, Unit, hasPermission, PERMISSIONS } from '../types';
import { LogOut, Menu, Shield, Users, Globe, ChevronRight } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  units: Unit[];
  selectedUnitId: string | null;
  onSelectUnit: (id: string | null) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, units, selectedUnitId, onSelectUnit }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Define logic for Service Ranger (Scout with Service Unit)
  const isServiceRanger = user.role === 'scout' && !!user.service_unit_id;

  // STRICTER LOGIC: Only Group Leaders, Unit Leaders (Manage Units), or Service Rangers can toggle units.
  // Internal ranks (Team Leader/Chief Leader) are SCOUTS restricted to their unit, even if they have view permissions.
  const canSelectUnits = 
      user.role === 'group_leader' || 
      (hasPermission(user, PERMISSIONS.MANAGE_UNITS) && user.role !== 'scout') || 
      isServiceRanger;
  
  const visibleUnits = isServiceRanger
    ? units.filter(u => u.id === user.unit_id || u.id === user.service_unit_id)
    : units;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col md:flex-row transition-colors duration-200">
      <div className="bg-blue-900 text-white p-4 flex justify-between items-center md:hidden sticky top-0 z-50 shadow-md">
        <h1 className="font-bold text-xl">الكشافة</h1>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}><Menu /></button>
      </div>

      <aside className={`fixed inset-y-0 right-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-xl dark:shadow-black/50 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:relative md:translate-x-0 md:flex md:flex-col border-l dark:border-gray-700`}>
        <div className="p-6 bg-blue-900 text-white text-center">
            <div className="w-16 h-16 bg-blue-700 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-blue-500">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="font-bold text-lg">{user.name}</h2>
            <span className="inline-block px-3 py-1 bg-blue-800 rounded-full text-xs mt-1 border border-blue-700">
                {USER_ROLES[user.role]}
            </span>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
           {canSelectUnits && (
             <div className="mb-6">
               <p className="text-xs font-bold text-gray-400 mb-2 px-2 uppercase tracking-wider">النطاق الإداري</p>
               
               {user.role === 'group_leader' && (
                 <button 
                    onClick={() => onSelectUnit(null)} 
                    className={`w-full text-right flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${selectedUnitId === null ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                 >
                   <Globe size={16}/> الإدارة العامة
                 </button>
               )}

               <div className="mt-2 space-y-1">
                 {visibleUnits.map(unit => {
                    let unitLabel = unit.name;
                    let isService = false;
                    
                    if (isServiceRanger) {
                        if (unit.id === user.unit_id) unitLabel += " (الأصلية)";
                        if (unit.id === user.service_unit_id) {
                            unitLabel += " (الخدمة)";
                            isService = true;
                        }
                    }
                   
                   return (
                     <button 
                        key={unit.id}
                        onClick={() => onSelectUnit(unit.id)}
                        className={`w-full text-right flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${selectedUnitId === unit.id ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                     >
                       {isService ? <Shield size={16} className="text-orange-500"/> : <Users size={16}/>} 
                       <span className="truncate">{unitLabel}</span>
                       {selectedUnitId === unit.id && <ChevronRight size={14} className="mr-auto"/>}
                     </button>
                   );
                 })}
               </div>
             </div>
           )}

           <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900 mt-auto">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">البيانات:</p>
              <p className="text-sm font-bold text-blue-900 dark:text-blue-300 break-all">{user.email}</p>
           </div>
        </nav>

        <div className="p-4 border-t dark:border-gray-700">
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-3 rounded-lg font-bold transition-colors">
            <LogOut size={18} /> تسجيل الخروج
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen w-full bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        {children}
      </main>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
};
