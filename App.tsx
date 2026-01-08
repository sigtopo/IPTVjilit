
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
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [loading, setLoading] = useState(false);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('iptv_playlists');
    if (saved) setPlaylists(JSON.parse(saved));
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
    if (viewMode === ViewMode.FAVORITES) {
      const allChannels = playlists.flatMap(p => p.channels);
      return allChannels.filter(c => favorites.includes(c.url) && 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (!activePlaylist) return [];
    return activePlaylist.channels.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.group?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activePlaylist, searchQuery, viewMode, favorites, playlists]);

  const handleAddPlaylist = async () => {
    if (!newPlaylistUrl && !newPlaylistName) return;
    setLoading(true);
    try {
      let playlist: Playlist;
      if (newPlaylistUrl.startsWith('http')) {
        playlist = await fetchPlaylistFromUrl(newPlaylistUrl);
      } else {
        // Assume it's text for now if no URL provided (manual upload would use a file reader)
        alert('Please provide a valid M3U URL');
        return;
      }
      setPlaylists(prev => [...prev, playlist]);
      setShowAddModal(false);
      setNewPlaylistUrl('');
    } catch (err) {
      alert('Error loading playlist: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const deletePlaylist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (activePlaylistId === id) {
      setActivePlaylistId(null);
      setViewMode(ViewMode.PLAYLISTS);
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
    setViewMode(ViewMode.PLAYER);
  };

  // Gemini Integration
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAskingAi, setIsAskingAi] = useState(false);

  const askAiAboutChannel = async () => {
    if (!activeChannel) return;
    setIsAskingAi(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `I am watching an IPTV channel called "${activeChannel.name}". It is in the category "${activeChannel.group || 'unknown'}". Tell me what kind of content this channel usually broadcasts and if there are any popular shows on it. Keep it brief.`,
      });
      setAiResponse(response.text);
    } catch (e) {
      setAiResponse("AI assistant currently unavailable.");
    } finally {
      setIsAskingAi(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <PlayIcon />
          </div>
          <h1 className="text-xl font-bold tracking-tight">IPTVjilit <span className="text-blue-500">Pro</span></h1>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <button 
            onClick={() => { setViewMode(ViewMode.PLAYLISTS); setActivePlaylistId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${viewMode === ViewMode.PLAYLISTS ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            <MenuIcon />
            <span className="font-medium">All Playlists</span>
          </button>
          
          <button 
            onClick={() => setViewMode(ViewMode.FAVORITES)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${viewMode === ViewMode.FAVORITES ? 'bg-red-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            <HeartIcon filled />
            <span className="font-medium">Favorites</span>
          </button>

          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            My Playlists
          </div>

          {playlists.map(p => (
            <div 
              key={p.id}
              onClick={() => {
                setActivePlaylistId(p.id);
                setViewMode(ViewMode.CHANNELS);
              }}
              className={`group flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all ${activePlaylistId === p.id && viewMode === ViewMode.CHANNELS ? 'bg-slate-800 text-white border border-slate-700' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span className="truncate text-sm">{p.name}</span>
              </div>
              <button 
                onClick={(e) => deletePlaylist(p.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl border border-slate-700 transition-colors"
          >
            <PlusIcon />
            Add Playlist
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            {viewMode === ViewMode.PLAYER && (
              <button 
                onClick={() => setViewMode(ViewMode.CHANNELS)}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
              >
                <ArrowLeftIcon />
              </button>
            )}
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <SearchIcon />
              </div>
              <input 
                type="text" 
                placeholder="Search channels or groups..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-lg transition-all active:scale-95"
            >
              <PlusIcon />
              Add Playlist
            </button>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {viewMode === ViewMode.PLAYLISTS && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Welcome to IPTVjilit Pro</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {playlists.length === 0 ? (
                  <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-4">
                    <div className="p-6 bg-slate-900 rounded-full">
                      <PlusIcon />
                    </div>
                    <p className="text-slate-400">No playlists found. Add one to start watching.</p>
                  </div>
                ) : (
                  playlists.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => { setActivePlaylistId(p.id); setViewMode(ViewMode.CHANNELS); }}
                      className="bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-blue-500/50 cursor-pointer transition-all hover:translate-y-[-4px] shadow-lg group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-600/10 text-blue-500 rounded-xl">
                          <PlayIcon />
                        </div>
                        <span className="text-xs text-slate-500">{p.channels.length} Channels</span>
                      </div>
                      <h3 className="text-lg font-bold mb-1 truncate">{p.name}</h3>
                      <p className="text-slate-500 text-sm">Added {new Date(p.addedAt).toLocaleDateString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {(viewMode === ViewMode.CHANNELS || viewMode === ViewMode.FAVORITES) && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {viewMode === ViewMode.FAVORITES ? 'Favorites' : activePlaylist?.name}
                </h2>
                <span className="text-sm text-slate-500">{filteredChannels.length} results</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredChannels.map(channel => (
                  <div 
                    key={channel.id}
                    onClick={() => playChannel(channel)}
                    className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-blue-500/50 cursor-pointer transition-all group relative"
                  >
                    <div className="aspect-video bg-slate-800 flex items-center justify-center p-4 relative">
                      {channel.logo ? (
                        <img src={channel.logo} alt={channel.name} className="max-w-full max-h-full object-contain" />
                      ) : (
                        <div className="text-2xl font-bold text-slate-700">{channel.name[0]}</div>
                      )}
                      <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/20 flex items-center justify-center transition-all">
                        <div className="opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all p-2 bg-white text-blue-600 rounded-full shadow-xl">
                          <PlayIcon />
                        </div>
                      </div>
                      <button 
                        onClick={(e) => toggleFavorite(channel, e)}
                        className="absolute top-2 right-2 p-1.5 bg-black/40 backdrop-blur-md rounded-lg text-white hover:text-red-500 transition-colors z-20"
                      >
                        <HeartIcon filled={favorites.includes(channel.url)} />
                      </button>
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-sm truncate">{channel.name}</h4>
                      <p className="text-xs text-slate-500 truncate">{channel.group || 'Uncategorized'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === ViewMode.PLAYER && activeChannel && (
            <div className="h-full flex flex-col gap-6">
              <div className="flex-1 min-h-[500px]">
                <VideoPlayer channel={activeChannel} />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">{activeChannel.name}</h2>
                      <p className="text-slate-400">Category: <span className="text-blue-400">{activeChannel.group}</span></p>
                    </div>
                    <button 
                      onClick={(e) => toggleFavorite(activeChannel, e)}
                      className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                    >
                      <HeartIcon filled={favorites.includes(activeChannel.url)} />
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {activeChannel.tvgId && <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-full border border-slate-700">TVG-ID: {activeChannel.tvgId}</span>}
                    <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-full border border-slate-700">HLS Stream</span>
                  </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="text-blue-500"><BotIcon /></div>
                    <h3 className="font-bold">AI Channel Assistant</h3>
                  </div>
                  <div className="flex-1 text-sm text-slate-400 mb-4 leading-relaxed">
                    {aiResponse ? (
                      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 text-slate-200">
                        {aiResponse}
                      </div>
                    ) : (
                      "Ask Gemini AI about this channel to learn more about its typical content, location, and popular shows."
                    )}
                  </div>
                  <button 
                    disabled={isAskingAi}
                    onClick={askAiAboutChannel}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white py-2.5 rounded-xl font-medium transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {isAskingAi ? "Thinking..." : "Get AI Insights"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Playlist Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold">Add New Playlist</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Playlist Name (optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Sports Pack"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all text-sm"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">M3U URL</label>
                <input 
                  type="text" 
                  placeholder="https://example.com/playlist.m3u"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all text-sm"
                  value={newPlaylistUrl}
                  onChange={(e) => setNewPlaylistUrl(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed italic">
                Note: Ensure the URL points to a valid M3U/M3U8 file. We currently support HLS playback natively.
              </p>
            </div>
            <div className="p-6 bg-slate-950/50 flex gap-3">
              <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                disabled={loading}
                onClick={handleAddPlaylist}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-medium py-2.5 rounded-xl transition-all shadow-lg"
              >
                {loading ? 'Processing...' : 'Add Playlist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
