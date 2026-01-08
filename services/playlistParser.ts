
import { Channel, Playlist } from '../types';

export const parseM3U = (content: string, name: string): Playlist => {
  const lines = content.split('\n');
  const channels: Channel[] = [];
  let currentChannel: Partial<Channel> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      // Extract info using regex
      const nameMatch = line.match(/,(.*)$/);
      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      const groupMatch = line.match(/group-title="([^"]*)"/);
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);

      currentChannel = {
        name: nameMatch ? nameMatch[1].trim() : 'Unknown Channel',
        logo: logoMatch ? logoMatch[1] : undefined,
        group: groupMatch ? groupMatch[1] : 'Uncategorized',
        tvgId: tvgIdMatch ? tvgIdMatch[1] : undefined,
        id: Math.random().toString(36).substr(2, 9)
      };
    } else if (line.startsWith('http') || line.includes('://')) {
      if (currentChannel.name) {
        currentChannel.url = line;
        channels.push(currentChannel as Channel);
        currentChannel = {};
      }
    }
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    name: name || 'Untitled Playlist',
    channels,
    addedAt: Date.now()
  };
};

export const fetchPlaylistFromUrl = async (url: string): Promise<Playlist> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch playlist');
  const text = await response.text();
  const name = url.split('/').pop() || 'Remote Playlist';
  const playlist = parseM3U(text, name);
  playlist.url = url;
  return playlist;
};
