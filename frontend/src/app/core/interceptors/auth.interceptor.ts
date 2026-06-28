import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ProfileService } from '../services/profile.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const profileService = inject(ProfileService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        profileService.clearSession();
      }
      return throwError(() => err);
    })
  );
};
