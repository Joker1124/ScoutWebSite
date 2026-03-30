
import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Search, Table, Columns, Info, Database, ShieldAlert, CheckCircle, XCircle, Key, RefreshCw, Wrench, Copy, Check, AlertTriangle } from 'lucide-react';

// تعريف الهيكلية المتوقعة لقاعدة البيانات
const DETAILED_SCHEMA = [
  { 
    table: 'users', 
    columns: [
      { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
      { name: 'name', type: 'text NOT NULL' },
      { name: 'email', type: 'text UNIQUE NOT NULL' },
      { name: 'password_hash', type: 'text NOT NULL' },
      { name: 'role', type: 'text NOT NULL' },
      { name: 'rank', type: "text DEFAULT 'scout'" },
      { name: 'status', type: "text DEFAULT 'pending'" },
      { name: 'unit_id', type: 'uuid REFERENCES public.units(id) ON DELETE SET NULL' },
      { name: 'team_id', type: 'uuid REFERENCES public.teams(id) ON DELETE SET NULL' },
      { name: 'service_unit_id', type: 'uuid REFERENCES public.units(id) ON DELETE SET NULL' },
      { name: 'national_id', type: 'text' },
      { name: 'birthdate', type: 'date' },
      { name: 'custom_permissions', type: "jsonb DEFAULT '[]'" },
      { name: 'created_at', type: 'timestamp with time zone DEFAULT now()' },
      { name: 'total_points', type: 'integer DEFAULT 0' }
    ] 
  },
  { 
    table: 'units', 
    columns: [
      { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
      { name: 'name', type: 'text NOT NULL' },
      { name: 'type', type: "text DEFAULT 'troop'" },
      { name: 'leader_id', type: 'uuid' }
    ] 
  },
  { 
    table: 'teams', 
    columns: [
      { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
      { name: 'name', type: 'text NOT NULL' },
      { name: 'unit_id', type: 'uuid REFERENCES public.units(id) ON DELETE CASCADE' }
    ] 
  },
  { 
    table: 'tracking_fields', 
    columns: [
      { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
      { name: 'name', type: 'text NOT NULL' },
      { name: 'frequency', type: 'text NOT NULL' },
      { name: 'min_required', type: 'integer DEFAULT 1' },
      { name: 'unit_id', type: 'uuid REFERENCES public.units(id) ON DELETE CASCADE' }
    ] 
  },
  { 
    table: 'attendance', 
    columns: [
      { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
      { name: 'user_id', type: 'uuid REFERENCES public.users(id) ON DELETE CASCADE' },
      { name: 'date', type: 'date NOT NULL' },
      { name: 'field_id', type: 'uuid REFERENCES public.tracking_fields(id) ON DELETE CASCADE' },
      { name: 'status', type: 'boolean DEFAULT false' }
    ],
    constraints: ['UNIQUE (user_id, field_id, date)'] 
  },
  { 
    table: 'badges', 
    columns: [
      { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
      { name: 'title', type: 'text NOT NULL' },
      { name: 'description', type: 'text' },
      { name: 'requirements', type: "jsonb DEFAULT '[]'" },
      { name: 'unit_id', type: 'uuid REFERENCES public.units(id) ON DELETE CASCADE' }
    ] 
  },
  { 
    table: 'badge_requests', 
    columns: [
      { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
      { name: 'user_id', type: 'uuid REFERENCES public.users(id) ON DELETE CASCADE' },
      { name: 'badge_id', type: 'uuid REFERENCES public.badges(id) ON DELETE CASCADE' },
      { name: 'status', type: "text DEFAULT 'pending'" },
      { name: 'requested_at', type: 'timestamp with time zone DEFAULT now()' }
    ],
    constraints: ['UNIQUE (user_id, badge_id)']
  },
  { 
    table: 'badge_requirements_progress', 
    columns: [
      { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
      { name: 'user_id', type: 'uuid REFERENCES public.users(id) ON DELETE CASCADE' },
      { name: 'badge_id', type: 'uuid REFERENCES public.badges(id) ON DELETE CASCADE' },
      { name: 'requirement_index', type: 'integer NOT NULL' },
      { name: 'completed', type: 'boolean DEFAULT true' }
    ],
    constraints: ['UNIQUE (user_id, badge_id, requirement_index)']
  },
  { 
    table: 'progress_cards', 
    columns: [
      { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
      { name: 'name', type: 'text NOT NULL' },
      { name: 'unit_id', type: 'uuid REFERENCES public.units(id) ON DELETE CASCADE' }
    ] 
  },
  { 
    table: 'progress_card_items', 
    columns: [
      { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
      { name: 'card_id', type: 'uuid REFERENCES public.progress_cards(id) ON DELETE CASCADE' },
      { name: 'name', type: 'text NOT NULL' }
    ] 
  },
  { 
    table: 'progress', 
    columns: [
      { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
      { name: 'user_id', type: 'uuid REFERENCES public.users(id) ON DELETE CASCADE' },
      { name: 'card_item_id', type: 'uuid REFERENCES public.progress_card_items(id) ON DELETE CASCADE' },
      { name: 'value', type: 'integer DEFAULT 0' }
    ],
    constraints: ['UNIQUE (user_id, card_item_id)']
  },
  { 
    table: 'user_cards', 
    columns: [
      { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
      { name: 'user_id', type: 'uuid REFERENCES public.users(id) ON DELETE CASCADE' },
      { name: 'card_id', type: 'uuid REFERENCES public.progress_cards(id) ON DELETE CASCADE' }
    ],
    constraints: ['UNIQUE (user_id, card_id)']
  },
  {
      table: 'progress_card_requests',
      columns: [
          { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
          { name: 'user_id', type: 'uuid REFERENCES public.users(id) ON DELETE CASCADE' },
          { name: 'card_id', type: 'uuid REFERENCES public.progress_cards(id) ON DELETE CASCADE' },
          { name: 'status', type: "text DEFAULT 'pending'" },
          { name: 'requested_at', type: 'timestamp with time zone DEFAULT now()' }
      ],
      constraints: ['UNIQUE (user_id, card_id)']
  },
  {
      table: 'community_posts',
      columns: [
          { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
          { name: 'user_id', type: 'uuid REFERENCES public.users(id) ON DELETE CASCADE' },
          { name: 'community_id', type: 'uuid REFERENCES public.communities(id) ON DELETE CASCADE' },
          { name: 'content', type: 'text NOT NULL' },
          { name: 'created_at', type: 'timestamp with time zone DEFAULT now()' }
      ]
  },
  {
      table: 'violation_acknowledgments',
      columns: [
          { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
          { name: 'user_id', type: 'uuid REFERENCES public.users(id) ON DELETE CASCADE' },
          { name: 'rule_id', type: 'uuid REFERENCES public.tracking_rules(id) ON DELETE CASCADE' },
          { name: 'violation_date', type: 'date NOT NULL' },
          { name: 'acknowledged_at', type: 'timestamp with time zone DEFAULT now()' }
      ]
  },
  {
      table: 'tracking_rules',
      columns: [
          { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
          { name: 'field_id', type: 'uuid REFERENCES public.tracking_fields(id) ON DELETE CASCADE' },
          { name: 'violation_threshold', type: 'integer DEFAULT 2' },
          { name: 'violation_action', type: 'text NOT NULL' },
          { name: 'is_consecutive', type: 'boolean DEFAULT true' },
          { name: 'timeframe_days', type: 'integer' }
      ]
  },
  {
      table: 'chants',
      columns: [
          { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
          { name: 'title', type: 'text NOT NULL' },
          { name: 'content', type: 'text NOT NULL' },
          { name: 'media_url', type: 'text' },
          { name: 'unit_id', type: 'uuid REFERENCES public.units(id) ON DELETE SET NULL' },
          { name: 'created_by', type: 'uuid REFERENCES public.users(id) ON DELETE SET NULL' },
          { name: 'created_at', type: 'timestamp with time zone DEFAULT now()' }
      ]
  },
   {
      table: 'inventory_items',
      columns: [
          { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
          { name: 'name', type: 'text NOT NULL' },
          { name: 'description', type: 'text' },
          { name: 'quantity', type: 'integer DEFAULT 1' },
          { name: 'status', type: "text DEFAULT 'available'" },
          { name: 'unit_id', type: 'uuid REFERENCES public.units(id) ON DELETE SET NULL' },
          { name: 'is_consumable', type: 'boolean DEFAULT false' },
          { name: 'quantity_in_maintenance', type: 'integer DEFAULT 0' }
      ]
  },
  {
      table: 'inventory_log',
      columns: [
          { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
          { name: 'item_id', type: 'uuid REFERENCES public.inventory_items(id) ON DELETE CASCADE' },
          { name: 'user_id', type: 'uuid REFERENCES public.users(id) ON DELETE SET NULL' },
          { name: 'checked_out_by', type: 'uuid REFERENCES public.users(id) ON DELETE SET NULL' },
          { name: 'external_person_name', type: 'text' },
          { name: 'quantity_checked_out', type: 'integer DEFAULT 1' },
          { name: 'quantity_returned', type: 'integer DEFAULT 0' },
          { name: 'quantity_damaged', type: 'integer DEFAULT 0' },
          { name: 'checked_out_at', type: 'timestamp with time zone DEFAULT now()' },
          { name: 'fully_checked_in_at', type: 'timestamp with time zone' },
          { name: 'notes', type: 'text' }
      ]
  },
    {
      table: 'inventory_custodianship',
      columns: [
          { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
          { name: 'user_id', type: 'uuid REFERENCES public.users(id) ON DELETE CASCADE' },
          { name: 'unit_id', type: 'uuid REFERENCES public.units(id) ON DELETE CASCADE' }
      ],
      constraints: ['UNIQUE (user_id, unit_id)']
  },
  {
      table: 'points_log',
      columns: [
          { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
          { name: 'user_id', type: 'uuid REFERENCES public.users(id) ON DELETE CASCADE' },
          { name: 'points_awarded', type: 'integer NOT NULL' },
          { name: 'reason', type: 'text' },
          { name: 'related_id', type: 'text' },
          { name: 'awarded_at', type: 'timestamp with time zone DEFAULT now()' }
      ]
  },
  {
      table: 'funds',
      columns: [
          { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
          { name: 'name', type: 'text NOT NULL' },
          { name: 'type', type: "text NOT NULL CHECK (type IN ('general', 'unit'))" },
          { name: 'unit_id', type: 'uuid REFERENCES public.units(id) ON DELETE SET NULL' },
          { name: 'manager_id', type: 'uuid REFERENCES public.users(id) ON DELETE SET NULL' },
          { name: 'balance', type: 'numeric DEFAULT 0' },
          { name: 'currency', type: "text DEFAULT 'EGP'" },
          { name: 'created_at', type: 'timestamp with time zone DEFAULT now()' }
      ]
  },
  {
      table: 'transactions',
      columns: [
          { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
          { name: 'fund_id', type: 'uuid REFERENCES public.funds(id) ON DELETE CASCADE' },
          { name: 'amount', type: 'numeric NOT NULL' },
          { name: 'type', type: "text NOT NULL CHECK (type IN ('income', 'expense'))" },
          { name: 'category', type: 'text NOT NULL' },
          { name: 'description', type: 'text' },
          { name: 'date', type: 'timestamp with time zone DEFAULT now()' },
          { name: 'created_by', type: 'uuid REFERENCES public.users(id) ON DELETE SET NULL' },
          { name: 'receipt_image_url', type: 'text' },
          { name: 'created_at', type: 'timestamp with time zone DEFAULT now()' }
      ]
  },
  {
      table: 'external_supplies',
      columns: [
          { name: 'id', type: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()' },
          { name: 'amount', type: 'numeric NOT NULL' },
          { name: 'recipient_id', type: 'uuid REFERENCES public.users(id) ON DELETE CASCADE' },
          { name: 'fund_id', type: 'uuid REFERENCES public.funds(id) ON DELETE SET NULL' },
          { name: 'source', type: 'text NOT NULL' },
          { name: 'received_date', type: 'timestamp with time zone DEFAULT now()' },
          { name: 'notes', type: 'text' },
          { name: 'created_by', type: 'uuid REFERENCES public.users(id) ON DELETE SET NULL' },
          { name: 'unit_id', type: 'uuid REFERENCES public.units(id) ON DELETE SET NULL' }
      ]
  }
];

export const DatabaseExplorer: React.FC = () => {
  const [serviceRoleKey, setServiceRoleKey] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [detectedSchema, setDetectedSchema] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [repairSql, setRepairSql] = useState('');
  const [copied, setCopied] = useState(false);

  const handleInspect = async () => {
    if (!serviceRoleKey.trim()) {
      setError('يرجى إدخال Service Role Key');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const inspectionResults = [];
      let generatedSql = "-- كشافة: سكربت الإصلاح الشامل (إضافة الجداول والأعمدة الناقصة)\n-- DROP TABLE IF EXISTS public.inventory_custodians;\n";
      let issuesFound = false;

      for (const item of DETAILED_SCHEMA) {
        const { error: tableError } = await supabase.from(item.table).select('*').limit(1);
        
        let tableStatus = 'present';
        if (tableError) {
            if (tableError.code === '42P01' || tableError.message.includes('does not exist') || tableError.message.includes('relation')) {
                tableStatus = 'missing';
            }
        }

        const columnResults: any[] = [];
        for (const col of item.columns) {
            if (tableStatus === 'missing') {
                columnResults.push({ name: col.name, status: 'missing' });
            } else {
                const { error: colError } = await supabase.from(item.table).select(col.name).limit(1);
                columnResults.push({ name: col.name, status: colError ? 'missing' : 'present' });
            }
        }

        if (tableStatus === 'present' && columnResults.length > 0 && columnResults.every(c => c.status === 'missing')) {
            tableStatus = 'missing';
        }

        if (tableStatus === 'missing') {
          issuesFound = true;
          generatedSql += `\n-- إنشاء جدول ${item.table} (مفقود بالكامل)\n`;
          generatedSql += `CREATE TABLE IF NOT EXISTS public.${item.table} (\n`;
          generatedSql += item.columns.map(c => `    ${c.name} ${c.type}`).join(',\n');
          if (item.constraints) {
              generatedSql += `,\n    ${item.constraints.map((c, i) => `CONSTRAINT ${item.table}_const_${i} ${c}`).join(',\n    ')}`;
          }
          generatedSql += `\n);\n`;
          generatedSql += `ALTER TABLE public.${item.table} ENABLE ROW LEVEL SECURITY;\n`;
          generatedSql += `DROP POLICY IF EXISTS "Allow all access" ON public.${item.table};\n`;
          generatedSql += `CREATE POLICY "Allow all access" ON public.${item.table} FOR ALL USING (true) WITH CHECK (true);\n`;
        } else {
          for (const colRes of columnResults) {
            if (colRes.status === 'missing') {
              issuesFound = true;
              const colDef = item.columns.find(c => c.name === colRes.name);
              if (colDef) {
                  generatedSql += `ALTER TABLE public.${item.table} ADD COLUMN IF NOT EXISTS ${colDef.name} ${colDef.type.replace('PRIMARY KEY', '').replace('DEFAULT gen_random_uuid()', '')};\n`;
              }
            }
          }
        }

        inspectionResults.push({
          name: item.table,
          status: tableStatus,
          columns: columnResults,
          requiredColumns: item.columns
        });
      }

        // Add function for points
        generatedSql += `
-- Function to increment total_points
CREATE OR REPLACE FUNCTION increment_total_points(user_id_param uuid, points_to_add integer)
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET total_points = total_points + points_to_add
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql;
`;

      // Add VIEW for inventory logs to join user and item names
      generatedSql += `
-- View to simplify fetching inventory logs with names
CREATE OR REPLACE VIEW public.inventory_log_view AS
SELECT
  log.id,
  log.item_id,
  log.user_id,
  log.checked_out_at,
  log.fully_checked_in_at,
  log.notes,
  COALESCE(u_receiver.name, log.external_person_name) AS person_name,
  i.name AS item_name,
  i.unit_id,
  log.external_person_name,
  log.quantity_checked_out,
  log.quantity_returned,
  log.quantity_damaged,
  log.checked_out_by,
  u_issuer.name as issuer_name
FROM
  public.inventory_log AS log
LEFT JOIN
  public.users AS u_receiver ON log.user_id = u_receiver.id
LEFT JOIN
  public.users AS u_issuer ON log.checked_out_by = u_issuer.id
JOIN
  public.inventory_items AS i ON log.item_id = i.id;
`;

      // Check if view exists, if not, consider it an issue.
      const { error: viewError } = await supabase.from('inventory_log_view').select('*').limit(1);
      if (viewError) {
          issuesFound = true;
      }


      setDetectedSchema(inspectionResults);
      // Always generate the script if there are issues, ensuring the view and function are included.
      setRepairSql(issuesFound ? generatedSql : "");
      setIsAuthorized(true);
    } catch (err: any) {
      setError('فشل فحص قاعدة البيانات: ' + err.message);
    } finally {
      setLoading(false);
      setServiceRoleKey('');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(repairSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/10 p-5 rounded-2xl border border-red-100 dark:border-red-900/30">
          <ShieldAlert className="text-red-600" size={32} />
          <div className="flex-1">
              <h3 className="font-bold text-red-900 dark:text-red-300">قسم البحث والمطابقة الهيكلية</h3>
              <p className="text-xs text-red-700 dark:text-red-400">
                  هام جداً: إذا ظهرت لك رسائل خطأ مثل "Could not find column" أو "Schema Cache"، قم بتشغيل الفحص هنا وانسخ كود الإصلاح ونفذه في Supabase SQL Editor.
              </p>
          </div>
      </div>

      {!isAuthorized ? (
          <div className="max-w-md mx-auto bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border dark:border-gray-700 text-center">
              <Key className="mx-auto mb-4 text-gray-300" size={48} />
              <h4 className="font-bold mb-4 dark:text-white">أدخل مفتاح الخدمة (Service Role Key)</h4>
              <p className="text-xs text-gray-500 mb-4">يمكنك استخدام المفتاح العام (Anon Key) للمشروع الحالي، ولكن يفضل مفتاح الخدمة للفحص الدقيق.</p>
              <input 
                type="password"
                className="w-full p-4 rounded-xl border dark:border-gray-600 dark:bg-gray-700 dark:text-white mb-4 text-center text-sm outline-none focus:ring-2 focus:ring-red-500"
                placeholder="eyJh..."
                value={serviceRoleKey}
                onChange={e => setServiceRoleKey(e.target.value)}
              />
              {error && <p className="text-xs text-red-600 mb-4">{error}</p>}
              <button onClick={handleInspect} disabled={loading} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                {loading ? <RefreshCw className="animate-spin" size={18}/> : 'بدء فحص التطابق العميق'}
              </button>
          </div>
      ) : (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              {repairSql ? (
                <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-dashed border-orange-300 dark:border-orange-800 p-6 rounded-3xl">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-orange-200 dark:bg-orange-800 rounded-2xl text-orange-700 dark:text-orange-200"><Wrench size={24}/></div>
                            <div>
                                <h4 className="font-bold text-orange-900 dark:text-orange-300">تم اكتشاف فجوات في الهيكلية!</h4>
                                <p className="text-xs text-orange-700 dark:text-orange-400">يجب تنفيذ الكود التالي في Supabase لإصلاح الأخطاء (بما في ذلك جداول الصيحات).</p>
                            </div>
                        </div>
                        <button onClick={copyToClipboard} className="bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-700 transition-all active:scale-95 shadow-lg shadow-orange-600/20">
                            {copied ? <Check size={18}/> : <Copy size={18}/>}
                            {copied ? 'تم النسخ' : 'نسخ سكربت الإصلاح'}
                        </button>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto border border-gray-800 max-h-64 overflow-y-auto">
                        <pre className="text-[10px] text-green-400 font-mono leading-relaxed whitespace-pre-wrap">{repairSql}</pre>
                    </div>
                </div>
              ) : (
                  <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-3xl border border-green-200 flex items-center gap-3">
                      <CheckCircle className="text-green-600"/>
                      <span className="font-bold text-green-800 dark:text-green-300">قاعدة البيانات متطابقة تماماً مع الكود!</span>
                  </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {detectedSchema.map(res => (
                      <div key={res.name} className={`bg-white dark:bg-gray-800 p-5 rounded-2xl border transition-all ${res.status === 'present' && res.columns.every((c:any) => c.status === 'present') ? 'border-gray-200 dark:border-gray-700' : 'border-red-300 dark:border-red-900 shadow-lg shadow-red-500/5'}`}>
                          <div className="flex justify-between items-center mb-4">
                              <div className="flex items-center gap-2">
                                  <Table size={18} className={res.status === 'present' ? 'text-blue-500' : 'text-red-500'} />
                                  <h5 className="font-bold text-sm uppercase dark:text-white">{res.name}</h5>
                              </div>
                              {res.status === 'present' ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                          </div>
                          <div className="space-y-1">
                              {res.columns.map((col: any) => (
                                  <div key={col.name} className="flex justify-between text-xs">
                                      <span className="text-gray-500 dark:text-gray-400">{col.name}</span>
                                      {col.status === 'present' ? <span className="text-green-500">✓</span> : <span className="text-red-500 font-bold">ناقص</span>}
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};
