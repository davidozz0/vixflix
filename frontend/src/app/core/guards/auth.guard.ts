import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ProfileService } from '../services/profile.service';

export const authGuard: CanActivateFn = () => {
  const profileService = inject(ProfileService);
  const router = inject(Router);

  if (profileService.isLoggedIn) return true;

  // Prova a ripristinare sessione da cookie (tap in me() setta session$)
  return profileService.me().pipe(
    map(() => true),
    catchError(() => of(router.parseUrl('/')))
  );
};
