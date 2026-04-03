/*
  # Optimize RLS Policies - Part 6

  1. Performance Improvements
    - Replace auth.uid() with (select auth.uid()) in RLS policies
    - Tables: recipe_ingredients, cookbooks, cookbook_recipes, member_invites, property_attributes, property_attribute_values
*/

DROP POLICY IF EXISTS "Admins can manage all recipe ingredients" ON recipe_ingredients;
CREATE POLICY "Admins can manage all recipe ingredients" ON recipe_ingredients
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can delete ingredients for own recipes" ON recipe_ingredients;
CREATE POLICY "Users can delete ingredients for own recipes" ON recipe_ingredients
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.submitted_by = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert ingredients for own recipes" ON recipe_ingredients;
CREATE POLICY "Users can insert ingredients for own recipes" ON recipe_ingredients
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.submitted_by = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update ingredients for own recipes" ON recipe_ingredients;
CREATE POLICY "Users can update ingredients for own recipes" ON recipe_ingredients
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.submitted_by = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.submitted_by = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create cookbooks" ON cookbooks;
CREATE POLICY "Users can create cookbooks" ON cookbooks
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own cookbooks" ON cookbooks;
CREATE POLICY "Users can delete own cookbooks" ON cookbooks
  FOR DELETE TO authenticated
  USING (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own cookbooks" ON cookbooks;
CREATE POLICY "Users can update own cookbooks" ON cookbooks
  FOR UPDATE TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can add recipes to cookbooks they own" ON cookbook_recipes;
CREATE POLICY "Users can add recipes to cookbooks they own" ON cookbook_recipes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cookbooks
      WHERE cookbooks.id = cookbook_recipes.cookbook_id
      AND cookbooks.created_by = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can remove recipes from cookbooks they own" ON cookbook_recipes;
CREATE POLICY "Users can remove recipes from cookbooks they own" ON cookbook_recipes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cookbooks
      WHERE cookbooks.id = cookbook_recipes.cookbook_id
      AND cookbooks.created_by = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can create invites" ON member_invites;
CREATE POLICY "Admins can create invites" ON member_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete invites" ON member_invites;
CREATE POLICY "Admins can delete invites" ON member_invites
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update invites" ON member_invites;
CREATE POLICY "Admins can update invites" ON member_invites
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can view all invites" ON member_invites;
CREATE POLICY "Admins can view all invites" ON member_invites
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage attributes" ON property_attributes;
CREATE POLICY "Admins can manage attributes" ON property_attributes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete attribute values" ON property_attribute_values;
CREATE POLICY "Admins can delete attribute values" ON property_attribute_values
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage attribute values" ON property_attribute_values;
CREATE POLICY "Admins can manage attribute values" ON property_attribute_values
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update attribute values" ON property_attribute_values;
CREATE POLICY "Admins can update attribute values" ON property_attribute_values
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND is_admin = true
    )
  );
