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
      <div *ngIf="!src" style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--text-secondary);">Caricamento...</div>
      <div style="position:absolute; inset:0; pointer-events:none; z-index:1;">
        <button routerLink="/home" class="nav-btn nav-home">
          <span class="nav-arrow">⌂</span>
          <span class="nav-label">home</span>
        </button>
        <button *ngIf="src && type==='tv' && hasPrev" (click)="goPrev()" class="nav-btn nav-left">
          <span class="nav-arrow">◀</span>
          <span class="nav-label">prev</span>
        </button>
        <button *ngIf="src && type==='tv' && hasNext" (click)="goNext()" class="nav-btn nav-right">
          <span class="nav-arrow">▶</span>
          <span class="nav-label">next</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .nav-btn {
      position: fixed; top: 50%; transform: translateY(-50%); z-index: 30;
      width: 105px; height: 180px;
      background: rgba(0,0,0,0.5); color: #fff; border: none;
      cursor: pointer; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 6px;
      transition: opacity 0.3s;
    }
    .nav-left { left: 0; border-radius: 0 12px 12px 0; }
    .nav-right { right: 0; border-radius: 12px 0 0 12px; }
    .nav-home { top: 60px; left: 0; transform: none; width: 100px; height: 70px; border-radius: 0 12px 12px 0; }
    .nav-arrow { font-size: 38px; }
    .nav-label { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
    .nav-btn:hover { background: rgba(0,0,0,0.8); }
  `]
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
      next: (list) => { const wl = list.find(e => e.tmdbId === this.tmdbId); this.loadPlayer(wl?.resumeTimeSeconds ?? 0); },
      error: () => this.loadPlayer(0)
    });

    window.addEventListener('message', this.onMessage);
  }




  private updateNav() {
    if (this.episodes.length === 0) return;
    const idx = this.episodes.findIndex(e => e.episodeNumber === this.episode);
    if (idx > 0) { this.hasPrev = true; this.prevEpisode = this.episodes[idx - 1].episodeNumber; } else this.hasPrev = false;
    if (idx >= 0 && idx < this.episodes.length - 1) { this.hasNext = true; this.nextEpisode = this.episodes[idx + 1].episodeNumber; } else this.hasNext = false;
    this.cdr.detectChanges();
  }

  goPrev() { if (this.prevEpisode) this.navigateToEpisode(this.prevEpisode); }
  goNext() { if (this.nextEpisode) this.navigateToEpisode(this.nextEpisode); }

  private navigateToEpisode(ep: number) {
    this.episode = ep; this.hasPrev = false; this.hasNext = false;
    this.prevEpisode = undefined; this.nextEpisode = undefined;
    this.loadPlayer(0);
    this.contentService.seasonEpisodes(this.tmdbId, this.season).subscribe(data => { this.episodes = data.episodes; this.updateNav(); });
  }

  private loadPlayer(startAt = 0) {
    let url = this.type === 'tv'
      ? `https://vixsrc.to/tv/${this.tmdbId}/${this.season}/${this.episode}?lang=it&autoplay=true`
      : `https://vixsrc.to/movie/${this.tmdbId}?lang=it&autoplay=true`;
    if (startAt > 0) url += `&startAt=${startAt}`;
    console.log('=== VIXFLIX PLAYER URL ===', url);
    this.src = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.cdr.detectChanges();
    this.watchlist.upsert(this.tmdbId, {
      status: 'watching', lastSeason: this.type === 'tv' ? this.season : null, lastEpisode: this.type === 'tv' ? this.episode : null, resumeTimeSeconds: 0
    }).subscribe({ error: (err: any) => console.error('watchlist save failed', err.status) });
  }

  ngOnDestroy() {
    window.removeEventListener('message', this.onMessage);

  }

  private onMessage = (event: MessageEvent) => {
    if (event.origin !== 'https://vixsrc.to') return;
    const msg = event.data;
    if (!msg || msg.type !== 'PLAYER_EVENT') return;
    const data = msg.data || msg.event || msg;
    if (data.event === 'timeupdate') {
      this.watchlist.upsert(this.tmdbId, {
        status: 'watching', lastSeason: this.type === 'tv' ? this.season : null, lastEpisode: this.type === 'tv' ? this.episode : null, resumeTimeSeconds: Math.floor(data.currentTime)
      }).subscribe({ error: () => {} });
    }
    if (data.event === 'ended') {
      this.watchlist.upsert(this.tmdbId, {
        status: 'watched', lastSeason: this.type === 'tv' ? this.season : null, lastEpisode: this.type === 'tv' ? this.episode : null, resumeTimeSeconds: 0
      }).subscribe({ error: () => {} });
      if (this.type === 'tv' && this.nextEpisode) setTimeout(() => this.goNext(), 3000);
    }
  };
}
