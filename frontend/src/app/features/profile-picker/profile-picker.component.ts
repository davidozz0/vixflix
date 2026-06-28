import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService } from '../../core/services/profile.service';

@Component({
  selector: 'app-profile-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page" style="display:flex; flex-direction:column; align-items:center; gap:1rem; padding:2rem;">
      <h1>VixFlix</h1>
      <div style="display:flex; flex-direction:column; gap:0.5rem; width:100%; max-width:300px;">
        <input [(ngModel)]="name" placeholder="Nome utente" style="padding:0.5rem; background:var(--bg-secondary); color:var(--text-primary); border:1px solid var(--border); border-radius:4px;" />
        <input [(ngModel)]="pin" type="password" maxlength="4" placeholder="PIN" style="padding:0.5rem; background:var(--bg-secondary); color:var(--text-primary); border:1px solid var(--border); border-radius:4px;" />
        <button (click)="login()" class="btn">Accedi</button>
      </div>
      <p *ngIf="error" style="color:var(--accent)">{{ error }}</p>
    </div>
  `
})
export class ProfilePickerComponent implements OnInit {
  private profileService = inject(ProfileService);
  private router = inject(Router);

  name = '';
  pin = '';
  error = '';

  ngOnInit() {
    if (this.profileService.isLoggedIn) {
      this.router.navigate(['/home'], { queryParams: { type: 'movie' } });
      return;
    }
    // Prova a ripristinare sessione da cookie
    this.profileService.me().subscribe({
      next: () => this.router.navigate(['/home'], { queryParams: { type: 'movie' } }),
      error: () => {} // No session, resta su login
    });
  }

  login() {
    this.error = '';
    this.profileService.login(this.name, this.pin).subscribe({
      next: () => this.router.navigate(['/home'], { queryParams: { type: 'movie' } }),
      error: () => this.error = 'Nome o PIN errati'
    });
  }
}
