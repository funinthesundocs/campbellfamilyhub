/*
  # Optimize RLS Policies - Part 2

  1. Performance Improvements
    - Replace auth.uid() with (select auth.uid()) in RLS policies
    - Tables: recipe_ratings, recipes, jokes, joke_votes, stories
*/

DROP POLICY IF EXISTS "Users can delete own ratings" ON recipe_ratings;
CREATE POLICY "Users can delete own ratings" ON recipe_ratings
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can rate recipes" ON recipe_ratings;
CREATE POLICY "Users can rate recipes" ON recipe_ratings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own ratings" ON recipe_ratings;
CREATE POLICY "Users can update own ratings" ON recipe_ratings
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can delete any recipe" ON recipes;
CREATE POLICY "Admins can delete any recipe" ON recipes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update any recipe" ON recipes;
CREATE POLICY "Admins can update any recipe" ON recipes
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

DROP POLICY IF EXISTS "Users can create recipes" ON recipes;
CREATE POLICY "Users can create recipes" ON recipes
  FOR INSERT TO authenticated
  WITH CHECK (submitted_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own recipes" ON recipes;
CREATE POLICY "Users can delete own recipes" ON recipes
  FOR DELETE TO authenticated
  USING (submitted_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own recipes" ON recipes;
CREATE POLICY "Users can update own recipes" ON recipes
  FOR UPDATE TO authenticated
  USING (submitted_by = (select auth.uid()))
  WITH CHECK (submitted_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can add jokes" ON jokes;
CREATE POLICY "Users can add jokes" ON jokes
  FOR INSERT TO authenticated
  WITH CHECK (submitted_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own jokes" ON jokes;
CREATE POLICY "Users can delete own jokes" ON jokes
  FOR DELETE TO authenticated
  USING (submitted_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own jokes" ON jokes;
CREATE POLICY "Users can update own jokes" ON jokes
  FOR UPDATE TO authenticated
  USING (submitted_by = (select auth.uid()))
  WITH CHECK (submitted_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can change vote" ON joke_votes;
CREATE POLICY "Users can change vote" ON joke_votes
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can remove vote" ON joke_votes;
CREATE POLICY "Users can remove vote" ON joke_votes
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can vote" ON joke_votes;
CREATE POLICY "Users can vote" ON joke_votes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can add stories" ON stories;
CREATE POLICY "Users can add stories" ON stories
  FOR INSERT TO authenticated
  WITH CHECK (submitted_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own stories" ON stories;
CREATE POLICY "Users can delete own stories" ON stories
  FOR DELETE TO authenticated
  USING (submitted_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own stories" ON stories;
CREATE POLICY "Users can update own stories" ON stories
  FOR UPDATE TO authenticated
  USING (submitted_by = (select auth.uid()))
  WITH CHECK (submitted_by = (select auth.uid()));
