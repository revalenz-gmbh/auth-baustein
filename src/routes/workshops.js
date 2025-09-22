import express from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { query } from '../utils/db.js';

const router = express.Router();

// Workshop-Anmeldung erstellen
router.post('/register', verifyJWT, async (req, res) => {
  try {
    const { 
      workshopDate, 
      company, 
      experience, 
      goals, 
      message 
    } = req.body;

    const userId = req.user.sub;

    // Validierung
    if (!workshopDate) {
      return res.status(400).json({
        success: false,
        message: 'Workshop-Datum ist erforderlich'
      });
    }

    if (!goals || goals.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Ziele sind erforderlich'
      });
    }

    // Prüfen ob bereits für diesen Termin angemeldet
    const existingRegistration = await query(
      'SELECT id FROM workshop_registrations WHERE user_id = $1 AND workshop_date = $2',
      [userId, workshopDate]
    );

    if (existingRegistration.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Du bist bereits für diesen Workshop-Termin angemeldet'
      });
    }

    // Workshop-Anmeldung erstellen
    const result = await query(
      `INSERT INTO workshop_registrations 
       (user_id, workshop_type, workshop_date, company, experience, goals, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        'kickstart',
        workshopDate,
        company || null,
        experience || null,
        goals,
        message || null,
        'registered'
      ]
    );

    const registration = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Workshop-Anmeldung erfolgreich erstellt',
      data: {
        id: registration.id,
        workshopDate: registration.workshop_date,
        company: registration.company,
        experience: registration.experience,
        goals: registration.goals,
        message: registration.message,
        status: registration.status,
        createdAt: registration.created_at
      }
    });

  } catch (error) {
    console.error('Workshop-Registrierung Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Interner Server-Fehler',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Workshop-Anmeldungen eines Benutzers abrufen
router.get('/my-registrations', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.sub;

    const result = await query(
      `SELECT 
        wr.*,
        u.name as user_name,
        u.email as user_email
       FROM workshop_registrations wr
       JOIN users u ON wr.user_id = u.id
       WHERE wr.user_id = $1
       ORDER BY wr.workshop_date DESC`,
      [userId]
    );

    const registrations = result.rows.map(row => ({
      id: row.id,
      workshopType: row.workshop_type,
      workshopDate: row.workshop_date,
      company: row.company,
      experience: row.experience,
      goals: row.goals,
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: {
        name: row.user_name,
        email: row.user_email
      }
    }));

    res.json({
      success: true,
      data: registrations
    });

  } catch (error) {
    console.error('Workshop-Anmeldungen abrufen Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Interner Server-Fehler',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Workshop-Anmeldung aktualisieren
router.put('/:id', verifyJWT, async (req, res) => {
  try {
    const registrationId = req.params.id;
    const userId = req.user.sub;
    const { company, experience, goals, message } = req.body;

    // Prüfen ob die Anmeldung dem Benutzer gehört
    const existingRegistration = await query(
      'SELECT * FROM workshop_registrations WHERE id = $1 AND user_id = $2',
      [registrationId, userId]
    );

    if (existingRegistration.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Workshop-Anmeldung nicht gefunden'
      });
    }

    // Anmeldung aktualisieren
    const result = await query(
      `UPDATE workshop_registrations 
       SET company = $1, experience = $2, goals = $3, message = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [company, experience, goals, message, registrationId, userId]
    );

    const updatedRegistration = result.rows[0];

    res.json({
      success: true,
      message: 'Workshop-Anmeldung erfolgreich aktualisiert',
      data: {
        id: updatedRegistration.id,
        workshopDate: updatedRegistration.workshop_date,
        company: updatedRegistration.company,
        experience: updatedRegistration.experience,
        goals: updatedRegistration.goals,
        message: updatedRegistration.message,
        status: updatedRegistration.status,
        updatedAt: updatedRegistration.updated_at
      }
    });

  } catch (error) {
    console.error('Workshop-Anmeldung aktualisieren Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Interner Server-Fehler',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Workshop-Anmeldung stornieren
router.delete('/:id', verifyJWT, async (req, res) => {
  try {
    const registrationId = req.params.id;
    const userId = req.user.sub;

    // Prüfen ob die Anmeldung dem Benutzer gehört
    const existingRegistration = await query(
      'SELECT * FROM workshop_registrations WHERE id = $1 AND user_id = $2',
      [registrationId, userId]
    );

    if (existingRegistration.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Workshop-Anmeldung nicht gefunden'
      });
    }

    // Anmeldung stornieren (Status auf cancelled setzen)
    await query(
      'UPDATE workshop_registrations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['cancelled', registrationId]
    );

    res.json({
      success: true,
      message: 'Workshop-Anmeldung erfolgreich storniert'
    });

  } catch (error) {
    console.error('Workshop-Anmeldung stornieren Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Interner Server-Fehler',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Alle Workshop-Anmeldungen abrufen (Admin-Funktion)
router.get('/all', verifyJWT, async (req, res) => {
  try {
    // Prüfen ob Benutzer Admin ist
    if (!req.user.roles || !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Zugriff verweigert. Admin-Berechtigung erforderlich.'
      });
    }

    const result = await query(
      `SELECT 
        wr.*,
        u.name as user_name,
        u.email as user_email
       FROM workshop_registrations wr
       JOIN users u ON wr.user_id = u.id
       ORDER BY wr.workshop_date DESC, wr.created_at DESC`
    );

    const registrations = result.rows.map(row => ({
      id: row.id,
      workshopType: row.workshop_type,
      workshopDate: row.workshop_date,
      company: row.company,
      experience: row.experience,
      goals: row.goals,
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email
      }
    }));

    res.json({
      success: true,
      data: registrations
    });

  } catch (error) {
    console.error('Alle Workshop-Anmeldungen abrufen Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Interner Server-Fehler',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
