import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule],
  template: `
    <nav>
      <a routerLink="/home" class="brand">VixFlix</a>
      <a routerLink="/home" class="link">Home</a>
      <button class="theme-toggle" (click)="theme.toggle()">
        {{ theme.theme === 'dark' ? '☀️' : '🌙' }}
      </button>
    </nav>
  `,
  styles: [`
    nav {
      display: flex;
      align-items: center;
      gap: 1rem;
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
      color: var(--text-primary);
      text-decoration: none;
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
}
