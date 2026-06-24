import { Component, inject, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ContentService } from '../../core/services/content.service';
import { WatchlistService } from '../../core/services/watchlist.service';
import { ModalService } from '../../core/services/modal.service';
import { DialogService } from '../../core/services/dialog.service';
import { ProfileService } from '../../core/services/profile.service';
import { Content } from '../../models/content.model';
import { ContinueWatching } from '../../models/continue-watching.model';
import { WatchlistEntry } from '../../models/watchlist.model';
import { RecommendedContent } from '../../models/recommended-content.model';
import { WishlistService } from '../../core/services/wishlist.service';
import { WishlistItem } from '../../models/wishlist-item.model';
import { ContentModalComponent } from '../content-modal/content-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, ContentModalComponent],
  template: `
    <div class="page" style="padding:1rem;">
      <div *ngIf="!isLoggedIn" style="margin-bottom:1rem; padding:0.75rem 1rem; background:var(--accent); color:#fff; border-radius:8px; display:flex; align-items:center; justify-content:space-between;">
        <span>Effettua il login per salvare i tuoi contenuti</span>
        <a routerLink="/" style="color:#fff; font-weight:600; text-decoration:underline;">Accedi</a>
      </div>

      <div *ngIf="continueList.length" style="margin-bottom:1.5rem;">
        <h3 style="margin:0 0 0.75rem 0; color:var(--text-primary);">Continua a guardare</h3>
        <div style="display:flex; gap:0.75rem; overflow-x:auto; padding-bottom:0.5rem;" class="thin-scroll">
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

      <div *ngIf="wishlistItems.length" style="margin-bottom:1.5rem;">
        <h3 style="margin:0 0 0.75rem 0; color:var(--text-primary);">Wishlist</h3>
        <div style="display:flex; gap:0.75rem; overflow-x:auto; padding-bottom:0.5rem;" class="thin-scroll">
          <div *ngFor="let w of wishlistItems" style="position:relative; cursor:pointer; min-width:140px; max-width:140px; flex-shrink:0; overflow:hidden;" class="card">
            <div (click)="onWishlistClick(w)">
              <img *ngIf="w.posterPath" [src]="'https://image.tmdb.org/t/p/w185' + w.posterPath" style="width:100%; display:block;" />
              <div *ngIf="!w.posterPath" style="width:100%; height:200px; background:var(--bg-secondary); display:flex; align-items:center; justify-content:center; color:var(--text-secondary); font-size:0.8rem;">No poster</div>
              <div style="font-size:0.85rem; padding:0.5rem; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ w.title }}</div>
            </div>
            <button (click)="removeFromWishlist(w, $event)" style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.7); color:#fff; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer; font-size:14px; line-height:1;">✕</button>
          </div>
        </div>
      </div>

      <div *ngIf="recommended.length" style="margin-bottom:1.5rem;">
        <h3 style="margin:0 0 0.75rem 0; color:var(--text-primary);">Consigliati per te</h3>
        <div style="display:flex; gap:0.75rem; overflow-x:auto; padding-bottom:0.5rem;" class="thin-scroll">
          <div *ngFor="let r of recommended" (click)="onRecommendedClick(r)" style="cursor:pointer; min-width:140px; max-width:140px; flex-shrink:0; overflow:hidden;" class="card">
            <img *ngIf="r.posterPath" [src]="'https://image.tmdb.org/t/p/w185' + r.posterPath" style="width:100%; display:block;" />
            <div *ngIf="!r.posterPath" style="width:100%; height:200px; background:var(--bg-secondary); display:flex; align-items:center; justify-content:center; color:var(--text-secondary); font-size:0.8rem;">No poster</div>
            <div style="font-size:0.85rem; padding:0.5rem; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ r.title }}</div>
          </div>
        </div>
      </div>

      <div *ngIf="!isSearching" style="margin-bottom:0.75rem;">
        <h3 style="margin:0; color:var(--text-primary);">Trending {{ type === 'movie' ? 'Film' : 'Serie TV' }}</h3>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap:1rem;">
        <div *ngFor="let c of contents" style="position:relative; overflow:hidden; cursor:pointer;" class="card">
          <div (click)="onCardClick(c)">
            <img *ngIf="c.posterPath" [src]="'https://image.tmdb.org/t/p/w300' + c.posterPath" style="width:100%; display:block;" />
            <div *ngIf="!c.posterPath" style="width:100%; aspect-ratio:2/3; background:var(--bg-secondary); display:flex; align-items:center; justify-content:center; color:var(--text-secondary); font-size:0.8rem;">No poster</div>
            <div style="font-size:0.9rem; padding:0.5rem; color:var(--text-primary);">{{ c.title }}</div>
          </div>
          <button (click)="toggleWishlist(c, $event)" style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.7); color:#fff; border:none; border-radius:50%; width:28px; height:28px; cursor:pointer; font-size:16px; line-height:1; display:flex; align-items:center; justify-content:center;"
                  [style.background]="isInWishlist(c.tmdbId) ? 'rgba(76,175,80,0.85)' : 'rgba(0,0,0,0.7)'">
            {{ isInWishlist(c.tmdbId) ? '✓' : '+' }}
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
  private contentService = inject(ContentService);
  private watchlistService = inject(WatchlistService);
  private modalService = inject(ModalService);
  private dialogService = inject(DialogService);
  private profileService = inject(ProfileService);
  private wishlistService = inject(WishlistService);
  private cdr = inject(ChangeDetectorRef);
  private queryParamsSub!: Subscription;
  private watchlistMap = new Map<number, WatchlistEntry>();
  wishlistItems: WishlistItem[] = [];
  private wishlistMap = new Map<number, WishlistItem>();
  contents: Content[] = [];
  continueList: ContinueWatching[] = [];
  recommended: RecommendedContent[] = [];
  type: 'movie' | 'tv' = 'movie';
  private genre = '';
  get isLoggedIn(): boolean { return this.profileService.isLoggedIn; }
  private page = 1;
  private lastQ = '';
  isSearching = false;
  isLoading = false;
  private hasMore = true;

  ngOnInit() {
    this.queryParamsSub = this.route.queryParamMap.subscribe(params => {
      const newType = (params.get('type') as 'movie' | 'tv') || 'movie';
      const q = params.get('q') || '';
      const newGenre = params.get('genre') || '';
      const changed = newType !== this.type || q !== this.lastQ || newGenre !== this.genre;
      if (changed) {
        this.type = newType;
        this.lastQ = q;
        this.genre = newGenre;
        this.page = 1;
        this.hasMore = true;
        this.contents = [];
      }
      if (this.contents.length === 0) {
        if (q.length >= 3) {
          this.isSearching = true;
          this.contentService.search(q, this.page).subscribe(data => {
            this.contents = data.results;
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        } else {
          this.isSearching = false;
          this.loadTrending();
        }
      }
    });
    this.loadWatchlistStatusMap();
    this.loadContinueWatching();
    this.loadRecommended();
    this.loadWishlistItems();
  }

  ngOnDestroy() {
    this.queryParamsSub.unsubscribe();
  }

  loadTrending() {
    if (this.isLoading || !this.hasMore || this.isSearching) return;
    this.isLoading = true;
    this.contentService.trending(this.type, this.page, this.genre || undefined).subscribe(data => {
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

  loadRecommended() {
    this.watchlistService.getRecommended().subscribe(list => {
      this.recommended = list;
      this.cdr.detectChanges();
    });
  }

  loadWatchlistStatusMap() {
    this.watchlistService.getAll().subscribe(list => {
      this.watchlistMap.clear();
      for (const e of list) {
        if (e.status !== 'unwatched') this.watchlistMap.set(e.tmdbId, e);
      }
      this.cdr.detectChanges();
    });
  }

  onCardClick(c: Content) {
    const wl = this.watchlistMap.get(c.tmdbId);
    this.modalService.open({
      tmdbId: c.tmdbId,
      type: c.type,
      status: (wl && wl.status === 'watched') ? 'watched' : 'unwatched',
    });
  }

  onRecommendedClick(r: RecommendedContent) {
    const wl = this.watchlistMap.get(r.tmdbId);
    this.modalService.open({
      tmdbId: r.tmdbId,
      type: r.type,
      status: (wl && wl.status === 'watched') ? 'watched' : 'unwatched',
    });
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

  loadWishlistItems() {
    this.wishlistService.getAll().subscribe({
      next: (list) => {
        this.wishlistItems = list;
        this.wishlistMap.clear();
        for (const item of list) {
          this.wishlistMap.set(item.tmdbId, item);
        }
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  isInWishlist(tmdbId: number): boolean {
    return this.wishlistMap.has(tmdbId);
  }

  async toggleWishlist(c: Content, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (this.isInWishlist(c.tmdbId)) {
      const ok = await this.dialogService.confirm(`Rimuovere "${c.title}" dalla wishlist?`);
      if (!ok) return;
      this.wishlistService.remove(c.tmdbId).subscribe(() => {
        this.loadWishlistItems();
      });
    } else {
      this.wishlistService.add(c.tmdbId, {
        title: c.title,
        posterPath: c.posterPath,
        type: c.type,
      }).subscribe(() => {
        this.loadWishlistItems();
      });
    }
  }

  onWishlistClick(w: WishlistItem) {
    const wl = this.watchlistMap.get(w.tmdbId);
    this.modalService.open({
      tmdbId: w.tmdbId,
      type: w.type,
      status: (wl && wl.status === 'watched') ? 'watched' : 'unwatched',
    });
  }

  async removeFromWishlist(w: WishlistItem, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    const ok = await this.dialogService.confirm(`Rimuovere "${w.title}" dalla wishlist?`);
    if (!ok) return;
    this.wishlistService.remove(w.tmdbId).subscribe(() => {
      this.loadWishlistItems();
    });
  }

  async removeContinue(c: ContinueWatching, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    const ok = await this.dialogService.confirm(`Rimuovere "${c.title}" dalla lista?`);
    if (!ok) return;
    this.watchlistService.remove(c.tmdbId).subscribe(() => {
      this.loadWatchlistStatusMap();
      this.loadContinueWatching();
    });
  }
}
