import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WishlistItem } from '../../models/wishlist-item.model';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private http = inject(HttpClient);
  private api = '/api/wishlist';

  getAll(): Observable<WishlistItem[]> {
    return this.http.get<WishlistItem[]>(this.api, { withCredentials: true });
  }

  add(tmdbId: number, item: { title: string; posterPath: string | null; type: string }): Observable<any> {
    return this.http.post(`${this.api}/${tmdbId}`, item, { withCredentials: true });
  }

  remove(tmdbId: number): Observable<any> {
    return this.http.delete(`${this.api}/${tmdbId}`, { withCredentials: true });
  }
}
