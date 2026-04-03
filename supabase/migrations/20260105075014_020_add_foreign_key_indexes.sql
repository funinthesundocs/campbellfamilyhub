/*
  # Add Indexes to Foreign Key Columns

  1. Performance Improvements
    - Add indexes to all foreign key columns that were missing them
    - This improves JOIN performance and DELETE cascade operations

  2. Tables Affected
    - albums (created_by)
    - campaign_contributions (campaign_id, user_id)
    - campaign_updates (campaign_id, posted_by)
    - comments (parent_comment_id, user_id)
    - crowdfunding_campaigns (created_by, related_project_id)
    - family_relationships (related_user_id)
    - invite_codes (created_by, used_by)
    - joke_votes (user_id)
    - jokes (submitted_by)
    - media_album_items (media_id)
    - media_tags (tag_id, tagged_by)
    - member_invites (used_by)
    - music_likes (user_id)
    - music_recommendations (added_by)
    - payments (recorded_by, related_project_id, related_reservation_id)
    - poll_options (poll_id)
    - poll_votes (option_id, user_id)
    - polls (created_by)
    - project_updates (posted_by, project_id)
    - property_attribute_values (attribute_id)
    - property_blackout_dates (created_by, property_id)
    - property_projects (assigned_to, created_by, property_id)
    - recipe_ratings (user_id)
    - reservations (reviewed_by, user_id)
    - stories (submitted_by)
    - tags (linked_user_id)
*/

CREATE INDEX IF NOT EXISTS idx_albums_created_by ON albums(created_by);

CREATE INDEX IF NOT EXISTS idx_campaign_contributions_campaign_id ON campaign_contributions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contributions_user_id ON campaign_contributions(user_id);

CREATE INDEX IF NOT EXISTS idx_campaign_updates_campaign_id ON campaign_updates(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_updates_posted_by ON campaign_updates(posted_by);

CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

CREATE INDEX IF NOT EXISTS idx_crowdfunding_campaigns_created_by ON crowdfunding_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_crowdfunding_campaigns_related_project_id ON crowdfunding_campaigns(related_project_id);

CREATE INDEX IF NOT EXISTS idx_family_relationships_related_user_id ON family_relationships(related_user_id);

CREATE INDEX IF NOT EXISTS idx_invite_codes_created_by ON invite_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_invite_codes_used_by ON invite_codes(used_by);

CREATE INDEX IF NOT EXISTS idx_joke_votes_user_id ON joke_votes(user_id);

CREATE INDEX IF NOT EXISTS idx_jokes_submitted_by ON jokes(submitted_by);

CREATE INDEX IF NOT EXISTS idx_media_album_items_media_id ON media_album_items(media_id);

CREATE INDEX IF NOT EXISTS idx_media_tags_tag_id ON media_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_media_tags_tagged_by ON media_tags(tagged_by);

CREATE INDEX IF NOT EXISTS idx_member_invites_used_by ON member_invites(used_by);

CREATE INDEX IF NOT EXISTS idx_music_likes_user_id ON music_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_music_recommendations_added_by ON music_recommendations(added_by);

CREATE INDEX IF NOT EXISTS idx_payments_recorded_by ON payments(recorded_by);
CREATE INDEX IF NOT EXISTS idx_payments_related_project_id ON payments(related_project_id);
CREATE INDEX IF NOT EXISTS idx_payments_related_reservation_id ON payments(related_reservation_id);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);

CREATE INDEX IF NOT EXISTS idx_poll_votes_option_id ON poll_votes(option_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON poll_votes(user_id);

CREATE INDEX IF NOT EXISTS idx_polls_created_by ON polls(created_by);

CREATE INDEX IF NOT EXISTS idx_project_updates_posted_by ON project_updates(posted_by);
CREATE INDEX IF NOT EXISTS idx_project_updates_project_id ON project_updates(project_id);

CREATE INDEX IF NOT EXISTS idx_property_attribute_values_attribute_id ON property_attribute_values(attribute_id);

CREATE INDEX IF NOT EXISTS idx_property_blackout_dates_created_by ON property_blackout_dates(created_by);
CREATE INDEX IF NOT EXISTS idx_property_blackout_dates_property_id ON property_blackout_dates(property_id);

CREATE INDEX IF NOT EXISTS idx_property_projects_assigned_to ON property_projects(assigned_to);
CREATE INDEX IF NOT EXISTS idx_property_projects_created_by ON property_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_property_projects_property_id ON property_projects(property_id);

CREATE INDEX IF NOT EXISTS idx_recipe_ratings_user_id ON recipe_ratings(user_id);

CREATE INDEX IF NOT EXISTS idx_reservations_reviewed_by ON reservations(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);

CREATE INDEX IF NOT EXISTS idx_stories_submitted_by ON stories(submitted_by);

CREATE INDEX IF NOT EXISTS idx_tags_linked_user_id ON tags(linked_user_id);
