// Lizenz-Validierungs-Middleware für Product-Zugriff
import { query } from '../utils/db.js';

/**
 * Middleware: Prüft, ob User/Tenant eine aktive Lizenz für ein Produkt hat
 * @param {string} productKey - Produkt-Schlüssel (z.B. 'tickets', 'impulse')
 * @returns {Function} Express Middleware
 */
export function requireLicense(productKey) {
  return async (req, res, next) => {
    try {
      // User muss authentifiziert sein (requireAuth sollte vorher laufen)
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Authentication required' 
          } 
        });
      }

      const userId = req.user.sub || req.user.id;
      const tenantId = req.user.tenantId || req.headers['x-tenant-id'];

      if (!tenantId) {
        return res.status(400).json({ 
          success: false,
          error: { 
            code: 'TENANT_REQUIRED', 
            message: 'Tenant-ID required for license check' 
          } 
        });
      }

      // 1. Prüfe Org-Level Lizenz (tenant-weit, admin_id IS NULL)
      const orgLicense = await query(
        `SELECT id, plan, status, valid_until, meta 
         FROM entitlements 
         WHERE tenant_id = $1 
         AND product_key = $2 
         AND admin_id IS NULL 
         AND status = 'active'
         AND (valid_until IS NULL OR valid_until > NOW())
         LIMIT 1`,
        [tenantId, productKey]
      );

      if (orgLicense.rowCount > 0) {
        req.license = {
          type: 'org',
          ...orgLicense.rows[0]
        };
        return next();
      }

      // 2. Prüfe Member-Level Lizenz (user-spezifisch)
      const memberLicense = await query(
        `SELECT id, plan, status, valid_until, meta 
         FROM entitlements 
         WHERE tenant_id = $1 
         AND admin_id = $2 
         AND product_key = $3
         AND status = 'active'
         AND (valid_until IS NULL OR valid_until > NOW())
         LIMIT 1`,
        [tenantId, userId, productKey]
      );

      if (memberLicense.rowCount > 0) {
        req.license = {
          type: 'member',
          ...memberLicense.rows[0]
        };
        return next();
      }

      // 3. Keine aktive Lizenz gefunden
      return res.status(403).json({ 
        success: false,
        error: { 
          code: 'LICENSE_REQUIRED', 
          message: `Active ${productKey} license required`,
          productKey: productKey,
          tenantId: tenantId
        } 
      });

    } catch (error) {
      console.error('License check error:', error);
      return res.status(500).json({ 
        success: false,
        error: { 
          code: 'LICENSE_CHECK_FAILED', 
          message: 'License validation failed' 
        } 
      });
    }
  };
}

/**
 * Middleware: Prüft spezifischen Plan (z.B. 'pro', 'enterprise')
 * @param {string} productKey - Produkt-Schlüssel
 * @param {string[]} allowedPlans - Erlaubte Pläne
 * @returns {Function} Express Middleware
 */
export function requirePlan(productKey, allowedPlans) {
  return async (req, res, next) => {
    // Erst Lizenz prüfen
    const licenseCheck = requireLicense(productKey);
    
    await new Promise((resolve, reject) => {
      licenseCheck(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    }).catch(() => {
      // License-Check hat bereits Response gesendet
      return;
    });

    // Dann Plan prüfen
    if (!req.license) {
      return; // Bereits von requireLicense behandelt
    }

    const plan = req.license.plan;
    if (!allowedPlans.includes(plan)) {
      return res.status(403).json({ 
        success: false,
        error: { 
          code: 'PLAN_UPGRADE_REQUIRED', 
          message: `Plan '${plan}' insufficient. Required: ${allowedPlans.join(', ')}`,
          currentPlan: plan,
          requiredPlans: allowedPlans
        } 
      });
    }

    next();
  };
}

/**
 * Middleware: Prüft Feature-Quota (z.B. max. Tickets pro Monat)
 * @param {string} productKey - Produkt-Schlüssel
 * @param {string} feature - Feature-Name (z.B. 'max_tickets')
 * @param {number} requestedCount - Angeforderte Anzahl
 * @returns {Function} Express Middleware
 */
export function checkQuota(productKey, feature, requestedCount = 1) {
  return async (req, res, next) => {
    try {
      if (!req.license) {
        // Lizenz-Check sollte vorher laufen
        return res.status(500).json({ 
          success: false,
          error: { 
            code: 'LICENSE_NOT_CHECKED', 
            message: 'License must be checked before quota validation' 
          } 
        });
      }

      const meta = req.license.meta || {};
      const limits = meta.limits || {};
      const limit = limits[feature];

      // Kein Limit = unbegrenzt
      if (!limit || limit === -1) {
        return next();
      }

      // Aktuellen Verbrauch abrufen (aus meta.usage)
      const usage = meta.usage || {};
      const currentCount = usage[feature] || 0;

      if (currentCount + requestedCount > limit) {
        return res.status(403).json({ 
          success: false,
          error: { 
            code: 'QUOTA_EXCEEDED', 
            message: `${feature} quota exceeded`,
            feature: feature,
            limit: limit,
            current: currentCount,
            requested: requestedCount
          } 
        });
      }

      // Quota ok
      req.quota = {
        feature: feature,
        limit: limit,
        current: currentCount,
        remaining: limit - currentCount - requestedCount
      };

      next();
    } catch (error) {
      console.error('Quota check error:', error);
      return res.status(500).json({ 
        success: false,
        error: { 
          code: 'QUOTA_CHECK_FAILED', 
          message: 'Quota validation failed' 
        } 
      });
    }
  };
}

export default { requireLicense, requirePlan, checkQuota };

