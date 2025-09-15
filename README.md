# Auth-Baustein

Leichtgewichtiger Auth-Service (Express + PostgreSQL + JWT), als eigener Baustein gedacht.

## Features
- Registrierung des ersten Admins via Setup-Token
- Login per E-Mail/Passwort oder API-Key
- JWT-Ausgabe (HS256) mit Claims `sub`, `email`, `roles`

## Schnellstart
1) `.env` aus `env.example` kopieren und Werte setzen
2) Schema `database/schema.sql` in der neuen Neon-DB ausführen
3) Abhängigkeiten installieren und starten
   ```bash
   npm install
   npm run dev
   ```

## Endpunkte
- `POST /auth/register` (nur mit Header `x-setup-token: <SETUP_TOKEN>`)  
  Body: `{ "name":"Admin", "email":"admin@example.com", "password":"Str0ng!PW" }`
- `POST /auth/login`  
  Variante A (Passwort): `{ "email":"admin@example.com", "password":"Str0ng!PW" }`  
  Variante B (API-Key): `{ "api_key":"<API_KEY>" }`
- `GET /auth/me` (Header `Authorization: Bearer <JWT>`) → gibt Token-Claims zurück
- `GET /auth/oauth/google` – Startet Google Login
- `GET /auth/oauth/google/callback` – OAuth Callback

Hinweis: Auf Vercel werden alle Anfragen unter `/api/*` durch `api/[...all].js` entgegengenommen, das `/api` vor der Übergabe an Express entfernt.

## Integration in Ticketservice
- JWT prüfen mit `AUTH_JWT_SECRET` (HS256)
- Übergangsweise kann X-API-Key parallel bestehen bleiben

## Ordnerstruktur
```
auth-baustein/
  database/schema.sql
  src/
    index.js
    routes/auth.js
    middleware/auth.js
    utils/db.js
  package.json
  env.example
  README.md
```

## Hinweise
- Für Produktion HTTPS nutzen
- `AUTH_JWT_SECRET` regelmäßig wechseln
- `SETUP_TOKEN` nur für die Erstanlage verwenden
