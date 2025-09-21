# 🔐 Auth-Baustein

Ein modulares, mehrsprachiges Authentifizierungs-System für moderne Webanwendungen.

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

### **Security:**
- ✅ **bcrypt** Password Hashing
- ✅ **Helmet** Security Headers
- ✅ **CORS** Protection
- ✅ **Rate Limiting** (geplant)

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

---

**Teil des Revalenz Bausteine-Systems** 🧩