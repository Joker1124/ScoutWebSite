
export type UserRole = 'group_leader' | 'unit_leader' | 'scout_leader' | 'assistant' | 'scout' | 'priest';
export type UserRank = 'scout' | 'team_leader' | 'chief_leader'; // الرتب الداخلية للفرد

export type UserStatus = 'pending' | 'active';
export type FieldFrequency = 'daily' | 'weekly' | 'monthly';
export type CommunityType = 'all_leaders' | 'unit_leaders' | 'full_unit' | 'team' | 'custom';
export type UnitType = 'clan' | 'troop' | 'pack';

export const PERMISSIONS = {
    // الهيكل التنظيمي
    MANAGE_UNITS: 'manage_units',
    MANAGE_TEAMS: 'manage_teams',
    ASSIGN_USERS: 'assign_users',

    // إدارة الأفراد
    VIEW_ALL_USERS: 'view_all_users',
    APPROVE_USERS: 'approve_users',
    EDIT_USERS: 'edit_users',
    DELETE_USERS: 'delete_users',
    MANAGE_ROLES_PERMISSIONS: 'manage_roles_permissions',

    // إدارة المحتوى والإعدادات
    MANAGE_TRACKING_FIELDS: 'manage_tracking_fields',
    MANAGE_PROGRESS_SYSTEM: 'manage_progress_system',
    MANAGE_BADGE_SYSTEM: 'manage_badge_system',
    MANAGE_COMMUNITIES: 'manage_communities',
    MANAGE_INVENTORY: 'manage_inventory',
    MANAGE_FINANCE: 'manage_finance', // New Permission

    // الصلاحيات التشغيلية
    REGISTER_ATTENDANCE: 'register_attendance',
    UPDATE_PROGRESS: 'update_progress',
    APPROVE_BADGES: 'approve_badges',
    
    // صلاحيات متقدمة
    VIEW_REPORTS: 'view_reports',
    EXPLORE_DB: 'explore_db',
} as const;

export const PERMISSION_LABELS: Record<string, string> = {
    [PERMISSIONS.MANAGE_UNITS]: 'إدارة الوحدات (فرق، عشائر)',
    [PERMISSIONS.MANAGE_TEAMS]: 'إدارة الطلائع/السداسيات',
    [PERMISSIONS.ASSIGN_USERS]: 'تسكين الأفراد في الهيكل',
    [PERMISSIONS.VIEW_ALL_USERS]: 'عرض بيانات جميع الأفراد',
    [PERMISSIONS.APPROVE_USERS]: 'الموافقة على طلبات الانضمام',
    [PERMISSIONS.EDIT_USERS]: 'تعديل بيانات الأفراد',
    [PERMISSIONS.DELETE_USERS]: 'حذف حسابات الأفراد',
    [PERMISSIONS.MANAGE_ROLES_PERMISSIONS]: 'إدارة الرتب والصلاحيات',
    [PERMISSIONS.MANAGE_TRACKING_FIELDS]: 'إدارة بنود المتابعة العامة',
    [PERMISSIONS.MANAGE_PROGRESS_SYSTEM]: 'إدارة نظام المنهج والتقدم',
    [PERMISSIONS.MANAGE_BADGE_SYSTEM]: 'إدارة نظام الشارات بالكامل',
    [PERMISSIONS.MANAGE_COMMUNITIES]: 'إدارة قنوات التواصل',
    [PERMISSIONS.MANAGE_INVENTORY]: 'إدارة المخزن والعهدة',
    [PERMISSIONS.MANAGE_FINANCE]: 'إدارة الخزنة والمالية', // New Label
    [PERMISSIONS.REGISTER_ATTENDANCE]: 'تسجيل الحضور والغياب',
    [PERMISSIONS.UPDATE_PROGRESS]: 'تسجيل التقدم في المنهج',
    [PERMISSIONS.APPROVE_BADGES]: 'اعتماد الشارات للأفراد',
    [PERMISSIONS.VIEW_REPORTS]: 'عرض التقارير والإحصائيات',
    [PERMISSIONS.EXPLORE_DB]: 'استكشاف قاعدة البيانات (للمطور)',
};

export const UNIT_LABELS: Record<UnitType, { unit: string; team: string; leader: string; team_leader: string }> = {
    clan: { unit: 'عشيرة الجوالة', team: 'رهط', leader: 'قائد العشيرة', team_leader: 'رائد الرهط' },
    troop: { unit: 'فرقة الكشافة', team: 'طليعة', leader: 'قائد الفرقة', team_leader: 'عريف الطليعة' },
    pack: { unit: 'باقة الأشبال', team: 'سداسي', leader: 'قائد الباقة', team_leader: 'رائد السداسي' }
};

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  national_id?: string;
  birthdate?: string;
  role: UserRole; // نوع الحساب (فرد، قائد...)
  rank?: UserRank; // الرتبة الداخلية (عريف، عريف أول...)
  status: UserStatus;
  unit_id?: string | null;
  team_id?: string | null; 
  service_unit_id?: string | null; // يحدد إذا كان جوال في الخدمة
  custom_permissions?: string[]; 
  created_at?: string;
  total_points?: number; // New Field for Gamification
}

export interface Unit {
  id: string;
  name: string;
  type: UnitType;
  leader_id?: string;
}

export interface Team {
  id: string;
  name: string;
  unit_id: string;
  leader_id?: string;
}

export interface TrackingField {
  id: string;
  name: string;
  visible: boolean;
  frequency: FieldFrequency;
  min_required?: number;
  created_by: string;
  unit_id?: string; 
}

export interface TrackingRule {
  id: string;
  field_id: string;
  violation_threshold: number;
  violation_action: string;
  is_consecutive: boolean;
  timeframe_days?: number | null;
}

export interface Attendance {
  id: string;
  user_id: string;
  date: string;
  field_id: string;
  status: boolean;
}

export interface ViolationAcknowledgment {
  id: string;
  user_id: string;
  rule_id: string;
  violation_date: string;
  acknowledged_at: string;
}

export interface ProgressCard {
  id: string;
  name: string;
  unit_id?: string;
  type?: string;
  created_by?: string;
}

export interface ProgressCardItem {
  id: string;
  card_id: string;
  name: string;
}

export interface Progress {
  id: string;
  user_id: string;
  card_item_id: string;
  value: number;
  updated_at?: string;
}

export interface UserCard {
  id: string;
  user_id: string;
  card_id: string;
  status?: string;
}

export interface ProgressCardRequest {
  id: string;
  user_id: string;
  card_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
}

export interface Community {
  id: string;
  name: string;
  type: CommunityType;
  unit_id?: string;
  parent_id?: string | null;
  description?: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  community_id: string;
  content: string;
  created_at: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  requirements?: string[];
  unit_id?: string; 
}

export interface BadgeRequest {
  id: string;
  user_id: string;
  badge_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at?: string;
}

export interface BadgeRequirementProgress {
    id: string;
    user_id: string;
    badge_id: string;
    requirement_index: number;
    completed: boolean;
}

export interface Chant {
    id: string;
    title: string;
    content: string;
    media_url?: string | null;
    unit_id?: string | null;
    created_by: string;
    created_at?: string;
}

// Types for Inventory
export interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
    status: 'available' | 'in_use' | 'maintenance';
    unit_id?: string | null;
    description?: string | null;
    is_consumable?: boolean;
    quantity_in_maintenance?: number;
}

export interface InventoryLog {
    id: string;
    item_id: string;
    user_id: string | null;
    checked_out_at: string;
    fully_checked_in_at?: string | null;
    notes?: string | null;
    external_person_name?: string | null;
    quantity_checked_out?: number;
    quantity_returned?: number;
    quantity_damaged?: number;
    checked_out_by?: string | null;
}

export interface InventoryCustodianship {
    id: string;
    user_id: string;
    unit_id: string | null;
}

// New Type for Gamification
export interface PointsLog {
    id: string;
    user_id: string;
    points_awarded: number;
    reason: string;
    related_id?: string | null;
    awarded_at?: string;
}

// Finance Types
export interface Fund {
    id: string;
    name: string;
    type: 'general' | 'unit';
    unit_id?: string | null;
    manager_id?: string | null; // User ID of the treasurer
    balance: number;
    currency?: string;
}

export interface Transaction {
    id: string;
    fund_id: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    description: string;
    date: string;
    created_by: string;
    receipt_image_url?: string | null;
    created_at?: string;
}

export interface ExternalSupply {
    id: string;
    amount: number;
    recipient_id: string; // User ID
    fund_id: string;
    source: string; // From where the money came
    received_date: string;
    notes?: string;
    created_by: string;
    unit_id?: string | null;
}

export const USER_ROLES: Record<UserRole, string> = {
  group_leader: 'قائد المجموعة',
  unit_leader: 'قائد الشعبة',
  scout_leader: 'قائد',
  assistant: 'مساعد قائد',
  scout: 'فرد',
  priest: 'الأب الكاهن (الراعي)'
};

export const USER_RANKS: Record<UserRank, string> = {
    scout: 'فرد',
    team_leader: 'عريف / رائد',
    chief_leader: 'عريف أول / رائد أكبر'
};

export const hasPermission = (user: User, permission: string): boolean => {
    if (user.role === 'group_leader') return true;
    if (user.role === 'priest') {
        // Priest has read-only access to everything.
        // We grant "MANAGE" permissions so they can ACCESS the views,
        // but the views themselves must check if the user is a priest to disable editing.
        const accessPermissions: string[] = [
            PERMISSIONS.MANAGE_UNITS,
            PERMISSIONS.MANAGE_TEAMS,
            PERMISSIONS.VIEW_ALL_USERS,
            PERMISSIONS.MANAGE_TRACKING_FIELDS,
            PERMISSIONS.MANAGE_PROGRESS_SYSTEM,
            PERMISSIONS.MANAGE_BADGE_SYSTEM,
            PERMISSIONS.MANAGE_COMMUNITIES,
            PERMISSIONS.MANAGE_INVENTORY,
            PERMISSIONS.MANAGE_FINANCE,
            PERMISSIONS.VIEW_REPORTS
        ];
        return accessPermissions.includes(permission);
    }
    if (user.custom_permissions?.includes(permission)) return true;

    // Check rank-based permissions for Scouts
    if (user.role === 'scout') {
        const rank = user.rank || 'scout';
        const rankPerms: Record<UserRank, string[]> = {
            scout: [],
            // TEAM LEADER: ONLY VIEW PERMISSIONS. NO REGISTER ATTENDANCE.
            team_leader: [PERMISSIONS.VIEW_ALL_USERS],
            chief_leader: [PERMISSIONS.VIEW_ALL_USERS],
        };
        return rankPerms[rank]?.includes(permission) || false;
    }

    const rolePerms: Record<UserRole, string[]> = {
        group_leader: [], // Handled above
        priest: [], // Handled above
        unit_leader: [
            PERMISSIONS.MANAGE_TEAMS,
            PERMISSIONS.ASSIGN_USERS,
            PERMISSIONS.APPROVE_USERS,
            PERMISSIONS.EDIT_USERS,
            PERMISSIONS.MANAGE_TRACKING_FIELDS,
            PERMISSIONS.MANAGE_PROGRESS_SYSTEM,
            PERMISSIONS.MANAGE_BADGE_SYSTEM,
            PERMISSIONS.MANAGE_COMMUNITIES,
            PERMISSIONS.MANAGE_INVENTORY,
            PERMISSIONS.MANAGE_FINANCE, // Added
            PERMISSIONS.REGISTER_ATTENDANCE,
            PERMISSIONS.UPDATE_PROGRESS,
            PERMISSIONS.APPROVE_BADGES,
            PERMISSIONS.VIEW_REPORTS,
            PERMISSIONS.VIEW_ALL_USERS,
        ],
        scout_leader: [
            PERMISSIONS.MANAGE_TEAMS,
            PERMISSIONS.ASSIGN_USERS,
            PERMISSIONS.APPROVE_USERS,
            PERMISSIONS.REGISTER_ATTENDANCE,
            PERMISSIONS.UPDATE_PROGRESS,
            PERMISSIONS.APPROVE_BADGES,
            PERMISSIONS.MANAGE_INVENTORY,
            PERMISSIONS.VIEW_ALL_USERS,
        ],
        assistant: [
            PERMISSIONS.REGISTER_ATTENDANCE,
            PERMISSIONS.UPDATE_PROGRESS,
            PERMISSIONS.VIEW_ALL_USERS, // Added to allow service rangers to see the list
        ],
        scout: [] // Handled by rank check above
    };

    return rolePerms[user.role]?.includes(permission) || false;
};
