# Task 5: Frontend — Player overlay always visible

**Files:**
- Modify: `frontend/src/app/features/player/player.component.ts`

## Implementation steps

### Step 1: Remove auto-hide properties

Remove from class body:
```ts
private navTimer: any;
```
and:
```ts
showNav = true;
```

### Step 2: Remove auto-hide methods

Remove:
```ts
@HostListener('document:mousemove')
onMouseMove() { this.showNav = true; this.cdr.detectChanges(); clearTimeout(this.navTimer); this.startHideTimer(); }
```
Remove:
```ts
private onKeyDown = () => { this.showNav = true; this.cdr.detectChanges(); clearTimeout(this.navTimer); this.startHideTimer(); };
```
Remove:
```ts
private startHideTimer() { this.navTimer = setTimeout(() => { this.showNav = false; this.cdr.detectChanges(); }, 1000); }
```

### Step 3: Remove keydown listener in ngOnInit and ngOnDestroy

In `ngOnInit`, remove:
```ts
document.addEventListener('keydown', this.onKeyDown);
```
and:
```ts
this.startHideTimer();
```

In `ngOnDestroy`, remove:
```ts
document.removeEventListener('keydown', this.onKeyDown);
```
and:
```ts
clearTimeout(this.navTimer);
```

### Step 4: Remove HostListener import if no longer used

Check if `@HostListener` decorator is still used elsewhere in the file. If not, change:
```ts
import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
```
to:
```ts
import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
```

### Step 5: Remove opacity/pointer-events bindings from nav buttons

Replace each button template to remove `[style.opacity]` and `[style.pointer-events]`:

Home button:
```html
<button routerLink="/home" class="nav-btn nav-home">
```

Prev button:
```html
<button *ngIf="src && type==='tv' && hasPrev" (click)="goPrev()" class="nav-btn nav-left">
```

Next button:
```html
<button *ngIf="src && type==='tv' && hasNext" (click)="goNext()" class="nav-btn nav-right">
```

### Step 6: Verify compilation

Run `cd E:\dev\src\vixflix\frontend && npx tsc --noEmit` — expect no errors.

### Step 7: Commit

```bash
git add frontend/src/app/features/player/player.component.ts
git commit -m "fix: player overlay buttons always visible, remove auto-hide"
```
