export interface ContinueWatching {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  type: 'movie' | 'tv';
  lastSeason: number | null;
  lastEpisode: number | null;
  resumeTimeSeconds: number;
}
