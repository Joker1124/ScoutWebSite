
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Units Table
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('clan', 'troop', 'pack')),
    leader_id UUID, -- References users(id), added later to avoid circular dependency
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Teams Table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    leader_id UUID, -- References users(id)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    national_id TEXT,
    birthdate DATE,
    role TEXT NOT NULL CHECK (role IN ('group_leader', 'unit_leader', 'scout_leader', 'assistant', 'scout', 'priest')),
    rank TEXT CHECK (rank IN ('scout', 'team_leader', 'chief_leader')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'active')),
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    service_unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    custom_permissions TEXT[],
    total_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key for unit leader (circular dependency resolution)
ALTER TABLE units ADD CONSTRAINT fk_unit_leader FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE teams ADD CONSTRAINT fk_team_leader FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL;

-- 4. Tracking Fields (Attendance/Behavior)
CREATE TABLE IF NOT EXISTS tracking_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    visible BOOLEAN DEFAULT TRUE,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    min_required INTEGER,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tracking Rules (Violations)
CREATE TABLE IF NOT EXISTS tracking_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID REFERENCES tracking_fields(id) ON DELETE CASCADE,
    violation_threshold INTEGER NOT NULL,
    violation_action TEXT NOT NULL,
    is_consecutive BOOLEAN DEFAULT FALSE,
    timeframe_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Attendance Records
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    field_id UUID REFERENCES tracking_fields(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, field_id, date)
);

-- 7. Violation Acknowledgments
CREATE TABLE IF NOT EXISTS violation_acknowledgments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES tracking_rules(id) ON DELETE CASCADE,
    violation_date DATE NOT NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Progress Cards (Curriculum)
CREATE TABLE IF NOT EXISTS progress_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    type TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Progress Card Items (Requirements)
CREATE TABLE IF NOT EXISTS progress_card_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID REFERENCES progress_cards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. User Progress (Completed Items)
CREATE TABLE IF NOT EXISTS progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    card_item_id UUID REFERENCES progress_card_items(id) ON DELETE CASCADE,
    value INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, card_item_id)
);

-- 11. User Cards (Assigned Cards)
CREATE TABLE IF NOT EXISTS user_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    card_id UUID REFERENCES progress_cards(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, card_id)
);

-- 12. Progress Card Requests
CREATE TABLE IF NOT EXISTS progress_card_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    card_id UUID REFERENCES progress_cards(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Communities
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('all_leaders', 'unit_leaders', 'full_unit', 'team', 'custom')),
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES communities(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Community Posts
CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Badges
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    requirements TEXT[], -- Array of strings
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Badge Requests
CREATE TABLE IF NOT EXISTS badge_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Badge Requirement Progress
CREATE TABLE IF NOT EXISTS badge_requirements_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    requirement_index INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_id, requirement_index)
);

-- 18. Chants
CREATE TABLE IF NOT EXISTS chants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    media_url TEXT,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('available', 'in_use', 'maintenance')),
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    description TEXT,
    is_consumable BOOLEAN DEFAULT FALSE,
    quantity_in_maintenance INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. Inventory Log
CREATE TABLE IF NOT EXISTS inventory_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    checked_out_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fully_checked_in_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    external_person_name TEXT,
    quantity_checked_out INTEGER DEFAULT 1,
    quantity_returned INTEGER DEFAULT 0,
    quantity_damaged INTEGER DEFAULT 0,
    checked_out_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 21. Inventory Custodianship (Who is responsible for the inventory)
CREATE TABLE IF NOT EXISTS inventory_custodianship (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 22. Points Log (Gamification)
CREATE TABLE IF NOT EXISTS points_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    points_awarded INTEGER NOT NULL,
    reason TEXT NOT NULL,
    related_id UUID, -- Generic reference to other tables
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 23. Funds (Finance Module - NEW)
CREATE TABLE IF NOT EXISTS funds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('general', 'unit')),
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    balance NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'EGP',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 24. Transactions (Finance Module - NEW)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fund_id UUID REFERENCES funds(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    receipt_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 25. External Supplies (NEW)
CREATE TABLE IF NOT EXISTS external_supplies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amount NUMERIC NOT NULL,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    fund_id UUID REFERENCES funds(id) ON DELETE SET NULL,
    source TEXT NOT NULL,
    received_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RPC Function to increment points safely
CREATE OR REPLACE FUNCTION increment_total_points(user_id_param UUID, points_to_add INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET total_points = COALESCE(total_points, 0) + points_to_add
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE violation_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_card_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_card_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_requirements_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE chants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_custodianship ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_supplies ENABLE ROW LEVEL SECURITY;

-- Create policies (Simplified for development - allow all for authenticated users)
-- In production, these should be stricter based on roles
CREATE POLICY "Enable all access for authenticated users" ON units FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON teams FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON users FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON tracking_fields FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON tracking_rules FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON attendance FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON violation_acknowledgments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON progress_cards FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON progress_card_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON progress FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON user_cards FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON progress_card_requests FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON communities FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON community_posts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON badges FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON badge_requests FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON badge_requirements_progress FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON chants FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON inventory_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON inventory_log FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON inventory_custodianship FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON points_log FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON funds FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON transactions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON external_supplies FOR ALL USING (auth.role() = 'authenticated');
