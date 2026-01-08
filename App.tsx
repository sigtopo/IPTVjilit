
import React, { useState, useEffect, useMemo } from 'react';
import { Playlist, Channel, ViewMode } from './types';
import { fetchPlaylistFromUrl } from './services/playlistParser';
import { 
  PlayIcon, PlusIcon, HeartIcon, SearchIcon, MenuIcon, ArrowLeftIcon, BotIcon 
} from './components/Icons';
import VideoPlayer from './components/VideoPlayer';

const App: React.FC = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'explorer'>('dashboard');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('iptv_playlists');
    if (saved) {
      const parsed = JSON.parse(saved);
      setPlaylists(parsed);
      if (parsed.length > 0) setActivePlaylistId(parsed[0].id);
    }
    const favs = localStorage.getItem('iptv_favorites');
    if (favs) setFavorites(JSON.parse(favs));
  }, []);

  useEffect(() => {
    localStorage.setItem('iptv_playlists', JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem('iptv_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const activePlaylist = useMemo(() => 
    playlists.find(p => p.id === activePlaylistId), 
    [playlists, activePlaylistId]
  );

  const groups = useMemo(() => {
    if (!activePlaylist) return [];
    const uniqueGroups = Array.from(new Set(activePlaylist.channels.map(c => c.group || 'عام')));
    return uniqueGroups.sort();
  }, [activePlaylist]);

  const filteredChannels = useMemo(() => {
    if (!activePlaylist) return [];
    let channels = activePlaylist.channels;
    
    if (activeGroup) {
      channels = channels.filter(c => (c.group || 'عام') === activeGroup);
    }

    return channels.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activePlaylist, searchQuery, activeGroup]);

  const handleAddPlaylist = async () => {
    if (!newPlaylistUrl) return;
    setLoading(true);
    try {
      const playlist = await fetchPlaylistFromUrl(newPlaylistUrl);
      if (newPlaylistName) playlist.name = newPlaylistName;
      setPlaylists(prev => [...prev, playlist]);
      setActivePlaylistId(playlist.id);
      setViewMode('dashboard');
      setShowAddModal(false);
      setNewPlaylistUrl('');
      setNewPlaylistName('');
    } catch (err) {
      alert('خطأ في تحميل القائمة، تأكد من الرابط');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (channel: Channel, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(channel.url) 
        ? prev.filter(url => url !== channel.url)
        : [...prev, channel.url]
    );
  };

  const playChannel = (channel: Channel) => {
    setActiveChannel(channel);
    setViewMode('explorer');
  };

  return (
    <div className="flex h-screen bg-[#050507] text-slate-100 overflow-hidden" dir="rtl">
      {/* 1. القائمة الجانبية الرئيسية (أيقونات) */}
      <aside className="w-20 bg-[#0a0a0c] border-l border-white/5 flex flex-col items-center py-8 shrink-0 z-40">
        <div className="w-12 h-12 bg-violet-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-10">
          <PlayIcon />
        </div>
        
        <nav className="flex flex-col gap-6">
          <button 
            onClick={() => setViewMode('dashboard')}
            className={`p-4 rounded-2xl transition-all ${viewMode === 'dashboard' ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'text-zinc-600 hover:text-indigo-400'}`}
          >
            <MenuIcon />
          </button>
          <button 
            onClick={() => setViewMode('explorer')}
            className={`p-4 rounded-2xl transition-all ${viewMode === 'explorer' ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'text-zinc-600 hover:text-indigo-400'}`}
          >
            <PlayIcon />
          </button>
          <button 
             onClick={() => setShowAddModal(true)}
             className="p-4 rounded-2xl text-zinc-600 hover:text-indigo-400 transition-all border border-dashed border-zinc-800"
          >
            <PlusIcon />
          </button>
        </nav>

        <div className="mt-auto p-4 text-zinc-700">
           <BotIcon />
        </div>
      </aside>

      {/* 2. قائمة التصنيفات (القائمة الثانية) */}
      {viewMode === 'explorer' && (
        <aside className="w-72 bg-[#0c0c0f] border-l border-white/5 flex flex-col shrink-0 z-30 animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-white/5">
            <h2 className="text-xl font-bold text-indigo-400">التصنيفات</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">اختر فئة القنوات</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            <button 
              onClick={() => setActiveGroup(null)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${!activeGroup ? 'bg-indigo-600/10 border border-indigo-500/30 text-white' : 'text-zinc-500 hover:bg-white/5'}`}
            >
              <span className="font-bold">كل القنوات</span>
              <span className="text-[10px] opacity-50">{activePlaylist?.channels.length}</span>
            </button>
            
            {groups.map(group => (
              <button 
                key={group}
                onClick={() => setActiveGroup(group)}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${activeGroup === group ? 'bg-indigo-600/10 border border-indigo-500/30 text-white' : 'text-zinc-500 hover:bg-white/5'}`}
              >
                <span className="font-bold truncate ml-2">{group}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${activeGroup === group ? 'bg-indigo-500' : 'bg-zinc-800'}`}></div>
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* 3. منطقة المحتوى الرئيسية */}
      <main className="flex-1 flex flex-col relative">
        {/* Header المتطور */}
        <header className="h-24 px-10 flex items-center justify-between bg-black/20 backdrop-blur-md z-20">
          <div className="flex items-center gap-6 w-full max-w-2xl">
            <div className="relative w-full group">
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                <SearchIcon />
              </div>
              <input 
                type="text" 
                placeholder="ابحث عن قناتك المفضلة..."
                className="w-full bg-[#121216] border border-white/5 rounded-2xl py-3.5 pr-12 pl-6 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-zinc-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-white">{activePlaylist?.name || "لا توجد قائمة"}</span>
              <span className="text-[10px] text-zinc-500">جودة بث عالية HLS</span>
            </div>
          </div>
        </header>

        {/* المساحة التفاعلية */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          
          {viewMode === 'dashboard' && (
            <div className="animate-in fade-in zoom-in-95 duration-700">
               <div className="mb-12">
                  <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-l from-white to-zinc-500 bg-clip-text text-transparent italic">أهلاً بك في عالم الترفيه</h1>
                  <p className="text-zinc-500 text-lg max-w-2xl">استعرض آلاف القنوات العالمية بجودة 4K مع نظام تصنيف ذكي وسهولة تامة في الوصول.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                  <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-1 rounded-[2.5rem] shadow-xl shadow-indigo-500/20">
                     <div className="bg-[#0c0c0f] h-full rounded-[2.4rem] p-8">
                        <h3 className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-4">القنوات النشطة</h3>
                        <div className="text-5xl font-black text-white">{activePlaylist?.channels.length || 0}</div>
                     </div>
                  </div>
                  <div className="bg-[#0c0c0f] border border-white/5 rounded-[2.5rem] p-8 hover:border-indigo-500/30 transition-all">
                     <h3 className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-4">المفضلة</h3>
                     <div className="text-5xl font-black text-white">{favorites.length}</div>
                  </div>
                  <div className="bg-[#0c0c0f] border border-white/5 rounded-[2.5rem] p-8 hover:border-indigo-500/30 transition-all">
                     <h3 className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-4">التصنيفات</h3>
                     <div className="text-5xl font-black text-white">{groups.length}</div>
                  </div>
               </div>

               {playlists.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-800 rounded-[3rem] bg-zinc-900/10">
                     <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-500 mb-6">
                        <PlusIcon />
                     </div>
                     <h2 className="text-2xl font-bold mb-2">ابدأ بإضافة أول قائمة تشغيل</h2>
                     <p className="text-zinc-600 mb-8">قم بلصق رابط M3U الخاص بك لتبدأ المشاهدة فوراً.</p>
                     <button 
                        onClick={() => setShowAddModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-10 py-4 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                     >
                        إضافة الآن
                     </button>
                  </div>
               )}
            </div>
          )}

          {viewMode === 'explorer' && (
            <div className="animate-in slide-in-from-bottom-6 duration-500">
               {/* مشغل الفيديو إذا كانت هناك قناة نشطة */}
               {activeChannel && (
                  <div className="mb-10 w-full aspect-video max-h-[60vh] bg-black rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl relative group">
                     <VideoPlayer channel={activeChannel} />
                     <div className="absolute top-8 right-8 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl text-white">
                           <BotIcon />
                        </button>
                        <button 
                           onClick={() => toggleFavorite(activeChannel, {} as any)}
                           className={`p-4 rounded-2xl border backdrop-blur-xl transition-all ${favorites.includes(activeChannel.url) ? 'bg-rose-600 border-rose-500 text-white' : 'bg-black/60 border-white/10 text-white hover:text-rose-400'}`}
                        >
                           <HeartIcon filled={favorites.includes(activeChannel.url)} />
                        </button>
                     </div>
                  </div>
               )}

               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-black">{activeGroup || 'اكتشف القنوات'}</h2>
                  <div className="px-4 py-1 bg-zinc-900 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
                     نتائج البحث: {filteredChannels.length}
                  </div>
               </div>

               {/* قائمة القنوات المكبرة */}
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredChannels.map(channel => (
                    <div 
                      key={channel.id}
                      onClick={() => playChannel(channel)}
                      className={`group relative bg-[#0c0c0f] border rounded-[2rem] p-6 transition-all cursor-pointer hover:translate-y-[-8px] hover:shadow-2xl hover:shadow-indigo-500/10 ${activeChannel?.url === channel.url ? 'border-indigo-500 bg-indigo-500/5 ring-4 ring-indigo-500/10' : 'border-white/5 hover:border-indigo-500/40'}`}
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-24 h-24 bg-zinc-900 rounded-2xl flex items-center justify-center p-3 shrink-0 border border-white/5 group-hover:border-indigo-500/30 transition-colors shadow-inner overflow-hidden">
                          {channel.logo ? (
                            <img src={channel.logo} alt="" className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                          ) : (
                            <span className="text-3xl font-black text-zinc-700">{channel.name[0]}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xl font-black text-white truncate mb-1 leading-tight">{channel.name}</h4>
                          <p className="text-xs text-zinc-500 font-bold uppercase truncate">{channel.group || 'غير مصنف'}</p>
                          <div className="mt-3 flex gap-2">
                             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                             <span className="text-[10px] font-bold text-zinc-600 uppercase">Live Now</span>
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={(e) => toggleFavorite(channel, e)}
                        className={`absolute top-4 left-4 p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${favorites.includes(channel.url) ? 'opacity-100 text-rose-500' : 'text-zinc-600 hover:text-rose-500'}`}
                      >
                        <HeartIcon filled={favorites.includes(channel.url)} />
                      </button>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Playlist Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0c0c0f] w-full max-w-xl rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-10 pb-4">
               <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-500 mb-6">
                  <PlusIcon />
               </div>
               <h3 className="text-3xl font-black mb-2 italic">إضافة عالم جديد</h3>
               <p className="text-zinc-500 text-sm">أدخل رابط ملف M3U الخاص بك للوصول إلى مكتبة ضخمة من المحتوى.</p>
            </div>
            
            <div className="p-10 pt-4 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-600 uppercase mr-1">عنوان القائمة</label>
                <input 
                  type="text" 
                  placeholder="مثال: الباقة الترفيهية"
                  className="w-full bg-[#121216] border border-white/5 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all font-bold"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-600 uppercase mr-1">رابط الاشتراك (M3U)</label>
                <input 
                  type="text" 
                  placeholder="https://example.com/playlist.m3u"
                  className="w-full bg-[#121216] border border-white/5 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all font-mono text-sm"
                  value={newPlaylistUrl}
                  onChange={(e) => setNewPlaylistUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="p-10 bg-white/5 flex gap-4">
              <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-black py-5 rounded-2xl transition-all"
              >
                تجاهل
              </button>
              <button 
                disabled={loading || !newPlaylistUrl}
                onClick={handleAddPlaylist}
                className="flex-1 bg-violet-gradient hover:opacity-90 disabled:opacity-50 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-indigo-500/20"
              >
                {loading ? 'جاري الاتصال...' : 'تأكيد الاتصال'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1f; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6366f1; }
      `}</style>
    </div>
  );
};

export default App;
