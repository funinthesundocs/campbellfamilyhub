/*
  # Add Gallery Order to Properties

  1. Changes
    - Add `gallery_order` column to `properties` table
    - Stores ordered array of photo URLs for hero filmstrip
    - First URL in array is the default hero image

  2. Notes
    - Existing properties will have NULL gallery_order
    - Admin can configure order via property edit form
*/

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS gallery_order text[] DEFAULT NULL;