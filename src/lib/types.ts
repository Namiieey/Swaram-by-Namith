export type AudioSource = { q: string; url: string };

export type Track = {
  id: string;
  name: string;
  artists: string;
  artistId?: string;
  album: string;
  albumId?: string;
  image: string;
  duration: number;
  language: string;
  year?: string;
  hasLyrics?: boolean;
  audio?: AudioSource[];
};

export type Entity = {
  id: string;
  type: "album" | "playlist" | "artist";
  title: string;
  subtitle: string;
  image: string;
};

export type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  accent: string;
  bio?: string;
};

export type ActivityItem = {
  user: PublicUser;
  track: Track | null;
  isPlaying: boolean;
  at: string | null;
};

export type PlaylistSummary = {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  isCollaborative: boolean;
  ownerId: string;
  owner: PublicUser | null;
  trackCount: number;
  covers: string[];
  role?: "owner" | "collaborator";
};

export type LyricLine = { t: number; text: string };
export type LyricsResult = { synced: LyricLine[]; plain: string; source?: string } | null;
