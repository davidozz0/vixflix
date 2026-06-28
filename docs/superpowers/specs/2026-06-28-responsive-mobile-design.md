# Responsive Mobile Design — VixFlix

## Overview
Rendere la web app VixFlix responsive e funzionante correttamente su dispositivi mobili (cellulari). Focus principale su **Home** e **Player** a schermi <= 600px di larghezza.

## Approach
**Media queries mirate (Approccio A):** aggiungere breakpoint `@media (max-width: 600px)` e `@media (max-width: 400px)` nei componenti esistenti, senza estrarre stili in file separati o introdurre dipendenze.

## Scope
- Navbar (componente condiviso)
- Home (caroselli orizzontali, grid principale)
- Player (pulsanti navigazione, title-bar)
- Profilo login (solo fix width fissa)

## Design

### 1. Navbar mobile
**Breakpoint:** max-width 600px

Stato attuale: 6 elementi (brand, Film, SerieTV, genere select, search, esci) in un'unica riga flex — overflow oltre 700px.

Modifiche:
```
@media (max-width: 600px):
  nav: flex-wrap: wrap; gap ridotto a 0.5rem; padding ridotto a 0.5rem
  .brand: order 1
  .search: order 2, flex: 1, min-width 100px, width auto
  .logout-btn: order 3
  .link, .genre-select: order 4 (seconda riga)
  .genre-select: max-width none
```

Risultato: due righe — (VixFlix + search + esci) su riga 1, (Film + SerieTV + genere) su riga 2.

### 2. Home — Card e grid
**Breakpoint:** max-width 600px

Stato attuale: card caroselli 140px fissi. Grid principale `auto-fill, minmax(150px, 1fr)`.

Modifiche:
```
@media (max-width: 600px):
  .card: min-width 110px, max-width 110px
  placeholder poster height 150px
  grid principale: minmax(100px, 1fr) invece di minmax(150px, 1fr)
```

### 3. Player — Pulsanti e title-bar
**Breakpoint:** max-width 600px

Stato attuale: nav-btn 105x180px fissi, nav-arrow 38px, title-bar nowrap.

Modifiche:
```
@media (max-width: 600px):
  .nav-btn: width 60px, height 80px
  .nav-home: width 60px, height 40px
  .nav-arrow: font-size 22px
  .title-bar: font-size 12px, max-width 90vw, overflow hidden, text-overflow ellipsis
```

### 4. Profile picker (fix minore)
**Breakpoint:** max-width 400px

Stato attuale: form `width: 300px` fisso.

Modifiche:
```
@media (max-width: 400px):
  input, button: width 100%, max-width 300px (sostituisce width:300px)
```

## Files da modificare
- `frontend/src/app/shared/navbar/navbar.component.ts` (blocco `styles: []`)
- `frontend/src/app/features/home/home.component.ts` (template inline)
- `frontend/src/app/features/player/player.component.ts` (blocco `styles: []`)
- `frontend/src/app/features/profile-picker/profile-picker.component.ts` (template inline)

## Esclusioni
- Content-modal: similar-grid verra' fixato separatamente se necessario
- Media-detail: non prioritario per mobile
- Fullscreen orizzontale player: da verificare dopo (menzionato ma non implementato in questa fase)

## Non incluso in questa fase
- Fullscreen orizzontale del player (da verificare e pianificare separatamente)
- Performance delle immagini su connessioni mobili
- Touch event ottimizzati per swipe nei caroselli
