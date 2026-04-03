/*
  # Add Property Pricing and Reservation Policies

  1. Changes to Properties Table
    - `price_per_night` (numeric) - Nightly rental rate
    - `cleaning_fee` (numeric) - One-time cleaning charge per reservation
    - `minimum_stay_days` (integer) - Minimum reservation length required
    - `maximum_stay_days` (integer) - Maximum reservation length allowed (optional)
    - `minimum_deposit` (numeric) - Required upfront deposit amount
  
  2. Purpose
    - Enable property-level pricing configuration
    - Define booking policies (min/max stay requirements)
    - Set deposit requirements for reservations
    - Allow admin to manage pricing through the Edit Property form
  
  3. Notes
    - All pricing fields are required for active properties
    - Minimum stay defaults to 1 day
    - Maximum stay is optional (NULL means no limit)
    - Prices are stored at property level and snapshotted at booking time
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'price_per_night'
  ) THEN
    ALTER TABLE properties ADD COLUMN price_per_night numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'cleaning_fee'
  ) THEN
    ALTER TABLE properties ADD COLUMN cleaning_fee numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'minimum_stay_days'
  ) THEN
    ALTER TABLE properties ADD COLUMN minimum_stay_days integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'maximum_stay_days'
  ) THEN
    ALTER TABLE properties ADD COLUMN maximum_stay_days integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'minimum_deposit'
  ) THEN
    ALTER TABLE properties ADD COLUMN minimum_deposit numeric DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_properties_pricing ON properties(is_active, price_per_night) WHERE is_active = true;