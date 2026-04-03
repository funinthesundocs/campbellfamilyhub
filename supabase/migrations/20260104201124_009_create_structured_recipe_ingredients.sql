/*
  # Structured Recipe Ingredients System

  1. New Tables
    - `recipe_ingredients`
      - `id` (uuid, primary key)
      - `recipe_id` (uuid, references recipes)
      - `quantity` (numeric, nullable) - the numeric amount (e.g., 2, 0.5)
      - `quantity_display` (text, nullable) - display format (e.g., "1/2", "2-3")
      - `unit` (text, nullable) - measurement unit (e.g., "cups", "tbsp")
      - `name` (text) - ingredient name (e.g., "all-purpose flour")
      - `notes` (text, nullable) - preparation notes (e.g., "sifted", "diced")
      - `is_header` (boolean) - for section headers like "For the sauce:"
      - `sort_order` (integer) - display order
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `recipe_ingredients` table
    - Authenticated users can read all ingredients
    - Recipe owners can insert/update/delete their recipe ingredients
    - Admins can manage all ingredients

  3. Changes
    - Adds structured ingredient support for intelligent scaling
    - Preserves original jsonb ingredients field for backwards compatibility
*/

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  quantity numeric,
  quantity_display text,
  unit text,
  name text NOT NULL,
  notes text,
  is_header boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_sort_order ON recipe_ingredients(recipe_id, sort_order);

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all recipe ingredients"
  ON recipe_ingredients
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert ingredients for own recipes"
  ON recipe_ingredients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.submitted_by = auth.uid()
    )
  );

CREATE POLICY "Users can update ingredients for own recipes"
  ON recipe_ingredients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.submitted_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.submitted_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete ingredients for own recipes"
  ON recipe_ingredients
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.submitted_by = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all recipe ingredients"
  ON recipe_ingredients
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