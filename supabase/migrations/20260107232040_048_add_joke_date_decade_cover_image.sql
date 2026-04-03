/*
  # Add Date, Decade, and Cover Image to Jokes

  1. Changes
    - Add `joke_date` column (date, nullable) - when the joke was told or originates from
    - Add `decade` column (text, nullable) - decade classification (1940s-2020s)
    - Add `cover_image_url` column (text, nullable) - optional cover image for the joke

  2. Purpose
    - Standardize joke metadata to match family stories format
    - Allow jokes to be organized by time period like stories
*/

ALTER TABLE jokes
ADD COLUMN IF NOT EXISTS joke_date date,
ADD COLUMN IF NOT EXISTS decade text,
ADD COLUMN IF NOT EXISTS cover_image_url text;
