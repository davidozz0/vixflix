import { Injectable } from '@angular/core';

const STORAGE_KEY = 'vixflix_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private current: 'dark' | 'light';

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY) as 'dark' | 'light' | null;
    this.current = saved ?? 'dark';
    this.apply();
  }

  get theme() {
    return this.current;
  }

  toggle() {
    this.current = this.current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, this.current);
    this.apply();
  }

  private apply() {
    document.body.setAttribute('data-theme', this.current);
  }
}
