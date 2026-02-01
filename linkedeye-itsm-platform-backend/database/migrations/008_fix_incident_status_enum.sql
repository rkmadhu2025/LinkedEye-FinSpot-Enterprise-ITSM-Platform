-- Migration: Fix IncidentStatus enum values
-- The Python enum previously had duplicate values (NEW='open', ASSIGNED='open', CLOSED='closed', CANCELLED='closed').
-- This migration updates existing rows to use the new unique enum values.
--
-- Run this BEFORE deploying the updated backend code.

BEGIN;

-- Update 'open' status incidents:
-- Incidents with an assigned_to_id are ASSIGNED, others are NEW
UPDATE incidents
SET status = 'assigned'
WHERE status = 'open'
  AND assigned_to_id IS NOT NULL;

UPDATE incidents
SET status = 'new'
WHERE status = 'open';

-- Update 'closed' status incidents that should be CANCELLED:
-- Incidents without resolution data are likely cancelled
UPDATE incidents
SET status = 'cancelled'
WHERE status = 'closed'
  AND resolved_at IS NULL
  AND resolution_notes IS NULL;

-- Verify no 'open' values remain
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM incidents WHERE status = 'open') THEN
        RAISE EXCEPTION 'Migration failed: "open" status values still exist';
    END IF;
END $$;

COMMIT;
