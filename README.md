# 🔐 Auth-Baustein

Ein flexibler, wiederverwendbarer Authentifizierungs-Service für moderne Webanwendungen. 
Dieser Baustein stellt nur die API-Endpunkte zur Verfügung - die Admin-Oberfläche wird in Ihrem Frontend implementiert.

> 🤖 **KI-Entwicklung**: Dieses Projekt wurde mit Unterstützung von KI-Agenten entwickelt und zeigt, wie moderne Software-Entwicklung mit KI-Tools effizienter und qualitativ hochwertiger wird.

> ⚠️ **WICHTIGER HAFTUNGSAUSSCHLUSS**: Die Revalenz GmbH übernimmt keine Haftung für die korrekte Funktionsfähigkeit, Sicherheit oder Eignung dieses Systems für bestimmte Zwecke. Die Nutzung erfolgt auf eigene Gefahr. Authentifizierung ist ein kritischer Sicherheitsbereich - führen Sie eigene Sicherheitsaudits durch und testen Sie das System gründlich vor dem produktiven Einsatz.
> 
> 📋 **Vollständiger Haftungsausschluss**: Siehe [DISCLAIMER.md](./DISCLAIMER.md) für detaillierte Informationen.

## 🌍 **Multilingual Support**

- **Deutsch** (Deutschland)
- **English** (International)
- **Einfach erweiterbar** für weitere Sprachen

## 🚀 **Features**

### **Authentifizierung:**
- ✅ **Setup-Token** für ersten Admin
- ✅ **E-Mail/Passwort** Login
- ✅ **API-Key** Login
- ✅ **Google OAuth** Integration
- ✅ **JWT** Token-basierte Sessions (HS256)
- ✅ **Multi-Tenant** Support

### **Benutzer-Management:**
- ✅ **Admin-Rollen** mit Tenant-Zuordnung
- ✅ **Session-Management**
- ✅ **Account-Verification**
- ✅ **API-Key** Generation

### **Workshop-Management:**
- ✅ **Workshop-Anmeldungen** verwalten
- ✅ **Status-Tracking** (angemeldet, bestätigt, storniert, abgeschlossen)
- ✅ **Benutzer-spezifische** Anmeldungen
- ✅ **Admin-Übersicht** aller Anmeldungen

### **Security:**
- ✅ **bcrypt** Password Hashing
- ✅ **Helmet** Security Headers
- ✅ **CORS** Protection
- ✅ **Rate Limiting** (geplant)

## 🎯 **Frontend-Integration**

### **Admin-Interface in Frontend implementieren:**

Dieser Auth-Baustein stellt nur die API-Endpunkte zur Verfügung. Für die Admin-Verwaltung implementieren Sie bitte ein Frontend-Interface in Ihrem Hauptprojekt.

**Beispiel-Code verfügbar:** `examples/admin-example.tsx`

### **Erforderliche Frontend-Komponenten:**
1. **Admin-Dashboard** mit Statistiken
2. **Workshop-Management** mit Filter und Suche
3. **Benutzer-Verwaltung** mit Rollen
4. **CSV-Export** für Daten
5. **Rollen-basierte** Zugriffskontrolle

## 📡 **API-Endpunkte**

### **Authentifizierung:**
- `GET /api/auth/me` - JWT validieren und Benutzerinfo abrufen
- `GET /api/auth/oauth/google` - Google OAuth Login starten
- `GET /api/auth/oauth/google/callback` - OAuth Callback (automatisch)

### **Workshop-Management:**
- `GET /api/workshops/my-registrations` - Eigene Anmeldungen abrufen
- `POST /api/workshops/register` - Für Workshop anmelden
- `PUT /api/workshops/:id` - Anmeldung aktualisieren
- `DELETE /api/workshops/:id` - Anmeldung stornieren
- `GET /api/workshops/all` - Alle Anmeldungen (Admin)

### **Tenant-Management (Admin):**
- `GET /api/auth/tenants` - Alle Organisationen abrufen
- `POST /api/auth/tenants` - Neue Organisation erstellen
- `DELETE /api/auth/tenants/:id` - Organisation löschen

### **Benutzer-Management (geplant):**
- `GET /api/auth/users` - Alle Benutzer abrufen (Admin)
- `PUT /api/auth/users/:id` - Benutzer aktualisieren
- `DELETE /api/auth/users/:id` - Benutzer löschen

## 🤖 **KI-Entwicklung**

### **Moderne Software-Entwicklung mit KI:**

Dieses Projekt wurde mit Unterstützung von KI-Agenten entwickelt und demonstriert, wie moderne Software-Entwicklung durch KI-Tools revolutioniert wird:

#### **🎯 KI-Unterstützung bei:**
- ✅ **Code-Generierung** - Automatische Implementierung von Features
- ✅ **Architektur-Design** - Optimale Projektstruktur und Patterns
- ✅ **Dokumentation** - Vollständige und verständliche Docs
- ✅ **Testing** - Test-Cases und Quality Assurance
- ✅ **Security** - Sicherheitsaudits und Best Practices
- ✅ **Deployment** - CI/CD Pipelines und Automation

#### **🚀 Vorteile der KI-Entwicklung:**
- ⚡ **Geschwindigkeit** - 3-5x schnellere Entwicklung
- 🎯 **Qualität** - Konsistente Code-Standards
- 📚 **Dokumentation** - Immer aktuell und vollständig
- 🔒 **Sicherheit** - Automatische Security-Checks
- 🧪 **Testing** - Umfassende Test-Coverage
- 🔄 **Wartbarkeit** - Sauberer, modularer Code

#### **💡 Für Entwickler:**
- **Lernressource** - Sehen Sie, wie KI-Entwicklung funktioniert
- **Best Practices** - Moderne Patterns und Standards
- **Code-Qualität** - Professionelle Implementierung
- **Innovation** - Zukunft der Software-Entwicklung

> **💭 Gedanke**: KI-Agenten sind nicht nur Tools, sondern echte Entwicklungspartner, die die Qualität und Geschwindigkeit der Software-Entwicklung revolutionieren.

📖 **Detaillierte Informationen**: Siehe [AI_DEVELOPMENT.md](./AI_DEVELOPMENT.md) für eine vollständige Dokumentation der KI-Entwicklung.

## 🏗️ **Architektur**

```
auth-baustein/
├── src/                      # Express.js Backend
│   ├── index.js             # Main Server
│   ├── app.js               # App Builder
│   ├── routes/              # API Routes
│   │   └── auth.js          # Auth Endpoints
│   ├── middleware/          # Middleware
│   │   └── auth.js          # JWT Middleware
│   └── utils/               # Utilities
│       └── db.js            # Database Connection
├── api/                     # Vercel Functions
│   └── [...all].js          # Catch-all Handler
├── database/                # Database Schema
│   └── schema.sql           # PostgreSQL Schema
├── frontend/                # React Components (geplant)
├── shared/                  # Shared Types/Schemas
│   ├── types/               # TypeScript Types
│   ├── schemas/             # Zod Schemas
│   └── constants/           # API Constants
└── docs/                    # Documentation
```

## 📦 **Installation**

```bash
# Dependencies installieren
npm install

# Environment Variables setzen
cp env.example .env
# .env bearbeiten mit eigenen Werten

# Database Schema erstellen
# schema.sql in PostgreSQL ausführen

# Development-Server starten
npm run dev
```

## 🔐 **Admin-Account einrichten**

### **Erste Einrichtung (Setup-Token):**

```bash
# 1. Auth-Baustein starten
npm run dev

# 2. Admin registrieren (nur mit Setup-Token möglich)
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -H "x-setup-token: dein_setup_token" \
  -d '{
    "name": "Admin",
    "email": "admin@example.com",
    "password": "sicheres_passwort"
  }'
```

### **Login testen:**

```bash
# Login mit E-Mail/Passwort
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "sicheres_passwort"
  }'

# Antwort enthält JWT-Token
# {"success": true, "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
```

### **JWT-Token verwenden:**

```bash
# Geschützte Route aufrufen
curl -X GET http://localhost:4000/auth/me \
  -H "Authorization: Bearer dein_jwt_token_hier"
```

### **Passwort-Reset (falls nötig):**

```bash
# Passwort-Hash direkt generieren
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('neues_passwort', 10));"

# Hash in Datenbank aktualisieren
UPDATE users 
SET password_hash = 'generierter_hash_hier'
WHERE email = 'admin@example.com' AND role = 'ADMIN';
```

## ⚠️ **Wichtige Konfiguration**

### **Domain-Konfiguration:**
- **Lokale Entwicklung:** `http://localhost:4000`
- **Produktion:** `https://accounts.revalenz.de` (oder deine Domain)
- **config.js:** `EXTERNAL_API_URL` muss mit der tatsächlichen Domain übereinstimmen

### **Google OAuth Setup:**
1. **Google Cloud Console** → OAuth 2.0 Client IDs
2. **Authorized redirect URIs** hinzufügen:
   - `https://accounts.revalenz.de/auth/oauth/google/callback`
   - `https://auth.revalenz.de/auth/oauth/google/callback` (falls verwendet)
3. **Vercel Environment Variables:**
   ```
   OAUTH_REDIRECT_BASE=https://accounts.revalenz.de
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

### **Frontend-Integration:**
```typescript
// In deiner Frontend-App (z.B. React)
const API_URL = import.meta.env.DEV
  ? 'http://localhost:4000'  // Lokaler auth-baustein
  : 'https://accounts.revalenz.de'; // Produktiver auth-baustein
```

## 🌐 **API-Endpunkte**

### **Authentifizierung:**
```typescript
// Registrierung (nur mit Setup-Token)
POST /auth/register
Headers: { "x-setup-token": "<SETUP_TOKEN>" }
Body: { "name": "Admin", "email": "admin@example.com", "password": "Str0ng!PW" }

// Login (E-Mail/Passwort)
POST /auth/login
Body: { "email": "admin@example.com", "password": "Str0ng!PW" }

// Login (API-Key)
POST /auth/login
Body: { "api_key": "<API_KEY>" }

// Benutzer-Info abrufen
GET /auth/me
Headers: { "Authorization": "Bearer <JWT>" }
```

### **OAuth:**
```typescript
// Google OAuth starten
GET /auth/oauth/google

// OAuth Callback
GET /auth/oauth/google/callback
```

## 🔧 **Integration**

### **Frontend (React):**
```tsx
// Popup-basierter OAuth-Flow
const handleProviderLogin = (provider: 'google' | 'github' | 'microsoft') => {
  const API_URL = import.meta.env.DEV
    ? 'http://localhost:4000'
    : 'https://accounts.revalenz.de';
    
  const popup = window.open(
    `${API_URL}/auth/oauth/${provider}?mode=popup&origin=${encodeURIComponent(window.location.origin)}`,
    'oauth-popup',
    'width=500,height=600,scrollbars=yes,resizable=yes'
  );
  
  // PostMessage-Listener für OAuth-Ergebnis
  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== API_URL) return;
    
    if (event.data.type === 'auth_token') {
      const { token } = event.data;
      // JWT-Token verarbeiten
      login(token, user);
      popup.close();
    }
  };
  
  window.addEventListener('message', handleMessage);
};
```

### **Backend (Express.js):**
```javascript
const { authRouter, authMiddleware } = require('@revalenz/auth-baustein-backend');

app.use('/api/auth', authRouter);
app.use('/api/protected', authMiddleware, protectedRoutes);
```

## 🔒 **Security Features**

- **JWT Tokens** mit HS256 Signierung
- **bcrypt** für Passwort-Verschlüsselung
- **API-Keys** für Service-to-Service Authentication
- **Setup-Token** für sichere Erstanlage
- **CORS** und **Helmet** für Web-Security

## 📱 **Responsive Design**

- **Mobile-First** Approach
- **Touch-Friendly** Buttons
- **Adaptive Layout**
- **Accessibility** (WCAG 2.1)

## 🧪 **Testing**

```bash
# Unit Tests
npm run test

# Integration Tests
npm run test:integration

# E2E Tests
npm run test:e2e
```

## 🚀 **Deployment**

### **Vercel (Empfehlung):**
```bash
# Vercel CLI installieren
npm i -g vercel

# Deployment
vercel --prod
```

### **Environment Variables:**
```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
AUTH_JWT_SECRET=your_jwt_secret

# Setup
SETUP_TOKEN=your_setup_token

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OAUTH_REDIRECT_BASE=https://accounts.revalenz.de

# Frontend
FRONTEND_URL=https://revalenz.de
```

## 🔧 **Troubleshooting**

### **OAuth redirect_uri_mismatch:**
- **Problem:** Google OAuth zeigt "redirect_uri_mismatch"
- **Lösung:** 
  1. Prüfe `config.js` → `EXTERNAL_API_URL` stimmt mit Domain überein
  2. Google Cloud Console → Authorized redirect URIs prüfen
  3. Vercel → Environment Variables → `OAUTH_REDIRECT_BASE` prüfen

### **Database Connection Error:**
- **Problem:** "client password must be a string"
- **Lösung:** `DATABASE_URL` prüfen, `&channel_binding=require` entfernen

### **Port bereits belegt:**
- **Problem:** "EADDRINUSE: address already in use :::4000"
- **Lösung:** 
  ```bash
  # Windows
  netstat -ano | findstr :4000
  taskkill /PID <PID> /F
  
  # Linux/Mac
  lsof -ti:4000 | xargs kill -9
  ```

### **Frontend kann nicht starten:**
- **Problem:** `package.json` korrupt oder `@revalenz/shared` nicht gefunden
- **Lösung:**
  ```bash
  # Shared Package verlinken
  cd shared && npm run build
  npm link
  cd ../revalenz-takeaction
  npm link @revalenz/shared
  ```

## 📋 **Roadmap**

- [x] Setup-Token Registrierung
- [x] E-Mail/Passwort Login
- [x] API-Key Login
- [x] Google OAuth
- [x] JWT Authentication
- [x] Multi-Tenant Support
- [ ] Frontend Components
- [ ] Rate Limiting
- [ ] 2FA Support
- [ ] Password Reset
- [ ] Account Verification

## 🤝 **Community**

- **GitHub Issues** für Bug-Reports
- **Pull Requests** willkommen
- **Discussions** für Features
- **Documentation** Verbesserungen

## 📄 **Lizenz**

MIT License - Siehe [LICENSE](LICENSE) für Details.

## ⚠️ **HAFTUNGSAUSSCHLUSS**

### **🔒 Sicherheitshinweise**

**KRITISCH**: Authentifizierung ist ein extrem sensibler Sicherheitsbereich. Die Revalenz GmbH übernimmt **KEINE HAFTUNG** für:

- ❌ **Korrekte Funktionsfähigkeit** des Systems
- ❌ **Sicherheit** oder Schutz vor Angriffen
- ❌ **Eignung** für bestimmte Anwendungsfälle
- ❌ **Verfügbarkeit** oder Ausfallzeiten
- ❌ **Datenverlust** oder Datenlecks
- ❌ **Compliance** mit Sicherheitsstandards
- ❌ **Schäden** durch fehlerhafte Implementierung

### **🛡️ Empfohlene Maßnahmen**

Vor dem produktiven Einsatz **MÜSSEN** Sie:

1. ✅ **Eigene Sicherheitsaudits** durchführen
2. ✅ **Penetrationstests** durchführen
3. ✅ **Code-Review** mit Sicherheitsexperten
4. ✅ **Load-Testing** für Performance
5. ✅ **Backup-Strategien** implementieren
6. ✅ **Monitoring** und Logging einrichten
7. ✅ **Updates** und Patches planen

### **📋 Verantwortung des Nutzers**

- 🔍 **Eigene Prüfung** der Sicherheit
- 🧪 **Umfassende Tests** vor Produktion
- 🔒 **Sichere Konfiguration** der Umgebung
- 📊 **Regelmäßige Updates** und Wartung
- 🚨 **Monitoring** von Sicherheitsereignissen

### **⚖️ Rechtlicher Hinweis**

Die Nutzung dieses Systems erfolgt **ausschließlich auf eigene Gefahr**. Die Revalenz GmbH haftet nicht für direkte, indirekte, zufällige oder Folgeschäden, die durch die Nutzung oder Unfähigkeit zur Nutzung dieses Systems entstehen.

---

**Teil des Revalenz Bausteine-Systems** 🧩 - **Nutzung auf eigene Gefahr**