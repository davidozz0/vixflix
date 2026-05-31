export interface RecommendedContent {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  type: 'movie' | 'tv';
}
