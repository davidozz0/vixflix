import { Component, inject, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { ContentService } from '../../core/services/content.service';
import { WatchlistService } from '../../core/services/watchlist.service';
import { ModalService } from '../../core/services/modal.service';
import { Content } from '../../models/content.model';
import { ContinueWatching } from '../../models/continue-watching.model';
import { WatchlistEntry } from '../../models/watchlist.model';
import { ContentModalComponent } from '../content-modal/content-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ContentModalComponent],
  template: `
    <div class="page" style="padding:1rem;">
      <div style="margin-bottom:1rem;">
        <input [(ngModel)]="query" (ngModelChange)="onQueryChange($event)" placeholder="Cerca..." style="width:100%; max-width:400px; padding:0.5rem; background:var(--bg-secondary); color:var(--text-primary); border:1px solid var(--border); border-radius:4px;" />
      </div>

      <div *ngIf="continueList.length" style="margin-bottom:1.5rem;">
        <h3 style="margin:0 0 0.75rem 0; color:var(--text-primary);">Continua a guardare</h3>
        <div style="display:flex; gap:0.75rem; overflow-x:auto; padding-bottom:0.5rem;">
          <div *ngFor="let c of continueList" style="position:relative; cursor:pointer; min-width:140px; max-width:140px; flex-shrink:0; overflow:hidden;" class="card">
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
        <div *ngFor="let c of contents" style="position:relative; overflow:hidden; cursor:pointer;" class="card">
          <div (click)="onCardClick(c)">
            <img *ngIf="c.posterPath" [src]="'https://image.tmdb.org/t/p/w300' + c.posterPath" style="width:100%; display:block;" />
            <div *ngIf="!c.posterPath" style="width:100%; aspect-ratio:2/3; background:var(--bg-secondary); display:flex; align-items:center; justify-content:center; color:var(--text-secondary); font-size:0.8rem;">No poster</div>
            <div style="font-size:0.9rem; padding:0.5rem; color:var(--text-primary);">{{ c.title }}</div>
          </div>
          <button (click)="addToWatchlist(c, $event)" style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.7); color:#fff; border:none; border-radius:50%; width:28px; height:28px; cursor:pointer; font-size:16px; line-height:1; display:flex; align-items:center; justify-content:center;"
                  [style.background]="isInWatchlist(c.tmdbId) ? 'rgba(76,175,80,0.85)' : 'rgba(0,0,0,0.7)'">
            {{ isInWatchlist(c.tmdbId) ? '✓' : '+' }}
          </button>
        </div>
      </div>
      <div *ngIf="isLoading" style="text-align:center; padding:1rem; color:var(--text-secondary);">Caricamento...</div>
    </div>
    <app-content-modal></app-content-modal>
  `
})
export class HomeComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private contentService = inject(ContentService);
  private watchlistService = inject(WatchlistService);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);
  private search$ = new Subject<string>();
  private searchSub: Subscription;
  private queryParamsSub!: Subscription;
  private watchlistMap = new Map<number, WatchlistEntry>();
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
    this.queryParamsSub = this.route.queryParamMap.subscribe(params => {
      const newType = (params.get('type') as 'movie' | 'tv') || 'movie';
      if (newType !== this.type) {
        this.type = newType;
        this.page = 1;
        this.hasMore = true;
        this.contents = [];
        this.query = '';
        this.isSearching = false;
        this.loadTrending();
      }
    });
    this.loadWatchlistMap();
    this.loadContinueWatching();
    this.loadTrending();
  }

  ngOnDestroy() {
    this.searchSub.unsubscribe();
    this.queryParamsSub.unsubscribe();
  }

  loadTrending() {
    if (this.isLoading || !this.hasMore || this.isSearching) return;
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

  loadWatchlistMap() {
    this.watchlistService.getAll().subscribe(list => {
      this.watchlistMap.clear();
      for (const e of list) this.watchlistMap.set(e.tmdbId, e);
      this.cdr.detectChanges();
    });
  }

  onCardClick(c: Content) {
    const wl = this.watchlistMap.get(c.tmdbId);
    if (wl && wl.status === 'watching') {
      this.router.navigate(['/watch', c.tmdbId], {
        queryParams: {
          type: c.type,
          season: wl.lastSeason ?? undefined,
          episode: wl.lastEpisode ?? undefined,
        }
      });
    } else {
      this.modalService.open({
        tmdbId: c.tmdbId,
        type: c.type,
        status: (wl && wl.status === 'watched') ? 'watched' : 'unwatched',
      });
    }
  }

  onQueryChange(value: string) {
    this.search$.next(value);
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

  isInWatchlist(tmdbId: number): boolean {
    return this.watchlistMap.has(tmdbId);
  }

  addToWatchlist(c: Content, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (this.isInWatchlist(c.tmdbId)) {
      this.watchlistService.remove(c.tmdbId).subscribe(() => {
        this.loadWatchlistMap();
        this.loadContinueWatching();
      });
    } else {
      this.watchlistService.upsert(c.tmdbId, {
        status: 'watching',
        lastSeason: c.type === 'tv' ? 1 : null,
        lastEpisode: c.type === 'tv' ? 1 : null,
        resumeTimeSeconds: 0
      }).subscribe(() => {
        this.loadWatchlistMap();
        this.loadContinueWatching();
      });
    }
  }

  removeContinue(c: ContinueWatching, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (!confirm(`Rimuovere "${c.title}" dalla lista?`)) return;
    this.watchlistService.remove(c.tmdbId).subscribe(() => {
      this.loadWatchlistMap();
      this.loadContinueWatching();
    });
  }
}
