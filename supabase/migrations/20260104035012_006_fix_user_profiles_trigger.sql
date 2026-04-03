/*
  # Fix user profile creation trigger
  
  1. Changes
    - Update handle_new_user function to use SECURITY DEFINER
    - This allows the trigger to bypass RLS when creating user profiles
    
  2. Security
    - Function is owned by postgres and runs with elevated privileges only for the specific insert operation
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;