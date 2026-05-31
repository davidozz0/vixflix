import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DialogService } from '../../core/services/dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="visible" class="overlay" (click)="answer(false)">
      <div class="dialog" (click)="$event.stopPropagation()">
        <p class="message">{{ message }}</p>
        <div class="buttons">
          <button class="btn secondary" (click)="answer(false)">Annulla</button>
          <button class="btn" (click)="answer(true)">Conferma</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed; inset: 0; z-index: 1100;
      background: rgba(0,0,0,0.7);
      display: flex; align-items: center; justify-content: center;
      padding: 1rem;
    }
    .dialog {
      background: var(--card-bg);
      border-radius: 12px;
      padding: 2rem;
      max-width: 360px; width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .message {
      color: var(--text-primary);
      font-size: 1rem;
      margin: 0 0 1.5rem 0;
      line-height: 1.5;
    }
    .buttons {
      display: flex; gap: 0.75rem; justify-content: flex-end;
    }
    .btn {
      background: var(--accent);
      color: #fff; border: none;
      padding: 0.5rem 1.25rem; border-radius: 8px;
      cursor: pointer; font-size: 0.9rem; font-weight: 600;
    }
    .btn.secondary {
      background: var(--bg-secondary);
      color: var(--text-primary);
      border: 1px solid var(--border);
    }
  `]
})
export class ConfirmDialogComponent implements OnDestroy {
  private dialogService = inject(DialogService);
  private sub: Subscription;
  visible = false;
  message = '';

  constructor() {
    this.sub = this.dialogService.data.subscribe(data => {
      if (!data) { this.visible = false; return; }
      this.message = data.message;
      this.visible = true;
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  answer(ok: boolean) {
    this.dialogService.answer(ok);
  }
}
