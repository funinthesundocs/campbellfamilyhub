/*
  # Property Custom Attributes System

  1. New Tables
    - `property_attributes`
      - `id` (uuid, primary key)
      - `name` (text) - display name of the attribute
      - `key` (text, unique) - machine-readable key
      - `type` (text) - data type: text, number, boolean, select
      - `options` (jsonb) - for select type, array of options
      - `is_required` (boolean) - whether attribute is required
      - `display_order` (integer) - sort order in forms
      - `is_active` (boolean) - whether attribute is available
      - `created_at` (timestamptz)

    - `property_attribute_values`
      - `id` (uuid, primary key)
      - `property_id` (uuid, FK to properties)
      - `attribute_id` (uuid, FK to property_attributes)
      - `value` (text) - stored as text, parsed based on type
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Authenticated users can read attributes
    - Only admins can manage attributes and values
*/

CREATE TABLE IF NOT EXISTS property_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key text UNIQUE NOT NULL,
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'number', 'boolean', 'select')),
  options jsonb DEFAULT '[]'::jsonb,
  is_required boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_attribute_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  attribute_id uuid NOT NULL REFERENCES property_attributes(id) ON DELETE CASCADE,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(property_id, attribute_id)
);

ALTER TABLE property_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_attribute_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active attributes"
  ON property_attributes
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage attributes"
  ON property_attributes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Authenticated users can view attribute values"
  ON property_attribute_values
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage attribute values"
  ON property_attribute_values
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update attribute values"
  ON property_attribute_values
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete attribute values"
  ON property_attribute_values
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_property_attributes_active ON property_attributes(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_property_attribute_values_property ON property_attribute_values(property_id);
