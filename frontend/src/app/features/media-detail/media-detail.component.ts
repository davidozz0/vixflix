import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { WatchlistService } from '../../core/services/watchlist.service';
import { ContentDetail, Episode, Season } from '../../models/content.model';
import { WatchlistEntry } from '../../models/watchlist.model';

@Component({
  selector: 'app-media-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div *ngIf="content" class="page" style="padding:1rem;">
      <div *ngIf="content.backdropPath" style="width:100%; height:300px; background-size:cover; background-position:center; margin-bottom:1rem; border-radius:4px;"
           [style.backgroundImage]="'url(https://image.tmdb.org/t/p/original' + content.backdropPath + ')'">
      </div>
      <div>
        <h1 style="margin-top:0;">{{ content.title }}</h1>
        <p style="color:var(--text-secondary);">{{ content.overview }}</p>
        <div style="margin:1rem 0;">
          <span *ngFor="let g of content.genres" class="pill">{{ g.name }}</span>
        </div>

        <div *ngIf="content.type === 'movie'">
          <button [routerLink]="['/watch', content.tmdbId]" [queryParams]="{type: 'movie'}" class="btn">Guarda</button>
        </div>

        <div *ngIf="content.type === 'tv'" style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button (click)="playResume()" class="btn">{{ resumeLabel() }}</button>
          <button (click)="showSeasons = !showSeasons" class="btn secondary">Episodi</button>
        </div>
      </div>

      <div *ngIf="showSeasons && content.seasons" style="margin-top:1rem;">
        <div *ngFor="let season of content.seasons" style="margin-bottom:0.5rem;">
          <h3 (click)="toggleSeason(season.seasonNumber)" style="cursor:pointer; background:var(--bg-secondary); padding:0.5rem; border-radius:4px; margin:0;">{{ season.name }} ({{ season.episodeCount }} episodi)</h3>
          <div *ngIf="openSeason === season.seasonNumber && episodes.length" style="padding:0.5rem; background:var(--card-bg); border:1px solid var(--border); border-radius:4px; margin-top:0.25rem;">
            <div *ngFor="let ep of episodes" (click)="playEpisode(season.seasonNumber, ep.episodeNumber)" style="padding:0.4rem 0; cursor:pointer; border-bottom:1px solid var(--border); color:var(--text-primary);">
              <span>{{ ep.episodeNumber }}. {{ ep.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MediaDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private contentService = inject(ContentService);
  private watchlistService = inject(WatchlistService);
  content?: ContentDetail;
  watchlistEntry?: WatchlistEntry;
  showSeasons = false;
  openSeason: number | null = null;
  episodes: Episode[] = [];

  ngOnInit() {
    const tmdbId = Number(this.route.snapshot.paramMap.get('tmdbId'));
    const type = (this.route.snapshot.queryParamMap.get('type') as 'movie' | 'tv') || 'movie';
    this.contentService.detail(tmdbId, type).subscribe(data => {
      this.content = data;
    });
    this.watchlistService.getAll().subscribe(list => {
      this.watchlistEntry = list.find(e => e.tmdbId === tmdbId);
    });
  }

  resumeLabel(): string {
    if (!this.watchlistEntry || this.watchlistEntry.status === 'unwatched') return 'Guarda S01E01';
    if (this.watchlistEntry.status === 'watching') {
      const s = this.watchlistEntry.lastSeason ?? 1;
      const e = this.watchlistEntry.lastEpisode ?? 1;
      return `Riprendi da S${s}E${e}`;
    }
    return 'Rigioca da inizio';
  }

  playResume() {
    if (!this.content) return;
    const s = this.watchlistEntry?.lastSeason ?? 1;
    const e = this.watchlistEntry?.lastEpisode ?? 1;
    this.router.navigate(['/watch', this.content.tmdbId], { queryParams: { type: 'tv', season: s, episode: e, title: this.content.title } });
  }

  toggleSeason(seasonNumber: number) {
    if (this.openSeason === seasonNumber) {
      this.openSeason = null;
      this.episodes = [];
      return;
    }
    this.openSeason = seasonNumber;
    this.contentService.seasonEpisodes(this.content!.tmdbId, seasonNumber).subscribe(data => {
      this.episodes = data.episodes;
    });
  }

  playEpisode(season: number, episode: number) {
    if (!this.content) return;
    this.router.navigate(['/watch', this.content.tmdbId], { queryParams: { type: 'tv', season, episode, title: this.content.title } });
  }
}
