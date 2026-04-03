/*
  # Normalize Property Amenities

  1. Changes
    - Replace duplicate amenity names with canonical versions
    - Kitchen -> Full Kitchen
    - Air Conditioning -> Central A/C
    - Central AC -> Central A/C
    - Grill -> BBQ Grill
    - Dock -> Private Dock
    - Firepit -> Fire Pit

  2. Notes
    - Uses array manipulation to update amenities
    - Removes duplicates after normalization
*/

UPDATE properties
SET amenities = (
  SELECT array_agg(DISTINCT 
    CASE 
      WHEN elem = 'Kitchen' THEN 'Full Kitchen'
      WHEN elem = 'Air Conditioning' THEN 'Central A/C'
      WHEN elem = 'Central AC' THEN 'Central A/C'
      WHEN elem = 'Grill' THEN 'BBQ Grill'
      WHEN elem = 'Dock' THEN 'Private Dock'
      WHEN elem = 'Firepit' THEN 'Fire Pit'
      ELSE elem
    END
  )
  FROM unnest(amenities) AS elem
)
WHERE amenities IS NOT NULL;