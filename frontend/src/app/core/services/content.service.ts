import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Content, ContentDetail, Episode } from '../../models/content.model';
import { environment } from '../../../environments/environment';

const API_URL = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ContentService {
  constructor(private http: HttpClient) {}

  trending(type: 'movie' | 'tv' = 'movie', page = 1): Observable<{ results: Content[]; page: number }> {
    return this.http.get<{ results: Content[]; page: number }>(`${API_URL}/trending`, {
      params: { type, page: String(page) }
    });
  }

  search(query: string, page = 1): Observable<{ results: Content[]; page: number }> {
    return this.http.get<{ results: Content[]; page: number }>(`${API_URL}/search`, {
      params: { q: query, page: String(page) }
    });
  }

  detail(tmdbId: number, type: 'movie' | 'tv'): Observable<ContentDetail> {
    return this.http.get<ContentDetail>(`${API_URL}/content/${tmdbId}`, {
      params: { type }
    });
  }

  seasonEpisodes(tmdbId: number, seasonNumber: number): Observable<{ seasonNumber: number; episodes: Episode[] }> {
    return this.http.get<{ seasonNumber: number; episodes: Episode[] }>(`${API_URL}/content/${tmdbId}/season/${seasonNumber}`);
  }
}
