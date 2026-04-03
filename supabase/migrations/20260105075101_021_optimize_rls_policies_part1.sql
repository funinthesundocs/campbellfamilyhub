/*
  # Optimize RLS Policies - Part 1

  1. Performance Improvements
    - Replace auth.uid() with (select auth.uid()) in RLS policies
    - This prevents re-evaluation of auth functions for each row
    - Improves query performance at scale

  2. Tables Updated (Part 1)
    - hub_settings
    - user_profiles
    - family_relationships
    - invite_codes
    - albums
    - media_files
    - media_album_items
    - media_tags
*/

DROP POLICY IF EXISTS "Admins can modify hub settings" ON hub_settings;
CREATE POLICY "Admins can modify hub settings" ON hub_settings
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

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update profiles" ON user_profiles;
CREATE POLICY "Users can update profiles" ON user_profiles
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()) OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_admin = true
  ))
  WITH CHECK (id = (select auth.uid()) OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_admin = true
  ));

DROP POLICY IF EXISTS "Users can manage own relationships" ON family_relationships;
CREATE POLICY "Users can manage own relationships" ON family_relationships
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can manage invite codes" ON invite_codes;
CREATE POLICY "Admins can manage invite codes" ON invite_codes
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

DROP POLICY IF EXISTS "Users can create albums" ON albums;
CREATE POLICY "Users can create albums" ON albums
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own albums" ON albums;
CREATE POLICY "Users can delete own albums" ON albums
  FOR DELETE TO authenticated
  USING (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own albums" ON albums;
CREATE POLICY "Users can update own albums" ON albums
  FOR UPDATE TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own media" ON media_files;
CREATE POLICY "Users can delete own media" ON media_files
  FOR DELETE TO authenticated
  USING (uploaded_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own media" ON media_files;
CREATE POLICY "Users can update own media" ON media_files
  FOR UPDATE TO authenticated
  USING (uploaded_by = (select auth.uid()))
  WITH CHECK (uploaded_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can upload media" ON media_files;
CREATE POLICY "Users can upload media" ON media_files
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = (select auth.uid()));

DROP POLICY IF EXISTS "Album owners can manage items" ON media_album_items;
CREATE POLICY "Album owners can manage items" ON media_album_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = media_album_items.album_id
      AND albums.created_by = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = media_album_items.album_id
      AND albums.created_by = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Tag owners can remove tags" ON media_tags;
CREATE POLICY "Tag owners can remove tags" ON media_tags
  FOR DELETE TO authenticated
  USING (tagged_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can tag media" ON media_tags;
CREATE POLICY "Users can tag media" ON media_tags
  FOR INSERT TO authenticated
  WITH CHECK (tagged_by = (select auth.uid()));
