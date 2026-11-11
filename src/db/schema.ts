import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export type StoredTrack = {
  id: string;
  name: string;
  artists: string;
  artistId?: string;
  album: string;
  albumId?: string;
  image: string;
  duration: number;
  language: string;
  hasLyrics?: boolean;
  year?: string;
};

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio").notNull().default(""),
  accent: text("accent").notNull().default("#1ed760"),
  showActivity: boolean("show_activity").notNull().default(true),
  nowPlaying: jsonb("now_playing").$type<StoredTrack | null>(),
  nowPlayingAt: timestamp("now_playing_at", { withTimezone: true }),
  isPlaying: boolean("is_playing").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const follows = pgTable(
  "follows",
  {
    followerId: text("follower_id").notNull(),
    followeeId: text("followee_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.followerId, t.followeeId] }), index("follows_followee_idx").on(t.followeeId)],
);

export const playlists = pgTable(
  "playlists",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    isPublic: boolean("is_public").notNull().default(false),
    isCollaborative: boolean("is_collaborative").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("playlists_owner_idx").on(t.ownerId)],
);

export const playlistMembers = pgTable(
  "playlist_members",
  {
    playlistId: text("playlist_id").notNull(),
    userId: text("user_id").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.playlistId, t.userId] })],
);

export const playlistTracks = pgTable(
  "playlist_tracks",
  {
    id: serial("id").primaryKey(),
    playlistId: text("playlist_id").notNull(),
    songId: text("song_id").notNull(),
    track: jsonb("track").$type<StoredTrack>().notNull(),
    addedBy: text("added_by").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("playlist_tracks_uq").on(t.playlistId, t.songId)],
);

export const plays = pgTable(
  "plays",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    songId: text("song_id").notNull(),
    track: jsonb("track").$type<StoredTrack>().notNull(),
    playedAt: timestamp("played_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("plays_user_idx").on(t.userId, t.playedAt)],
);

export const rooms = pgTable("rooms", {
  code: text("code").primaryKey(),
  hostId: text("host_id").notNull(),
  track: jsonb("track").$type<StoredTrack | null>(),
  position: real("position").notNull().default(0),
  isPlaying: boolean("is_playing").notNull().default(false),
  version: integer("version").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roomMembers = pgTable(
  "room_members",
  {
    code: text("code").notNull(),
    userId: text("user_id").notNull(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.code, t.userId] })],
);
