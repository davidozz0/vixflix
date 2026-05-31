import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Profile, AuthSession } from '../../models/profile.model';
import { environment } from '../../../environments/environment';

const API_URL = environment.apiUrl;
const STORAGE_KEY = 'vixflix_session';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private session$ = new BehaviorSubject<AuthSession | null>(this.loadSession());
  public session = this.session$.asObservable();

  constructor(private http: HttpClient) {}

  private loadSession(): AuthSession | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  private saveSession(session: AuthSession | null) {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.session$.next(session);
  }

  getToken(): string | null {
    return this.session$.value?.token ?? null;
  }

  createProfile(name: string, pin: string): Observable<AuthSession> {
    return this.http.post<AuthSession>(`${API_URL}/profiles`, { name, pin }).pipe(
      tap(s => this.saveSession(s))
    );
  }

  login(name: string, pin: string): Observable<AuthSession> {
    return this.http.post<AuthSession>(`${API_URL}/profiles/login`, { name, pin }).pipe(
      tap(s => this.saveSession(s))
    );
  }

  logout() {
    this.saveSession(null);
  }

  me(): Observable<Profile> {
    return this.http.get<Profile>(`${API_URL}/profiles/me`, {
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
  }
}
