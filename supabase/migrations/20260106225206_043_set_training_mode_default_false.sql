/*
  # Set Training Mode Default to False

  1. Changes
    - Change default value of `training_mode` column from true to false
    - Users can opt-in to training mode if they want help
    - Existing users with training_mode = true will keep their preference

  2. Notes
    - Does not affect existing user preferences
    - Only changes the default for new users going forward
*/

ALTER TABLE user_profiles
ALTER COLUMN training_mode SET DEFAULT false;
