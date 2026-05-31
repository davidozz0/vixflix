import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { ConfirmDialogComponent } from './features/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, NavbarComponent, ConfirmDialogComponent],
  template: `
    <div class="page">
      <app-navbar></app-navbar>
      <router-outlet></router-outlet>
      <app-confirm-dialog></app-confirm-dialog>
    </div>
  `
})
export class AppComponent {}
