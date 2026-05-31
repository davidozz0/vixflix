import { Component, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule],
  template: `
    <nav>
      <a routerLink="/home" [queryParams]="{type: activeType}" class="brand">VixFlix</a>
      <a routerLink="/home" [queryParams]="{type: 'movie'}" class="link" [class.active]="activeType==='movie'">Film</a>
      <a routerLink="/home" [queryParams]="{type: 'tv'}" class="link" [class.active]="activeType==='tv'">Serie TV</a>
      <button class="theme-toggle" (click)="theme.toggle()">
        {{ theme.theme === 'dark' ? '☀️' : '🌙' }}
      </button>
    </nav>
  `,
  styles: [`
    nav {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 1rem;
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
    .link.active {
      color: var(--text-primary);
      border-bottom: 2px solid var(--accent);
      font-weight: 600;
    }
    .theme-toggle {
      margin-left: auto;
      background: none;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
    }
  `]
})
export class NavbarComponent {
  theme = inject(ThemeService);
  private router = inject(Router);

  get activeType(): 'movie' | 'tv' {
    const url = this.router.url;
    if (url.includes('type=tv')) return 'tv';
    return 'movie';
  }
}
