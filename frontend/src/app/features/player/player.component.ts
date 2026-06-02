import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { WatchlistService } from '../../core/services/watchlist.service';
import { ContentService } from '../../core/services/content.service';
import { Episode } from '../../models/content.model';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div style="position:fixed; inset:0; background:#000;">
      <iframe *ngIf="src" [src]="src" style="border:none; width:100%; height:100%; display:block;" allowfullscreen></iframe>
      <div *ngIf="!src" style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--text-secondary);">
        Caricamento...
      </div>
    </div>
    <a routerLink="/home" style="position:fixed; top:16px; left:16px; z-index:20; background:rgba(0,0,0,0.6); color:#fff; padding:8px 16px; border-radius:4px; text-decoration:none; font-size:14px;">← Home</a>
    <div *ngIf="type==='tv'" style="position:fixed; bottom:30px; left:0; right:0; z-index:20; display:flex; justify-content:center; gap:1rem;">
      <button *ngIf="hasPrev" (click)="goPrev()" style="background:rgba(0,0,0,0.7); color:#fff; border:none; padding:0.5rem 1rem; border-radius:4px; cursor:pointer;">← Ep. precedente</button>
      <button *ngIf="hasNext" (click)="goNext()" style="background:rgba(0,0,0,0.7); color:#fff; border:none; padding:0.5rem 1rem; border-radius:4px; cursor:pointer;">Ep. successivo →</button>
    </div>
  `
})
export class PlayerComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private watchlist = inject(WatchlistService);
  private contentService = inject(ContentService);
  private cdr = inject(ChangeDetectorRef);
  src?: SafeResourceUrl;
  type: 'movie' | 'tv' = 'movie';
  private tmdbId = 0;
  private season = 1;
  private episode = 1;
  private episodes: Episode[] = [];
  hasPrev = false;
  hasNext = false;
  private prevEpisode?: number;
  private nextEpisode?: number;

  ngOnInit() {
    this.tmdbId = Number(this.route.snapshot.paramMap.get('tmdbId'));
    this.type = (this.route.snapshot.queryParamMap.get('type') as 'movie' | 'tv') || 'movie';
    this.season = Number(this.route.snapshot.queryParamMap.get('season')) || 1;
    this.episode = Number(this.route.snapshot.queryParamMap.get('episode')) || 1;
    console.log('Player init', { tmdbId: this.tmdbId, type: this.type, season: this.season, episode: this.episode });

    if (this.type === 'tv') {
      this.contentService.seasonEpisodes(this.tmdbId, this.season).subscribe(data => {
        this.episodes = data.episodes;
        this.updateNav();
      });
    }

    this.watchlist.getAll().subscribe({
      next: (list) => {
        const wl = list.find(e => e.tmdbId === this.tmdbId);
        this.loadPlayer(wl?.resumeTimeSeconds ?? 0);
      },
      error: () => this.loadPlayer(0)
    });

    window.addEventListener('message', this.onMessage);
  }

  private updateNav() {
    if (this.episodes.length === 0) return;
    const idx = this.episodes.findIndex(e => e.episodeNumber === this.episode);
    if (idx > 0) { this.hasPrev = true; this.prevEpisode = this.episodes[idx - 1].episodeNumber; }
    else this.hasPrev = false;
    if (idx >= 0 && idx < this.episodes.length - 1) { this.hasNext = true; this.nextEpisode = this.episodes[idx + 1].episodeNumber; }
    else this.hasNext = false;
  }

  goPrev() {
    if (this.prevEpisode) this.navigateToEpisode(this.prevEpisode);
  }

  goNext() {
    if (this.nextEpisode) this.navigateToEpisode(this.nextEpisode);
  }

  private navigateToEpisode(ep: number) {
    this.episode = ep;
    this.hasPrev = false; this.hasNext = false;
    this.prevEpisode = undefined; this.nextEpisode = undefined;
    this.loadPlayer(0);
    this.contentService.seasonEpisodes(this.tmdbId, this.season).subscribe(data => {
      this.episodes = data.episodes;
      this.updateNav();
    });
  }

  private loadPlayer(startAt = 0) {
    let url: string;
    if (this.type === 'tv') {
      url = `https://vixsrc.to/tv/${this.tmdbId}/${this.season}/${this.episode}?lang=it&autoplay=true`;
    } else {
      url = `https://vixsrc.to/movie/${this.tmdbId}?lang=it&autoplay=true`;
    }
    if (startAt > 0) url += `&startAt=${startAt}`;
    console.log('=== VIXFLIX PLAYER URL ===', url);
    this.src = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.cdr.detectChanges();

    this.watchlist.upsert(this.tmdbId, {
      status: 'watching',
      lastSeason: this.type === 'tv' ? this.season : null,
      lastEpisode: this.type === 'tv' ? this.episode : null,
      resumeTimeSeconds: 0
    }).subscribe({
      next: () => console.log('watchlist saved on open'),
      error: (err) => console.error('watchlist save failed', err.status)
    });
  }

  ngOnDestroy() {
    window.removeEventListener('message', this.onMessage);
  }

  private onMessage = (event: MessageEvent) => {
    console.log('postMessage received', { origin: event.origin, data: event.data });
    if (event.origin !== 'https://vixsrc.to') {
      console.log('postMessage IGNORED: wrong origin', event.origin);
      return;
    }
    const msg = event.data;
    if (!msg || msg.type !== 'PLAYER_EVENT') {
      console.log('postMessage IGNORED: not a PLAYER_EVENT', msg?.type);
      return;
    }
    const data = msg.data || msg.event || msg;
    console.log('PLAYER_EVENT', data.event, data);
    if (data.event === 'timeupdate') {
      console.log('>>> SAVING timeupdate, currentTime=', data.currentTime);
      this.watchlist.upsert(this.tmdbId, {
        status: 'watching',
        lastSeason: this.type === 'tv' ? this.season : null,
        lastEpisode: this.type === 'tv' ? this.episode : null,
        resumeTimeSeconds: Math.floor(data.currentTime)
      }).subscribe({
        next: () => console.log('watchlist upsert OK'),
        error: (err) => console.error('watchlist upsert FAIL - not logged in?', err.status)
      });
    }
    if (data.event === 'ended') {
      this.watchlist.upsert(this.tmdbId, {
        status: 'watched',
        lastSeason: this.type === 'tv' ? this.season : null,
        lastEpisode: this.type === 'tv' ? this.episode : null,
        resumeTimeSeconds: 0
      }).subscribe({
        next: () => console.log('watchlist completed OK'),
        error: (err) => console.error('watchlist completed FAIL - not logged in?', err.status)
      });
      if (this.type === 'tv' && this.nextEpisode) {
        setTimeout(() => this.goNext(), 3000);
      }
    }
  };
}
