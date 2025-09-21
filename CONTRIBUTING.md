# 🤝 Contributing to Auth-Baustein

Vielen Dank für Ihr Interesse am Auth-Baustein! Wir freuen uns über Beiträge von der Community.

> 🤖 **KI-Entwicklung**: Dieses Projekt wurde mit Unterstützung von KI-Agenten entwickelt. Wir ermutigen auch Contributors, KI-Tools für ihre Beiträge zu nutzen - es macht die Entwicklung effizienter und qualitativ hochwertiger!

## 📋 **Beitragsrichtlinien**

### **🎯 Was wir begrüßen:**
- ✅ **Bug-Fixes** und Verbesserungen
- ✅ **Neue Features** und Erweiterungen
- ✅ **Dokumentation** und Beispiele
- ✅ **Tests** und Qualitätssicherung
- ✅ **Performance-Optimierungen**

### **🚫 Was wir nicht akzeptieren:**
- ❌ **Breaking Changes** ohne vorherige Diskussion
- ❌ **Sicherheitslücken** ohne verantwortungsvolle Offenlegung
- ❌ **Code ohne Tests** für neue Features
- ❌ **Inkompatible Änderungen** an der API

## 🔄 **Workflow für Beiträge**

### **1. Fork und Setup**
```bash
# Repository forken
git clone https://github.com/IHR-USERNAME/auth-baustein.git
cd auth-baustein

# Dependencies installieren
npm install

# Environment setup
cp env.example .env
# .env mit Ihren Test-Daten konfigurieren
```

### **2. Feature Branch erstellen**
```bash
git checkout -b feature/ihr-feature-name
# oder
git checkout -b fix/bug-description
```

### **3. Änderungen implementieren**
- ✅ **Tests schreiben** für neue Features
- ✅ **Dokumentation aktualisieren**
- ✅ **Code-Formatierung** einhalten
- ✅ **Linting** ohne Fehler

### **4. Pull Request erstellen**
- 📝 **Beschreibung** der Änderungen
- 🔗 **Issue verlinken** (falls vorhanden)
- ✅ **Tests bestanden**
- 📸 **Screenshots** für UI-Änderungen

## 🧪 **Testing**

### **Lokale Tests**
```bash
# Unit Tests
npm test

# Linting
npm run lint

# Build Test
npm run build
```

### **Integration Tests**
- ✅ **API-Endpunkte** testen
- ✅ **Datenbank-Schema** validieren
- ✅ **OAuth-Flow** prüfen

## 📚 **Code-Standards**

### **JavaScript/TypeScript**
- ✅ **ESLint** Konfiguration befolgen
- ✅ **Prettier** für Code-Formatierung
- ✅ **JSDoc** für Funktionen
- ✅ **TypeScript** für neue Features

### **🤖 KI-Tools verwenden**
- ✅ **Code-Generierung** mit KI-Agenten
- ✅ **Code-Review** mit KI-Unterstützung
- ✅ **Dokumentation** automatisch generieren
- ✅ **Testing** mit KI-generierten Tests
- ✅ **Refactoring** mit KI-Unterstützung

### **Commit-Messages**
```
feat: neue Feature-Beschreibung
fix: Bug-Fix-Beschreibung
docs: Dokumentations-Update
test: Test-Hinzufügung
refactor: Code-Refactoring
```

## 🔒 **Sicherheit**

### **Responsible Disclosure**
- 🛡️ **Sicherheitslücken** an security@revalenz.de melden
- ⏰ **90 Tage** Embargo für kritische Lücken
- 📧 **Keine öffentlichen Issues** für Sicherheitsprobleme

### **Code-Review**
- 👀 **Alle PRs** werden von Maintainern geprüft
- 🔍 **Sicherheits-Checks** automatisch
- ✅ **Tests müssen bestehen**

## 🏗️ **Architektur-Prinzipien**

### **Modularität**
- 🔧 **Bausteine** sollen wiederverwendbar sein
- 🔌 **API-first** Design
- 📦 **Minimale Abhängigkeiten**

### **Kompatibilität**
- 🔄 **Backward Compatibility** wahren
- 📋 **Semantic Versioning** (SemVer)
- 🧪 **Breaking Changes** nur in Major Versions

## 📞 **Support**

### **Hilfe bekommen**
- 💬 **GitHub Discussions** für Fragen
- 🐛 **GitHub Issues** für Bugs
- 📧 **Email** an support@revalenz.de

### **Community**
- 🌐 **Website**: https://revalenz.de
- 📚 **Dokumentation**: README.md
- 🎯 **Beispiele**: examples/ Verzeichnis

## 🎉 **Anerkennung**

### **Contributors**
- 👥 **Alle Contributors** werden in README.md aufgelistet
- 🏆 **Besondere Beiträge** werden hervorgehoben
- 📢 **Social Media** Erwähnung für größere Features

### **Lizenz**
- 📄 **MIT License** - freie Nutzung
- 🏢 **Kommerzielle Nutzung** erlaubt
- 📋 **Attribution** erforderlich

---

**Vielen Dank für Ihren Beitrag zur Revalenz-Community!** 🚀
