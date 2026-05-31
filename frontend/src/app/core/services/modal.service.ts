import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ModalData } from '../../models/modal-data.model';

@Injectable({ providedIn: 'root' })
export class ModalService {
  private data$ = new BehaviorSubject<ModalData | null>(null);

  get data(): Observable<ModalData | null> {
    return this.data$.asObservable();
  }

  open(data: ModalData) {
    this.data$.next(data);
  }

  close() {
    this.data$.next(null);
  }
}
