/*
  # Add New Property Attributes

  1. New Attributes
    - Beds (type: number) - number of beds available
    - Cribs (type: number) - cribs for infants
    - Refrigerators (type: number) - refrigerator count
    - Fold Out Sofas (type: number) - additional sleeping options

  2. Notes
    - All new attributes added to property_attributes table
    - Type set to 'number' for counting items
*/

INSERT INTO property_attributes (name, key, type, display_order)
SELECT 'Beds', 'beds', 'number', 10
WHERE NOT EXISTS (
  SELECT 1 FROM property_attributes WHERE key = 'beds'
);

INSERT INTO property_attributes (name, key, type, display_order)
SELECT 'Cribs', 'cribs', 'number', 11
WHERE NOT EXISTS (
  SELECT 1 FROM property_attributes WHERE key = 'cribs'
);

INSERT INTO property_attributes (name, key, type, display_order)
SELECT 'Refrigerators', 'refrigerators', 'number', 12
WHERE NOT EXISTS (
  SELECT 1 FROM property_attributes WHERE key = 'refrigerators'
);

INSERT INTO property_attributes (name, key, type, display_order)
SELECT 'Fold Out Sofas', 'fold_out_sofas', 'number', 13
WHERE NOT EXISTS (
  SELECT 1 FROM property_attributes WHERE key = 'fold_out_sofas'
);