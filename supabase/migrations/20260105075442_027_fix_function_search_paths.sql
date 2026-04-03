/*
  # Fix Function Search Paths

  1. Security Improvements
    - Set immutable search_path for all functions to prevent search path manipulation attacks
    - Functions updated: update_updated_at_column, update_campaign_total, update_joke_votes

  2. Changes
    - Recreate functions with SET search_path = public
*/

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_campaign_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE crowdfunding_campaigns
    SET current_amount = current_amount + NEW.amount
    WHERE id = NEW.campaign_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE crowdfunding_campaigns
    SET current_amount = current_amount - OLD.amount
    WHERE id = OLD.campaign_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE crowdfunding_campaigns
    SET current_amount = current_amount - OLD.amount + NEW.amount
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_joke_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE jokes
    SET upvote_count = upvote_count + NEW.vote_value
    WHERE id = NEW.joke_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE jokes
    SET upvote_count = upvote_count - OLD.vote_value
    WHERE id = OLD.joke_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE jokes
    SET upvote_count = upvote_count - OLD.vote_value + NEW.vote_value
    WHERE id = NEW.joke_id;
  END IF;
  RETURN NEW;
END;
$$;
