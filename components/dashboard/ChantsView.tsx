
import React, { useState, useEffect } from 'react';
import { User, Chant } from '../../types';
import { Music, Video, FileText, Plus, ArrowRight, Trash2, Edit2, Play, ExternalLink, RefreshCw, Save } from 'lucide-react';
import { getTable, setTable, writeInsert, writeUpdate, writeDelete } from '../../src/offline';

interface ChantsViewProps {
    currentUser: User;
    showMessage: (type: 'success' | 'error', text: string) => void;
}

export const ChantsView: React.FC<ChantsViewProps> = ({ currentUser, showMessage }) => {
    const [chants, setChants] = useState<Chant[]>([]);
    const [selectedChant, setSelectedChant] = useState<Chant | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<{ title: string; content: string; media_url: string }>({ title: '', content: '', media_url: '' });
    const [loading, setLoading] = useState(true);

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{ show: boolean; id: string | null; title: string }>({ show: false, id: null, title: '' });
    const [processingId, setProcessingId] = useState<string | null>(null);

    const isLeader = !['scout'].includes(currentUser.role);

    useEffect(() => {
        fetchChants();
    }, []);

    const fetchChants = async () => {
        setLoading(true);
        const data = await getTable('chants');
        if (data) setChants(data as Chant[]);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!formData.title.trim() || !formData.content.trim()) return;

        const payload = {
            title: formData.title,
            content: formData.content,
            media_url: formData.media_url || null,
            created_by: currentUser.id,
            unit_id: currentUser.unit_id
        };

        try {
            if (selectedChant && selectedChant.id) {
                // Update
                await writeUpdate('chants', payload, { id: selectedChant.id });
                showMessage('success', 'تم تحديث الصيحة بنجاح');
            } else {
                // Insert
                await writeInsert('chants', { id: crypto.randomUUID(), ...payload });
                showMessage('success', 'تم إضافة الصيحة بنجاح');
            }
            setIsEditing(false);
            setSelectedChant(null);
            setFormData({ title: '', content: '', media_url: '' });
            fetchChants();
        } catch (e: any) {
            showMessage('error', 'حدث خطأ: ' + e.message);
        }
    };

    const promptDelete = (chant: Chant) => {
        setDeleteModal({ show: true, id: chant.id, title: chant.title });
    };

    const executeDelete = async () => {
        if (!deleteModal.id) return;
        setProcessingId(deleteModal.id);
        
        try {
            await writeDelete('chants', { id: deleteModal.id });

            if (selectedChant?.id === deleteModal.id) {
                setSelectedChant(null);
                setIsEditing(false);
            }
            fetchChants();
            showMessage('success', 'تم حذف الصيحة بنجاح');
            setDeleteModal({ show: false, id: null, title: '' });
        } catch (e: any) {
            showMessage('error', 'فشل الحذف: ' + e.message);
        } finally {
            setProcessingId(null);
        }
    };

    const openEdit = (chant: Chant) => {
        setFormData({ title: chant.title, content: chant.content, media_url: chant.media_url || '' });
        setSelectedChant(chant);
        setIsEditing(true);
    };

    const openNew = () => {
        setFormData({ title: '', content: '', media_url: '' });
        setSelectedChant(null); // Clear selection to show form
        setIsEditing(true);
    };

    // Helper to render media
    const renderMedia = (url: string) => {
        if (!url) return null;

        // 1. استخراج معرف الفيديو (ID) بذكاء من أي صيغة
        let videoId = '';
        
        // محاولة استخراجه من كود iframe إذا قام المستخدم بنسخه بالكامل
        if (url.includes('<iframe')) {
            const srcMatch = url.match(/src="([^"]+)"/);
            if (srcMatch && srcMatch[1]) {
                url = srcMatch[1]; // استبدال الرابط الكامل برابط المصدر فقط
            }
        }

        // البحث عن الـ ID المكون من 11 حرف (حروف وأرقام وشرطات)
        // يدعم: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
        const match = url.match(regExp);

        if (match && match[2].length === 11) {
            videoId = match[2];
            
            // Fix: Simplify to match the working example provided by user
            // No origin, no rel=0, no referrerPolicy
            const embedSrc = `https://www.youtube.com/embed/${videoId}`;

            return (
                <div className="aspect-video w-full rounded-xl overflow-hidden shadow-lg border-2 border-red-500/20 bg-black my-4 relative group">
                    <iframe 
                        className="w-full h-full"
                        src={embedSrc}
                        title="YouTube video player"
                        frameBorder="0"
                        allowFullScreen
                    ></iframe>
                </div>
            );
        }

        // SoundCloud
        if (url.includes('soundcloud.com')) {
            const scSrc = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`;
            return (
                <div className="w-full rounded-xl overflow-hidden shadow-lg border-2 border-orange-500/20 my-4">
                     <iframe 
                        width="100%" 
                        height="166" 
                        scrolling="no" 
                        frameBorder="0" 
                        allow="autoplay" 
                        src={scSrc}
                    ></iframe>
                </div>
            );
        }

        // رابط عادي
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 bg-blue-50 p-3 rounded-lg my-4 font-bold">
                <ExternalLink size={18}/> فتح الرابط المرفق
            </a>
        );
    };

    if (isEditing) {
        return (
            <div className="max-w-3xl mx-auto glass-panel p-8 rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-2xl font-black dark:text-white flex items-center gap-3">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl text-purple-600 dark:text-purple-400">
                            {selectedChant ? <Edit2 size={24}/> : <Plus size={24}/>}
                        </div>
                        {selectedChant ? 'تعديل صيحة' : 'إضافة صيحة جديدة'}
                    </h3>
                    <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-500"><ArrowRight/></button>
                </div>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">عنوان الصيحة</label>
                        <input 
                            className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white p-4 rounded-xl outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all font-bold placeholder:text-gray-400" 
                            value={formData.title} 
                            onChange={e => setFormData({...formData, title: e.target.value})} 
                            placeholder="مثلاً: صيحة التجمع"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">نص الصيحة</label>
                        <textarea 
                            className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white p-4 rounded-xl h-48 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all font-medium leading-relaxed resize-none placeholder:text-gray-400 custom-scrollbar" 
                            value={formData.content} 
                            onChange={e => setFormData({...formData, content: e.target.value})} 
                            placeholder="اكتب كلمات الصيحة هنا..."
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">رابط الفيديو (YouTube) أو الصوت (SoundCloud)</label>
                        <div className="relative">
                            <input 
                                className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white p-4 pl-10 rounded-xl outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all font-mono text-sm placeholder:text-gray-400" 
                                value={formData.media_url} 
                                onChange={e => setFormData({...formData, media_url: e.target.value})} 
                                placeholder="https://youtu.be/..." 
                                dir="ltr"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                <Video size={18}/>
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 flex items-center gap-1">
                            <RefreshCw size={10}/>
                            يمكنك لصق رابط الفيديو العادي من المتصفح، وسيقوم النظام بتشغيله تلقائياً.
                        </p>
                    </div>
                    <div className="flex gap-4 pt-6 border-t border-gray-100 dark:border-gray-700">
                        <button onClick={handleSave} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-purple-500/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                            <Save size={20}/> حفظ
                        </button>
                        <button onClick={() => setIsEditing(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-4 rounded-xl font-bold transition-all active:scale-95">إلغاء</button>
                    </div>
                </div>
            </div>
        );
    }

    if (selectedChant) {
        return (
            <div className="max-w-4xl mx-auto glass-panel rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-white/20 dark:border-gray-700">
                <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-10 text-white relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-60"></div>
                     <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                     
                     <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 opacity-80 text-xs font-bold uppercase tracking-widest mb-2">
                                <FileText size={14}/> <span>كلمات الصيحة</span>
                            </div>
                            <h2 className="text-4xl font-black mb-4 leading-tight">{selectedChant.title}</h2>
                        </div>
                        <button onClick={() => setSelectedChant(null)} className="bg-white/20 hover:bg-white/30 p-3 rounded-2xl backdrop-blur-md transition-all shadow-lg"><ArrowRight size={24}/></button>
                     </div>

                     {isLeader && (
                         <div className="absolute bottom-6 left-6 flex gap-3 z-10">
                             <button onClick={() => openEdit(selectedChant)} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl backdrop-blur-md transition-all font-bold text-sm flex items-center gap-2 hover:scale-105 active:scale-95"><Edit2 size={16}/> تعديل</button>
                             <button onClick={() => promptDelete(selectedChant)} className="bg-red-500/30 hover:bg-red-500/50 text-white px-4 py-2 rounded-xl backdrop-blur-md transition-all font-bold text-sm flex items-center gap-2 hover:scale-105 active:scale-95"><Trash2 size={16}/> حذف</button>
                         </div>
                     )}
                </div>
                
                <div className="p-8 md:p-10 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                     {renderMedia(selectedChant.media_url || '')}
                     <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm mt-6 relative">
                        <div className="absolute -top-3 right-8 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">النص</div>
                        <pre className="whitespace-pre-wrap font-sans text-lg leading-loose text-gray-700 dark:text-gray-300 font-medium">
                            {selectedChant.content}
                        </pre>
                     </div>
                </div>
                
                {/* Delete Confirmation Modal */}
                {deleteModal.show && (
                    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border-2 border-red-100 dark:border-red-900 transform scale-100 transition-all">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-400 shadow-inner">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="text-xl font-black text-center mb-3 dark:text-white">حذف الصيحة</h3>
                            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                                هل أنت متأكد من حذف صيحة <br/><b className="text-gray-900 dark:text-white text-lg">"{deleteModal.title}"</b>؟ <br/>
                                <span className="text-red-500 text-xs mt-2 block">لا يمكن التراجع عن هذا الإجراء.</span>
                            </p>
                            <div className="flex gap-3">
                                <button onClick={executeDelete} disabled={!!processingId} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 active:scale-95">
                                    {processingId ? <RefreshCw className="animate-spin" size={20}/> : 'نعم، احذف'}
                                </button>
                                <button onClick={() => setDeleteModal({ show: false, id: null, title: '' })} disabled={!!processingId} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-3.5 rounded-xl font-bold transition-all active:scale-95">
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-purple-100 to-white dark:from-purple-900/20 dark:to-gray-900/20 p-8 rounded-3xl border border-purple-100 dark:border-purple-900/30 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 mb-4 md:mb-0 text-center md:text-right w-full md:w-auto">
                    <h2 className="text-3xl font-black text-purple-900 dark:text-purple-300 flex items-center justify-center md:justify-start gap-3 mb-2">
                        <div className="p-2 bg-purple-200 dark:bg-purple-800/50 rounded-xl"><Music size={32}/></div>
                        بنك الصيحات الكشفية
                    </h2>
                    <p className="text-base text-purple-700 dark:text-purple-400 opacity-80 font-medium pr-16">مكتبة شاملة للصيحات والأغاني الكشفية</p>
                </div>
                {isLeader && (
                    <button onClick={openNew} className="w-full md:w-auto bg-purple-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-purple-600/20 hover:bg-purple-700 transition-all active:scale-95 flex items-center justify-center gap-2 relative z-10 group">
                        <Plus size={20} className="group-hover:rotate-90 transition-transform"/> إضافة صيحة
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {chants.map(chant => (
                    <div onClick={() => setSelectedChant(chant)} key={chant.id} className="glass-panel p-6 rounded-3xl border border-white/20 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden flex flex-col h-full">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className={`p-3 rounded-2xl ${chant.media_url ? 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400' : 'bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                                {chant.media_url ? <Video size={24}/> : <FileText size={24}/>}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                                {chant.media_url ? 'فيديو/صوت' : 'نص'}
                            </span>
                        </div>

                        <h4 className="font-black text-xl text-gray-900 dark:text-white mb-3 line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{chant.title}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-6 leading-relaxed flex-1">{chant.content}</p>
                        
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-700/50">
                            <span className="text-xs font-bold text-gray-400 group-hover:text-purple-500 transition-colors">عرض التفاصيل</span>
                            <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
                                <ArrowRight size={16} className="rotate-180"/>
                            </div>
                        </div>
                    </div>
                ))}
                {chants.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-24 bg-gray-50/50 dark:bg-gray-900/20 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-300">
                            <Music size={40}/>
                        </div>
                        <p className="text-gray-400 font-bold text-lg">لم يتم إضافة صيحات بعد</p>
                        {isLeader && <button onClick={openNew} className="mt-4 text-purple-600 font-bold hover:underline">إضافة أول صيحة</button>}
                    </div>
                )}
            </div>
        </div>
    );
};
