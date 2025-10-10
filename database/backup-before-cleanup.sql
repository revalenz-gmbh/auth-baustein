-- ============================================================================
-- QUICK BACKUP: Wichtige Daten vor Cleanup sichern
-- ============================================================================
-- 
-- Dieses Script erstellt Backup-Tabellen mit allen wichtigen Daten.
-- Falls etwas schiefgeht, können die Daten wiederhergestellt werden.
-- 
-- Führe dieses Script ZUERST aus, BEVOR du cleanup-oauth-only.sql ausführst
-- ============================================================================

-- 1. Backup der Users-Tabelle
-- ============================================================================
CREATE TABLE IF NOT EXISTS users_backup_20241008 AS 
SELECT * FROM users;

SELECT COUNT(*) as backed_up_users FROM users_backup_20241008;

-- 2. Backup der Tenants-Tabelle
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenants_backup_20241008 AS 
SELECT * FROM tenants;

SELECT COUNT(*) as backed_up_tenants FROM tenants_backup_20241008;

-- 3. Backup der Workshop-Registrierungen
-- ============================================================================
CREATE TABLE IF NOT EXISTS workshop_registrations_backup_20241008 AS 
SELECT * FROM workshop_registrations;

SELECT COUNT(*) as backed_up_workshops FROM workshop_registrations_backup_20241008;

-- ============================================================================
-- BACKUP ERFOLGREICH!
-- ============================================================================
-- 
-- Die folgenden Backup-Tabellen wurden erstellt:
-- - users_backup_20241008
-- - tenants_backup_20241008
-- - workshop_registrations_backup_20241008
-- 
-- Falls du die Daten wiederherstellen musst:
-- 
-- INSERT INTO users SELECT * FROM users_backup_20241008 ON CONFLICT DO NOTHING;
-- INSERT INTO tenants SELECT * FROM tenants_backup_20241008 ON CONFLICT DO NOTHING;
-- INSERT INTO workshop_registrations SELECT * FROM workshop_registrations_backup_20241008 ON CONFLICT DO NOTHING;
-- 
-- Backup-Tabellen löschen (nach erfolgreicher Migration):
-- DROP TABLE users_backup_20241008;
-- DROP TABLE tenants_backup_20241008;
-- DROP TABLE workshop_registrations_backup_20241008;
-- 
-- ============================================================================

