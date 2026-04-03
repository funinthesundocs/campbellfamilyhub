/*
  # Optimize RLS Policies - Part 3

  1. Performance Improvements
    - Replace auth.uid() with (select auth.uid()) in RLS policies
    - Tables: reservations, property_blackout_dates, property_projects, properties, project_updates
*/

DROP POLICY IF EXISTS "Admins can manage all reservations" ON reservations;
CREATE POLICY "Admins can manage all reservations" ON reservations
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

DROP POLICY IF EXISTS "Users can create reservations" ON reservations;
CREATE POLICY "Users can create reservations" ON reservations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own pending reservations" ON reservations;
CREATE POLICY "Users can update own pending reservations" ON reservations
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()) AND status = 'pending')
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can manage blackout dates" ON property_blackout_dates;
CREATE POLICY "Admins can manage blackout dates" ON property_blackout_dates
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

DROP POLICY IF EXISTS "Admins can manage projects" ON property_projects;
CREATE POLICY "Admins can manage projects" ON property_projects
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

DROP POLICY IF EXISTS "Project creators can update" ON property_projects;
CREATE POLICY "Project creators can update" ON property_projects
  FOR UPDATE TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can propose projects" ON property_projects;
CREATE POLICY "Users can propose projects" ON property_projects
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can manage properties" ON properties;
CREATE POLICY "Admins can manage properties" ON properties
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

DROP POLICY IF EXISTS "Users can post updates" ON project_updates;
CREATE POLICY "Users can post updates" ON project_updates
  FOR INSERT TO authenticated
  WITH CHECK (posted_by = (select auth.uid()));
