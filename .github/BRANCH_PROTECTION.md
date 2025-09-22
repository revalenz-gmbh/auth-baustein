# 🛡️ Branch Protection Setup

## 📋 **Empfohlene GitHub Branch Protection Rules**

### **Für `main` Branch:**
- ✅ **Require pull request reviews** (2 Reviews)
- ✅ **Dismiss stale reviews** when new commits are pushed
- ✅ **Require status checks** to pass before merging
- ✅ **Require branches to be up to date** before merging
- ✅ **Require conversation resolution** before merging
- ✅ **Restrict pushes** that create files larger than 100MB
- ✅ **Require signed commits** (optional, aber empfohlen)

### **Für `develop` Branch:**
- ✅ **Require pull request reviews** (1 Review)
- ✅ **Require status checks** to pass before merging
- ✅ **Require branches to be up to date** before merging

## 🔧 **Setup-Anleitung**

### **1. GitHub Repository Settings**
1. Gehen Sie zu **Settings** → **Branches**
2. Klicken Sie auf **Add rule**
3. Konfigurieren Sie die Regeln wie oben beschrieben

### **2. Required Status Checks**
- `test` (CI/CD Pipeline)
- `security-audit` (Security Checks)
- `dependency-check` (Dependency Review)

### **3. Review Requirements**
- **Maintainers** können PRs mergen
- **Contributors** benötigen Reviews
- **Admins** können Regeln umgehen (nur in Notfällen)

## 🚨 **Notfall-Procedures**

### **Hotfixes:**
1. **Issue** erstellen mit `hotfix` Label
2. **Branch** von `main` erstellen: `hotfix/issue-description`
3. **Fix** implementieren und testen
4. **PR** gegen `main` erstellen
5. **Schnelle Review** von Maintainern
6. **Merge** und **Tag** erstellen

### **Security Fixes:**
1. **Private Issue** erstellen
2. **Security Branch** erstellen
3. **Fix** implementieren
4. **Private PR** für Review
5. **Coordinated Release** nach 90 Tagen

## 📊 **Monitoring**

### **Branch Health:**
- 🔍 **Regelmäßige Reviews** der Branch-Strategie
- 📈 **Merge-Frequenz** überwachen
- 🚨 **Failed Checks** schnell beheben
- 📋 **PR-Template** verwenden

### **Metrics:**
- ⏱️ **Time to Merge** (Ziel: < 48h)
- 🔄 **PR Throughput** (Ziel: > 5/Woche)
- 🐛 **Bug Rate** (Ziel: < 5% der PRs)
- 👥 **Contributor Growth** (Ziel: +2/Monat)

---

**Diese Regeln schützen Ihr Repository vor ungewollten Änderungen!** 🛡️
