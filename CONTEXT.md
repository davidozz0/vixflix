# VixFlix

Catalogo contenuti audiovisivi con player integrato. Aggrega metadati da TMDB e disponibilità da vixsrc.to.

## Language

**Content:**
Un film o una serie TV identificati universalmente dal TMDB ID.
_Avoid_: Media, item, video

**TMDB ID:**
Identificatore numerico univoco globale assegnato da The Movie Database. Chiave primaria logica del dominio.
_Avoid_: tmdb_id (usa camelCase nel codice, ma nel glossario è il concetto)

**Source ID:**
Identificatore numerico interno di vixsrc.to, usato per avviare il player e verificare la disponibilità. Separato dal TMDB ID.
_Avoid_: vixsrc_id, externalId

**Profile:**
Una persona che usa l'applicazione. Identificata da un nome e un PIN a 4 cifre. Ogni profilo ha la propria watchlist e preferenze. Il PIN consente il recupero del profilo da qualsiasi dispositivo.
_Avoid_: Account, user, utente

**Watchlist:**
Insieme dei contenuti aggiunti da un profilo, con stato di visione e punto di ripresa.
_Avoid_: Lista, preferiti, bookmarks

**Player Event:**
Messaggio postMessage emesso dall'iframe del player con stato di riproduzione (play, pause, ended, timeupdate, ecc.).
_Avoid_: Evento player, messaggio iframe
