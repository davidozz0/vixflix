import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { ConfirmDialogComponent } from './features/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, NavbarComponent, ConfirmDialogComponent],
  template: `
    <div class="page">
      <app-navbar [style.display]="showNavbar ? '' : 'none'"></app-navbar>
      <router-outlet></router-outlet>
      <app-confirm-dialog></app-confirm-dialog>
    </div>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  showNavbar = true;
  private sub!: Subscription;

  ngOnInit() {
    this.showNavbar = this.router.url !== '/';
    this.sub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      this.showNavbar = this.router.url !== '/';
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
