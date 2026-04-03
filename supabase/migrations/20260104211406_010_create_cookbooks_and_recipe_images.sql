/*
  # Create Cookbooks System and Recipe Images Support

  1. New Tables
    - `cookbooks`
      - `id` (uuid, primary key)
      - `title` (text, required) - Name of the cookbook
      - `description` (text, nullable) - Description of the cookbook
      - `cover_image_url` (text, nullable) - Cover image for the cookbook
      - `cookbook_type` (text) - Type: general, holiday, seasonal, family-favorites, quick-meals, special-occasions
      - `is_featured` (boolean) - Whether cookbook is featured
      - `created_by` (uuid, FK to user_profiles) - Creator of the cookbook
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `cookbook_recipes`
      - `id` (uuid, primary key)
      - `cookbook_id` (uuid, FK to cookbooks)
      - `recipe_id` (uuid, FK to recipes)
      - `sort_order` (integer) - For ordering recipes within cookbook
      - `added_at` (timestamptz)

  2. Schema Changes
    - Add `image_url` column to `recipe_ingredients` for ingredient photos
    - Add `instruction_images` JSONB column to `recipes` for step-by-step photos

  3. Security
    - Enable RLS on new tables
    - Authenticated users can read all cookbooks
    - Users can manage their own cookbooks
    - Admins can manage all cookbooks

  4. Data Migration
    - Create default "Thanksgiving Classics" cookbook
    - Migrate recipes with is_thanksgiving_classic = true to this cookbook
*/

-- Create cookbooks table
CREATE TABLE IF NOT EXISTS cookbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_image_url text,
  cookbook_type text DEFAULT 'general' CHECK (cookbook_type IN ('general', 'holiday', 'seasonal', 'family-favorites', 'quick-meals', 'special-occasions')),
  is_featured boolean DEFAULT false,
  created_by uuid NOT NULL REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create cookbook_recipes junction table
CREATE TABLE IF NOT EXISTS cookbook_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cookbook_id uuid NOT NULL REFERENCES cookbooks(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  added_at timestamptz DEFAULT now(),
  UNIQUE(cookbook_id, recipe_id)
);

-- Add image_url to recipe_ingredients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipe_ingredients' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE recipe_ingredients ADD COLUMN image_url text;
  END IF;
END $$;

-- Add instruction_images JSONB to recipes (stores {step_index: image_url})
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'instruction_images'
  ) THEN
    ALTER TABLE recipes ADD COLUMN instruction_images jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Enable RLS on cookbooks
ALTER TABLE cookbooks ENABLE ROW LEVEL SECURITY;

-- Enable RLS on cookbook_recipes
ALTER TABLE cookbook_recipes ENABLE ROW LEVEL SECURITY;

-- Cookbooks policies
CREATE POLICY "Authenticated users can view all cookbooks"
  ON cookbooks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create cookbooks"
  ON cookbooks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own cookbooks"
  ON cookbooks FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
  ))
  WITH CHECK (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
  ));

CREATE POLICY "Users can delete own cookbooks"
  ON cookbooks FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
  ));

-- Cookbook_recipes policies
CREATE POLICY "Authenticated users can view cookbook recipes"
  ON cookbook_recipes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add recipes to cookbooks they own"
  ON cookbook_recipes FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM cookbooks WHERE id = cookbook_id AND (created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
    ))
  ));

CREATE POLICY "Users can remove recipes from cookbooks they own"
  ON cookbook_recipes FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM cookbooks WHERE id = cookbook_id AND (created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
    ))
  ));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cookbook_recipes_cookbook_id ON cookbook_recipes(cookbook_id);
CREATE INDEX IF NOT EXISTS idx_cookbook_recipes_recipe_id ON cookbook_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_cookbooks_created_by ON cookbooks(created_by);

-- Create default Thanksgiving Classics cookbook and migrate existing recipes
-- This runs as a DO block to handle the case where there might be no admin user yet
DO $$
DECLARE
  admin_user_id uuid;
  thanksgiving_cookbook_id uuid;
BEGIN
  -- Find an admin user to be the owner of the default cookbook
  SELECT id INTO admin_user_id FROM user_profiles WHERE is_admin = true LIMIT 1;
  
  -- If no admin exists, find any user
  IF admin_user_id IS NULL THEN
    SELECT id INTO admin_user_id FROM user_profiles LIMIT 1;
  END IF;
  
  -- Only proceed if we have a user
  IF admin_user_id IS NOT NULL THEN
    -- Check if Thanksgiving Classics cookbook already exists
    SELECT id INTO thanksgiving_cookbook_id FROM cookbooks WHERE title = 'Thanksgiving Classics' LIMIT 1;
    
    -- Create the cookbook if it doesn't exist
    IF thanksgiving_cookbook_id IS NULL THEN
      INSERT INTO cookbooks (title, description, cookbook_type, is_featured, created_by)
      VALUES (
        'Thanksgiving Classics',
        'Traditional family recipes that make our Thanksgiving celebrations special',
        'holiday',
        true,
        admin_user_id
      )
      RETURNING id INTO thanksgiving_cookbook_id;
    END IF;
    
    -- Migrate recipes with is_thanksgiving_classic = true
    INSERT INTO cookbook_recipes (cookbook_id, recipe_id, sort_order)
    SELECT thanksgiving_cookbook_id, id, ROW_NUMBER() OVER (ORDER BY created_at)
    FROM recipes
    WHERE is_thanksgiving_classic = true
    ON CONFLICT (cookbook_id, recipe_id) DO NOTHING;
  END IF;
END $$;
