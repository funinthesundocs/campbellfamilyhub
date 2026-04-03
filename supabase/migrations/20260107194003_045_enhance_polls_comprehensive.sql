/*
  # Comprehensive Poll System Enhancement

  This migration adds advanced polling features to transform the basic poll system
  into a full-featured family decision-making platform.

  ## 1. Enhanced Poll Types
    - `rating`: Star/scale-based polls (1-5, 1-10)
    - `ranking`: Drag-to-prioritize polls
    - `open_text`: Free-form text responses
    - `image_choice`: Visual option selection

  ## 2. New Columns on `polls` Table
    - `rating_scale` (integer): Scale for rating polls (default 5)
    - `allow_vote_change` (boolean): Whether users can change their vote
    - `starts_at` (timestamptz): Future scheduling support
    - `recurrence_pattern` (text): For recurring polls (daily, weekly, monthly, yearly)
    - `parent_poll_id` (uuid): Links recurring poll instances
    - `template_id` (uuid): Reference to poll template
    - `reminder_sent_at` (timestamptz): Track when reminder was sent
    - `participation_count` (integer): Cached voter count

  ## 3. New Columns on `poll_options` Table
    - `image_url` (text): Image for visual polls

  ## 4. New Tables
    - `poll_templates`: Pre-built poll templates
    - `poll_comments`: Discussion on polls
    - `poll_vote_history`: Track vote changes
    - `poll_rankings`: Store ranking votes
    - `poll_text_responses`: Store open text responses
    - `poll_ratings`: Store rating votes

  ## 5. Security
    - RLS enabled on all new tables
    - Authenticated users can read polls
    - Users can manage their own votes/comments
    - Admins can manage templates
*/

-- Add new columns to polls table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'polls' AND column_name = 'rating_scale'
  ) THEN
    ALTER TABLE polls ADD COLUMN rating_scale integer DEFAULT 5;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'polls' AND column_name = 'allow_vote_change'
  ) THEN
    ALTER TABLE polls ADD COLUMN allow_vote_change boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'polls' AND column_name = 'starts_at'
  ) THEN
    ALTER TABLE polls ADD COLUMN starts_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'polls' AND column_name = 'recurrence_pattern'
  ) THEN
    ALTER TABLE polls ADD COLUMN recurrence_pattern text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'polls' AND column_name = 'parent_poll_id'
  ) THEN
    ALTER TABLE polls ADD COLUMN parent_poll_id uuid REFERENCES polls(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'polls' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE polls ADD COLUMN template_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'polls' AND column_name = 'reminder_sent_at'
  ) THEN
    ALTER TABLE polls ADD COLUMN reminder_sent_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'polls' AND column_name = 'participation_count'
  ) THEN
    ALTER TABLE polls ADD COLUMN participation_count integer DEFAULT 0;
  END IF;
END $$;

-- Add image_url to poll_options
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'poll_options' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE poll_options ADD COLUMN image_url text;
  END IF;
END $$;

-- Create poll_templates table
CREATE TABLE IF NOT EXISTS poll_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  poll_type text NOT NULL DEFAULT 'general',
  default_title text,
  default_description text,
  default_options jsonb DEFAULT '[]'::jsonb,
  default_settings jsonb DEFAULT '{}'::jsonb,
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE poll_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active templates"
  ON poll_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage templates"
  ON poll_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_admin = true OR user_profiles.is_super_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_admin = true OR user_profiles.is_super_admin = true)
    )
  );

-- Create poll_comments table
CREATE TABLE IF NOT EXISTS poll_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id uuid REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES poll_comments(id) ON DELETE CASCADE,
  is_edited boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE poll_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view poll comments"
  ON poll_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON poll_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON poll_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON poll_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create poll_vote_history table (for tracking vote changes)
CREATE TABLE IF NOT EXISTS poll_vote_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_option_id uuid REFERENCES poll_options(id) ON DELETE SET NULL,
  new_option_id uuid REFERENCES poll_options(id) ON DELETE SET NULL,
  previous_value text,
  new_value text,
  vote_type text NOT NULL DEFAULT 'choice',
  changed_at timestamptz DEFAULT now()
);

ALTER TABLE poll_vote_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vote history"
  ON poll_vote_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System inserts vote history"
  ON poll_vote_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create poll_rankings table (for ranking polls)
CREATE TABLE IF NOT EXISTS poll_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  rank_position integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(poll_id, user_id, option_id)
);

ALTER TABLE poll_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rankings"
  ON poll_rankings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage own rankings"
  ON poll_rankings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rankings"
  ON poll_rankings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own rankings"
  ON poll_rankings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create poll_text_responses table (for open text polls)
CREATE TABLE IF NOT EXISTS poll_text_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

ALTER TABLE poll_text_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view text responses"
  ON poll_text_responses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create text responses"
  ON poll_text_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own text responses"
  ON poll_text_responses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own text responses"
  ON poll_text_responses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create poll_ratings table (for rating polls)
CREATE TABLE IF NOT EXISTS poll_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating_value integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

ALTER TABLE poll_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ratings"
  ON poll_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create ratings"
  ON poll_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
  ON poll_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
  ON poll_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_poll_comments_poll_id ON poll_comments(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_comments_user_id ON poll_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_rankings_poll_id ON poll_rankings(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_rankings_user_id ON poll_rankings(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_text_responses_poll_id ON poll_text_responses(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_ratings_poll_id ON poll_ratings(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_vote_history_poll_id ON poll_vote_history(poll_id);
CREATE INDEX IF NOT EXISTS idx_polls_starts_at ON polls(starts_at);
CREATE INDEX IF NOT EXISTS idx_polls_parent_poll_id ON polls(parent_poll_id);

-- Insert default poll templates
INSERT INTO poll_templates (name, description, category, poll_type, default_title, default_options, default_settings, is_system)
VALUES
  ('Quick Yes/No', 'Simple two-option decision', 'decisions', 'general', 'Quick Decision', '["Yes", "No"]'::jsonb, '{"allow_multiple_choices": false}'::jsonb, true),
  ('Event Date', 'Find the best date for an event', 'events', 'event-date', 'When should we meet?', '[]'::jsonb, '{"allow_multiple_choices": true}'::jsonb, true),
  ('Location Choice', 'Choose a location or venue', 'events', 'location', 'Where should we go?', '[]'::jsonb, '{"allow_multiple_choices": false}'::jsonb, true),
  ('RSVP', 'Attendance confirmation', 'events', 'general', 'Will you attend?', '["Yes, I''ll be there!", "Maybe, not sure yet", "Sorry, can''t make it"]'::jsonb, '{"allow_multiple_choices": false}'::jsonb, true),
  ('Food Poll', 'What should we eat?', 'food', 'general', 'What should we have?', '[]'::jsonb, '{"allow_multiple_choices": true}'::jsonb, true),
  ('Rating', 'Rate something on a scale', 'feedback', 'rating', 'How would you rate it?', '[]'::jsonb, '{"rating_scale": 5}'::jsonb, true),
  ('Priority Ranking', 'Rank items by importance', 'decisions', 'ranking', 'Rank these by priority', '[]'::jsonb, '{}'::jsonb, true),
  ('Open Suggestions', 'Collect ideas and suggestions', 'feedback', 'open_text', 'What are your suggestions?', '[]'::jsonb, '{}'::jsonb, true),
  ('Photo Choice', 'Choose from images', 'media', 'image_choice', 'Which one do you prefer?', '[]'::jsonb, '{"allow_multiple_choices": false}'::jsonb, true)
ON CONFLICT DO NOTHING;

-- Add foreign key for template_id now that table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'polls_template_id_fkey'
  ) THEN
    ALTER TABLE polls ADD CONSTRAINT polls_template_id_fkey
      FOREIGN KEY (template_id) REFERENCES poll_templates(id) ON DELETE SET NULL;
  END IF;
END $$;
