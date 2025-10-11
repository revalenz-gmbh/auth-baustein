// Lizenz-Management API-Endpoints
import express from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../utils/db.js';
import {
  getLicensePlan,
  createOrUpdateLicense,
  revokeLicense,
  listLicenses,
  upgradeLicense,
  isValidPlan
} from '../utils/license.js';

const router = express.Router();

// ============================================================================
// MIDDLEWARE
// ============================================================================

function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'No token provided' }
      });
    }

    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      error: { code: 'INVALID_TOKEN', message: 'Token invalid or expired' }
    });
  }
}

async function requireTenantAccess(req, res, next) {
  const tenantId = parseInt(req.params.tenantId, 10);
  const userId = req.user.sub;
  const isSuper = Array.isArray(req.user.roles) && req.user.roles.includes('super');

  if (isSuper) {
    req.tenantId = tenantId;
    return next();
  }

  // Prüfe Tenant-Admin-Zugriff
  const result = await query(
    'SELECT role FROM tenant_admins WHERE tenant_id = $1 AND admin_id = $2',
    [tenantId, userId]
  );

  if (result.rowCount === 0) {
    return res.status(403).json({ 
      success: false, 
      error: { code: 'FORBIDDEN', message: 'No access to this tenant' }
    });
  }

  req.tenantId = tenantId;
  req.tenantRole = result.rows[0].role;
  next();
}

// ============================================================================
// ENDPOINTS
// ============================================================================

/**
 * GET /api/licenses/tenants/:tenantId
 * Liste alle Lizenzen für einen Tenant
 */
router.get('/tenants/:tenantId', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const licenses = await listLicenses(req.tenantId);

    return res.json({ 
      success: true, 
      data: {
        tenantId: req.tenantId,
        licenses: licenses
      }
    });
  } catch (error) {
    console.error('List licenses error:', error);
    return res.status(500).json({ 
      success: false, 
      error: { code: 'LIST_FAILED', message: 'Failed to list licenses' }
    });
  }
});

/**
 * GET /api/licenses/tenants/:tenantId/products/:productKey
 * Ruft spezifische Lizenz für ein Produkt ab
 */
router.get('/tenants/:tenantId/products/:productKey', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const { productKey } = req.params;
    const license = await getLicensePlan(req.tenantId, productKey);

    if (!license) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'LICENSE_NOT_FOUND', message: 'No license found for this product' }
      });
    }

    return res.json({ 
      success: true, 
      data: {
        tenantId: req.tenantId,
        productKey: productKey,
        license: license
      }
    });
  } catch (error) {
    console.error('Get license error:', error);
    return res.status(500).json({ 
      success: false, 
      error: { code: 'GET_FAILED', message: 'Failed to get license' }
    });
  }
});

/**
 * POST /api/licenses/tenants/:tenantId/products/:productKey
 * Erstellt oder aktualisiert eine Lizenz (Super oder Owner)
 */
router.post('/tenants/:tenantId/products/:productKey', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const { productKey } = req.params;
    const { plan, status, valid_until, meta } = req.body || {};

    // Zugriffskontrolle: Nur Super oder Owner dürfen Lizenzen verwalten
    const isSuper = Array.isArray(req.user.roles) && req.user.roles.includes('super');
    if (!isSuper && req.tenantRole !== 'owner') {
      return res.status(403).json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'Only super users or tenant owners can manage licenses' }
      });
    }

    // Validierung
    if (!plan) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'PLAN_REQUIRED', message: 'Plan is required' }
      });
    }

    if (!isValidPlan(plan)) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'INVALID_PLAN', message: `Invalid plan: ${plan}` }
      });
    }

    // Lizenz erstellen/aktualisieren
    const license = await createOrUpdateLicense(req.tenantId, productKey, plan, {
      status: status || 'active',
      validUntil: valid_until || null,
      meta: meta || {}
    });

    if (!license) {
      return res.status(500).json({ 
        success: false, 
        error: { code: 'CREATE_FAILED', message: 'Failed to create/update license' }
      });
    }

    return res.json({ 
      success: true, 
      data: {
        tenantId: req.tenantId,
        productKey: productKey,
        license: license
      }
    });
  } catch (error) {
    console.error('Create/update license error:', error);
    return res.status(500).json({ 
      success: false, 
      error: { code: 'UPSERT_FAILED', message: 'Failed to create/update license' }
    });
  }
});

/**
 * POST /api/licenses/tenants/:tenantId/products/:productKey/upgrade
 * Upgrade einer Lizenz auf höheren Plan
 */
router.post('/tenants/:tenantId/products/:productKey/upgrade', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const { productKey } = req.params;
    const { newPlan, extensionMonths, meta } = req.body || {};

    // Zugriffskontrolle
    const isSuper = Array.isArray(req.user.roles) && req.user.roles.includes('super');
    if (!isSuper && req.tenantRole !== 'owner') {
      return res.status(403).json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'Only super users or tenant owners can upgrade licenses' }
      });
    }

    if (!newPlan) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'PLAN_REQUIRED', message: 'New plan is required' }
      });
    }

    // Upgrade durchführen
    const license = await upgradeLicense(req.tenantId, productKey, newPlan, {
      extensionMonths: extensionMonths || 1,
      meta: meta || {}
    });

    if (!license) {
      return res.status(500).json({ 
        success: false, 
        error: { code: 'UPGRADE_FAILED', message: 'Failed to upgrade license' }
      });
    }

    return res.json({ 
      success: true, 
      data: {
        tenantId: req.tenantId,
        productKey: productKey,
        license: license,
        message: 'License upgraded successfully'
      }
    });
  } catch (error) {
    console.error('Upgrade license error:', error);
    return res.status(500).json({ 
      success: false, 
      error: { code: 'UPGRADE_FAILED', message: 'Failed to upgrade license' }
    });
  }
});

/**
 * DELETE /api/licenses/tenants/:tenantId/products/:productKey
 * Deaktiviert eine Lizenz (nur Super)
 */
router.delete('/tenants/:tenantId/products/:productKey', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const { productKey } = req.params;

    // Nur Super-User dürfen Lizenzen deaktivieren
    const isSuper = Array.isArray(req.user.roles) && req.user.roles.includes('super');
    if (!isSuper) {
      return res.status(403).json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'Only super users can revoke licenses' }
      });
    }

    const success = await revokeLicense(req.tenantId, productKey);

    if (!success) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'License not found or already inactive' }
      });
    }

    return res.json({ 
      success: true, 
      data: {
        tenantId: req.tenantId,
        productKey: productKey,
        message: 'License revoked successfully'
      }
    });
  } catch (error) {
    console.error('Revoke license error:', error);
    return res.status(500).json({ 
      success: false, 
      error: { code: 'REVOKE_FAILED', message: 'Failed to revoke license' }
    });
  }
});

/**
 * GET /api/licenses/products
 * Liste verfügbare Produkte
 */
router.get('/products', async (req, res) => {
  try {
    const result = await query(
      `SELECT key, name, is_active 
       FROM products 
       WHERE is_active = true
       ORDER BY name`
    );

    return res.json({ 
      success: true, 
      data: {
        products: result.rows
      }
    });
  } catch (error) {
    console.error('List products error:', error);
    return res.status(500).json({ 
      success: false, 
      error: { code: 'LIST_FAILED', message: 'Failed to list products' }
    });
  }
});

/**
 * GET /api/licenses/plans
 * Liste verfügbare Pläne mit Features
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = [
      {
        key: 'free',
        name: 'Free',
        price: 0,
        features: {
          max_tickets: 100,
          max_orders: 50,
          support: 'community'
        }
      },
      {
        key: 'starter',
        name: 'Starter',
        price: 29,
        features: {
          max_tickets: 1000,
          max_orders: 500,
          support: 'email'
        }
      },
      {
        key: 'pro',
        name: 'Professional',
        price: 99,
        features: {
          max_tickets: 10000,
          max_orders: 5000,
          support: 'priority',
          custom_branding: true
        }
      },
      {
        key: 'enterprise',
        name: 'Enterprise',
        price: null, // Custom pricing
        features: {
          max_tickets: -1, // Unlimited
          max_orders: -1,
          support: 'dedicated',
          custom_branding: true,
          sla: true
        }
      }
    ];

    return res.json({ 
      success: true, 
      data: { plans: plans }
    });
  } catch (error) {
    console.error('List plans error:', error);
    return res.status(500).json({ 
      success: false, 
      error: { code: 'LIST_FAILED', message: 'Failed to list plans' }
    });
  }
});

export default router;

