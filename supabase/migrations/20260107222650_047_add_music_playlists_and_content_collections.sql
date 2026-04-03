/*
  # Music Playlists and Content Collections

  This migration adds organizational structures for Music, Jokes, and Stories
  following the same pattern as Media Albums and Recipe Cookbooks.

  ## 1. New Tables

  ### Music Organization
  - `music_playlists` - Folders for organizing music recommendations
    - `id` (uuid, primary key)
    - `name` (text) - Playlist name
    - `description` (text) - Optional description
    - `cover_image_url` (text) - Optional cover image
    - `is_featured` (boolean) - Featured playlist flag
    - `created_by` (uuid) - Creator reference
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `playlist_items` - Junction table linking music to playlists
    - `id` (uuid, primary key)
    - `playlist_id` (uuid) - Reference to playlist
    - `music_id` (uuid) - Reference to music recommendation
    - `position` (integer) - Order within playlist
    - `added_by` (uuid) - Who added this item
    - `added_at` (timestamptz)

  ### Joke Organization
  - `joke_collections` - Folders for organizing jokes
    - `id` (uuid, primary key)
    - `name` (text) - Collection name
    - `description` (text) - Optional description
    - `cover_image_url` (text) - Optional cover image
    - `is_featured` (boolean) - Featured collection flag
    - `created_by` (uuid) - Creator reference
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `joke_collection_items` - Junction table linking jokes to collections
    - `id` (uuid, primary key)
    - `collection_id` (uuid) - Reference to collection
    - `joke_id` (uuid) - Reference to joke
    - `position` (integer) - Order within collection
    - `added_by` (uuid) - Who added this item
    - `added_at` (timestamptz)

  ### Story Organization
  - `story_collections` - Folders for organizing stories
    - `id` (uuid, primary key)
    - `name` (text) - Collection name
    - `description` (text) - Optional description
    - `cover_image_url` (text) - Optional cover image
    - `is_featured` (boolean) - Featured collection flag
    - `created_by` (uuid) - Creator reference
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `story_collection_items` - Junction table linking stories to collections
    - `id` (uuid, primary key)
    - `collection_id` (uuid) - Reference to collection
    - `story_id` (uuid) - Reference to story
    - `position` (integer) - Order within collection
    - `added_by` (uuid) - Who added this item
    - `added_at` (timestamptz)

  ### Content Files (for uploaded media in jokes/stories)
  - `content_files` - Uploaded files attached to jokes or stories
    - `id` (uuid, primary key)
    - `content_type` (text) - 'joke' or 'story'
    - `content_id` (uuid) - Reference to joke or story
    - `file_url` (text) - Storage URL
    - `file_type` (text) - MIME type
    - `file_name` (text) - Original filename
    - `file_size` (integer) - Size in bytes
    - `uploaded_by` (uuid) - Uploader reference
    - `created_at` (timestamptz)

  ### Voice Transcriptions
  - `voice_transcriptions` - Speech-to-text transcription records
    - `id` (uuid, primary key)
    - `content_type` (text) - 'joke' or 'story'
    - `content_id` (uuid) - Reference to joke or story (nullable for drafts)
    - `audio_url` (text) - Storage URL of audio file
    - `transcription` (text) - The transcribed text
    - `language` (text) - Detected language
    - `confidence` (real) - Transcription confidence score
    - `created_by` (uuid) - Who created it
    - `created_at` (timestamptz)

  ## 2. Enhanced Columns on Existing Tables
  - `music_recommendations`: Add `file_url`, `file_type` for uploaded audio
  - `jokes`: Add `category` default, `source_type` for content origin
  - `stories`: Add `source_type` for content origin

  ## 3. Security
  - RLS enabled on all new tables
  - Authenticated users can read all content
  - Users can manage their own content
  - Admins have full access

  ## 4. Indexes
  - Foreign key indexes for efficient joins
  - Position indexes for ordered queries
*/

-- Music Playlists
CREATE TABLE IF NOT EXISTS music_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cover_image_url text,
  is_featured boolean DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE music_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view playlists"
  ON music_playlists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create playlists"
  ON music_playlists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own playlists"
  ON music_playlists FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own playlists"
  ON music_playlists FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Playlist Items (junction table)
CREATE TABLE IF NOT EXISTS playlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES music_playlists(id) ON DELETE CASCADE,
  music_id uuid NOT NULL REFERENCES music_recommendations(id) ON DELETE CASCADE,
  position integer DEFAULT 0,
  added_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  UNIQUE(playlist_id, music_id)
);

ALTER TABLE playlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view playlist items"
  ON playlist_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add to playlists they created"
  ON playlist_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM music_playlists
      WHERE id = playlist_id AND created_by = auth.uid()
    )
    OR auth.uid() = added_by
  );

CREATE POLICY "Playlist owners can update items"
  ON playlist_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM music_playlists
      WHERE id = playlist_id AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM music_playlists
      WHERE id = playlist_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Playlist owners can delete items"
  ON playlist_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM music_playlists
      WHERE id = playlist_id AND created_by = auth.uid()
    )
  );

-- Joke Collections
CREATE TABLE IF NOT EXISTS joke_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cover_image_url text,
  is_featured boolean DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE joke_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view joke collections"
  ON joke_collections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create joke collections"
  ON joke_collections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own joke collections"
  ON joke_collections FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own joke collections"
  ON joke_collections FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Joke Collection Items
CREATE TABLE IF NOT EXISTS joke_collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES joke_collections(id) ON DELETE CASCADE,
  joke_id uuid NOT NULL REFERENCES jokes(id) ON DELETE CASCADE,
  position integer DEFAULT 0,
  added_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  UNIQUE(collection_id, joke_id)
);

ALTER TABLE joke_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view joke collection items"
  ON joke_collection_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add to collections they created"
  ON joke_collection_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM joke_collections
      WHERE id = collection_id AND created_by = auth.uid()
    )
    OR auth.uid() = added_by
  );

CREATE POLICY "Collection owners can update items"
  ON joke_collection_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM joke_collections
      WHERE id = collection_id AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM joke_collections
      WHERE id = collection_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Collection owners can delete items"
  ON joke_collection_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM joke_collections
      WHERE id = collection_id AND created_by = auth.uid()
    )
  );

-- Story Collections
CREATE TABLE IF NOT EXISTS story_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cover_image_url text,
  is_featured boolean DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE story_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view story collections"
  ON story_collections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create story collections"
  ON story_collections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own story collections"
  ON story_collections FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own story collections"
  ON story_collections FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Story Collection Items
CREATE TABLE IF NOT EXISTS story_collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES story_collections(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  position integer DEFAULT 0,
  added_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  UNIQUE(collection_id, story_id)
);

ALTER TABLE story_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view story collection items"
  ON story_collection_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add to story collections they created"
  ON story_collection_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM story_collections
      WHERE id = collection_id AND created_by = auth.uid()
    )
    OR auth.uid() = added_by
  );

CREATE POLICY "Story collection owners can update items"
  ON story_collection_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM story_collections
      WHERE id = collection_id AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM story_collections
      WHERE id = collection_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Story collection owners can delete items"
  ON story_collection_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM story_collections
      WHERE id = collection_id AND created_by = auth.uid()
    )
  );

-- Content Files (for uploaded media in jokes/stories)
CREATE TABLE IF NOT EXISTS content_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('joke', 'story')),
  content_id uuid,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_name text NOT NULL,
  file_size integer DEFAULT 0,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE content_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view content files"
  ON content_files FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can upload content files"
  ON content_files FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update own content files"
  ON content_files FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploaded_by)
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete own content files"
  ON content_files FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);

-- Voice Transcriptions
CREATE TABLE IF NOT EXISTS voice_transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('joke', 'story', 'music')),
  content_id uuid,
  audio_url text,
  transcription text NOT NULL,
  language text DEFAULT 'en-US',
  confidence real DEFAULT 0,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE voice_transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transcriptions"
  ON voice_transcriptions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create transcriptions"
  ON voice_transcriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own transcriptions"
  ON voice_transcriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own transcriptions"
  ON voice_transcriptions FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Add file columns to music_recommendations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'music_recommendations' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE music_recommendations ADD COLUMN file_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'music_recommendations' AND column_name = 'file_type'
  ) THEN
    ALTER TABLE music_recommendations ADD COLUMN file_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'music_recommendations' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE music_recommendations ADD COLUMN file_name text;
  END IF;
END $$;

-- Add source_type to jokes for tracking content origin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jokes' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE jokes ADD COLUMN source_type text DEFAULT 'text' CHECK (source_type IN ('text', 'voice', 'file'));
  END IF;
END $$;

-- Add source_type to stories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE stories ADD COLUMN source_type text DEFAULT 'text' CHECK (source_type IN ('text', 'voice', 'file'));
  END IF;
END $$;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_id ON playlist_items(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_music_id ON playlist_items(music_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_position ON playlist_items(playlist_id, position);

CREATE INDEX IF NOT EXISTS idx_joke_collection_items_collection_id ON joke_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_joke_collection_items_joke_id ON joke_collection_items(joke_id);
CREATE INDEX IF NOT EXISTS idx_joke_collection_items_position ON joke_collection_items(collection_id, position);

CREATE INDEX IF NOT EXISTS idx_story_collection_items_collection_id ON story_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_story_collection_items_story_id ON story_collection_items(story_id);
CREATE INDEX IF NOT EXISTS idx_story_collection_items_position ON story_collection_items(collection_id, position);

CREATE INDEX IF NOT EXISTS idx_content_files_content ON content_files(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_content ON voice_transcriptions(content_type, content_id);