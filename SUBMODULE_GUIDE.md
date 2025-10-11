# 📦 Auth-Baustein - Git Submodule Guide

## Übersicht

Der **Auth-Baustein** wird als **Git Submodule** in mehreren Projekten verwendet, um **Code-Duplikation zu vermeiden** und **zentrale Updates** zu ermöglichen.

---

## 🏗️ **Architektur**

```
┌─────────────────────────────────────────────────────────┐
│   GitHub: revalenz-gmbh/auth-baustein                   │
│   (Single Source of Truth)                              │
└─────────────────────────────────────────────────────────┘
           ↓                              ↓
    git submodule                   git submodule
           ↓                              ↓
┌──────────────────────┐      ┌──────────────────────┐
│  Revalenz Platform   │      │  Benefizshow Ticket  │
│                      │      │  System              │
│  bausteine/          │      │  bausteine/          │
│  └─ auth-baustein/   │      │  └─ auth-baustein/   │
│     (submodule)      │      │     (submodule)      │
└──────────────────────┘      └──────────────────────┘
```

---

## 🚀 **Setup: Neues Projekt mit Auth-Baustein**

### **1. Submodule hinzufügen**

```bash
# In Ihr Projekt-Root-Verzeichnis
cd /pfad/zu/ihrem/projekt

# Submodule hinzufügen
git submodule add https://github.com/revalenz-gmbh/auth-baustein.git bausteine/auth-baustein

# Initialisieren und pullen
git submodule update --init --recursive

# Committen
git add .gitmodules bausteine/auth-baustein
git commit -m "feat: Add auth-baustein as submodule"
git push origin main
```

### **2. Dependencies installieren**

```bash
# In den Auth-Baustein wechseln
cd bausteine/auth-baustein

# Dependencies installieren
npm install

# Zurück zum Root
cd ../..
```

### **3. Environment Variables setzen**

```bash
# In Ihrem Projekt: .env
DATABASE_URL=postgresql://...
AUTH_JWT_SECRET=your_jwt_secret_here

# WICHTIG: AUTH_JWT_SECRET muss in ALLEN Projekten identisch sein!
```

---

## 🔄 **Updates: Auth-Baustein aktualisieren**

### **Für Entwickler (lokal)**

```bash
# In Ihr Projekt-Root
cd /pfad/zu/ihrem/projekt

# Submodule auf neuesten Stand bringen
cd bausteine/auth-baustein
git checkout main
git pull origin main

# Zurück zum Root
cd ../..

# Änderung committen
git add bausteine/auth-baustein
git commit -m "chore: Update auth-baustein to latest version"
git push origin main
```

### **Für neue Entwickler (nach Clone)**

```bash
# Projekt clonen
git clone https://github.com/ihre-org/ihr-projekt.git
cd ihr-projekt

# Submodule initialisieren und pullen
git submodule update --init --recursive

# Auth-Baustein Dependencies
cd bausteine/auth-baustein
npm install
cd ../..
```

### **Automatisch mit Clone**

```bash
# Clone mit automatischer Submodule-Initialisierung
git clone --recurse-submodules https://github.com/ihre-org/ihr-projekt.git
```

---

## 🛠️ **Änderungen am Auth-Baustein vornehmen**

### **Option A: Änderungen im Submodule (empfohlen)**

```bash
# In den Auth-Baustein wechseln
cd bausteine/auth-baustein

# Eigenen Branch erstellen
git checkout -b feature/lizenz-system-verbesserung

# Änderungen vornehmen
# ... Code bearbeiten ...

# Committen und pushen
git add .
git commit -m "feat: Lizenz-Middleware hinzugefügt"
git push origin feature/lizenz-system-verbesserung

# Pull Request auf GitHub erstellen
# → https://github.com/revalenz-gmbh/auth-baustein/compare
```

### **Option B: Lokale Änderungen testen**

```bash
# In den Auth-Baustein wechseln
cd bausteine/auth-baustein

# Branch erstellen (lokal)
git checkout -b test/lokale-aenderung

# Änderungen vornehmen
# ... Code bearbeiten ...

# Testen in Ihrem Projekt
cd ../..
npm run dev

# Wenn erfolgreich: In main Branch mergen
cd bausteine/auth-baustein
git checkout main
git merge test/lokale-aenderung
git push origin main

# Zurück zum Root und Submodule-Pointer aktualisieren
cd ../..
git add bausteine/auth-baustein
git commit -m "chore: Update auth-baustein with local changes"
git push origin main
```

---

## 🔄 **Workflow: Änderungen an andere Projekte weitergeben**

### **Szenario: Neue Features im Auth-Baustein**

1. **In Auth-Baustein entwickeln:**
   ```bash
   cd bausteine/auth-baustein
   git checkout -b feature/new-feature
   # ... Code ändern ...
   git commit -m "feat: New feature"
   git push origin feature/new-feature
   ```

2. **Pull Request erstellen und mergen:**
   - https://github.com/revalenz-gmbh/auth-baustein/pulls
   - Nach Review mergen in `main`

3. **In Revalenz Platform aktualisieren:**
   ```bash
   cd revalenz-platform/bausteine/auth-baustein
   git checkout main
   git pull origin main
   cd ../..
   git add bausteine/auth-baustein
   git commit -m "chore: Update auth-baustein (new feature)"
   git push origin main
   ```

4. **In Benefizshow Platform aktualisieren:**
   ```bash
   cd benefizshow-platform/bausteine/auth-baustein
   git checkout main
   git pull origin main
   cd ../..
   git add bausteine/auth-baustein
   git commit -m "chore: Update auth-baustein (new feature)"
   git push origin main
   ```

5. **Vercel Re-Deploy (automatisch):**
   - Beide Projekte deployen automatisch via GitHub-Integration

---

## ⚠️ **Wichtige Hinweise**

### **DO's ✅**

1. **Immer `main` Branch verwenden:**
   ```bash
   cd bausteine/auth-baustein
   git checkout main
   ```

2. **Vor Änderungen pullen:**
   ```bash
   git pull origin main
   ```

3. **Submodule-Pointer committen:**
   ```bash
   # Nach Auth-Baustein-Update
   cd ../..
   git add bausteine/auth-baustein
   git commit -m "chore: Update auth-baustein"
   ```

4. **Dependencies synchron halten:**
   ```bash
   cd bausteine/auth-baustein
   npm install
   ```

### **DON'Ts ❌**

1. ❌ **Nicht direkt in Submodule committen** ohne Branch
2. ❌ **Nicht .gitmodules manuell bearbeiten**
3. ❌ **Nicht Submodule-Ordner löschen** (stattdessen: `git submodule deinit`)
4. ❌ **Nicht verschiedene Branches** in verschiedenen Projekten verwenden

---

## 🔍 **Status prüfen**

### **Submodule-Status anzeigen**

```bash
# Im Projekt-Root
git submodule status

# Zeigt z.B.:
# a1b2c3d4 bausteine/auth-baustein (heads/main)
```

### **Alle Submodules updaten**

```bash
# Alle Submodules auf neuesten Stand
git submodule update --remote --merge
```

### **Submodule-Diff anzeigen**

```bash
# Was hat sich geändert?
git diff --submodule
```

---

## 🐛 **Troubleshooting**

### **Problem: "Submodule not initialized"**

```bash
git submodule update --init --recursive
```

### **Problem: "Detached HEAD" in Submodule**

```bash
cd bausteine/auth-baustein
git checkout main
git pull origin main
cd ../..
git add bausteine/auth-baustein
git commit -m "chore: Fix submodule HEAD"
```

### **Problem: "Merge conflict in submodule"**

```bash
# In Submodule wechseln
cd bausteine/auth-baustein

# Auf main zurücksetzen
git checkout main
git pull origin main

# Zurück zum Root
cd ../..
git add bausteine/auth-baustein
git commit -m "chore: Resolve submodule conflict"
```

### **Problem: "Changes in submodule not visible"**

```bash
# Submodule re-initialisieren
git submodule deinit -f bausteine/auth-baustein
git submodule update --init --recursive
```

---

## 📋 **Checkliste: Neues Projekt mit Auth-Baustein**

- [ ] Submodule hinzugefügt (`git submodule add`)
- [ ] Initialisiert (`git submodule update --init`)
- [ ] Dependencies installiert (`npm install`)
- [ ] Environment Variables gesetzt (`.env`)
- [ ] `AUTH_JWT_SECRET` identisch mit anderen Projekten
- [ ] Erste Änderung committed und gepusht
- [ ] Vercel Deployment konfiguriert
- [ ] Domain in `TRUSTED_DOMAINS` hinzugefügt (`src/utils/redirect.js`)

---

## 📚 **Weitere Ressourcen**

- **Git Submodule Docs:** https://git-scm.com/book/en/v2/Git-Tools-Submodules
- **Auth-Baustein README:** `bausteine/auth-baustein/README.md`
- **Integration Guide:** `bausteine/auth-baustein/INTEGRATION_GUIDE.md`

---

## ✅ **Zusammenfassung**

### **Vorteile von Submodules:**

1. ✅ **Single Source of Truth** - Eine Codebasis für alle
2. ✅ **Zentrale Updates** - Änderungen einmal, überall verfügbar
3. ✅ **Versionskontrolle** - Jedes Projekt kann eigene Version nutzen
4. ✅ **Saubere Struktur** - Keine Code-Duplikation

### **Workflow:**

1. **Entwicklung:** Feature-Branch in Auth-Baustein
2. **Review:** Pull Request auf GitHub
3. **Merge:** In `main` Branch
4. **Update:** Submodule in allen Projekten aktualisieren
5. **Deploy:** Vercel deployt automatisch

---

**Made with ❤️ for the Revalenz Platform**

