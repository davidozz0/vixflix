import { Component, inject } from '@angular/core';
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
      <div *ngIf="mode === 'pick'" style="display:flex; flex-direction:column; gap:1rem; width:300px;">
        <button (click)="mode='create'" class="btn">Crea profilo</button>
        <button (click)="mode='login'" class="btn secondary">Accedi</button>
      </div>
      <div *ngIf="mode === 'create'" style="display:flex; flex-direction:column; gap:0.5rem; width:300px;">
        <input [(ngModel)]="name" placeholder="Nome profilo" style="padding:0.5rem;" />
        <input [(ngModel)]="pin" type="password" maxlength="4" placeholder="PIN (4 cifre)" style="padding:0.5rem;" />
        <button (click)="create()" class="btn">Crea</button>
        <button (click)="mode='pick'" class="btn secondary">Indietro</button>
      </div>
      <div *ngIf="mode === 'login'" style="display:flex; flex-direction:column; gap:0.5rem; width:300px;">
        <input [(ngModel)]="name" placeholder="Nome profilo" style="padding:0.5rem;" />
        <input [(ngModel)]="pin" type="password" maxlength="4" placeholder="PIN" style="padding:0.5rem;" />
        <button (click)="login()" class="btn">Accedi</button>
        <button (click)="mode='pick'" class="btn secondary">Indietro</button>
      </div>
      <p *ngIf="error" style="color:var(--accent)">{{ error }}</p>
    </div>
  `
})
export class ProfilePickerComponent {
  private profileService = inject(ProfileService);
  private router = inject(Router);

  mode: 'pick' | 'create' | 'login' = 'pick';
  name = '';
  pin = '';
  error = '';

  create() {
    this.error = '';
    this.profileService.createProfile(this.name, this.pin).subscribe({
      next: () => this.router.navigate(['/home']),
      error: () => this.error = 'Errore creazione profilo'
    });
  }

  login() {
    this.error = '';
    this.profileService.login(this.name, this.pin).subscribe({
      next: () => this.router.navigate(['/home']),
      error: () => this.error = 'Nome o PIN errati'
    });
  }
}
