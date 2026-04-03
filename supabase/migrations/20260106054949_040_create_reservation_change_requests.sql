/*
  # Create Reservation Change Requests Table

  1. New Tables
    - `reservation_change_requests`
      - `id` (uuid, primary key)
      - `reservation_id` (uuid, foreign key to reservations)
      - `requested_by` (uuid, foreign key to user_profiles)
      - `original_start_date` (date) - Original check-in date
      - `original_end_date` (date) - Original check-out date
      - `requested_start_date` (date) - New requested check-in date
      - `requested_end_date` (date) - New requested check-out date
      - `reason` (text) - User explanation for the change
      - `status` (text) - pending, approved, denied
      - `reviewed_by` (uuid, foreign key to user_profiles) - Admin who reviewed
      - `admin_notes` (text) - Admin response notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `reservation_change_requests` table
    - Users can view their own change requests
    - Users can create change requests for their own reservations
    - Admins can view all change requests
    - Admins can update change requests (approve/deny)
  
  3. Purpose
    - Allow users to request date changes for existing reservations
    - Track change request history
    - Enable admin review and approval workflow
    - Maintain audit trail of all reservation modifications
*/

CREATE TABLE IF NOT EXISTS reservation_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  original_start_date date NOT NULL,
  original_end_date date NOT NULL,
  requested_start_date date NOT NULL,
  requested_end_date date NOT NULL,
  reason text,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  admin_notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE reservation_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own change requests"
  ON reservation_change_requests FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Users can create change requests for own reservations"
  ON reservation_change_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM reservations
      WHERE id = reservation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update change requests"
  ON reservation_change_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE INDEX IF NOT EXISTS idx_change_requests_reservation ON reservation_change_requests(reservation_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON reservation_change_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_change_requests_user ON reservation_change_requests(requested_by);

CREATE OR REPLACE FUNCTION update_reservation_change_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_reservation_change_requests_timestamp ON reservation_change_requests;
CREATE TRIGGER update_reservation_change_requests_timestamp
  BEFORE UPDATE ON reservation_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_reservation_change_request_timestamp();