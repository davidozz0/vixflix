import { Component, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule, FormsModule],
  template: `
    <nav>
      <a routerLink="/home" [queryParams]="{type: activeType}" class="brand">VixFlix</a>
      <a routerLink="/home" [queryParams]="{type: 'movie'}" class="link" [class.active]="activeType==='movie'">Film</a>
      <a routerLink="/home" [queryParams]="{type: 'tv'}" class="link" [class.active]="activeType==='tv'">Serie TV</a>
      <input [(ngModel)]="query" (ngModelChange)="onQueryChange($event)" placeholder="Cerca..." class="search" />
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
  `]
})
export class NavbarComponent {
  private router = inject(Router);
  private search$ = new Subject<string>();
  query = '';

  constructor() {
    this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(q => {
      const url = this.router.url;
      if (q.length >= 3) {
        this.router.navigate(['/home'], { queryParams: { type: this.activeType, q } });
      } else if (url.includes('q=')) {
        this.router.navigate(['/home'], { queryParams: { type: this.activeType } });
      }
    });
  }

  get activeType(): 'movie' | 'tv' {
    return this.router.url.includes('type=tv') ? 'tv' : 'movie';
  }

  onQueryChange(value: string) {
    this.search$.next(value);
  }
}
