// Lizenz-Helper-Funktionen für das Lizenz-Management
import { query } from './db.js';

/**
 * Prüft, ob eine aktive Lizenz für ein Produkt existiert
 * @param {number} tenantId - Tenant-ID
 * @param {number|null} adminId - Admin-ID (null = Org-Level)
 * @param {string} productKey - Produkt-Schlüssel
 * @returns {Promise<boolean>}
 */
export async function hasActiveLicense(tenantId, adminId, productKey) {
  try {
    const result = await query(
      `SELECT id FROM entitlements 
       WHERE tenant_id = $1 
       AND (admin_id = $2 OR (admin_id IS NULL AND $2 IS NOT NULL))
       AND product_key = $3 
       AND status = 'active'
       AND (valid_until IS NULL OR valid_until > NOW())
       LIMIT 1`,
      [tenantId, adminId, productKey]
    );
    return result.rowCount > 0;
  } catch (error) {
    console.error('hasActiveLicense error:', error);
    return false;
  }
}

/**
 * Ruft den Lizenz-Plan für ein Produkt ab
 * @param {number} tenantId - Tenant-ID
 * @param {string} productKey - Produkt-Schlüssel
 * @returns {Promise<Object|null>} Lizenz-Objekt oder null
 */
export async function getLicensePlan(tenantId, productKey) {
  try {
    const result = await query(
      `SELECT id, plan, status, valid_until, meta, created_at
       FROM entitlements 
       WHERE tenant_id = $1 
       AND product_key = $2 
       AND admin_id IS NULL
       AND status = 'active'
       ORDER BY created_at DESC 
       LIMIT 1`,
      [tenantId, productKey]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('getLicensePlan error:', error);
    return null;
  }
}

/**
 * Prüft Feature-Quota
 * @param {number} tenantId - Tenant-ID
 * @param {string} productKey - Produkt-Schlüssel
 * @param {string} feature - Feature-Name
 * @param {number} count - Aktuelle Anzahl
 * @returns {Promise<boolean>} True wenn unter Limit
 */
export async function checkQuota(tenantId, productKey, feature, count) {
  try {
    const license = await getLicensePlan(tenantId, productKey);
    if (!license) return false;

    const limits = license.meta?.limits || {};
    const limit = limits[feature];

    // Kein Limit definiert = unbegrenzt
    if (!limit || limit === -1) return true;

    return count < limit;
  } catch (error) {
    console.error('checkQuota error:', error);
    return false;
  }
}

/**
 * Aktualisiert Usage-Counter für ein Feature
 * @param {number} tenantId - Tenant-ID
 * @param {string} productKey - Produkt-Schlüssel
 * @param {string} feature - Feature-Name
 * @param {number} increment - Inkrement (Standard: 1)
 * @returns {Promise<boolean>}
 */
export async function incrementUsage(tenantId, productKey, feature, increment = 1) {
  try {
    const license = await getLicensePlan(tenantId, productKey);
    if (!license) return false;

    const meta = license.meta || {};
    const usage = meta.usage || {};
    usage[feature] = (usage[feature] || 0) + increment;
    meta.usage = usage;

    await query(
      `UPDATE entitlements 
       SET meta = $1::jsonb
       WHERE id = $2`,
      [JSON.stringify(meta), license.id]
    );

    return true;
  } catch (error) {
    console.error('incrementUsage error:', error);
    return false;
  }
}

/**
 * Erstellt oder aktualisiert eine Org-Level Lizenz
 * @param {number} tenantId - Tenant-ID
 * @param {string} productKey - Produkt-Schlüssel
 * @param {string} plan - Plan-Name (z.B. 'free', 'starter', 'pro')
 * @param {Object} options - Zusätzliche Optionen
 * @returns {Promise<Object|null>} Lizenz-Objekt oder null
 */
export async function createOrUpdateLicense(tenantId, productKey, plan, options = {}) {
  try {
    const {
      status = 'active',
      validUntil = null,
      meta = {}
    } = options;

    const result = await query(
      `INSERT INTO entitlements 
       (tenant_id, admin_id, product_key, plan, status, valid_until, meta)
       VALUES ($1, NULL, $2, $3, $4, $5::timestamp, $6::jsonb)
       ON CONFLICT (tenant_id, product_key) 
       WHERE admin_id IS NULL
       DO UPDATE SET 
         plan = EXCLUDED.plan,
         status = EXCLUDED.status,
         valid_until = EXCLUDED.valid_until,
         meta = EXCLUDED.meta
       RETURNING id, plan, status, valid_until, meta, created_at`,
      [tenantId, productKey, plan, status, validUntil, JSON.stringify(meta)]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('createOrUpdateLicense error:', error);
    return null;
  }
}

/**
 * Deaktiviert eine Lizenz
 * @param {number} tenantId - Tenant-ID
 * @param {string} productKey - Produkt-Schlüssel
 * @returns {Promise<boolean>}
 */
export async function revokeLicense(tenantId, productKey) {
  try {
    const result = await query(
      `UPDATE entitlements 
       SET status = 'inactive'
       WHERE tenant_id = $1 
       AND product_key = $2 
       AND admin_id IS NULL
       RETURNING id`,
      [tenantId, productKey]
    );

    return result.rowCount > 0;
  } catch (error) {
    console.error('revokeLicense error:', error);
    return false;
  }
}

/**
 * Prüft abgelaufene Lizenzen und setzt Status auf 'expired'
 * @returns {Promise<number>} Anzahl der abgelaufenen Lizenzen
 */
export async function checkExpiredLicenses() {
  try {
    const result = await query(
      `UPDATE entitlements 
       SET status = 'expired' 
       WHERE status = 'active' 
       AND valid_until < NOW() 
       RETURNING id, tenant_id, admin_id, product_key`
    );

    // Optional: Benachrichtigungen senden
    if (result.rowCount > 0) {
      console.log(`⏰ ${result.rowCount} Lizenzen abgelaufen:`, result.rows);
      // TODO: Benachrichtigungs-Service aufrufen
    }

    return result.rowCount;
  } catch (error) {
    console.error('checkExpiredLicenses error:', error);
    return 0;
  }
}

/**
 * Upgrade einer Lizenz auf einen höheren Plan
 * @param {number} tenantId - Tenant-ID
 * @param {string} productKey - Produkt-Schlüssel
 * @param {string} newPlan - Neuer Plan
 * @param {Object} options - Zusätzliche Optionen
 * @returns {Promise<Object|null>}
 */
export async function upgradeLicense(tenantId, productKey, newPlan, options = {}) {
  try {
    const current = await getLicensePlan(tenantId, productKey);
    
    // Aktuelle Laufzeit verlängern
    let validUntil = options.validUntil;
    if (!validUntil && current?.valid_until) {
      validUntil = new Date(current.valid_until);
      validUntil.setMonth(validUntil.getMonth() + (options.extensionMonths || 1));
    }

    // Meta-Daten zusammenführen
    const meta = {
      ...(current?.meta || {}),
      ...(options.meta || {}),
      upgradedAt: new Date().toISOString(),
      previousPlan: current?.plan
    };

    return await createOrUpdateLicense(tenantId, productKey, newPlan, {
      status: 'active',
      validUntil: validUntil,
      meta: meta
    });
  } catch (error) {
    console.error('upgradeLicense error:', error);
    return null;
  }
}

/**
 * Liste alle aktiven Lizenzen für einen Tenant
 * @param {number} tenantId - Tenant-ID
 * @returns {Promise<Array>}
 */
export async function listLicenses(tenantId) {
  try {
    const result = await query(
      `SELECT 
         e.id, 
         e.product_key, 
         p.name as product_name,
         e.plan, 
         e.status, 
         e.valid_until, 
         e.meta,
         e.created_at,
         CASE 
           WHEN e.admin_id IS NULL THEN 'org'
           ELSE 'member'
         END as license_type
       FROM entitlements e
       LEFT JOIN products p ON e.product_key = p.key
       WHERE e.tenant_id = $1
       ORDER BY e.created_at DESC`,
      [tenantId]
    );

    return result.rows;
  } catch (error) {
    console.error('listLicenses error:', error);
    return [];
  }
}

/**
 * Prüft, ob ein Plan gültig ist
 * @param {string} plan - Plan-Name
 * @returns {boolean}
 */
export function isValidPlan(plan) {
  const validPlans = ['free', 'starter', 'pro', 'enterprise', 'trial'];
  return validPlans.includes(plan.toLowerCase());
}

/**
 * Plan-Hierarchie für Vergleiche
 * @param {string} plan - Plan-Name
 * @returns {number} Rang (höher = besser)
 */
export function getPlanRank(plan) {
  const ranks = {
    free: 0,
    trial: 1,
    starter: 2,
    pro: 3,
    enterprise: 4
  };
  return ranks[plan.toLowerCase()] || 0;
}

/**
 * Prüft, ob ein Plan ausreichend ist
 * @param {string} currentPlan - Aktueller Plan
 * @param {string} requiredPlan - Erforderlicher Plan
 * @returns {boolean}
 */
export function isPlanSufficient(currentPlan, requiredPlan) {
  return getPlanRank(currentPlan) >= getPlanRank(requiredPlan);
}

export default {
  hasActiveLicense,
  getLicensePlan,
  checkQuota,
  incrementUsage,
  createOrUpdateLicense,
  revokeLicense,
  checkExpiredLicenses,
  upgradeLicense,
  listLicenses,
  isValidPlan,
  getPlanRank,
  isPlanSufficient
};

