
import React, { useState, useEffect, useMemo } from 'react';
import { Playlist, Channel, ViewMode } from './types';
import { parseM3U, fetchPlaylistFromUrl } from './services/playlistParser';
import { 
  PlayIcon, PlusIcon, TrashIcon, HeartIcon, SearchIcon, MenuIcon, ArrowLeftIcon, BotIcon 
} from './components/Icons';
import VideoPlayer from './components/VideoPlayer';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.PLAYLISTS);
  const [sidebarTab, setSidebarTab] = useState<'all' | 'groups' | 'favorites'>('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [loading, setLoading] = useState(false);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('iptv_playlists');
    if (saved) {
      const parsed = JSON.parse(saved);
      setPlaylists(parsed);
      if (parsed.length > 0 && !activePlaylistId) {
        setActivePlaylistId(parsed[0].id);
        setViewMode(ViewMode.CHANNELS);
      }
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

  const filteredChannels = useMemo(() => {
    if (!activePlaylist) return [];
    let channels = activePlaylist.channels;
    
    if (sidebarTab === 'favorites') {
      channels = channels.filter(c => favorites.includes(c.url));
    }

    return channels.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activePlaylist, searchQuery, sidebarTab, favorites]);

  const handleAddPlaylist = async () => {
    if (!newPlaylistUrl) return;
    setLoading(true);
    try {
      let playlist: Playlist;
      if (newPlaylistUrl.startsWith('http')) {
        playlist = await fetchPlaylistFromUrl(newPlaylistUrl);
      } else {
        alert('Please provide a valid M3U URL');
        return;
      }
      if (newPlaylistName) playlist.name = newPlaylistName;
      setPlaylists(prev => [...prev, playlist]);
      setActivePlaylistId(playlist.id);
      setViewMode(ViewMode.CHANNELS);
      setShowAddModal(false);
      setNewPlaylistUrl('');
      setNewPlaylistName('');
    } catch (err) {
      alert('Error loading playlist: ' + err);
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
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar - Redesigned to match screenshot */}
      <aside className="w-[320px] bg-[#121212] border-r border-[#222] flex flex-col shrink-0 z-20 shadow-2xl">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[#222] bg-[#1a1a1a]">
          <div className="flex items-center justify-between mb-2">
            <button 
              onClick={() => setViewMode(ViewMode.PLAYLISTS)}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeftIcon />
            </button>
            <div className="text-center flex-1">
              <div className="text-sm font-bold truncate px-2">{activePlaylist?.name || "Select Playlist"}</div>
              <div className="text-[10px] text-slate-500 uppercase">{activePlaylist?.channels.length || 0} Channels</div>
            </div>
            <button className="text-slate-400 hover:text-white">
              <MenuIcon />
            </button>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex items-center justify-between mt-4 px-1">
            <button 
              onClick={() => setSidebarTab('all')}
              className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${sidebarTab === 'all' ? 'text-white border-b-2 border-white pb-1' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <MenuIcon />
              <span>All channels</span>
            </button>
            <button 
              onClick={() => setSidebarTab('groups')}
              className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${sidebarTab === 'groups' ? 'text-white border-b-2 border-white pb-1' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <BotIcon />
              <span>Groups</span>
            </button>
            <button 
              onClick={() => setSidebarTab('favorites')}
              className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${sidebarTab === 'favorites' ? 'text-white border-b-2 border-white pb-1' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <HeartIcon filled={sidebarTab === 'favorites'} />
              <span>Favorites</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search channel"
              className="w-full bg-[#2a2a2a] border-none rounded-md py-1.5 pl-3 pr-10 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
              <SearchIcon />
            </div>
          </div>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0f0f0f]">
          {filteredChannels.length > 0 ? (
            filteredChannels.map((channel, index) => (
              <div 
                key={channel.id}
                onClick={() => playChannel(channel)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-l-4 ${activeChannel?.url === channel.url ? 'bg-[#1a1a1a] border-red-600' : 'hover:bg-[#151515] border-transparent'}`}
              >
                <div className="text-[10px] text-slate-500 w-6 font-mono">{index + 1}.</div>
                <div className="flex-1 text-xs font-medium truncate text-slate-200">
                  {channel.name}
                </div>
                {channel.logo && (
                  <div className="w-10 h-6 flex items-center justify-center shrink-0">
                    <img src={channel.logo} alt="" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-600 text-xs italic">
              No channels found in this section
            </div>
          )}
        </div>

        {/* Bottom Action */}
        <div className="p-3 border-t border-[#222]">
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-[#252525] text-white text-xs py-2 rounded border border-[#333] transition-colors"
          >
            <PlusIcon />
            Add Playlist
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative bg-black">
        {/* Dynamic Header for Active Channel */}
        <header className="h-12 bg-black/90 backdrop-blur-sm border-b border-[#111] flex items-center justify-between px-4 z-10">
          <div className="flex items-center gap-3">
            <button className="text-slate-400 hover:text-white">
              <MenuIcon />
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => activeChannel && toggleFavorite(activeChannel, {} as any)}>
                <HeartIcon filled={activeChannel ? favorites.includes(activeChannel.url) : false} />
              </button>
              <h2 className="text-sm font-medium">
                {activeChannel ? `${activeChannel.name} (HLS)` : "Select a channel to start viewing"}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-slate-400">
            <button className="hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>
            <button className="hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            </button>
          </div>
        </header>

        {/* Video Stage */}
        <div className="flex-1 flex items-center justify-center">
          {activeChannel ? (
            <VideoPlayer channel={activeChannel} />
          ) : (
            <div className="text-center space-y-4">
              <div className="text-slate-800"><PlayIcon /></div>
              <p className="text-slate-600 text-sm">Select a channel from the sidebar to play</p>
              {playlists.length === 0 && (
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-600 px-4 py-2 rounded text-xs font-bold"
                >
                  Connect Playlist
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Add Playlist Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] w-full max-w-md rounded-xl border border-[#333] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-[#333]">
              <h3 className="text-lg font-bold">Import IPTV Playlist</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">Playlist Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Arabic & Sports"
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg py-2.5 px-4 focus:ring-1 focus:ring-blue-600 outline-none text-sm"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">M3U URL</label>
                <input 
                  type="text" 
                  placeholder="https://server.com/playlist.m3u"
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg py-2.5 px-4 focus:ring-1 focus:ring-blue-600 outline-none text-sm"
                  value={newPlaylistUrl}
                  onChange={(e) => setNewPlaylistUrl(e.target.value)}
                />
              </div>
            </div>
            <div className="p-5 bg-black/50 flex gap-3">
              <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-[#222] hover:bg-[#333] text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                disabled={loading || !newPlaylistUrl}
                onClick={handleAddPlaylist}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white py-2.5 rounded-lg text-sm font-bold transition-all"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0a0a0a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}</style>
    </div>
  );
};

export default App;
