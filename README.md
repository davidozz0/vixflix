# VixFlix

Catalogo contenuti audiovisivi con player integrato via vixsrc.to. Aggrega metadati da TMDB.

## Stack

| Layer | Tecnologia |
|---|---|
| Frontend | Angular 19+ (standalone), TypeScript, RxJS, CSS custom properties (dark/light) |
| Backend | Node.js, Express, Drizzle ORM, SQLite (better-sqlite3) |
| Auth | PIN a 4 cifre, JWT |
| Metadati | TMDB API (v4 auth) |
| Player | iframe vixsrc.to + postMessage per progresso |

## Avvio rapido

```bash
npm run dev
```

Oppure doppio click su `start.bat`. Avvia backend (`:3000`) e frontend (`:4200`) in parallelo.

## Configurazione

Copia `backend/.env` e imposta le variabili:

```env
PORT=3000
JWT_SECRET=il-tuo-secret
DATABASE_URL=./sqlite.db
TMDB_API_KEY=il-tuo-access-token-tmdb-v4
```

TMDB API key gratuita: https://www.themoviedb.org/settings/api — serve un Access Token (lettura), non una API key v3.

## Script

| Comando | Directory | Descrizione |
|---|---|---|
| `npm run dev` | root | Avvia backend + frontend |
| `npm run dev:backend` | root | Solo backend (`tsx watch`) |
| `npm run dev:frontend` | root | Solo frontend (`ng serve`) |
| `npm run build` | root | Builda backend (`tsc`) e frontend (`ng build`) |

## Docker

L'immagine è composta da due container via `docker-compose.yml`:

- **frontend**: build Angular multistage → Nginx (porta 80, proxy `/api` → backend)
- **backend**: Node.js 22 alpine, SQLite su volume persistente

### Build & Run

```bash
docker compose up --build
```

### Solo build immagine

```bash
docker build -t vixflix-backend ./backend
docker build -t vixflix-frontend ./frontend
```

## Struttura

```
vixflix/
├── frontend/       # Angular standalone
│   ├── src/app/
│   │   ├── core/services/    # ProfileService, WatchlistService, ContentService, ThemeService
│   │   ├── models/           # Content, Profile, WatchlistEntry
│   │   └── features/         # Home, Player, ProfilePicker, MediaDetail
│   ├── nginx.conf
│   └── Dockerfile
├── backend/        # Node + Express + Drizzle
│   ├── src/db/schema.ts      # profiles, watchlist
│   ├── src/index.ts          # API routes
│   ├── drizzle/              # SQLite migrations
│   └── Dockerfile
├── docker-compose.yml
└── CONTEXT.md                # Glossario dominio
```
