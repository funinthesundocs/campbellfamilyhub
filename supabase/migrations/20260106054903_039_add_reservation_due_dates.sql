/*
  # Add Payment Due Dates to Reservations

  1. Changes to Reservations Table
    - `deposit_due_date` (date) - Date by which deposit payment is due
    - `balance_due_date` (date) - Date by which final balance is due
  
  2. Purpose
    - Track payment deadlines for deposit and balance
    - Enable payment schedule display on reservation detail page
    - Support payment reminder notifications
  
  3. Notes
    - Due dates are set when reservation is approved
    - Deposit typically due within 7 days of approval
    - Balance typically due 30 days before check-in
    - These are nullable as they don't apply to pending/denied reservations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'deposit_due_date'
  ) THEN
    ALTER TABLE reservations ADD COLUMN deposit_due_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'balance_due_date'
  ) THEN
    ALTER TABLE reservations ADD COLUMN balance_due_date date;
  END IF;
END $$;