/*
  # Update Recipe Categories to Comprehensive List

  1. Changes
    - Drop existing `recipes_category_check` constraint
    - Update existing recipes to use new category values
    - Add new comprehensive category constraint with 20 categories

  2. New Categories (20 total)
    - `appetizers-small-bites` - Finger foods, hors d'oeuvres, starters
    - `soups-stews` - All hot and cold soups, chowders, bisques, stews
    - `salads` - Green salads, grain salads, pasta salads, slaws
    - `breakfast-brunch` - Eggs, pancakes, waffles, quiche, breakfast casseroles
    - `main-poultry` - Chicken, turkey, duck dishes
    - `main-beef-lamb` - Steaks, roasts, ground beef, lamb
    - `main-pork` - Chops, roasts, ham, bacon dishes
    - `main-seafood` - Fish, shellfish, seafood mains
    - `main-vegetarian` - Meatless mains, plant-based entrees
    - `pasta-rice-grains` - Pasta dishes, risotto, grain bowls, pilafs
    - `vegetables-sides` - Vegetable sides, casseroles, gratins
    - `breads-rolls` - Yeast breads, quick breads, biscuits, rolls
    - `sauces-gravies-condiments` - Pan sauces, gravies, marinades, relishes
    - `dips-spreads` - Party dips, compound butters, spreads
    - `stocks-broths` - Homemade stocks, bone broths, bases
    - `desserts-cakes` - Cakes, pies, tarts, puddings, custards
    - `cookies-bars-pastries` - Cookies, brownies, bars, danish, croissants
    - `beverages-cocktails` - Drinks, smoothies, cocktails, punches
    - `preserves-jams-pickles` - Canning, preserving, pickling, fermenting
    - `other` - Anything that doesn't fit the above

  3. Migration Strategy
    - Drop old constraint first
    - Map old categories to new categories
    - Add new constraint with comprehensive list
    - Existing recipes will be updated to use closest matching new category
    - Default unmapped categories to 'other'

  4. Notes
    - This does not break existing recipes
    - All existing categories are mapped to new equivalents
    - Category display labels should be handled in frontend
*/

-- Step 1: Drop the old constraint first
ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_category_check;

-- Step 2: Update existing recipes to use new category names
UPDATE recipes SET category = 'appetizers-small-bites' WHERE category = 'appetizers';
UPDATE recipes SET category = 'main-poultry' WHERE category = 'main-dishes';
UPDATE recipes SET category = 'vegetables-sides' WHERE category = 'sides';
UPDATE recipes SET category = 'desserts-cakes' WHERE category = 'desserts';
UPDATE recipes SET category = 'beverages-cocktails' WHERE category = 'drinks';
UPDATE recipes SET category = 'breakfast-brunch' WHERE category = 'breakfast';
UPDATE recipes SET category = 'other' WHERE category = 'thanksgiving-classics';

-- Step 3: Add the new comprehensive constraint
ALTER TABLE recipes ADD CONSTRAINT recipes_category_check CHECK (
  category IN (
    'appetizers-small-bites',
    'soups-stews',
    'salads',
    'breakfast-brunch',
    'main-poultry',
    'main-beef-lamb',
    'main-pork',
    'main-seafood',
    'main-vegetarian',
    'pasta-rice-grains',
    'vegetables-sides',
    'breads-rolls',
    'sauces-gravies-condiments',
    'dips-spreads',
    'stocks-broths',
    'desserts-cakes',
    'cookies-bars-pastries',
    'beverages-cocktails',
    'preserves-jams-pickles',
    'other'
  )
);
