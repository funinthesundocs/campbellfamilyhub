/*
  # Add Reservation Pricing and Payment Tracking

  1. Changes to Reservations Table
    - `nights_count` (integer) - Calculated number of nights in reservation
    - `nightly_rate` (numeric) - Snapshot of property rate at booking time
    - `cleaning_fee` (numeric) - Snapshot of cleaning fee at booking time
    - `subtotal` (numeric) - nights_count × nightly_rate
    - `total_amount` (numeric) - subtotal + cleaning_fee
    - `deposit_amount` (numeric) - Required deposit amount
    - `deposit_paid_at` (timestamptz) - Timestamp when deposit was paid
    - `balance_paid_at` (timestamptz) - Timestamp when balance was paid
    - `payment_status` (enum) - Payment workflow status
    - `stripe_payment_intent_id` (text) - Stripe payment intent ID for tracking
    - `stripe_deposit_intent_id` (text) - Stripe deposit payment intent ID
  
  2. Payment Status Values
    - 'pending' - Reservation submitted, awaiting admin approval
    - 'awaiting_deposit' - Approved, deposit payment required
    - 'deposit_paid' - Deposit received, balance due before check-in
    - 'fully_paid' - All payments complete, reservation confirmed
    - 'refunded' - Payment refunded, reservation cancelled
  
  3. Purpose
    - Track complete pricing breakdown for each reservation
    - Snapshot pricing at booking time (prevents retroactive changes)
    - Manage payment workflow from approval to confirmation
    - Prepare for Stripe integration with payment intent tracking
  
  4. Notes
    - Pricing fields are populated when reservation is created
    - Payment status transitions: pending → awaiting_deposit → deposit_paid → fully_paid
    - Stripe fields are NULL until payment processing is implemented
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'nights_count'
  ) THEN
    ALTER TABLE reservations ADD COLUMN nights_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'nightly_rate'
  ) THEN
    ALTER TABLE reservations ADD COLUMN nightly_rate numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'cleaning_fee'
  ) THEN
    ALTER TABLE reservations ADD COLUMN cleaning_fee numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE reservations ADD COLUMN subtotal numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE reservations ADD COLUMN total_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'deposit_amount'
  ) THEN
    ALTER TABLE reservations ADD COLUMN deposit_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'deposit_paid_at'
  ) THEN
    ALTER TABLE reservations ADD COLUMN deposit_paid_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'balance_paid_at'
  ) THEN
    ALTER TABLE reservations ADD COLUMN balance_paid_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE reservations ADD COLUMN payment_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'stripe_payment_intent_id'
  ) THEN
    ALTER TABLE reservations ADD COLUMN stripe_payment_intent_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'stripe_deposit_intent_id'
  ) THEN
    ALTER TABLE reservations ADD COLUMN stripe_deposit_intent_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reservations_payment_status_check'
  ) THEN
    ALTER TABLE reservations ADD CONSTRAINT reservations_payment_status_check 
      CHECK (payment_status IN ('pending', 'awaiting_deposit', 'deposit_paid', 'fully_paid', 'refunded'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reservations_payment_status ON reservations(payment_status, status);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON reservations(property_id, start_date, end_date) WHERE status IN ('approved', 'pending');