import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { authService } from '../src/services/authService';
import { getTable, setTable } from '../src/offline';
import { 
  User, Unit, Team, TrackingField, Attendance, Progress, Community, 
  ProgressCard, ProgressCardItem, TrackingRule, ViolationAcknowledgment, 
  UserCard,  Badge, BadgeRequest, ProgressCardRequest, InventoryItem, 
  InventoryLog, InventoryCustodianship, Fund, Transaction, ExternalSupply,
  BadgeRequirementProgress, CommunityPost
} from '../types';

/**
 * Hook مخصص لإدارة المزامنة في الوقت الفعلي (Real-time Sync)
 * يدعم وضع الأوفلاين عبر IndexedDB
 */
export const useRealtimeSync = (currentUser: User | null) => {
  const [data, setData] = useState<{
    users: User[];
    units: Unit[];
    teams: Team[];
    trackingFields: TrackingField[];
    attendance: Attendance[];
    communities: Community[];
    communityPosts: CommunityPost[];
    progressCards: ProgressCard[];
    progressCardItems: ProgressCardItem[];
    progress: Progress[];
    userCards: UserCard[];
    progressCardRequests: ProgressCardRequest[];
    trackingRules: TrackingRule[];
    violations: ViolationAcknowledgment[];
    badges: Badge[];
    badgeRequests: BadgeRequest[];
    badgeRequirementProgress: BadgeRequirementProgress[];
    inventoryItems: InventoryItem[];
    inventoryLogs: InventoryLog[];
    inventoryCustodianships: InventoryCustodianship[];
    funds: Fund[];
    transactions: Transaction[];
    externalSupplies: ExternalSupply[];
  }>({
    users: [], units: [], teams: [], trackingFields: [], attendance: [],
    communities: [], communityPosts: [], progressCards: [], progressCardItems: [],
    progress: [], userCards: [], progressCardRequests: [], trackingRules: [],
    violations: [], badges: [], badgeRequests: [], badgeRequirementProgress: [],
    inventoryItems: [], inventoryLogs: [], inventoryCustodianships: [],
    funds: [], transactions: [], externalSupplies: [],
  });

  const [loading, setLoading] = useState(true);

  /**
   * جلب البيانات الأولية (أولاً من IndexedDB ثم من السيرفر إذا كان متاحاً)
   */
  const fetchInitialData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    
    try {
      // 1. تحميل البيانات المحلية فوراً (Offline-First)
      const tables = [
        'users', 'units', 'teams', 'tracking_fields', 'attendance', 'communities',
        'community_posts', 'progress_cards', 'progress_card_items', 'progress',
        'user_cards', 'progress_card_requests', 'tracking_rules', 'violation_acknowledgments',
        'badges', 'badge_requests', 'badge_requirements_progress', 'inventory_items',
        'inventory_log', 'inventory_custodianship', 'funds', 'transactions', 'external_supplies'
      ];

      const results = await Promise.all(tables.map(async (table) => {
        try {
          return await getTable(table) || [];
        } catch (e) {
          console.warn(`Failed to load local table: ${table}`, e);
          return [];
        }
      }));

      const [
        users, units, teams, trackingFields, attendance, communities,
        communityPosts, progressCards, progressCardItems, progress,
        userCards, progressCardRequests, trackingRules, violations,
        badges, badgeRequests, badgeRequirementProgress, inventoryItems,
        inventoryLogs, inventoryCustodianships, funds, transactions, externalSupplies
      ] = results;

      setData(prev => ({
        ...prev,
        users, units, teams, trackingFields, attendance, communities,
        communityPosts, progressCards, progressCardItems, progress,
        userCards, progressCardRequests, trackingRules, violations,
        badges, badgeRequests, badgeRequirementProgress, inventoryItems,
        inventoryLogs, inventoryCustodianships, funds, transactions, externalSupplies
      }));

      // 2. إذا كان هناك إنترنت، جلب أحدث نسخة من السيرفر
      if (navigator.onLine) {
        const serverResults = await Promise.all(tables.map(async (table) => {
          try {
            const { data, error } = await supabase.from(table).select('*');
            
            if (error) throw error;
            
            if (data) {
              await setTable(table, data);
              return data;
            }
          } catch (e) {
            console.warn(`Failed to fetch from Supabase for table: ${table}`, e);
          }
          return null;
        }));

          const [
            s_users, s_units, s_teams, s_trackingFields, s_attendance, s_communities,
            s_communityPosts, s_progressCards, s_progressCardItems, s_progress,
            s_userCards, s_progressCardRequests, s_trackingRules, s_violations,
            s_badges, s_badgeRequests, s_badgeRequirementProgress, s_inventoryItems,
            s_inventoryLogs, s_inventoryCustodianships, s_funds, s_transactions, s_externalSupplies
          ] = serverResults;

          setData(prev => ({
            ...prev,
            users: s_users || prev.users,
            units: s_units || prev.units,
            teams: s_teams || prev.teams,
            trackingFields: s_trackingFields || prev.trackingFields,
            attendance: s_attendance || prev.attendance,
            communities: s_communities || prev.communities,
            communityPosts: s_communityPosts || prev.communityPosts,
            progressCards: s_progressCards || prev.progressCards,
            progressCardItems: s_progressCardItems || prev.progressCardItems,
            progress: s_progress || prev.progress,
            userCards: s_userCards || prev.userCards,
            progressCardRequests: s_progressCardRequests || prev.progressCardRequests,
            trackingRules: s_trackingRules || prev.trackingRules,
            violations: s_violations || prev.violations,
            badges: s_badges || prev.badges,
            badgeRequests: s_badgeRequests || prev.badgeRequests,
            badgeRequirementProgress: s_badgeRequirementProgress || prev.badgeRequirementProgress,
            inventoryItems: s_inventoryItems || prev.inventoryItems,
            inventoryLogs: s_inventoryLogs || prev.inventoryLogs,
            inventoryCustodianships: s_inventoryCustodianships || prev.inventoryCustodianships,
            funds: s_funds || prev.funds,
            transactions: s_transactions || prev.transactions,
            externalSupplies: s_externalSupplies || prev.externalSupplies
          }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  /**
   * تحديث بيانات جدول معين في الذاكرة وفي IndexedDB
   */
  const updateTableData = useCallback(async (table: string, newData: any) => {
    // تحديث IndexedDB
    try {
      await setTable(table, newData);
    } catch (e) {
      console.warn(`Failed to update local table: ${table}`, e);
    }

    // تحديث الذاكرة
    setData(prev => {
      const stateKey = table === 'violation_acknowledgments' ? 'violations' : 
                       table === 'inventory_log' ? 'inventoryLogs' :
                       table === 'inventory_custodianship' ? 'inventoryCustodianships' :
                       table === 'external_supplies' ? 'externalSupplies' :
                       table === 'tracking_fields' ? 'trackingFields' :
                       table === 'progress_cards' ? 'progressCards' :
                       table === 'progress_card_items' ? 'progressCardItems' :
                       table === 'progress_card_requests' ? 'progressCardRequests' :
                       table === 'tracking_rules' ? 'trackingRules' :
                       table === 'badge_requests' ? 'badgeRequests' :
                       table === 'badge_requirements_progress' ? 'badgeRequirementProgress' :
                       table === 'community_posts' ? 'communityPosts' :
                       table === 'inventory_items' ? 'inventoryItems' :
                       table;
      
      return {
        ...prev,
        [stateKey]: newData
      };
    });
  }, []);

  useEffect(() => {
    const handleLocalDbUpdate = async (event: CustomEvent) => {
      const { table } = event.detail;
      console.log('[useRealtimeSync] Local DB updated for table:', table);
      if (table) {
        try {
          const newData = await getTable(table);
          console.log('[useRealtimeSync] New data for table:', table, newData);
          if (newData) {
            setData(prev => {
              let stateKey: keyof typeof prev | null = null;
              
              // Mapping table names to state keys
              if (table === 'users') stateKey = 'users';
              else if (table === 'units') stateKey = 'units';
              else if (table === 'teams') stateKey = 'teams';
              else if (table === 'tracking_fields') stateKey = 'trackingFields';
              else if (table === 'attendance') stateKey = 'attendance';
              else if (table === 'communities') stateKey = 'communities';
              else if (table === 'community_posts') stateKey = 'communityPosts';
              else if (table === 'progress_cards') stateKey = 'progressCards';
              else if (table === 'progress_card_items') stateKey = 'progressCardItems';
              else if (table === 'progress') stateKey = 'progress';
              else if (table === 'user_cards') stateKey = 'userCards';
              else if (table === 'progress_card_requests') stateKey = 'progressCardRequests';
              else if (table === 'tracking_rules') stateKey = 'trackingRules';
              else if (table === 'violation_acknowledgments') stateKey = 'violations';
              else if (table === 'badges') stateKey = 'badges';
              else if (table === 'badge_requests') stateKey = 'badgeRequests';
              else if (table === 'badge_requirements_progress') stateKey = 'badgeRequirementProgress';
              else if (table === 'inventory_items') stateKey = 'inventoryItems';
              else if (table === 'inventory_log') stateKey = 'inventoryLogs';
              else if (table === 'inventory_custodianship') stateKey = 'inventoryCustodianships';
              else if (table === 'funds') stateKey = 'funds';
              else if (table === 'transactions') stateKey = 'transactions';
              else if (table === 'external_supplies') stateKey = 'externalSupplies';
              
              if (!stateKey) {
                console.warn('[useRealtimeSync] No state key found for table:', table);
                return prev;
              }

              console.log('[useRealtimeSync] Updating state for key:', stateKey);
              return {
                ...prev,
                [stateKey]: newData
              };
            });
          }
        } catch (e) {
          console.error(`Failed to refresh local table ${table} after update`, e);
        }
      }
    };

    window.addEventListener('local-db-updated', handleLocalDbUpdate as EventListener);
    return () => {
      window.removeEventListener('local-db-updated', handleLocalDbUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    fetchInitialData();

    if (!currentUser) return;

    /**
     * الاشتراك في تحديثات Supabase Realtime
     */
    const tables = [
      'users', 'units', 'teams', 'tracking_fields', 'attendance', 'communities',
      'community_posts', 'progress_cards', 'progress_card_items', 'progress',
      'user_cards', 'progress_card_requests', 'tracking_rules', 'violation_acknowledgments',
      'badges', 'badge_requests', 'badge_requirements_progress', 'inventory_items',
      'inventory_log', 'inventory_custodianship', 'funds', 'transactions', 'external_supplies'
    ];

    console.log('جاري تفعيل Supabase Realtime...');
    
    const channels = tables.map(table => {
      return supabase
        .channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: table }, async () => {
          console.log(`تغيير مكتشف في الجدول: ${table}`);
          // جلب أحدث البيانات للجدول المتأثر
          const { data: newData } = await supabase.from(table).select('*');
          if (newData) {
            updateTableData(table, newData);
          }
        })
        .subscribe();
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [currentUser, fetchInitialData, updateTableData]);

  return { data, loading, refresh: fetchInitialData };
};
