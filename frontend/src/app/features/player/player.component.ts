import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { WatchlistService } from '../../core/services/watchlist.service';

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
    <a routerLink="/home" style="position:fixed; top:16px; left:16px; z-index:10; background:rgba(0,0,0,0.6); color:#fff; padding:8px 16px; border-radius:4px; text-decoration:none; font-size:14px;">← Home</a>
  `
})
export class PlayerComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);
  private watchlist = inject(WatchlistService);
  src?: SafeResourceUrl;
  private tmdbId = 0;
  private type: 'movie' | 'tv' = 'movie';
  private season = 1;
  private episode = 1;

  ngOnInit() {
    this.tmdbId = Number(this.route.snapshot.paramMap.get('tmdbId'));
    this.type = (this.route.snapshot.queryParamMap.get('type') as 'movie' | 'tv') || 'movie';
    this.season = Number(this.route.snapshot.queryParamMap.get('season')) || 1;
    this.episode = Number(this.route.snapshot.queryParamMap.get('episode')) || 1;
    console.log('Player init', { tmdbId: this.tmdbId, type: this.type, season: this.season, episode: this.episode });

    let url: string;
    if (this.type === 'tv') {
      url = `https://vixsrc.to/tv/${this.tmdbId}/${this.season}/${this.episode}?lang=it&autoplay=true`;
    } else {
      url = `https://vixsrc.to/movie/${this.tmdbId}?lang=it&autoplay=true`;
    }
    console.log('=== VIXFLIX PLAYER URL ===', url);
    this.src = this.sanitizer.bypassSecurityTrustResourceUrl(url);

    window.addEventListener('message', this.onMessage);
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
    const data = msg.data;
    console.log('PLAYER_EVENT', data.event, data);
    if (data.event === 'timeupdate') {
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
    }
  };
}
