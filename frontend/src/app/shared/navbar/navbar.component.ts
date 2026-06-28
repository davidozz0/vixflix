import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged, filter } from 'rxjs';
import { ContentService } from '../../core/services/content.service';
import { ProfileService } from '../../core/services/profile.service';
import { Genre } from '../../models/genre.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <nav>
      <a routerLink="/home" [queryParams]="{type: activeType}" class="brand">VixFlix</a>
      <a routerLink="/home" [queryParams]="{type: 'movie'}" class="link" [class.active]="activeType==='movie'">Film</a>
      <a routerLink="/home" [queryParams]="{type: 'tv'}" class="link" [class.active]="activeType==='tv'">Serie TV</a>
      <select [(ngModel)]="selectedGenre" (ngModelChange)="onGenreChange($event)" class="genre-select">
        <option value="">Tutti</option>
        <option *ngFor="let g of genres" [value]="g.id">{{ g.name }}</option>
      </select>
      <input [(ngModel)]="query" (ngModelChange)="onQueryChange($event)" placeholder="Cerca..." class="search" />
      <button (click)="logout()" class="logout-btn">Esci</button>
    </nav>
  `,
  styles: [`
    nav {
      position: sticky; top: 0; z-index: 100;
      display: flex; align-items: center; gap: 1.5rem;
      padding: 0.75rem 1rem;
      background-color: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
    }
    .brand {
      color: var(--accent);
      font-weight: bold;
      text-decoration: none;
      font-size: 1.2rem;
    }
    .link {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.95rem;
      padding-bottom: 2px;
    }
    .link.active { color: var(--text-primary); border-bottom: 2px solid var(--accent); font-weight: 600; }
    .genre-select {
      padding: 0.4rem 0.5rem;
      background: var(--bg-primary);
      color: var(--text-primary);
      border: 1px solid var(--border);
      border-radius: 4px;
      font-size: 0.9rem;
      max-width: 140px;
    }
    .search {
      margin-left: auto;
      padding: 0.4rem 0.6rem;
      background: var(--bg-primary);
      color: var(--text-primary);
      border: 1px solid var(--border);
      border-radius: 4px;
      font-size: 0.9rem;
      width: 200px;
    }
    .search::placeholder { color: var(--text-secondary); }
    .logout-btn {
      padding: 0.4rem 0.8rem;
      background: transparent;
      color: var(--text-secondary);
      border: 1px solid var(--border);
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
      white-space: nowrap;
    }
    .logout-btn:hover {
      color: var(--accent);
      border-color: var(--accent);
    }
  `]
})
export class NavbarComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private profileService = inject(ProfileService);
  private contentService = inject(ContentService);
  private search$ = new Subject<string>();
  private routerSub!: Subscription;
  private lastType = '';
  query = '';
  genres: Genre[] = [];
  selectedGenre = '';

  constructor() {
    this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(q => {
      const url = this.router.url;
      const gp = this.getGenreParam();
      if (q.length >= 3) {
        this.router.navigate(['/home'], { queryParams: { type: this.activeType, q, genre: gp || undefined } });
      } else if (url.includes('q=')) {
        this.router.navigate(['/home'], { queryParams: { type: this.activeType, genre: gp || undefined } });
      }
    });
  }

  ngOnInit() {
    setTimeout(() => this.loadGenres());
    this.routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      setTimeout(() => {
        if (this.activeType !== this.lastType) {
          this.lastType = this.activeType;
          this.loadGenres();
        }
        this.selectedGenre = this.getGenreParam();
      });
    });
  }

  ngOnDestroy() {
    this.routerSub.unsubscribe();
  }

  get activeType(): 'movie' | 'tv' {
    return this.router.url.includes('type=tv') ? 'tv' : 'movie';
  }

  private getGenreParam(): string {
    const m = this.router.url.match(/genre=(\d+)/);
    return m ? m[1] : '';
  }

  loadGenres() {
    this.contentService.genres(this.activeType).subscribe(data => {
      this.genres = data;
      this.selectedGenre = this.getGenreParam();
    });
  }

  onGenreChange(genre: string) {
    const q = this.query.length >= 3 ? this.query : undefined;
    this.router.navigate(['/home'], { queryParams: { type: this.activeType, genre: genre || undefined, q } });
  }

  onQueryChange(value: string) {
    this.search$.next(value);
  }

  logout() {
    this.profileService.logout().subscribe({
      next: () => this.router.navigate(['/']),
      error: () => this.router.navigate(['/']),
    });
  }
}
