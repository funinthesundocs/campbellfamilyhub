/*
  # Optimize RLS Policies - Part 5

  1. Performance Improvements
    - Replace auth.uid() with (select auth.uid()) in RLS policies
    - Tables: music_recommendations, music_likes, payments, notifications, activity_log, comments
*/

DROP POLICY IF EXISTS "Users can add music recommendations" ON music_recommendations;
CREATE POLICY "Users can add music recommendations" ON music_recommendations
  FOR INSERT TO authenticated
  WITH CHECK (added_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own music" ON music_recommendations;
CREATE POLICY "Users can delete their own music" ON music_recommendations
  FOR DELETE TO authenticated
  USING (added_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own music" ON music_recommendations;
CREATE POLICY "Users can update their own music" ON music_recommendations
  FOR UPDATE TO authenticated
  USING (added_by = (select auth.uid()))
  WITH CHECK (added_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can like music" ON music_likes;
CREATE POLICY "Users can like music" ON music_likes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can unlike music" ON music_likes;
CREATE POLICY "Users can unlike music" ON music_likes
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can manage payments" ON payments;
CREATE POLICY "Admins can manage payments" ON payments
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

DROP POLICY IF EXISTS "Users can view own payments" ON payments;
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "System can log activity" ON activity_log;
CREATE POLICY "System can log activity" ON activity_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can add comments" ON comments;
CREATE POLICY "Users can add comments" ON comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own comments" ON comments;
CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
