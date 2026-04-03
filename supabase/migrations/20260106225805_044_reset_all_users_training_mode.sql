/*
  # Reset All Users Training Mode to Off

  1. Changes
    - Set training_mode = false for ALL existing users
    - This is a one-time reset to align with the new default behavior
    - Users can turn training mode back on manually if they want it

  2. Rationale
    - Previous migration only changed the default for NEW users
    - Existing users still had training_mode = true from old default
    - This ensures everyone starts with training mode OFF
    - Users must actively opt-in to training mode

  3. Safety
    - No data loss - only flipping a boolean flag
    - Users can re-enable training mode at any time via the toggle switch
*/

-- Reset all existing users to have training mode OFF
UPDATE user_profiles 
SET training_mode = false 
WHERE training_mode = true;
