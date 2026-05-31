import { Component, inject, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { ContentService } from '../../core/services/content.service';
import { WatchlistService } from '../../core/services/watchlist.service';
import { Content } from '../../models/content.model';
import { ContinueWatching } from '../../models/continue-watching.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="page" style="padding:1rem;">
      <div style="display:flex; gap:1rem; margin-bottom:1rem;">
        <input [(ngModel)]="query" (ngModelChange)="onQueryChange($event)" placeholder="Cerca..." style="flex:1; padding:0.5rem; background:var(--bg-secondary); color:var(--text-primary); border:1px solid var(--border); border-radius:4px;" />
        <select [(ngModel)]="type" (change)="onTypeChange()" style="padding:0.5rem; background:var(--bg-secondary); color:var(--text-primary); border:1px solid var(--border); border-radius:4px;">
          <option value="movie">Film</option>
          <option value="tv">Serie TV</option>
        </select>
      </div>

      <div *ngIf="continueList.length" style="margin-bottom:1.5rem;">
        <h3 style="margin:0 0 0.75rem 0; color:var(--text-primary);">Continua a guardare</h3>
        <div style="display:flex; gap:0.75rem; overflow-x:auto; padding-bottom:0.5rem;">
          <div *ngFor="let c of continueList" style="cursor:pointer; min-width:140px; max-width:140px; flex-shrink:0; position:relative;" class="card" style="overflow:hidden;">
            <div [routerLink]="['/watch', c.tmdbId]" [queryParams]="{type: c.type, season: c.lastSeason || 1, episode: c.lastEpisode || 1}">
              <img *ngIf="c.posterPath" [src]="'https://image.tmdb.org/t/p/w185' + c.posterPath" style="width:100%; display:block;" />
              <div *ngIf="!c.posterPath" style="width:100%; height:200px; background:var(--bg-secondary); display:flex; align-items:center; justify-content:center; color:var(--text-secondary); font-size:0.8rem;">No poster</div>
              <div style="font-size:0.85rem; padding:0.5rem; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ c.title }}</div>
              <div *ngIf="c.lastEpisode" style="font-size:0.7rem; padding:0 0.5rem 0.5rem 0.5rem; color:var(--text-secondary);">S{{ c.lastSeason }}E{{ c.lastEpisode }}</div>
            </div>
            <button (click)="removeContinue(c, $event)" style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.7); color:#fff; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer; font-size:14px; line-height:1;">✕</button>
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap:1rem;">
        <div *ngFor="let c of contents" style="position:relative; overflow:hidden;" class="card">
          <div [routerLink]="['/watch', c.tmdbId]" [queryParams]="{type: c.type}" style="cursor:pointer;">
            <img *ngIf="c.posterPath" [src]="'https://image.tmdb.org/t/p/w300' + c.posterPath" style="width:100%; display:block;" />
            <div *ngIf="!c.posterPath" style="width:100%; aspect-ratio:2/3; background:var(--bg-secondary); display:flex; align-items:center; justify-content:center; color:var(--text-secondary); font-size:0.8rem;">No poster</div>
            <div style="font-size:0.9rem; padding:0.5rem; color:var(--text-primary);">{{ c.title }}</div>
          </div>
          <button (click)="addToWatchlist(c, $event)" style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.7); color:#fff; border:none; border-radius:50%; width:28px; height:28px; cursor:pointer; font-size:16px; line-height:1;">+</button>
        </div>
      </div>
      <div *ngIf="isLoading" style="text-align:center; padding:1rem; color:var(--text-secondary);">Caricamento...</div>
    </div>
  `
})
export class HomeComponent implements OnInit, OnDestroy {
  private contentService = inject(ContentService);
  private watchlistService = inject(WatchlistService);
  private cdr = inject(ChangeDetectorRef);
  private search$ = new Subject<string>();
  private searchSub: Subscription;
  contents: Content[] = [];
  continueList: ContinueWatching[] = [];
  type: 'movie' | 'tv' = 'movie';
  query = '';
  private page = 1;
  private isSearching = false;
  isLoading = false;
  private hasMore = true;

  constructor() {
    this.searchSub = this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(q => {
      if (q.length >= 3) {
        this.isSearching = true;
        this.page = 1;
        this.hasMore = true;
        this.contentService.search(q, this.page).subscribe(data => {
          this.contents = data.results;
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      } else {
        this.isSearching = false;
        this.page = 1;
        this.hasMore = true;
        this.contents = [];
        this.loadTrending();
      }
    });
  }

  ngOnInit() {
    this.loadContinueWatching();
    this.loadTrending();
  }

  ngOnDestroy() {
    this.searchSub.unsubscribe();
  }

  loadTrending() {
    if (this.isLoading || !this.hasMore) return;
    this.isLoading = true;
    this.contentService.trending(this.type, this.page).subscribe(data => {
      this.contents = this.page === 1 ? data.results : [...this.contents, ...data.results];
      this.page++;
      this.hasMore = data.results.length > 0;
      this.isLoading = false;
      this.cdr.detectChanges();
      this.checkFillViewport();
    });
  }

  loadContinueWatching() {
    this.watchlistService.continueWatching().subscribe(list => {
      this.continueList = list;
      this.cdr.detectChanges();
    });
  }

  onQueryChange(value: string) {
    this.search$.next(value);
  }

  onTypeChange() {
    this.page = 1;
    this.hasMore = true;
    this.contents = [];
    this.query = '';
    this.isSearching = false;
    this.loadTrending();
  }

  @HostListener('window:scroll')
  onScroll() {
    if (this.isLoading || !this.hasMore || this.isSearching) return;
    const scrollBottom = window.innerHeight + window.scrollY;
    const docHeight = document.documentElement.scrollHeight;
    if (scrollBottom >= docHeight - 400) {
      this.loadTrending();
    }
  }

  private checkFillViewport() {
    if (this.isLoading || !this.hasMore || this.isSearching) return;
    const docHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    if (docHeight <= viewportHeight) {
      this.loadTrending();
    }
  }

  addToWatchlist(c: Content, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.watchlistService.upsert(c.tmdbId, {
      status: 'watching',
      lastSeason: c.type === 'tv' ? 1 : null,
      lastEpisode: c.type === 'tv' ? 1 : null,
      resumeTimeSeconds: 0
    }).subscribe(() => {
      this.loadContinueWatching();
    });
  }

  removeContinue(c: ContinueWatching, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (!confirm(`Rimuovere "${c.title}" dalla lista?`)) return;
    this.watchlistService.remove(c.tmdbId).subscribe(() => {
      this.loadContinueWatching();
    });
  }
}
