# VixFlix — Plan

Portale Netflix-like per catalogo contenuti con player integrato via vixsrc.to.

## Stack

| Layer | Tecnologia |
|---|---|
| Frontend | Angular 18+, TypeScript, RxJS, CSS vanilla (tema dark) |
| Build | Angular CLI (solo in fase di build) |
| Runtime | **Nginx** (static files + proxy) |
| Container | **Docker** (multistage: node:22-alpine build → nginx:alpine runtime) |
| Metadati | **TMDB API** (gratuita, CORS sì, poster/rating/generi) |
| Disponibilità | **vixsrc.to API** (`/api/list/{type}?lang=it`, match per TMDB ID) |
| Player | iframe **vixsrc.to** (`/movie/{id}` / `/tv/{id}/{s}/{e}` + postMessage eventi) |
| Profili | **localStorage** (switchabili, senza auth) |
| Watchlist | **localStorage** (visto/in corso, aggiornato via postMessage player) |

## Backend

**Nessun backend.**
- Niente Express, niente DB, niente Node in runtime
- Profili e watchlist su localStorage
- Se vixsrc.to blocca CORS → proxy nginx di 2 righe

## Docker Multistage Build

```dockerfile
# Stage 1: Build Angular
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

# Stage 2: Serve con Nginx
FROM nginx:alpine
COPY --from=build /app/dist/vixflix/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy opzionale per vixsrc.to (se CORS non supportato)
    location /api/vixsrc/ {
        proxy_pass https://vixsrc.to/;
        proxy_set_header Host vixsrc.to;
        proxy_set_header Accept-Encoding "";
    }
}
```

## Struttura repo

```
vixflix/
├── src/app/
│   ├── core/services/
│   │   ├── tmdb.service.ts       # chiamate TMDB API
│   │   ├── vixsrc.service.ts     # chiamate vixsrc.to API
│   │   ├── profile.service.ts    # localStorage profili
│   │   └── watchlist.service.ts  # localStorage + postMessage
│   ├── models/                   # interfacce TS
│   ├── features/
│   │   ├── home/                 # hero + griglia trending
│   │   ├── search-bar/           # input con debounce 300ms
│   │   ├── type-filter/          # Tutti / Film / Serie
│   │   ├── genre-filter/         # pill generi da TMDB
│   │   ├── card-grid/            # infinite scroll + status badge
│   │   ├── profile-picker/       # schermata cambio profilo
│   │   ├── media-detail/         # info + iframe player
│   │   └── player/               # wrapper iframe + postMessage
│   └── shared/navbar/
├── Dockerfile
├── nginx.conf
├── angular.json
└── package.json
```

## Deploy

```bash
docker build -t vixflix .
docker run -p 80:80 -e TMDB_API_KEY=xxx vixflix
```

## Domande aperte

- **Serie TV**: pagina intermedia con stagioni/episodi o play diretto S01E01?
- **Lingua UI**: italiano o inglese?
- **API key TMDB**: richiesta su themoviedb.org (gratis, ~5 min)
- **vixsrc.to CORS**: da verificare al primo test (proxy nginx come fallback)
