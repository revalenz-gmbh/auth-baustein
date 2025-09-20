# 🔐 Auth-Baustein

Ein modulares, mehrsprachiges Authentifizierungs-System für moderne Webanwendungen.

## 🌍 **Multilingual Support**

- **Deutsch** (Deutschland)
- **English** (International)
- **Einfach erweiterbar** für weitere Sprachen

## 🚀 **Features**

### **Authentifizierung:**
- ✅ **OAuth2** Integration (Google, GitHub, Microsoft)
- ✅ **JWT** Token-basierte Sessions
- ✅ **Multi-Provider** Support
- ✅ **Secure** Password Hashing

### **Benutzer-Management:**
- ✅ **Profil-Verwaltung**
- ✅ **Rollen-basierte** Berechtigungen
- ✅ **Session-Management**
- ✅ **Account-Verification**

### **Security:**
- ✅ **CSRF Protection**
- ✅ **Rate Limiting**
- ✅ **Input Validation**
- ✅ **Secure Headers**

## 🏗️ **Architektur**

```
auth-baustein/
├── frontend/              # React-Komponenten
│   ├── components/        # UI-Komponenten
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── ProfileCard.tsx
│   │   └── LanguageSwitcher.tsx
│   ├── hooks/            # Custom Hooks
│   │   ├── useAuth.ts
│   │   └── useLanguage.ts
│   └── locales/          # Übersetzungen
│       ├── de.json
│       └── en.json
├── backend/              # Express.js API
│   ├── routes/           # API-Routen
│   ├── middleware/       # Auth-Middleware
│   ├── services/         # Business Logic
│   └── models/           # Datenmodelle
└── docs/                 # Dokumentation
    ├── integration.md
    └── api.md
```

## 📦 **Installation**

```bash
# Frontend-Komponenten
npm install @revalenz/auth-baustein-frontend

# Backend-API
npm install @revalenz/auth-baustein-backend
```

## 🔧 **Integration**

### **Frontend (React):**
```tsx
import { AuthProvider, LoginForm } from '@revalenz/auth-baustein-frontend';

function App() {
  return (
    <AuthProvider>
      <LoginForm 
        providers={['google', 'github']}
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

## 🌐 **API-Endpunkte**

```typescript
// Authentifizierung
POST   /api/auth/login          // Login
POST   /api/auth/register       // Registrierung
POST   /api/auth/logout         // Logout
GET    /api/auth/me             // Benutzer-Info

// OAuth
GET    /api/auth/google         // Google OAuth
GET    /api/auth/github         // GitHub OAuth
GET    /api/auth/microsoft      // Microsoft OAuth

// Profil
GET    /api/auth/profile        // Profil abrufen
PUT    /api/auth/profile        // Profil aktualisieren
POST   /api/auth/change-password // Passwort ändern
```

## 🎨 **UI-Komponenten**

### **LoginForm:**
- **Responsive Design**
- **Provider-Buttons** (Google, GitHub, etc.)
- **Form-Validation**
- **Loading States**
- **Error Handling**

### **LanguageSwitcher:**
- **Dropdown-Menü**
- **Flag-Icons**
- **Persistent** Language Selection
- **RTL Support** (geplant)

## 🔒 **Security Features**

- **JWT Tokens** mit Refresh-Mechanismus
- **Secure Cookies** für Session-Management
- **Rate Limiting** gegen Brute-Force
- **Input Sanitization**
- **CORS Configuration**

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
# Frontend
vercel --prod

# Backend
vercel --prod --cwd backend/
```

### **Docker:**
```bash
docker build -t auth-baustein .
docker run -p 3000:3000 auth-baustein
```

## 📋 **Roadmap**

- [x] OAuth2 Integration
- [x] JWT Authentication
- [x] Multilingual Support
- [x] Responsive Design
- [ ] 2FA Support
- [ ] Social Login
- [ ] Password Reset
- [ ] Account Verification
- [ ] Admin Dashboard

## 🤝 **Community**

- **GitHub Issues** für Bug-Reports
- **Pull Requests** willkommen
- **Discussions** für Features
- **Documentation** Verbesserungen

## 📄 **Lizenz**

MIT License - Siehe [LICENSE](LICENSE) für Details.

---

**Teil des Revalenz Bausteine-Systems** 🧩
