export interface Content {
  tmdbId: number;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  type: 'movie' | 'tv';
  genreIds: number[];
  voteAverage: number;
  releaseDate?: string;
  sourceId?: number;
}

export interface ContentDetail extends Content {
  genres: { id: number; name: string }[];
  runtime?: number; // minutes, film only
  numberOfSeasons?: number; // tv only
  seasons?: Season[];
}

export interface Season {
  seasonNumber: number;
  name: string;
  episodeCount: number;
}

export interface Episode {
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  overview: string;
}
