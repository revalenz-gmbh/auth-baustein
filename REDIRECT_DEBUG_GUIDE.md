# 🔍 Auth-Baustein Redirect Debug Guide

## 🚨 Problem-Symptome

### Was Sie gemeldet haben:
```
Callback landet auf revalenz.de statt auf benefizshow.de
URL enthält: https://revalenz.de,%20https//www.revalenz.de
- Zwei URLs komma-getrennt
- Fehlendes ":" in der zweiten URL (https// statt https://)
```

---

## 🔎 Ursachenanalyse

### 1. **Mögliche Fehlerquellen:**

#### A) **State-Parameter wird falsch kodiert** (Client-Seite)
```javascript
// ❌ FALSCH: Mehrere returnUrls oder falsche Verkettung
const stateObj = {
  returnUrl: "https://revalenz.de, https//www.revalenz.de" // ← Bug hier!
};
```

#### B) **State-Parameter wird falsch dekodiert** (Server-Seite)
```javascript
// Problematisch in Node.js < 18
Buffer.from(stateRaw, 'base64url') // ← Nicht zuverlässig!
```

#### C) **returnUrl fehlt in TRUSTED_DOMAINS** (Validierung)
```javascript
// Wenn benefizshow.de nicht in der Liste ist:
const TRUSTED_DOMAINS = [
  'https://www.revalenz.de',
  'https://revalenz.de'
  // ❌ benefizshow.de fehlt!
];
```

---

## ✅ Implementierte Lösungen

### 1. **Robuste URL-Normalisierung**

```javascript
// src/utils/redirect.js

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  // Whitespace entfernen
  url = url.trim();
  
  // Fehlendes Kolon nach Protokoll korrigieren
  url = url.replace(/^https\/\//, 'https://');
  url = url.replace(/^http\/\//, 'http://');
  
  // Komma-getrennte Teile behandeln (Parsing-Fehler-Indikator)
  if (url.includes(',')) {
    const parts = url.split(',');
    url = parts[0].trim(); // Ersten Teil nehmen
  }
  
  // URL-Format validieren
  try {
    new URL(url); // Wirft Fehler bei ungültiger URL
    return url;
  } catch {
    return null;
  }
}
```

### 2. **Erweiterte Debug-Logs**

```javascript
// In allen OAuth-Callbacks (Google, GitHub, Microsoft)

console.log('📦 Raw state parameter:', stateRaw);
console.log('📦 Decoded state:', decoded);
console.log('📦 Parsed state object:', JSON.stringify(state, null, 2));

// In redirect.js
console.log('🔍 Redirect Debug - Raw State:', {
  stateType: typeof state,
  stateKeys: state ? Object.keys(state) : [],
  rawReturnUrl: returnUrl,
  stateJSON: JSON.stringify(state, null, 2)
});

console.log('🔍 Redirect Debug - After Normalization:', {
  normalizedReturnUrl: returnUrl,
  trustedDomains: TRUSTED_DOMAINS
});
```

### 3. **TRUSTED_DOMAINS erweitert**

```javascript
const TRUSTED_DOMAINS = [
  'https://www.revalenz.de',
  'https://revalenz.de',
  'https://benefizshow.de',      // ✅ Hinzugefügt
  'https://www.benefizshow.de',  // ✅ Hinzugefügt
  'http://localhost:5173',
  'http://localhost:3000'
];
```

### 4. **Manuelle Base64url-Dekodierung**

```javascript
// Statt Buffer.from(stateRaw, 'base64url')
const base64 = stateRaw.replace(/-/g, '+').replace(/_/g, '/');
const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
const decoded = Buffer.from(padded, 'base64').toString('utf8');
```

---

## 🧪 Testing-Checkliste

### Schritt 1: Debug-Logs prüfen

Nach dem Deployment auf Vercel, testen Sie den Login und prüfen Sie die Logs:

```bash
# Vercel-Logs in Echtzeit anzeigen
vercel logs --follow --project auth-baustein
```

### Schritt 2: Erwartete Log-Ausgabe

```
📦 Raw state parameter: eyJyZXR1cm5VcmwiOiJodHRwczovL2JlbmVmaXpzaG93LmRlL2FkbWluL2NhbGxiYWNrLmh0bWwiLC...
📦 Decoded state: {"returnUrl":"https://benefizshow.de/admin/callback.html","origin":"https://benefizshow.de",...}
📦 Parsed state object: {
  "returnUrl": "https://benefizshow.de/admin/callback.html",
  "origin": "https://benefizshow.de",
  "mode": "redirect",
  "privacy_consent": {
    "accepted": true,
    "timestamp": "2025-10-11T..."
  }
}
🔍 Redirect Debug - Raw State: {
  "stateType": "object",
  "stateKeys": ["returnUrl", "origin", "mode", "privacy_consent"],
  "rawReturnUrl": "https://benefizshow.de/admin/callback.html",
  "stateJSON": "..."
}
🔍 Redirect Debug - After Normalization: {
  "normalizedReturnUrl": "https://benefizshow.de/admin/callback.html",
  "trustedDomains": ["https://www.revalenz.de", ...]
}
✅ Validated returnUrl: https://benefizshow.de/admin/callback.html
```

### Schritt 3: Fehlerfälle prüfen

#### Fall 1: returnUrl fehlt
```
⚠️ Using fallback URL: https://www.revalenz.de/auth/callback (original returnUrl was: undefined)
```

#### Fall 2: returnUrl nicht in TRUSTED_DOMAINS
```
⚠️ Using fallback URL: https://www.revalenz.de/auth/callback (original returnUrl was: https://untrusted-domain.com)
```

#### Fall 3: returnUrl hat ungültiges Format
```
⚠️ Using fallback URL: https://www.revalenz.de/auth/callback (original returnUrl was: htp:/invalid)
```

---

## 📝 Beispiel-Integration für Benefizshow

### Datei 1: `benefizshow.de/admin/login.html`

```html
<script>
const AUTH_URL = 'https://accounts.revalenz.de';
const RETURN_URL = 'https://benefizshow.de/admin/callback.html'; // ← Vollständige URL!

function loginWithGoogle() {
  const stateObj = {
    returnUrl: RETURN_URL,  // ← Wichtig: Vollständige HTTPS-URL
    origin: window.location.origin,
    mode: 'redirect',
    privacy_consent: {
      accepted: true,
      timestamp: new Date().toISOString()
    }
  };
  
  // Base64url-Kodierung
  const stateB64 = btoa(unescape(encodeURIComponent(JSON.stringify(stateObj))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  window.location.href = `${AUTH_URL}/api/auth/oauth/google?state=${stateB64}`;
}
</script>
```

### Datei 2: `benefizshow.de/admin/callback.html`

```html
<script>
function handleCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (!token) {
    console.error('Kein Token gefunden!');
    return;
  }
  
  // Token speichern
  localStorage.setItem('auth_token', token);
  
  // Weiterleiten zur Admin-Console
  window.location.href = '/admin/dashboard.html';
}

handleCallback();
</script>
```

---

## 🔧 Häufige Fehler und Lösungen

### Problem 1: "returnUrl ist undefined"

**Ursache:** State-Parameter wird nicht korrekt übergeben

**Lösung:**
```javascript
// ❌ FALSCH
window.location.href = `${AUTH_URL}/api/auth/oauth/google`;

// ✅ RICHTIG
const stateB64 = /* ... */;
window.location.href = `${AUTH_URL}/api/auth/oauth/google?state=${stateB64}`;
```

### Problem 2: "returnUrl ist nicht in TRUSTED_DOMAINS"

**Ursache:** Neue Domain wurde nicht zur Liste hinzugefügt

**Lösung:** In `src/utils/redirect.js` erweitern:
```javascript
const TRUSTED_DOMAINS = [
  // ... bestehende Domains
  'https://ihre-neue-domain.de',
  'https://www.ihre-neue-domain.de'
];
```

### Problem 3: "returnUrl hat ungültiges Format"

**Ursache:** Fehlendes Protokoll oder Tippfehler

**Lösung:**
```javascript
// ❌ FALSCH
returnUrl: "benefizshow.de/admin/callback.html"    // Kein https://
returnUrl: "https//benefizshow.de/admin/callback.html"  // Fehlendes :

// ✅ RICHTIG
returnUrl: "https://benefizshow.de/admin/callback.html"
```

---

## 📊 Status-Matrix

| Domain | In TRUSTED_DOMAINS? | OAuth funktioniert? | Notizen |
|--------|---------------------|---------------------|---------|
| www.revalenz.de | ✅ | ✅ | Produktiv |
| revalenz.de | ✅ | ✅ | Produktiv |
| benefizshow.de | ✅ | 🧪 **Zu testen** | Neu hinzugefügt |
| www.benefizshow.de | ✅ | 🧪 **Zu testen** | Neu hinzugefügt |
| localhost:5173 | ✅ | ✅ | Dev |

---

## 🚀 Deployment-Anleitung

### 1. **Änderungen sind bereits committed:**
```bash
git log --oneline -1
# b75ceb6 fix(auth): Robustere OAuth-Redirect-Logik mit Debug-Logging
```

### 2. **Vercel Deployment prüfen:**
```bash
# Status prüfen
vercel projects ls | grep auth-baustein

# Automatisches Deployment via GitHub-Integration
# → Vercel erkennt den Push automatisch und deployed
```

### 3. **Deployment-Status überwachen:**
```
https://vercel.com/revalenz-gmbh/auth-baustein/deployments
```

### 4. **Nach Deployment: Testen**
```bash
# Logs in Echtzeit
vercel logs --follow --project auth-baustein

# Oder im Vercel Dashboard:
# → Projekt → Deployments → Latest → Logs
```

---

## 📞 Support

### Bei Problemen:

1. **Logs prüfen:**
   - Vercel Dashboard → Auth-Baustein → Logs
   - Browser Console (F12) während des Login-Vorgangs

2. **Debug-Informationen sammeln:**
   ```
   - Raw state parameter (aus Vercel-Logs)
   - Decoded state (aus Vercel-Logs)
   - Browser-URL nach Callback
   - Fehlermeldungen (falls vorhanden)
   ```

3. **Beispieldateien verwenden:**
   - `examples/benefizshow-admin-example.html`
   - `examples/benefizshow-callback-example.html`

---

## ✅ Zusammenfassung

### Was wurde behoben:

1. ✅ **Robuste URL-Normalisierung** gegen Parsing-Fehler
2. ✅ **Erweiterte Debug-Logs** für bessere Fehleranalyse
3. ✅ **benefizshow.de in TRUSTED_DOMAINS** hinzugefügt
4. ✅ **Manuelle Base64url-Dekodierung** für Kompatibilität
5. ✅ **Beispiel-HTML-Dateien** für Benefizshow erstellt

### Nächste Schritte:

1. 🧪 **Benefizshow-Login testen** mit der neuen Admin-HTML
2. 📊 **Logs analysieren** und Debug-Ausgaben prüfen
3. ✅ **Bei Erfolg:** Debug-Logs entfernen (optional)
4. 📝 **Bei Fehler:** Logs teilen für weitere Analyse

---

**Deployment:** ✅ Erfolgreich auf Vercel deployed  
**Status:** 🧪 Bereit für Testing  
**Version:** v2.1.0 (11.10.2025)

