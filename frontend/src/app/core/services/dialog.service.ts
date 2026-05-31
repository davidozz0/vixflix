import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DialogService {
  private data$ = new BehaviorSubject<{ message: string; callback: (ok: boolean) => void } | null>(null);

  get data(): Observable<{ message: string; callback: (ok: boolean) => void } | null> {
    return this.data$.asObservable();
  }

  confirm(message: string): Promise<boolean> {
    return new Promise(resolve => {
      this.data$.next({ message, callback: resolve });
    });
  }

  answer(ok: boolean) {
    const d = this.data$.value;
    if (d) d.callback(ok);
    this.data$.next(null);
  }
}
