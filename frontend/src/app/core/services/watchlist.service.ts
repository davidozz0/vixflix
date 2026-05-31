import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WatchlistEntry, WatchStatus } from '../../models/watchlist.model';
import { ContinueWatching } from '../../models/continue-watching.model';
import { ProfileService } from './profile.service';
import { environment } from '../../../environments/environment';

const API_URL = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  constructor(private http: HttpClient, private profile: ProfileService) {}

  private authHeaders() {
    const token = this.profile.getToken();
    return { Authorization: `Bearer ${token}` };
  }

  getAll(): Observable<WatchlistEntry[]> {
    return this.http.get<WatchlistEntry[]>(`${API_URL}/watchlist`, { headers: this.authHeaders() });
  }

  continueWatching(): Observable<ContinueWatching[]> {
    return this.http.get<ContinueWatching[]>(`${API_URL}/watchlist/continue`, { headers: this.authHeaders() });
  }

  upsert(tmdbId: number, payload: {
    status: WatchStatus;
    lastSeason?: number | null;
    lastEpisode?: number | null;
    resumeTimeSeconds?: number;
  }): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`${API_URL}/watchlist/${tmdbId}`, payload, { headers: this.authHeaders() });
  }

  remove(tmdbId: number): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`${API_URL}/watchlist/${tmdbId}`, { status: 'unwatched' }, { headers: this.authHeaders() });
  }
}
