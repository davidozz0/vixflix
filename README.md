# VixFlix

Catalogo contenuti audiovisivi con player integrato via vixsrc.to. Aggrega metadati da TMDB.

## Stack

| Layer | Tecnologia |
|---|---|
| Frontend | Angular 19+ (standalone), TypeScript, RxJS, CSS custom properties (dark) |
| Backend | Node.js, Express, Drizzle ORM, SQLite (better-sqlite3) |
| Auth | PIN a 4 cifre + session cookie HttpOnly |
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
DATABASE_URL=./sqlite.db
TMDB_API_KEY=il-tuo-access-token-tmdb-v4
TELEGRAM_BOT_TOKEN=opzionale
TELEGRAM_CHAT_ID=opzionale
```

TMDB API key gratuita: https://www.themoviedb.org/settings/api — serve un Access Token (lettura), non una API key v3.

### Notifiche Telegram (opzionale)

Per ricevere notifiche su Telegram al primo accesso di un utente:

1. Apri Telegram e cerca **@BotFather**
2. Invia `/newbot` e segui le istruzioni (scegli nome e username del bot)
3. Copia il **token** ricevuto (es. `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)
4. Cerca il bot appena creato su Telegram e avvia una chat (invia `/start`)
5. Vai su `https://api.telegram.org/bot<TOKEN>/getUpdates` (sostituisci `<TOKEN>` col token)
6. Nella risposta JSON cerca `"chat":{"id":123456789}` — quello è il tuo **chat ID**
7. Inserisci entrambi in `backend/.env`:
   ```env
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
   TELEGRAM_CHAT_ID=123456789
   ```

## Gestione utenti

La creazione utenti è riservata all'amministratore. Usa la CLI:

```bash
cd backend
npx tsx src/admin.ts add <nome> <pin>    # Crea un utente
npx tsx src/admin.ts list                 # Lista utenti
npx tsx src/admin.ts delete <nome>        # Elimina utente
```

Esempio: `npx tsx src/admin.ts add davidozzo 1234`

Ogni utente accede con **nome** e **PIN a 4 cifre**. La sessione persiste 30 giorni via cookie HttpOnly.

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

## Deploy su Ubuntu (senza Docker)

```bash
# Prerequisito: Node.js 22+
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Clona e installa
git clone https://github.com/davidozz0/vixflix.git
cd vixflix
npm install && cd backend && npm install && cd ../frontend && npm install && cd ..

# Configura
cp backend/.env.example backend/.env
nano backend/.env   # inserisci TMDB_API_KEY

# Crea il primo utente
cd backend && npx tsx src/admin.ts add <nome> <pin> && cd ..

# Avvia
chmod +x start.sh
./start.sh
```

L'app sarà accessibile su `http://<ip-server>:4200`. Assicurati che la porta 4200 sia aperta: `sudo ufw allow 4200`.

## Struttura

```
vixflix/
├── frontend/       # Angular standalone
│   ├── src/app/
│   │   ├── core/services/    # ProfileService, WatchlistService, ContentService
│   │   ├── models/           # Content, Profile, WatchlistEntry
│   │   └── features/         # Home, Player, ProfilePicker, MediaDetail
│   ├── nginx.conf
│   └── Dockerfile
├── backend/        # Node + Express + Drizzle
│   ├── src/
│   │   ├── admin.ts           # CLI gestione utenti
│   │   ├── index.ts           # API routes
│   │   └── db/schema.ts       # profiles, sessions, watchlist, login_logs
│   └── Dockerfile
├── docker-compose.yml

---

Progetto interamente sviluppato via IA con [opencode](https://opencode.ai):
- **Pianificazione**: sessione `grill-me` per definire il dominio, l'architettura e le scelte progettuali
- **Sviluppo**: modello `deepseek-v4-pro`
- **Commit e push automatici** via `gh` CLI
```
