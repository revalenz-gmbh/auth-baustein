# 🔐 Auth-Baustein - Integration in andere Projekte

## Übersicht

Der **Auth-Baustein** ist ein **wiederverwendbarer, zentraler OAuth-Authentifizierungs-Service**, der von mehreren Websites/Projekten genutzt werden kann.

**Aktuell verwendet von:**
- ✅ www.revalenz.de (Revalenz Platform)
- ✅ benefizshow.de (Benefiz Show Admin)

**Vorteile:**
- 🔒 **Ein zentraler Auth-Service** für alle Ihre Projekte
- 🌐 **Multi-Tenant-fähig** - jedes Projekt bleibt auf seiner eigenen Domain
- 🚀 **OAuth-Provider** bereits integriert: Google, GitHub, Microsoft
- 🔐 **Sicher** - Validiert Redirect-URLs gegen Whitelist
- 📦 **Einfach zu deployen** - Ein Vercel-Projekt für alle

---

## 🏗️ Architektur

```
┌─────────────────────────────────────────────────────────┐
│           Auth-Baustein (accounts.revalenz.de)          │
│                                                         │
│  • OAuth-Provider (Google, GitHub, Microsoft)          │
│  • JWT-Token-Generierung                               │
│  • User-Verwaltung (PostgreSQL)                        │
│  • Multi-Tenant Redirect-Validierung                   │
└─────────────────────────────────────────────────────────┘
           ▲                    ▲                    ▲
           │                    │                    │
           │                    │                    │
    ┌──────┴─────┐      ┌──────┴─────┐      ┌──────┴─────┐
    │  Website A │      │  Website B │      │  Website C │
    │ revalenz.de│      │benefizshow │      │ ihre-neue  │
    │            │      │    .de     │      │  -site.de  │
    └────────────┘      └────────────┘      └────────────┘
```

---

## 🚀 Integration in ein neues Projekt

### Schritt 1: Frontend-Integration

#### 1.1 OAuth-Login-Komponente erstellen

```typescript
// src/components/auth/LoginDialog.tsx
import React from 'react';

const AUTH_URL = 'https://accounts.revalenz.de'; // ← Zentraler Auth-Baustein

const handleProviderLogin = (provider: 'google' | 'github' | 'microsoft') => {
  // State-Objekt mit Return-URL
  const stateObj = {
    returnUrl: `${window.location.origin}/auth/callback`, // ← Ihre Callback-URL
    origin: window.location.origin,
    mode: 'redirect',
    privacy_consent: {
      accepted: true,
      timestamp: new Date().toISOString()
    }
  };
  
  // Base64url encoding
  const stateB64 = btoa(unescape(encodeURIComponent(JSON.stringify(stateObj))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Redirect zum Auth-Baustein
  window.location.href = `${AUTH_URL}/api/auth/oauth/${provider}?state=${stateB64}`;
};

export function LoginDialog() {
  return (
    <div>
      <button onClick={() => handleProviderLogin('google')}>
        Login mit Google
      </button>
      <button onClick={() => handleProviderLogin('github')}>
        Login mit GitHub
      </button>
      <button onClick={() => handleProviderLogin('microsoft')}>
        Login mit Microsoft
      </button>
    </div>
  );
}
```

#### 1.2 Callback-Route erstellen

```typescript
// src/pages/AuthCallback.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // Token aus URL-Parameter extrahieren
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      
      if (!token) {
        console.error('No token in callback');
        navigate('/login?error=no_token');
        return;
      }
      
      try {
        // Token speichern
        localStorage.setItem('token', token);
        
        // JWT dekodieren für User-Daten
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        const user = {
          id: parseInt(payload.sub),
          email: payload.email,
          name: payload.email,
          role: payload.roles?.[0]?.toUpperCase() || 'CLIENT',
        };
        
        // User speichern
        localStorage.setItem('user', JSON.stringify(user));
        
        // Weiterleitung zum Dashboard/Member Area
        navigate('/dashboard'); // ← Ihre Zielseite
      } catch (error) {
        console.error('Token parsing error:', error);
        navigate('/login?error=invalid_token');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div>
      <h2>Authentifizierung läuft...</h2>
      <p>Bitte warten...</p>
    </div>
  );
}
```

#### 1.3 Auth-Context erstellen

```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Token aus localStorage laden
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse user data', error);
        logout();
      }
    }
  }, []);

  const login = (newToken: string, userData: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAuthenticated: !!token && !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

#### 1.4 API-Calls mit Token

```typescript
// src/services/api.ts
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`https://your-api.com${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token abgelaufen - User ausloggen
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}
```

---

### Schritt 2: Auth-Baustein konfigurieren

#### 2.1 Ihre Domain zur Trusted-List hinzufügen

**Datei:** `bausteine/auth-baustein/src/utils/redirect.js`

```javascript
const TRUSTED_DOMAINS = [
  'https://www.revalenz.de',
  'https://revalenz.de',
  'https://benefizshow.de',
  'https://www.benefizshow.de',
  'https://ihre-neue-website.de',        // ← Fügen Sie Ihre Domain hinzu!
  'https://www.ihre-neue-website.de',    // ← Mit www
  'http://localhost:5173',               // Dev (Vite)
  'http://localhost:3000'                // Dev (React/Next)
];
```

**Dann:**
```bash
git add bausteine/auth-baustein/src/utils/redirect.js
git commit -m "feat: Add ihre-neue-website.de to trusted domains"
git push origin main
```

Vercel deployt automatisch den Auth-Baustein neu.

#### 2.2 OAuth-Provider konfigurieren (falls noch nicht geschehen)

**Google OAuth:**
1. https://console.cloud.google.com/apis/credentials
2. Erstellen Sie OAuth 2.0 Client ID
3. **Autorisierte Redirect-URIs:**
   - `https://accounts.revalenz.de/api/auth/oauth/google/callback`
4. Vercel Environment Variables setzen:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

**GitHub OAuth:**
1. https://github.com/settings/developers
2. New OAuth App
3. **Authorization callback URL:**
   - `https://accounts.revalenz.de/api/auth/oauth/github/callback`
4. Vercel Environment Variables:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`

**Microsoft OAuth:**
1. https://portal.azure.com → App registrations
2. New registration
3. **Redirect URI:**
   - `https://accounts.revalenz.de/api/auth/oauth/microsoft/callback`
4. Vercel Environment Variables:
   - `MICROSOFT_CLIENT_ID`
   - `MICROSOFT_CLIENT_SECRET`
   - `MICROSOFT_TENANT_ID`

---

### Schritt 3: Backend-Integration

#### 3.1 JWT-Token validieren

Ihr Backend muss die JWT-Tokens vom Auth-Baustein verifizieren:

```javascript
// backend/middleware/auth.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.AUTH_JWT_SECRET; // ← MUSS identisch mit Auth-Baustein sein!

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!token) {
    return res.status(401).json({ 
      error: { code: 'UNAUTHORIZED', message: 'Missing token' } 
    });
  }
  
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.user = payload; // { sub: userId, email, roles, tenants }
    next();
  } catch (err) {
    return res.status(401).json({ 
      error: { code: 'INVALID_TOKEN', message: 'Token invalid' } 
    });
  }
}

// Verwendung:
app.get('/api/protected', requireAuth, (req, res) => {
  res.json({ 
    message: 'Protected data',
    user: req.user 
  });
});
```

#### 3.2 Environment Variables setzen

**KRITISCH:** Der `AUTH_JWT_SECRET` muss in **ALLEN** Backends identisch sein!

**Vercel:**
1. Gehen Sie zu Ihrem Backend-Projekt: https://vercel.com/your-org/your-backend/settings/environment-variables
2. Fügen Sie hinzu:
   - **Name:** `AUTH_JWT_SECRET`
   - **Value:** [Kopieren Sie den Wert vom Auth-Baustein!]
   - **Environments:** Production, Preview, Development

**Wie finde ich den aktuellen Secret?**
1. https://vercel.com/martins-projects/auth-baustein/settings/environment-variables
2. `AUTH_JWT_SECRET` → "Show" → Kopieren
3. In Ihr Backend-Projekt einfügen

---

### Schritt 4: Datenbank-Zugriff (Optional)

Falls Sie **eigene User-Daten** in der Auth-Datenbank speichern möchten:

#### 4.1 Datenbank-Connection einrichten

```javascript
// backend/db.js
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.AUTH_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function query(text, params) {
  return pool.query(text, params);
}
```

#### 4.2 User-Daten abrufen

```javascript
// backend/api/users.js
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

app.get('/api/me', requireAuth, async (req, res) => {
  const userId = req.user.sub; // Aus JWT-Token
  
  const result = await query(
    'SELECT id, email, name, role, status FROM users WHERE id = $1',
    [userId]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({ user: result.rows[0] });
});
```

---

## 🔒 Sicherheit

### JWT-Token-Format

```json
{
  "sub": "123",              // User ID
  "email": "user@example.com",
  "roles": ["client"],       // oder ["admin"], ["manager"], etc.
  "tenants": ["1", "2"],     // Optional: Tenant-IDs
  "iat": 1728577234,         // Issued at (Unix timestamp)
  "exp": 1728580834          // Expires at (1 Stunde später)
}
```

### Token-Lebensdauer

- **Standard:** 1 Stunde
- **Anpassung:** In `bausteine/auth-baustein/src/routes/auth.js` → `signToken()`:
  ```javascript
  jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); // ← Hier ändern
  ```

### Refresh-Tokens (TODO)

Aktuell keine Refresh-Tokens implementiert. User müssen sich nach 1h neu einloggen.

**Geplante Implementierung:**
- Refresh-Token in httpOnly Cookie
- `/api/auth/refresh` Endpoint
- Automatische Token-Erneuerung im Frontend

---

## 🧪 Testing

### Lokales Testing

1. **Auth-Baustein lokal starten:**
   ```bash
   cd bausteine/auth-baustein
   npm install
   npm run dev  # Port 4000
   ```

2. **Ihr Frontend lokal starten:**
   ```bash
   cd your-project
   npm install
   npm run dev  # Port 5173 oder 3000
   ```

3. **In LoginDialog.tsx:**
   ```typescript
   const AUTH_URL = import.meta.env.DEV 
     ? 'http://localhost:4000'              // ← Lokal
     : 'https://accounts.revalenz.de';      // ← Produktion
   ```

4. **OAuth-Provider:**
   - Fügen Sie `http://localhost:4000/api/auth/oauth/google/callback` zu Google OAuth hinzu
   - Gleiches für GitHub und Microsoft

### Production Testing

1. Domain in Trusted-List hinzufügen (siehe Schritt 2.1)
2. OAuth-Provider sind bereits konfiguriert (nutzen `accounts.revalenz.de`)
3. Einfach deployen und testen!

---

## 🚀 Deployment-Checklist

### Für ein neues Projekt:

- [ ] **Frontend:**
  - [ ] LoginDialog-Komponente integriert
  - [ ] AuthCallback-Route erstellt
  - [ ] AuthContext implementiert
  - [ ] API-Calls nutzen Token aus localStorage

- [ ] **Auth-Baustein:**
  - [ ] Ihre Domain zu `TRUSTED_DOMAINS` hinzugefügt
  - [ ] Code gepusht → Vercel deployt automatisch

- [ ] **Backend:**
  - [ ] `AUTH_JWT_SECRET` in Vercel ENV gesetzt (identisch mit Auth-Baustein!)
  - [ ] JWT-Validierung-Middleware implementiert
  - [ ] Protected Routes nutzen `requireAuth`

- [ ] **OAuth-Provider (falls neue Domain):**
  - [ ] Google: Redirect-URI hinzugefügt
  - [ ] GitHub: Callback-URL hinzugefügt
  - [ ] Microsoft: Redirect-URI hinzugefügt

- [ ] **Testing:**
  - [ ] Login funktioniert
  - [ ] Callback landet auf korrekter Domain
  - [ ] Token wird gespeichert
  - [ ] Protected API-Calls funktionieren
  - [ ] Logout funktioniert

---

## 📝 Beispiel-Projekte

### Revalenz Platform (Referenz-Implementierung)

**Struktur:**
```
revalenz-platform/
├── frontend/
│   ├── src/
│   │   ├── components/auth/LoginDialog.tsx     ← Login-Komponente
│   │   ├── pages/AuthCallback.tsx              ← Callback-Handler
│   │   ├── contexts/AuthContext.tsx            ← Auth-State
│   │   └── services/apiService.ts              ← API mit Token
│   └── src/config/api.ts                       ← AUTH_URL Config
├── bausteine/
│   ├── auth-baustein/                          ← Zentraler Auth-Service
│   └── console-baustein/                       ← Backend mit JWT-Validierung
```

**Live:**
- Frontend: https://www.revalenz.de
- Auth: https://accounts.revalenz.de
- Backend: https://console.revalenz.de

---

## 🐛 Troubleshooting

### Problem: "401 Unauthorized" bei API-Calls

**Lösung:** `AUTH_JWT_SECRET` ist unterschiedlich!
1. Kopieren Sie Secret vom Auth-Baustein
2. Setzen Sie exakt denselben Wert in Ihrem Backend
3. Redeploy Backend
4. Neu einloggen (alte Tokens ungültig!)

### Problem: Redirect geht auf falsche Domain

**Lösung:** Domain nicht in `TRUSTED_DOMAINS`!
1. Fügen Sie Domain zu `redirect.js` hinzu
2. Push → Auto-Deploy
3. Neu testen

### Problem: "Invalid token" nach Login

**Ursachen:**
1. Token ist abgelaufen (> 1h alt)
2. `AUTH_JWT_SECRET` wurde geändert
3. Token wurde manuell modifiziert

**Lösung:** Einfach neu einloggen!

### Problem: OAuth-Provider-Fehler

**Lösung:** Callback-URL fehlt!
1. Google/GitHub/Microsoft Console öffnen
2. Redirect-URI hinzufügen: `https://accounts.revalenz.de/api/auth/oauth/{provider}/callback`
3. Speichern
4. Neu versuchen

### Problem: Callback landet auf falscher Domain trotz TRUSTED_DOMAINS

**Symptome:**
- Callback landet auf `revalenz.de` statt auf Ihrer Domain
- URL enthält seltsame Zeichen wie `https://revalenz.de,%20https//www.revalenz.de`
- Fehlende oder fehlerhafte `returnUrl` im State

**Häufige Ursachen & Lösungen:**

#### 1. **Veraltete AUTH_BASE URL**
```javascript
// ❌ FALSCH - Alte Vercel-URL
const AUTH_BASE = 'https://auth-baustein.vercel.app/api';

// ✅ RICHTIG - Production URL
const AUTH_BASE = 'https://accounts.revalenz.de/api';
```

**Wo prüfen:**
- In Ihrer HTML/JS-Datei (meist am Anfang)
- In Ihrer Config-Datei (`config.js`, `constants.ts`, etc.)

#### 2. **returnUrl nicht vollständig**
```javascript
// ❌ FALSCH - Relative URL
const returnUrl = '/auth/callback';

// ❌ FALSCH - Ohne Protokoll
const returnUrl = 'benefizshow.de/admin.html';

// ✅ RICHTIG - Vollständige HTTPS-URL
const returnUrl = `${window.location.origin}${window.location.pathname}`;
// Ergibt: "https://benefizshow.de/admin.html"
```

**Best Practice:**
```javascript
function handleProviderLogin(provider) {
  // Vollständige URL mit origin + pathname
  const returnUrl = `${window.location.origin}${window.location.pathname}`;
  
  // Client-seitige Validierung
  if (!returnUrl.startsWith('https://') && !returnUrl.startsWith('http://localhost')) {
    console.error('❌ Invalid returnUrl:', returnUrl);
    alert('Fehler: returnUrl muss mit https:// beginnen!');
    return;
  }
  
  const stateObj = {
    returnUrl: returnUrl,
    origin: window.location.origin,
    mode: 'redirect',
    privacy_consent: {
      accepted: true,
      timestamp: new Date().toISOString()
    }
  };
  
  // Base64url encoding
  const stateB64 = btoa(unescape(encodeURIComponent(JSON.stringify(stateObj))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  window.location.href = `${AUTH_BASE}/api/auth/oauth/${provider}?state=${stateB64}`;
}
```

#### 3. **Debug-Logging aktivieren**

**Im Frontend (Browser Console):**
```javascript
console.log('🔐 Login Debug:', {
  provider: provider,
  returnUrl: returnUrl,
  origin: window.location.origin,
  stateObj: stateObj,
  authBase: AUTH_BASE
});
console.log('🔐 State Base64url:', stateB64);
console.log('🔐 Redirecting to:', authUrl);
```

**Im Backend (Vercel Logs):**
```bash
# Echtzeit-Logs anzeigen
vercel logs --follow --project auth-baustein

# Oder im Dashboard:
# https://vercel.com/your-org/auth-baustein → Deployments → Latest → Logs
```

**Suchen Sie nach:**
- `📦 Raw state parameter:` - Der Base64url-String
- `📦 Decoded state:` - Der dekodierte JSON-String
- `📦 Parsed state object:` - Das State-Objekt als JSON
- `🔍 Redirect Debug - Raw State:` - State vor Normalisierung
- `🔍 Redirect Debug - After Normalization:` - State nach Normalisierung
- `✅ Validated returnUrl:` - Erfolgreiche Validierung
- `⚠️ Using fallback URL:` - Fehler! Fallback wurde verwendet

**Erfolgreiche Logs sehen so aus:**
```
📦 Raw state parameter: eyJyZXR1cm5VcmwiOiJodHRwczovL2JlbmVmaXpzaG93LmRlL2FkbWluLmh0bWwiLC...
📦 Decoded state: {"returnUrl":"https://benefizshow.de/admin.html",...}
📦 Parsed state object: {
  "returnUrl": "https://benefizshow.de/admin.html",
  "origin": "https://benefizshow.de",
  ...
}
🔍 Redirect Debug - Raw State: {
  "rawReturnUrl": "https://benefizshow.de/admin.html",
  ...
}
🔍 Redirect Debug - After Normalization: {
  "normalizedReturnUrl": "https://benefizshow.de/admin.html",
  ...
}
✅ Validated returnUrl: https://benefizshow.de/admin.html
```

#### 4. **Testing-Workflow**

**Schritt 1:** Browser Console öffnen (F12)
```
→ Console-Tab öffnen
→ Alle Logs löschen (clear)
```

**Schritt 2:** Login-Button klicken
```
→ Prüfen: Werden die Debug-Logs angezeigt?
→ Prüfen: Ist returnUrl vollständig? (mit https://)
→ Prüfen: Ist AUTH_BASE korrekt?
```

**Schritt 3:** Nach OAuth-Login
```
→ Prüfen: Auf welcher Domain sind Sie gelandet?
→ Erwartung: https://ihre-domain.de/ihre-seite?token=...
→ NICHT: https://revalenz.de/...
```

**Schritt 4:** Vercel-Logs prüfen
```
→ Vercel Dashboard öffnen
→ Auth-Baustein → Deployments → Latest → Logs
→ Suchen nach "📦" und "🔍"
→ Prüfen: Wurde returnUrl korrekt dekodiert?
→ Prüfen: Steht "✅ Validated returnUrl" in den Logs?
```

#### 5. **Komplettes Beispiel: Vanilla HTML/JS Integration**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Mein Admin-Panel - Login</title>
</head>
<body>
  <h1>Admin Login</h1>
  <button onclick="handleProviderLogin('google')">🔐 Mit Google anmelden</button>
  <button onclick="handleProviderLogin('github')">🔐 Mit GitHub anmelden</button>
  <button onclick="handleProviderLogin('microsoft')">🔐 Mit Microsoft anmelden</button>

  <script>
    // ✅ WICHTIG: Production Auth-Baustein URL verwenden!
    const AUTH_BASE = 'https://accounts.revalenz.de/api';

    function handleProviderLogin(provider) {
      // Vollständige returnUrl erstellen
      const returnUrl = `${window.location.origin}${window.location.pathname}`;
      
      // Debug-Logging
      console.log('🔐 Login Debug:', {
        provider: provider,
        returnUrl: returnUrl,
        origin: window.location.origin,
        authBase: AUTH_BASE
      });
      
      // Validierung
      if (!returnUrl.startsWith('https://') && !returnUrl.startsWith('http://localhost')) {
        console.error('❌ Invalid returnUrl:', returnUrl);
        alert('Fehler: returnUrl muss mit https:// beginnen!');
        return;
      }
      
      // State-Objekt
      const stateObj = {
        returnUrl: returnUrl,
        origin: window.location.origin,
        mode: 'redirect',
        privacy_consent: {
          accepted: true,
          timestamp: new Date().toISOString()
        }
      };
      
      // Base64url encoding
      const stateB64 = btoa(unescape(encodeURIComponent(JSON.stringify(stateObj))))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      const authUrl = `${AUTH_BASE}/auth/oauth/${provider}?state=${stateB64}`;
      console.log('🔐 State Base64url:', stateB64);
      console.log('🔐 Redirecting to:', authUrl);
      
      // Redirect
      window.location.href = authUrl;
    }

    // Token aus URL extrahieren (nach Callback)
    window.addEventListener('DOMContentLoaded', () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      
      if (token) {
        console.log('✅ Token empfangen:', token.substring(0, 20) + '...');
        
        // Token speichern
        localStorage.setItem('admin_jwt', token);
        
        // URL bereinigen (Token aus Adresszeile entfernen)
        history.replaceState(null, document.title, window.location.pathname);
        
        // UI aktualisieren (z.B. Admin-Panel anzeigen)
        alert('Login erfolgreich!');
        window.location.reload();
      }
    });
  </script>
</body>
</html>
```

#### 6. **Checkliste bei Redirect-Problemen**

- [ ] **AUTH_BASE** ist `https://accounts.revalenz.de/api` (nicht die alte Vercel-URL!)
- [ ] **returnUrl** ist vollständige HTTPS-URL (nicht relativ!)
- [ ] **Ihre Domain** ist in `TRUSTED_DOMAINS` eingetragen
- [ ] **Browser Console** zeigt Debug-Logs an
- [ ] **Vercel Logs** zeigen "✅ Validated returnUrl"
- [ ] **Browser Cache** gelöscht (Strg+F5)
- [ ] **Neuestes Deployment** ist aktiv auf Vercel

---

## 📚 Weitere Ressourcen

- **JWT-Dokumentation:** https://jwt.io
- **OAuth 2.0 Spec:** https://oauth.net/2/
- **Vercel Environment Variables:** https://vercel.com/docs/environment-variables

---

## ✨ Zusammenfassung

**Der Auth-Baustein ist:**
- ✅ **Multi-Tenant** - Ein Service für viele Projekte
- ✅ **Sicher** - Validiert Redirects, JWT-basiert
- ✅ **Einfach** - 3 Schritte zur Integration
- ✅ **Wartbar** - Ein Update → alle Projekte profitieren

**Integration in 3 Schritten:**
1. **Frontend:** Login-Button → Auth-Baustein → Callback
2. **Auth-Baustein:** Domain zu Trusted-List hinzufügen
3. **Backend:** JWT mit `AUTH_JWT_SECRET` verifizieren

**Fertig!** 🎉

