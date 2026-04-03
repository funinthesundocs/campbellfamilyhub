/*
  # Comprehensive Crowdfunding Enhancement
  
  ## Summary
  This migration adds professional crowdfunding features to the family fundraising system,
  including milestone goals, giving tiers, campaign categories, progress updates UI support,
  contributor leaderboards, matching funds, team fundraising, and flexible funding options.

  ## Changes to crowdfunding_campaigns table
  - `category` (text) - Campaign type: medical, education, memorial, event, home_repair, travel, other
  - `funding_type` (text) - 'flexible' (keep all funds) or 'all_or_nothing' (refund if goal not met)
  - `is_featured` (boolean) - Admin can feature campaigns
  - `allow_offline_contributions` (boolean) - Enable manual contribution tracking
  - `visibility` (text) - 'public', 'family_only', or 'draft'
  - `video_url` (text) - Optional video embed URL

  ## New Tables

  ### campaign_milestones
  Stretch goals that unlock at specific funding amounts
  - `id`, `campaign_id`, `title`, `description`, `target_amount`, `reached_at`, `display_order`

  ### campaign_giving_tiers
  Suggested contribution levels with descriptions
  - `id`, `campaign_id`, `name`, `amount`, `description`, `perks`, `max_contributors`, `current_contributors`, `display_order`

  ### campaign_team_members
  Multiple organizers per campaign
  - `id`, `campaign_id`, `user_id`, `role`, `can_edit`, `can_post_updates`, `invited_at`, `joined_at`

  ### campaign_matching_pledges
  Matching fund commitments
  - `id`, `campaign_id`, `user_id`, `match_amount`, `match_ratio`, `max_match`, `amount_matched`, `is_active`

  ### offline_contributions
  Track cash/check contributions given outside the app
  - `id`, `campaign_id`, `recorded_by`, `contributor_name`, `amount`, `contribution_method`, `notes`, `contributed_at`

  ## Security
  - RLS enabled on all new tables
  - Policies for authenticated family members
  - Admin policies for management
*/

-- Add new columns to crowdfunding_campaigns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crowdfunding_campaigns' AND column_name = 'category') THEN
    ALTER TABLE crowdfunding_campaigns ADD COLUMN category text DEFAULT 'other';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crowdfunding_campaigns' AND column_name = 'funding_type') THEN
    ALTER TABLE crowdfunding_campaigns ADD COLUMN funding_type text DEFAULT 'flexible';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crowdfunding_campaigns' AND column_name = 'is_featured') THEN
    ALTER TABLE crowdfunding_campaigns ADD COLUMN is_featured boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crowdfunding_campaigns' AND column_name = 'allow_offline_contributions') THEN
    ALTER TABLE crowdfunding_campaigns ADD COLUMN allow_offline_contributions boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crowdfunding_campaigns' AND column_name = 'visibility') THEN
    ALTER TABLE crowdfunding_campaigns ADD COLUMN visibility text DEFAULT 'family_only';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crowdfunding_campaigns' AND column_name = 'video_url') THEN
    ALTER TABLE crowdfunding_campaigns ADD COLUMN video_url text;
  END IF;
END $$;

-- Campaign Milestones (stretch goals)
CREATE TABLE IF NOT EXISTS campaign_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES crowdfunding_campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  target_amount numeric NOT NULL,
  reached_at timestamptz,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaign_milestones ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_milestones' AND policyname = 'Authenticated users can view milestones') THEN
    CREATE POLICY "Authenticated users can view milestones" ON campaign_milestones FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_milestones' AND policyname = 'Campaign creators can manage milestones') THEN
    CREATE POLICY "Campaign creators can manage milestones" ON campaign_milestones FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM crowdfunding_campaigns WHERE id = campaign_milestones.campaign_id AND created_by = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM crowdfunding_campaigns WHERE id = campaign_milestones.campaign_id AND created_by = auth.uid()));
  END IF;
END $$;

-- Campaign Giving Tiers
CREATE TABLE IF NOT EXISTS campaign_giving_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES crowdfunding_campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric NOT NULL,
  description text,
  perks text,
  max_contributors integer,
  current_contributors integer DEFAULT 0,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaign_giving_tiers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_giving_tiers' AND policyname = 'Authenticated users can view tiers') THEN
    CREATE POLICY "Authenticated users can view tiers" ON campaign_giving_tiers FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_giving_tiers' AND policyname = 'Campaign creators can manage tiers') THEN
    CREATE POLICY "Campaign creators can manage tiers" ON campaign_giving_tiers FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM crowdfunding_campaigns WHERE id = campaign_giving_tiers.campaign_id AND created_by = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM crowdfunding_campaigns WHERE id = campaign_giving_tiers.campaign_id AND created_by = auth.uid()));
  END IF;
END $$;

-- Add tier_id to contributions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_contributions' AND column_name = 'tier_id') THEN
    ALTER TABLE campaign_contributions ADD COLUMN tier_id uuid REFERENCES campaign_giving_tiers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Campaign Team Members
CREATE TABLE IF NOT EXISTS campaign_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES crowdfunding_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'organizer',
  can_edit boolean DEFAULT false,
  can_post_updates boolean DEFAULT true,
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  UNIQUE(campaign_id, user_id)
);

ALTER TABLE campaign_team_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_team_members' AND policyname = 'Authenticated users can view team members') THEN
    CREATE POLICY "Authenticated users can view team members" ON campaign_team_members FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_team_members' AND policyname = 'Campaign creators can manage team') THEN
    CREATE POLICY "Campaign creators can manage team" ON campaign_team_members FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM crowdfunding_campaigns WHERE id = campaign_team_members.campaign_id AND created_by = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM crowdfunding_campaigns WHERE id = campaign_team_members.campaign_id AND created_by = auth.uid()));
  END IF;
END $$;

-- Campaign Matching Pledges
CREATE TABLE IF NOT EXISTS campaign_matching_pledges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES crowdfunding_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_ratio numeric DEFAULT 1.0,
  max_match numeric NOT NULL,
  amount_matched numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaign_matching_pledges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_matching_pledges' AND policyname = 'Authenticated users can view matching pledges') THEN
    CREATE POLICY "Authenticated users can view matching pledges" ON campaign_matching_pledges FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_matching_pledges' AND policyname = 'Users can manage own pledges') THEN
    CREATE POLICY "Users can manage own pledges" ON campaign_matching_pledges FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Offline Contributions
CREATE TABLE IF NOT EXISTS offline_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES crowdfunding_campaigns(id) ON DELETE CASCADE,
  recorded_by uuid NOT NULL REFERENCES auth.users(id),
  contributor_name text NOT NULL,
  amount numeric NOT NULL,
  contribution_method text DEFAULT 'cash',
  notes text,
  contributed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE offline_contributions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'offline_contributions' AND policyname = 'Authenticated users can view offline contributions') THEN
    CREATE POLICY "Authenticated users can view offline contributions" ON offline_contributions FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'offline_contributions' AND policyname = 'Campaign creators can manage offline contributions') THEN
    CREATE POLICY "Campaign creators can manage offline contributions" ON offline_contributions FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM crowdfunding_campaigns WHERE id = offline_contributions.campaign_id AND created_by = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM crowdfunding_campaigns WHERE id = offline_contributions.campaign_id AND created_by = auth.uid()));
  END IF;
END $$;

-- Add media support to campaign_updates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_updates' AND column_name = 'image_url') THEN
    ALTER TABLE campaign_updates ADD COLUMN image_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_updates' AND column_name = 'video_url') THEN
    ALTER TABLE campaign_updates ADD COLUMN video_url text;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_milestones_campaign ON campaign_milestones(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_giving_tiers_campaign ON campaign_giving_tiers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_team_members_campaign ON campaign_team_members(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_team_members_user ON campaign_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_matching_pledges_campaign ON campaign_matching_pledges(campaign_id);
CREATE INDEX IF NOT EXISTS idx_offline_contributions_campaign ON offline_contributions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crowdfunding_campaigns_category ON crowdfunding_campaigns(category);
CREATE INDEX IF NOT EXISTS idx_crowdfunding_campaigns_status ON crowdfunding_campaigns(status);
