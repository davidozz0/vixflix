export type WatchStatus = 'unwatched' | 'watching' | 'watched';

export interface WatchlistEntry {
  id: number;
  profileId: number;
  tmdbId: number;
  status: WatchStatus;
  lastSeason: number | null;
  lastEpisode: number | null;
  resumeTimeSeconds: number;
  updatedAt: string;
}
