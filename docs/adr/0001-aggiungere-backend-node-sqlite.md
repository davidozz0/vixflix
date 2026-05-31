# Aggiungere un backend Node.js + SQLite

Il piano originale prevedeva un'applicazione puramente frontend (Angular + Nginx statico) con profili e watchlist su localStorage. Abbiamo deciso di introdurre un backend Node.js con database SQLite per due motivi principali: persistenza strutturata dei dati utente e supporto multi-device tramite PIN.

Questa scelta introduce un runtime Node in produzione e una singola istanza SQLite, ma evita di gestire localStorage come database ad-hoc e permette di recuperare il profilo da qualsiasi dispositivo inserendo nome + PIN.