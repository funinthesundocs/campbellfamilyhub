/*
  # Create Music Recommendations Table

  1. New Tables
    - `music_recommendations`
      - `id` (uuid, primary key)
      - `title` (text, required) - Song or album title
      - `artist` (text) - Artist name
      - `album` (text) - Album name
      - `url` (text) - Link to streaming platform
      - `platform` (text) - Detected platform (spotify, apple, youtube, etc.)
      - `notes` (text) - Personal note about why they recommend it
      - `added_by` (uuid, foreign key) - User who added it
      - `like_count` (integer) - Number of likes
      - `created_at` (timestamptz)

    - `music_likes`
      - `id` (uuid, primary key)
      - `music_id` (uuid, foreign key) - Reference to music item
      - `user_id` (uuid, foreign key) - User who liked
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Authenticated users can view all music
    - Users can add their own recommendations
    - Users can delete their own recommendations
    - Users can like music once
*/

CREATE TABLE IF NOT EXISTS music_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text,
  album text,
  url text,
  platform text,
  notes text,
  added_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  like_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS music_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  music_id uuid NOT NULL REFERENCES music_recommendations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(music_id, user_id)
);

ALTER TABLE music_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all music"
  ON music_recommendations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add music recommendations"
  ON music_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = added_by);

CREATE POLICY "Users can update their own music"
  ON music_recommendations FOR UPDATE
  TO authenticated
  USING (auth.uid() = added_by)
  WITH CHECK (auth.uid() = added_by);

CREATE POLICY "Users can delete their own music"
  ON music_recommendations FOR DELETE
  TO authenticated
  USING (auth.uid() = added_by);

CREATE POLICY "Authenticated users can view music likes"
  ON music_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like music"
  ON music_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike music"
  ON music_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
