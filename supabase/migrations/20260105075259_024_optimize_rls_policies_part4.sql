/*
  # Optimize RLS Policies - Part 4

  1. Performance Improvements
    - Replace auth.uid() with (select auth.uid()) in RLS policies
    - Tables: polls, poll_options, poll_votes, crowdfunding_campaigns, campaign_contributions, campaign_updates
*/

DROP POLICY IF EXISTS "Admins can create polls" ON polls;
CREATE POLICY "Admins can create polls" ON polls
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Poll creators can update" ON polls;
CREATE POLICY "Poll creators can update" ON polls
  FOR UPDATE TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can manage poll options" ON poll_options;
CREATE POLICY "Admins can manage poll options" ON poll_options
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

DROP POLICY IF EXISTS "Users can change vote" ON poll_votes;
CREATE POLICY "Users can change vote" ON poll_votes
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view votes based on poll settings" ON poll_votes;
CREATE POLICY "Users can view votes based on poll settings" ON poll_votes
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM polls p
      JOIN poll_options po ON po.poll_id = p.id
      WHERE po.id = poll_votes.option_id
      AND (p.is_anonymous = false OR p.closes_at < now())
    )
  );

DROP POLICY IF EXISTS "Users can vote" ON poll_votes;
CREATE POLICY "Users can vote" ON poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can create campaigns" ON crowdfunding_campaigns;
CREATE POLICY "Admins can create campaigns" ON crowdfunding_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Campaign creators can update" ON crowdfunding_campaigns;
CREATE POLICY "Campaign creators can update" ON crowdfunding_campaigns
  FOR UPDATE TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can contribute" ON campaign_contributions;
CREATE POLICY "Users can contribute" ON campaign_contributions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view contributions based on anonymity" ON campaign_contributions;
CREATE POLICY "Users can view contributions based on anonymity" ON campaign_contributions
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR is_anonymous = false
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Campaign creators can post updates" ON campaign_updates;
CREATE POLICY "Campaign creators can post updates" ON campaign_updates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crowdfunding_campaigns c
      WHERE c.id = campaign_updates.campaign_id
      AND c.created_by = (select auth.uid())
    )
  );
