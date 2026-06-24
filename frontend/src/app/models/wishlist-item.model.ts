export interface WishlistItem {
  id: number;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  type: 'movie' | 'tv';
  addedAt: string;
}
