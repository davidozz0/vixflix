import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { Profile } from '../../models/profile.model';
import { environment } from '../../../environments/environment';

const API_URL = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private session$ = new BehaviorSubject<Profile | null>(null);
  public session = this.session$.asObservable();

  constructor(private http: HttpClient) {
    this.me().subscribe({
      next: p => this.session$.next(p),
      error: () => this.session$.next(null),
    });
  }

  get isLoggedIn(): boolean {
    return this.session$.value !== null;
  }

  getToken(): string | null {
    return this.session$.value ? 'session' : null;
  }

  login(name: string, pin: string): Observable<Profile> {
    return this.http.post<{ profile: Profile }>(`${API_URL}/profiles/login`, { name, pin }, { withCredentials: true })
      .pipe(
        map(res => res.profile),
        tap(p => this.session$.next(p))
      );
  }

  logout(): Observable<any> {
    return this.http.post(`${API_URL}/profiles/logout`, {}, { withCredentials: true }).pipe(
      tap(() => this.session$.next(null))
    );
  }

  me(): Observable<Profile> {
    return this.http.get<Profile>(`${API_URL}/profiles/me`, { withCredentials: true });
  }
}
