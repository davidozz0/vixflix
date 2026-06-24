# Task 3: Frontend — Create WishlistItem model + WishlistService

**Files:**
- Create: `frontend/src/app/models/wishlist-item.model.ts`
- Create: `frontend/src/app/core/services/wishlist.service.ts`

**Interfaces:**
- Produces: `WishlistItem` interface, `WishlistService` class (consumed by Task 4)

## Global constraints

- All frontend API calls use `{ withCredentials: true }`

## Implementation steps

### Step 1: Create model

Create `frontend/src/app/models/wishlist-item.model.ts`:

```ts
export interface WishlistItem {
  id: number;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  type: 'movie' | 'tv';
  addedAt: string;
}
```

### Step 2: Create service

Create `frontend/src/app/core/services/wishlist.service.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WishlistItem } from '../../models/wishlist-item.model';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private http = inject(HttpClient);
  private api = '/api/wishlist';

  getAll(): Observable<WishlistItem[]> {
    return this.http.get<WishlistItem[]>(this.api, { withCredentials: true });
  }

  add(tmdbId: number, item: { title: string; posterPath: string | null; type: string }): Observable<any> {
    return this.http.post(`${this.api}/${tmdbId}`, item, { withCredentials: true });
  }

  remove(tmdbId: number): Observable<any> {
    return this.http.delete(`${this.api}/${tmdbId}`, { withCredentials: true });
  }
}
```

### Step 3: Verify compilation

Run `cd E:\dev\src\vixflix\frontend && npx tsc --noEmit` — expect no errors.

### Step 4: Commit

```bash
git add frontend/src/app/models/wishlist-item.model.ts frontend/src/app/core/services/wishlist.service.ts
git commit -m "feat: add WishlistItem model and WishlistService"
```
