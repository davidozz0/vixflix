# Task 4 Report: Home component wishlist section + "+" uses wishlist

**Status:** DONE

**Commits:** `8a41086` — feat: add wishlist section to home, '+' uses wishlist

**Compilation:** `npx tsc --noEmit` passed with zero errors.

**Changes made to `home.component.ts`:**
- Added imports for `WishlistService` and `WishlistItem`
- Injected `WishlistService`
- Added `wishlistItems` and `wishlistMap` properties
- Renamed `loadWatchlistMap()` → `loadWatchlistStatusMap()`
- Added `loadWishlistItems()`, `isInWishlist()`, `toggleWishlist()`, `onWishlistClick()`, `removeFromWishlist()`
- Removed `isInWatchlist()` and `addToWatchlist()`
- Updated `ngOnInit()` to call `loadWatchlistStatusMap()` and `loadWishlistItems()`
- Added wishlist section HTML template between continue watching and recommended
- Updated "+" button to use `toggleWishlist`/`isInWishlist`
- Updated `removeContinue` to call `loadWatchlistStatusMap()`

**Concerns:** None.
