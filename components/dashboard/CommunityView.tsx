
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { User, Community, CommunityPost } from '../../types';
import { MessageSquare, Trash2 } from 'lucide-react';
import { writeInsert, writeDelete } from '../../src/offline';

interface CommunityViewProps {
  currentUser: User;
  users: User[];
  communities: Community[];
  syncedPosts?: CommunityPost[];
}

export const CommunityView: React.FC<CommunityViewProps> = ({ currentUser, users, communities, syncedPosts }) => {
  const [activeCommunity, setActiveCommunity] = useState<string | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newPostContent, setNewPostContent] = useState('');

  useEffect(() => {
    if (communities.length > 0 && !activeCommunity) {
        setActiveCommunity(communities[0].id);
    }
  }, [communities]);

  useEffect(() => {
    if (syncedPosts && activeCommunity) {
        setPosts(syncedPosts.filter(p => p.community_id === activeCommunity).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    }
  }, [syncedPosts, activeCommunity]);

  const fetchPosts = async (communityId: string) => {
    // Handled by useRealtimeSync
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !activeCommunity) return;
    
    const newPost: CommunityPost = {
        id: crypto.randomUUID(),
        user_id: currentUser.id,
        community_id: activeCommunity,
        content: newPostContent,
        created_at: new Date().toISOString()
    };

    setNewPostContent('');

    try {
        await writeInsert('community_posts', newPost);
    } catch (e) {
        console.error("Post Error", e);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[650px] glass-panel rounded-3xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700">
        {/* Sidebar Channels */}
        <div className="w-full md:w-72 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-md border-l border-gray-200 dark:border-gray-700 p-5 overflow-y-auto">
            <h3 className="font-black text-gray-800 dark:text-white mb-6 text-lg flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                    <MessageSquare size={20}/>
                </div>
                القنوات
            </h3>
            <div className="space-y-3">
                {communities.map(c => (
                    <button 
                        key={c.id} 
                        onClick={() => setActiveCommunity(c.id)} 
                        className={`
                            w-full text-right p-4 rounded-2xl transition-all duration-300 group relative overflow-hidden
                            ${activeCommunity === c.id 
                                ? 'bg-white dark:bg-gray-700 shadow-lg shadow-blue-900/5 border-2 border-blue-500/20' 
                                : 'hover:bg-white/50 dark:hover:bg-gray-700/50 border-2 border-transparent'
                            }
                        `}
                    >
                        <div className="relative z-10">
                            <span className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${activeCommunity === c.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                                {c.type === 'all_leaders' ? 'قادة' : c.type === 'team' ? 'طليعة' : 'وحدة'}
                            </span>
                            <span className={`font-bold text-sm ${activeCommunity === c.id ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                # {c.name}
                            </span>
                        </div>
                        {activeCommunity === c.id && <div className="absolute right-0 top-0 h-full w-1 bg-blue-500"></div>}
                    </button>
                ))}
            </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/subtle-dots.png')] opacity-5 pointer-events-none"></div>
            
            <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar relative z-10">
                {posts.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                        <MessageSquare size={64} className="text-gray-300 mb-4"/>
                        <p className="text-gray-400 font-medium">لا توجد رسائل بعد.. ابدأ المحادثة!</p>
                    </div>
                )}
                {posts.map(post => {
                    const author = users.find(u => u.id === post.user_id);
                    const isMe = post.user_id === currentUser.id;
                    return (
                        <div key={post.id} className={`flex ${isMe ? 'justify-start' : 'justify-start'} gap-4 group animate-in fade-in slide-in-from-bottom-2`}>
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md ${isMe ? 'bg-gradient-to-br from-blue-500 to-blue-700' : 'bg-gradient-to-br from-gray-400 to-gray-600'}`}>
                                {author?.name.charAt(0) || '?'}
                            </div>
                            <div className={`
                                p-4 rounded-2xl shadow-sm max-w-[85%] relative group-hover:shadow-md transition-shadow duration-300
                                ${isMe ? 'bg-blue-50 dark:bg-blue-900/20 rounded-tr-none border border-blue-100 dark:border-blue-800' : 'bg-white dark:bg-gray-800 rounded-tl-none border border-gray-100 dark:border-gray-700'}
                            `}>
                                <div className="flex justify-between items-center mb-2 gap-6">
                                    <span className={`font-bold text-xs ${isMe ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>{author?.name}</span>
                                    <span className="text-[10px] text-gray-400 font-mono">{new Date(post.created_at).toLocaleDateString('ar-EG')}</span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                                {(currentUser.role === 'group_leader' || isMe) && (
                                    <button 
                                        onClick={async () => { 
                                            try {
                                                await writeDelete('community_posts', { id: post.id });
                                            } catch (e) {
                                                console.error("Delete Post Error", e);
                                            }
                                        }} 
                                        className="absolute -left-8 top-2 p-1.5 bg-red-50 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100 hover:scale-110 shadow-sm"
                                        title="حذف الرسالة"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md relative z-20">
                {currentUser.role !== 'priest' ? (
                    <form onSubmit={handlePost} className="flex gap-3 items-center">
                        <div className="flex-1 relative">
                            <input 
                                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all dark:text-white placeholder-gray-400" 
                                placeholder="اكتب رسالة..." 
                                value={newPostContent} 
                                onChange={e => setNewPostContent(e.target.value)} 
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={!newPostContent.trim()}
                            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                        >
                            إرسال
                        </button>
                    </form>
                ) : (
                    <p className="text-center text-gray-500 text-sm font-medium py-3">للعرض فقط - لا يمكنك المشاركة في المحادثات</p>
                )}
            </div>
        </div>
    </div>
  );
};
