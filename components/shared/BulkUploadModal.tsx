
import React, { useState } from 'react';
import { Unit } from '../../types';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabaseClient';
import { UploadCloud, Download, FileSpreadsheet, X, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface BulkUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'fields' | 'badges' | 'cards' | 'users';
    units: Unit[];
    onSuccess: () => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose, type, units, onSuccess }) => {
    const [selectedUnitId, setSelectedUnitId] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [log, setLog] = useState<{status: 'success' | 'error', msg: string} | null>(null);

    if (!isOpen) return null;

    const getTitle = () => {
        switch(type) {
            case 'fields': return 'رفع بنود متابعة وقواعد';
            case 'badges': return 'رفع شارات ومتطلبات';
            case 'cards': return 'رفع بطاقات تقدم وبنود';
            case 'users': return 'إنشاء حسابات أفراد';
        }
    };

    const handleDownloadTemplate = () => {
        if (!selectedUnitId) {
            alert('يرجى اختيار الشعبة أولاً لدمجها في النموذج');
            return;
        }
        
        const unit = units.find(u => u.id === selectedUnitId);
        const unitName = unit?.name || 'Unknown';
        
        let headers: string[] = [];
        let exampleRow: any[] = [];
        let filename = '';

        if (type === 'fields') {
            headers = ['Unit ID', 'Unit Name', 'Field Name', 'Frequency (daily/weekly/monthly)', 'Min Required', 'Rule Threshold', 'Rule Action', 'Is Consecutive (Yes/No)', 'Timeframe Days'];
            exampleRow = [selectedUnitId, unitName, 'حضور القداس', 'weekly', 1, 3, 'تنبيه شفهي', 'Yes', ''];
            filename = `template_fields_${unitName}.xlsx`;
        } else if (type === 'badges') {
            headers = ['Unit ID', 'Unit Name', 'Badge Title', 'Description', 'Requirements (Separated by |)'];
            exampleRow = [selectedUnitId, unitName, 'شارة المسعف', 'يعرف مبادئ الإسعافات', 'عمل جبيرة|إيقاف نزيف|إنعاش قلبي'];
            filename = `template_badges_${unitName}.xlsx`;
        } else if (type === 'cards') {
            headers = ['Unit ID', 'Unit Name', 'Card Name', 'Type', 'Items (Separated by |)'];
            exampleRow = [selectedUnitId, unitName, 'بطاقة المبتدئ', 'كشفي', 'حفظ الوعد|حفظ القانون|معرفة العقد'];
            filename = `template_cards_${unitName}.xlsx`;
        } else if (type === 'users') {
            headers = ['Unit ID', 'Unit Name', 'Full Name', 'National ID', 'Birthdate (YYYY-MM-DD)', 'Role (scout/assistant/scout_leader)', 'Rank (scout/team_leader/chief_leader)', 'Email/Username', 'Password'];
            exampleRow = [selectedUnitId, unitName, 'مينا جرجس', '30101010101010', '2010-05-15', 'scout', 'scout', 'mina.girgis', '123456'];
            filename = `template_users_${unitName}.xlsx`;
        }

        const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, filename);
    };

    const handleProcessFile = async () => {
        if (!file) return;
        setProcessing(true);
        setLog(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                // Remove header row
                const rows = jsonData.slice(1) as any[][];
                
                let successCount = 0;
                let failCount = 0;

                for (const row of rows) {
                    if (!row || row.length === 0) continue;
                    
                    // Basic validation: Check if Unit ID exists in row[0]
                    const rowUnitId = row[0];
                    if (!rowUnitId) {
                        failCount++;
                        continue;
                    }

                    try {
                        if (type === 'fields') {
                            // Row: [UnitID, Name, FieldName, Freq, Min, Threshold, Action, Consec, Time]
                            const fieldId = crypto.randomUUID();
                            await supabase.from('tracking_fields').insert({
                                id: fieldId,
                                unit_id: rowUnitId,
                                name: row[2],
                                frequency: row[3] || 'weekly',
                                min_required: parseInt(row[4]) || 1,
                                visible: true,
                                created_by: (await supabase.auth.getUser()).data.user?.id
                            });

                            if (row[5] && row[6]) {
                                await supabase.from('tracking_rules').insert({
                                    field_id: fieldId,
                                    violation_threshold: parseInt(row[5]),
                                    violation_action: row[6],
                                    is_consecutive: row[7]?.toString().toLowerCase() === 'yes',
                                    timeframe_days: row[8] ? parseInt(row[8]) : null
                                });
                            }
                        } 
                        else if (type === 'badges') {
                            // Row: [UnitID, Name, Title, Desc, Reqs]
                            const reqs = row[4] ? row[4].toString().split('|').map((s: string) => s.trim()) : [];
                            await supabase.from('badges').insert({
                                title: row[2],
                                description: row[3],
                                unit_id: rowUnitId,
                                requirements: reqs
                            });
                        } 
                        else if (type === 'cards') {
                            // Row: [UnitID, Name, CardName, Type, Items]
                            const cardId = crypto.randomUUID();
                            await supabase.from('progress_cards').insert({
                                id: cardId,
                                unit_id: rowUnitId,
                                name: row[2],
                                type: row[3]
                            });

                            if (row[4]) {
                                const items = row[4].toString().split('|').map((s: string) => ({
                                    card_id: cardId,
                                    name: s.trim()
                                }));
                                await supabase.from('progress_card_items').insert(items);
                            }
                        }
                        else if (type === 'users') {
                             // Row: [UnitID, Name, FullName, NationalID, Birthdate, Role, Rank, Email, Password]
                             const newUser = {
                                 id: crypto.randomUUID(),
                                 unit_id: rowUnitId,
                                 name: row[2],
                                 national_id: row[3]?.toString(),
                                 birthdate: row[4], // Assuming format YYYY-MM-DD
                                 role: row[5] || 'scout',
                                 rank: row[6] || 'scout',
                                 email: row[7],
                                 password_hash: row[8],
                                 status: 'active',
                                 created_at: new Date().toISOString()
                             };
                             
                             // Basic check
                             if (!newUser.name || !newUser.email || !newUser.password_hash) throw new Error("Missing required fields");
                             
                             const { error } = await supabase.from('users').insert(newUser);
                             if (error) throw error;
                        }
                        successCount++;
                    } catch (err) {
                        console.error(err);
                        failCount++;
                    }
                }

                setLog({ status: 'success', msg: `تمت المعالجة: ${successCount} ناجح، ${failCount} فشل.` });
                if (successCount > 0) onSuccess();

            } catch (error: any) {
                setLog({ status: 'error', msg: 'حدث خطأ أثناء قراءة الملف: ' + error.message });
            } finally {
                setProcessing(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 w-full max-w-lg shadow-2xl border-2 dark:border-gray-800">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black dark:text-white flex items-center gap-2">
                        <FileSpreadsheet className="text-green-600" size={24}/> {getTitle()}
                    </h3>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-red-500"/></button>
                </div>

                <div className="space-y-6">
                    {/* Step 1 */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
                        <label className="text-xs font-bold text-gray-500 mb-2 block uppercase">1. اختر الشعبة لتجهيز النموذج</label>
                        <select 
                            className="w-full p-3 rounded-xl border-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white outline-none font-bold"
                            value={selectedUnitId}
                            onChange={e => setSelectedUnitId(e.target.value)}
                        >
                            <option value="">-- اختر الشعبة --</option>
                            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <button 
                            onClick={handleDownloadTemplate}
                            disabled={!selectedUnitId}
                            className="w-full mt-3 bg-white dark:bg-gray-700 border-2 border-green-200 dark:border-green-900 text-green-700 dark:text-green-400 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-50 dark:hover:bg-green-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download size={16}/> تحميل نموذج Excel
                        </button>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
                        <label className="text-xs font-bold text-gray-500 mb-2 block uppercase">2. املأ البيانات وارفع الملف</label>
                        <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:bg-white dark:hover:bg-gray-700/50 transition-colors">
                            <input 
                                type="file" 
                                accept=".xlsx, .xls"
                                onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center gap-2 pointer-events-none">
                                <UploadCloud className="text-blue-500" size={32}/>
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                    {file ? file.name : 'اضغط لاختيار ملف Excel'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Feedback */}
                    {log && (
                        <div className={`p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {log.status === 'success' ? <CheckCircle size={18}/> : <AlertTriangle size={18}/>}
                            {log.msg}
                        </div>
                    )}

                    <button 
                        onClick={handleProcessFile}
                        disabled={!file || processing}
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? <RefreshCw className="animate-spin" size={24}/> : 'بدء الرفع والحفظ'}
                    </button>
                </div>
            </div>
        </div>
    );
};
