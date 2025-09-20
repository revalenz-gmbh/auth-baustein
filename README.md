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
import { AuthProvider, LoginForm } from '@revalenz/auth-baustein-frontend';

function App() {
  return (
    <AuthProvider>
      <LoginForm 
        apiUrl="https://auth.revalenz.de/api"
        onSuccess={(user) => console.log('Logged in:', user)}
      />
    </AuthProvider>
  );
}
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
GOOGLE_REDIRECT_URI=https://auth.revalenz.de/api/auth/oauth/google/callback
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