# 🎯 Lizenz-System - Usage Examples

## Übersicht

Das Lizenz-System ermöglicht **Product-basierte Zugriffskontrolle** mit **flexiblen Plänen** und **Quota-Management**.

---

## 📦 **1. Middleware in Backend integrieren**

### **Beispiel: Ticketsystem (console-baustein)**

```javascript
// In: bausteine/console-baustein/src/app.js
import express from 'express';
import { requireLicense, checkQuota } from '../auth-baustein/src/middleware/checkLicense.js';
import { requireAuth } from './middleware/auth.js';

const app = express();

// Alle Ticket-Endpoints benötigen eine aktive 'tickets' Lizenz
app.use('/api/tickets', requireAuth, requireLicense('tickets'));
app.use('/api/orders', requireAuth, requireLicense('tickets'));

// Spezifische Routes mit Quota-Check
app.post('/api/tickets', 
  requireAuth, 
  requireLicense('tickets'),
  checkQuota('tickets', 'max_tickets', 1),
  async (req, res) => {
    // Ticket erstellen
    const ticket = await createTicket(req.body);
    
    // Usage hochzählen
    await incrementUsage(req.user.tenantId, 'tickets', 'max_tickets');
    
    res.json({ success: true, data: ticket });
  }
);
```

---

## 🔧 **2. Helper-Funktionen verwenden**

### **Lizenz prüfen**

```javascript
import { hasActiveLicense, getLicensePlan } from '../auth-baustein/src/utils/license.js';

// Prüfen ob Lizenz existiert
const hasLicense = await hasActiveLicense(tenantId, null, 'tickets');
if (!hasLicense) {
  return res.status(403).json({ error: 'License required' });
}

// Plan-Details abrufen
const license = await getLicensePlan(tenantId, 'tickets');
console.log('Current plan:', license.plan);
console.log('Valid until:', license.valid_until);
```

### **Quota prüfen**

```javascript
import { checkQuota, incrementUsage } from '../auth-baustein/src/utils/license.js';

// Vor Erstellung prüfen
const canCreate = await checkQuota(tenantId, 'tickets', 'max_tickets', currentCount);
if (!canCreate) {
  return res.status(403).json({ error: 'Ticket quota exceeded' });
}

// Nach Erstellung hochzählen
await incrementUsage(tenantId, 'tickets', 'max_tickets', 1);
```

### **Lizenz erstellen/upgraden**

```javascript
import { createOrUpdateLicense, upgradeLicense } from '../auth-baustein/src/utils/license.js';

// Neue Lizenz erstellen
const license = await createOrUpdateLicense(tenantId, 'tickets', 'pro', {
  status: 'active',
  validUntil: new Date('2025-12-31'),
  meta: {
    limits: {
      max_tickets: 10000,
      max_orders: 5000
    }
  }
});

// Upgrade durchführen
const upgraded = await upgradeLicense(tenantId, 'tickets', 'enterprise', {
  extensionMonths: 12,
  meta: {
    limits: {
      max_tickets: -1,  // Unlimited
      max_orders: -1
    }
  }
});
```

---

## 🌐 **3. API-Endpoints nutzen**

### **Lizenzen abrufen**

```bash
# Alle Lizenzen für einen Tenant
GET /api/licenses/tenants/123
Authorization: Bearer <JWT>

Response:
{
  "success": true,
  "data": {
    "tenantId": 123,
    "licenses": [
      {
        "id": 1,
        "product_key": "tickets",
        "product_name": "Ticketservice",
        "plan": "pro",
        "status": "active",
        "valid_until": "2025-12-31T23:59:59Z",
        "license_type": "org"
      }
    ]
  }
}
```

### **Spezifische Lizenz abrufen**

```bash
# Lizenz für ein Produkt
GET /api/licenses/tenants/123/products/tickets
Authorization: Bearer <JWT>

Response:
{
  "success": true,
  "data": {
    "tenantId": 123,
    "productKey": "tickets",
    "license": {
      "id": 1,
      "plan": "pro",
      "status": "active",
      "valid_until": "2025-12-31T23:59:59Z",
      "meta": {
        "limits": {
          "max_tickets": 10000,
          "max_orders": 5000
        },
        "usage": {
          "max_tickets": 1234,
          "max_orders": 567
        }
      }
    }
  }
}
```

### **Lizenz erstellen/aktualisieren**

```bash
# Lizenz anlegen (Super oder Owner)
POST /api/licenses/tenants/123/products/tickets
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "plan": "pro",
  "status": "active",
  "valid_until": "2025-12-31T23:59:59Z",
  "meta": {
    "limits": {
      "max_tickets": 10000,
      "max_orders": 5000
    }
  }
}

Response:
{
  "success": true,
  "data": {
    "tenantId": 123,
    "productKey": "tickets",
    "license": { ... }
  }
}
```

### **Lizenz upgraden**

```bash
# Upgrade auf höheren Plan
POST /api/licenses/tenants/123/products/tickets/upgrade
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "newPlan": "enterprise",
  "extensionMonths": 12,
  "meta": {
    "limits": {
      "max_tickets": -1,
      "max_orders": -1
    }
  }
}

Response:
{
  "success": true,
  "data": {
    "tenantId": 123,
    "productKey": "tickets",
    "license": { ... },
    "message": "License upgraded successfully"
  }
}
```

### **Lizenz deaktivieren**

```bash
# Lizenz widerrufen (nur Super)
DELETE /api/licenses/tenants/123/products/tickets
Authorization: Bearer <JWT>

Response:
{
  "success": true,
  "data": {
    "tenantId": 123,
    "productKey": "tickets",
    "message": "License revoked successfully"
  }
}
```

---

## 💻 **4. Frontend-Integration**

### **React-Komponente: Lizenz-Status**

```typescript
// src/components/LicenseStatus.tsx
import { useEffect, useState } from 'react';

interface License {
  plan: string;
  status: string;
  valid_until: string;
  meta: {
    limits?: Record<string, number>;
    usage?: Record<string, number>;
  };
}

export function LicenseStatus({ productKey }: { productKey: string }) {
  const [license, setLicense] = useState<License | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLicense() {
      const token = localStorage.getItem('token');
      const tenantId = getUserTenantId(); // Ihre Funktion
      
      const response = await fetch(
        `${AUTH_API}/licenses/tenants/${tenantId}/products/${productKey}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const { data } = await response.json();
      setLicense(data.license);
      setLoading(false);
    }
    
    loadLicense();
  }, [productKey]);

  if (loading) return <div>Loading...</div>;
  if (!license) return <div>No active license</div>;

  const usage = license.meta.usage || {};
  const limits = license.meta.limits || {};

  return (
    <div className="license-status">
      <h3>License: {license.plan}</h3>
      <p>Status: {license.status}</p>
      {license.valid_until && (
        <p>Valid until: {new Date(license.valid_until).toLocaleDateString()}</p>
      )}
      
      <div className="usage">
        <h4>Usage:</h4>
        {Object.keys(limits).map(feature => (
          <div key={feature}>
            <span>{feature}:</span>
            <span>{usage[feature] || 0} / {limits[feature] === -1 ? '∞' : limits[feature]}</span>
            <progress 
              value={usage[feature] || 0} 
              max={limits[feature] === -1 ? 100 : limits[feature]} 
            />
          </div>
        ))}
      </div>
      
      {license.plan !== 'enterprise' && (
        <button onClick={() => handleUpgrade()}>
          Upgrade to {getNextPlan(license.plan)}
        </button>
      )}
    </div>
  );
}
```

### **Upgrade-Dialog**

```typescript
// src/components/UpgradeDialog.tsx
async function handleUpgrade(newPlan: string) {
  const token = localStorage.getItem('token');
  const tenantId = getUserTenantId();
  
  const response = await fetch(
    `${AUTH_API}/licenses/tenants/${tenantId}/products/tickets/upgrade`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        newPlan: newPlan,
        extensionMonths: 12
      })
    }
  );
  
  const { success, data } = await response.json();
  
  if (success) {
    alert(`Upgraded to ${newPlan}!`);
    window.location.reload();
  } else {
    alert('Upgrade failed');
  }
}
```

---

## 🔄 **5. Cron-Job für Lizenz-Ablauf**

### **Automatische Prüfung abgelaufener Lizenzen**

```javascript
// src/jobs/checkLicenses.js
import { checkExpiredLicenses } from '../utils/license.js';

// Täglich um Mitternacht ausführen
export async function runLicenseCheck() {
  console.log('🔍 Checking for expired licenses...');
  
  const expiredCount = await checkExpiredLicenses();
  
  console.log(`✅ ${expiredCount} licenses expired`);
  
  return expiredCount;
}

// Vercel Cron (vercel.json):
// {
//   "crons": [
//     {
//       "path": "/api/cron/check-licenses",
//       "schedule": "0 0 * * *"
//     }
//   ]
// }
```

---

## 🎯 **6. Plan-Definitionen**

### **Feature-Matrix**

| Feature | Free | Starter | Pro | Enterprise |
|---------|------|---------|-----|------------|
| Max Tickets/Monat | 100 | 1,000 | 10,000 | ∞ |
| Max Orders/Monat | 50 | 500 | 5,000 | ∞ |
| Support | Community | E-Mail | Priority | Dedicated |
| Custom Branding | ❌ | ❌ | ✅ | ✅ |
| SLA | ❌ | ❌ | ❌ | ✅ |
| Preis/Monat | €0 | €29 | €99 | Custom |

### **Meta-Struktur**

```json
{
  "limits": {
    "max_tickets": 10000,
    "max_orders": 5000,
    "max_events": 100
  },
  "usage": {
    "max_tickets": 1234,
    "max_orders": 567,
    "max_events": 12
  },
  "features": {
    "custom_branding": true,
    "priority_support": true,
    "api_access": true
  }
}
```

---

## ✅ **7. Best Practices**

### **DO's ✅**

1. **Immer Lizenz-Check vor Feature-Zugriff:**
   ```javascript
   app.use('/api/feature', requireAuth, requireLicense('product'));
   ```

2. **Usage nach Erstellung hochzählen:**
   ```javascript
   await incrementUsage(tenantId, 'tickets', 'max_tickets', 1);
   ```

3. **Quota vor Erstellung prüfen:**
   ```javascript
   const canCreate = await checkQuota(tenantId, 'tickets', 'max_tickets', count);
   ```

4. **Fehler-Handling:**
   ```javascript
   if (!hasLicense) {
     return res.status(403).json({ 
       error: { code: 'LICENSE_REQUIRED', message: 'Active license required' }
     });
   }
   ```

### **DON'Ts ❌**

1. ❌ **Lizenz-Check überspringen** bei kritischen Features
2. ❌ **Usage nicht hochzählen** nach Erstellung
3. ❌ **Quota nicht prüfen** vor Erstellung
4. ❌ **Fehler ignorieren** bei Lizenz-Validierung

---

## 📚 **Weitere Ressourcen**

- **Middleware:** `src/middleware/checkLicense.js`
- **Helper:** `src/utils/license.js`
- **Routes:** `src/routes/licenses.js`
- **Integration Guide:** `INTEGRATION_GUIDE.md`

---

**Made with ❤️ for the Revalenz Platform**

