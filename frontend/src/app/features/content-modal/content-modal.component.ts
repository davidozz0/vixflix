import { Component, inject, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ModalService } from '../../core/services/modal.service';
import { ContentService } from '../../core/services/content.service';
import { WatchlistService } from '../../core/services/watchlist.service';
import { ContentDetail, Episode } from '../../models/content.model';
import { ModalData } from '../../models/modal-data.model';

@Component({
  selector: 'app-content-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="visible" class="overlay" (click)="close()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <button class="close" (click)="close()">✕</button>
        <div *ngIf="content" class="body">
          <div *ngIf="content.backdropPath" class="backdrop"
               [style.backgroundImage]="'url(https://image.tmdb.org/t/p/w780' + content.backdropPath + ')'">
            <img *ngIf="content.posterPath" [src]="'https://image.tmdb.org/t/p/w300' + content.posterPath" class="poster" />
            <div *ngIf="!content.posterPath" class="poster placeholder"></div>
          </div>
          <div class="info">
            <h2>{{ content.title }}</h2>
            <div class="meta">
              <span *ngIf="content.releaseDate" class="year">{{ content.releaseDate | slice:0:4 }}</span>
              <span class="rating">★ {{ content.voteAverage | number:'1.1-1' }}</span>
              <span *ngIf="content.runtime" class="runtime">{{ content.runtime }} min</span>
              <span *ngIf="content.numberOfSeasons" class="seasons">{{ content.numberOfSeasons }} stagioni</span>
            </div>
            <div class="genres">
              <span *ngFor="let g of content.genres" class="pill">{{ g.name }}</span>
            </div>
            <p class="overview">{{ content.overview }}</p>
          </div>

          <div *ngIf="content.type === 'tv' && content.seasons" class="episode-picker">
            <div class="season-tabs">
              <button *ngFor="let s of content.seasons"
                      (click)="selectSeason(s.seasonNumber)"
                      [class.active]="s.seasonNumber === selectedSeason"
                      class="season-tab">
                S{{ s.seasonNumber }}
              </button>
            </div>
            <div *ngIf="episodes.length" class="episode-list">
              <div *ngFor="let ep of episodes"
                   (click)="selectedEpisode = ep.episodeNumber"
                   [class.active-ep]="selectedEpisode === ep.episodeNumber"
                   class="episode-row">
                <span class="ep-num">{{ ep.episodeNumber }}</span>
                <span class="ep-title">{{ ep.name }}</span>
              </div>
            </div>
          </div>

          <div class="actions">
            <button class="watch-btn" (click)="play()">
              {{ isWatched ? 'Riguarda' : 'Guarda' }}
              <span *ngIf="content.type === 'tv' && selectedSeason && selectedEpisode">
                S{{ selectedSeason }}E{{ selectedEpisode }}
              </span>
            </button>
          </div>
        </div>
        <div *ngIf="!content" class="loading">Caricamento...</div>
      </div>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,0.8);
      backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      padding: 1rem;
    }
    .modal-card, .modal-card * { box-sizing: border-box; }
    .modal-card {
      position: relative;
      background: var(--card-bg);
      border-radius: 12px;
      max-width: 520px; width: 100%; max-height: 90vh;
      overflow-y: auto; overflow-x: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .close {
      position: absolute; top: 12px; right: 12px; z-index: 10;
      background: rgba(0,0,0,0.6); color: #fff; border: none;
      width: 32px; height: 32px; border-radius: 50%;
      cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center;
    }
    .backdrop {
      width: 100%; height: 180px; background-size: cover; background-position: center;
      position: relative; display: flex; align-items: flex-end; padding: 0 1rem;
    }
    .poster {
      width: 100px; border-radius: 8px; margin-bottom: -40px; position: relative;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    .poster.placeholder {
      height: 150px; background: var(--bg-secondary); border-radius: 8px;
      margin-bottom: -40px;
    }
    .info {
      padding: 3rem 1.5rem 0;
    }
    .info h2 {
      margin: 0 0 0.5rem 0; font-size: 1.4rem; color: var(--text-primary);
      overflow-wrap: break-word;
    }
    .meta {
      display: flex; gap: 1rem; flex-wrap: wrap; color: var(--text-secondary);
      font-size: 0.9rem; margin-bottom: 0.75rem;
    }
    .meta .rating { color: #f5c518; }
    .genres {
      margin-bottom: 0.75rem; display: flex; gap: 0.35rem; flex-wrap: wrap;
    }
    .pill {
      background: var(--pill-bg); color: var(--pill-text);
      padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.8rem;
    }
    .overview {
      color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5;
      margin: 0 0 1rem 0; overflow-wrap: break-word;
    }
    .episode-picker {
      padding: 0 1.5rem;
    }
    .season-tabs {
      display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.75rem;
    }
    .season-tab {
      background: var(--bg-secondary); color: var(--text-secondary);
      border: 1px solid var(--border); border-radius: 6px;
      padding: 0.25rem 0.65rem; font-size: 0.85rem; cursor: pointer;
    }
    .season-tab.active {
      background: var(--accent); color: #fff; border-color: var(--accent);
    }
    .episode-list {
      max-height: 200px; overflow-y: auto; margin-bottom: 0.75rem;
      border: 1px solid var(--border); border-radius: 8px;
    }
    .episode-row {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem;
      cursor: pointer; border-bottom: 1px solid var(--border); color: var(--text-secondary);
      font-size: 0.9rem;
    }
    .episode-row:last-child { border-bottom: none; }
    .episode-row:hover { background: var(--bg-secondary); }
    .episode-row.active-ep { color: var(--text-primary); background: var(--bg-secondary); }
    .ep-num { font-weight: 600; min-width: 24px; }
    .ep-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .actions {
      padding: 0 1.5rem 1.5rem;
    }
    .watch-btn {
      width: 100%; padding: 0.75rem; font-size: 1rem;
      background: var(--accent); color: #fff; border: none;
      border-radius: 8px; cursor: pointer; font-weight: 600;
    }
    .watch-btn:hover { opacity: 0.9; }
    .loading {
      padding: 3rem; text-align: center; color: var(--text-secondary);
    }
  `]
})
export class ContentModalComponent implements OnDestroy {
  private modalService = inject(ModalService);
  private contentService = inject(ContentService);
  private watchlist = inject(WatchlistService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private sub: Subscription;

  visible = false;
  content?: ContentDetail;
  private data?: ModalData;
  isWatched = false;
  selectedSeason = 1;
  selectedEpisode?: number;
  episodes: Episode[] = [];

  constructor() {
    this.sub = this.modalService.data.subscribe(data => {
      if (!data) { this.visible = false; return; }
      this.data = data;
      this.isWatched = data.status === 'watched';
      this.content = undefined;
      this.selectedSeason = 1;
      this.selectedEpisode = undefined;
      this.episodes = [];
      this.visible = true;
      this.contentService.detail(data.tmdbId, data.type).subscribe(detail => {
        this.content = detail;
        if (detail.type === 'tv') this.selectSeason(1);
        this.cdr.detectChanges();
      });
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  selectSeason(n: number) {
    this.selectedSeason = n;
    this.selectedEpisode = undefined;
    this.contentService.seasonEpisodes(this.content!.tmdbId, n).subscribe(data => {
      this.episodes = data.episodes;
      this.cdr.detectChanges();
    });
  }

  play() {
    if (!this.data) return;
    this.visible = false;
    const qp: any = { type: this.data.type };
    if (this.content?.type === 'tv') {
      qp.season = this.selectedSeason;
      qp.episode = this.selectedEpisode || this.episodes[0]?.episodeNumber || 1;
    }
    this.router.navigate(['/watch', this.data.tmdbId], { queryParams: qp });
  }

  close() {
    this.modalService.close();
  }
}
