
export interface Channel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
  tvgId?: string;
}

export interface Playlist {
  id: string;
  name: string;
  channels: Channel[];
  addedAt: number;
  url?: string;
}

export interface AppState {
  playlists: Playlist[];
  activePlaylistId: string | null;
  activeChannel: Channel | null;
  favorites: string[]; // List of channel URLs or unique IDs
  searchQuery: string;
}

export enum ViewMode {
  PLAYLISTS = 'playlists',
  CHANNELS = 'channels',
  PLAYER = 'player',
  FAVORITES = 'favorites'
}
