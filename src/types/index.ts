export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  cover_photo_url: string | null;
  bio: string | null;
  birthday: string | null;
  phone: string | null;
  location: string | null;
  relationship_type: string | null;
  generation: number | null;
  user_type: 'family' | 'guest' | 'admin';
  is_admin: boolean;
  is_super_admin: boolean;
  is_active: boolean;
  theme_preference: 'light' | 'dark' | 'system';
  email_notifications: boolean;
  training_mode?: boolean;
  training_progress?: {
    tour_completed: boolean;
    dismissed_tips: string[];
    current_step: number;
  };
  last_seen_at: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface MemberInvite {
  id: string;
  code: string;
  email: string | null;
  created_by: string | null;
  used_by: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  creator?: UserProfile;
  user?: UserProfile;
}

export interface HubSettings {
  id: string;
  hub_name: string;
  tagline: string | null;
  associated_family_names: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  default_theme: 'light' | 'dark' | 'system';
  contact_email: string | null;
  enable_reservations: boolean;
  enable_crowdfunding: boolean;
  enable_recipes: boolean;
  enable_media: boolean;
  enable_polls: boolean;
}

export interface Property {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  cover_image_url: string | null;
  photo_urls: string[] | null;
  gallery_order: string[] | null;
  amenities: string[];
  house_rules: string | null;
  max_guests: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_type: string | null;
  custom_attributes: Record<string, number | string | boolean> | null;
  price_per_night: number;
  cleaning_fee: number;
  minimum_stay_days: number;
  maximum_stay_days: number | null;
  minimum_deposit: number;
  is_active: boolean;
}

export interface PropertyAttribute {
  id: string;
  name: string;
  key: string;
  type: 'number' | 'text' | 'boolean' | 'select';
  options: string[];
  is_required: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Reservation {
  id: string;
  property_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  guest_count: number;
  guests_names: string | null;
  notes: string | null;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  nights_count: number;
  nightly_rate: number;
  cleaning_fee: number;
  subtotal: number;
  total_amount: number;
  deposit_amount: number;
  deposit_paid_at: string | null;
  balance_paid_at: string | null;
  deposit_due_date: string | null;
  balance_due_date: string | null;
  payment_status: 'pending' | 'awaiting_deposit' | 'deposit_paid' | 'fully_paid' | 'refunded';
  stripe_payment_intent_id: string | null;
  stripe_deposit_intent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReservationChangeRequest {
  id: string;
  reservation_id: string;
  requested_by: string;
  original_start_date: string;
  original_end_date: string;
  requested_start_date: string;
  requested_end_date: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'denied';
  reviewed_by: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  id?: string;
  recipe_id?: string;
  quantity: number | null;
  quantity_display: string | null;
  unit: string | null;
  name: string;
  notes: string | null;
  is_header: boolean;
  sort_order: number;
  image_url?: string | null;
  created_at?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  category: string;
  ingredients: string[];
  instructions: string[];
  instruction_images?: Record<number, string>;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  tips: string | null;
  source: string | null;
  original_author: string | null;
  is_thanksgiving_classic: boolean;
  is_featured: boolean;
  submitted_by: string;
  times_made_count: number;
  created_at: string;
  updated_at: string;
  structured_ingredients?: RecipeIngredient[];
}

export interface RecipeWithCookbooks extends Recipe {
  cookbookNames?: string[];
  avgRating?: number;
  ratingCount?: number;
  dietary_restrictions?: string[];
  cuisine_type?: string;
  view_count?: number;
}

export type PollType = 'general' | 'event-date' | 'location' | 'name-vote' | 'priority' | 'rating' | 'ranking' | 'open_text' | 'image_choice';

export interface Poll {
  id: string;
  title: string;
  description: string | null;
  poll_type: PollType;
  closes_at: string;
  allow_multiple_choices: boolean;
  is_anonymous: boolean;
  show_results_before_close: boolean;
  is_featured: boolean;
  rating_scale: number;
  allow_vote_change: boolean;
  starts_at: string | null;
  recurrence_pattern: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  parent_poll_id: string | null;
  template_id: string | null;
  reminder_sent_at: string | null;
  participation_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  image_url: string | null;
  sort_order: number;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
}

export interface PollTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  poll_type: PollType;
  default_title: string | null;
  default_description: string | null;
  default_options: string[];
  default_settings: {
    allow_multiple_choices?: boolean;
    is_anonymous?: boolean;
    show_results_before_close?: boolean;
    rating_scale?: number;
    allow_vote_change?: boolean;
  };
  is_system: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PollComment {
  id: string;
  poll_id: string;
  option_id: string | null;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
  replies?: PollComment[];
}

export interface PollRanking {
  id: string;
  poll_id: string;
  user_id: string;
  option_id: string;
  rank_position: number;
  created_at: string;
  updated_at: string;
}

export interface PollTextResponse {
  id: string;
  poll_id: string;
  user_id: string;
  response_text: string;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
}

export interface PollRating {
  id: string;
  poll_id: string;
  user_id: string;
  rating_value: number;
  created_at: string;
  updated_at: string;
}

export interface PollVoteHistory {
  id: string;
  poll_id: string;
  user_id: string;
  previous_option_id: string | null;
  new_option_id: string | null;
  previous_value: string | null;
  new_value: string | null;
  vote_type: 'choice' | 'rating' | 'ranking' | 'text';
  changed_at: string;
}

export type CampaignCategory = 'medical' | 'education' | 'memorial' | 'event' | 'home_repair' | 'travel' | 'other';
export type CampaignFundingType = 'flexible' | 'all_or_nothing';
export type CampaignVisibility = 'public' | 'family_only' | 'draft';

export interface CrowdfundingCampaign {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  video_url: string | null;
  goal_amount: number;
  current_amount: number;
  minimum_contribution: number;
  deadline: string;
  status: 'draft' | 'active' | 'successful' | 'unsuccessful' | 'cancelled';
  category: CampaignCategory;
  funding_type: CampaignFundingType;
  visibility: CampaignVisibility;
  is_featured: boolean;
  allow_offline_contributions: boolean;
  thank_you_message: string | null;
  related_project_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignMilestone {
  id: string;
  campaign_id: string;
  title: string;
  description: string | null;
  target_amount: number;
  reached_at: string | null;
  display_order: number;
  created_at: string;
}

export interface CampaignGivingTier {
  id: string;
  campaign_id: string;
  name: string;
  amount: number;
  description: string | null;
  perks: string | null;
  max_contributors: number | null;
  current_contributors: number;
  display_order: number;
  created_at: string;
}

export interface CampaignContribution {
  id: string;
  campaign_id: string;
  user_id: string;
  amount: number;
  message: string | null;
  is_anonymous: boolean;
  tier_id: string | null;
  contributed_at: string;
  created_at: string;
  user?: UserProfile;
}

export interface CampaignUpdate {
  id: string;
  campaign_id: string;
  title: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  posted_by: string;
  created_at: string;
  user?: UserProfile;
}

export interface CampaignTeamMember {
  id: string;
  campaign_id: string;
  user_id: string;
  role: string;
  can_edit: boolean;
  can_post_updates: boolean;
  invited_at: string;
  joined_at: string | null;
  user?: UserProfile;
}

export interface CampaignMatchingPledge {
  id: string;
  campaign_id: string;
  user_id: string;
  match_ratio: number;
  max_match: number;
  amount_matched: number;
  is_active: boolean;
  message: string | null;
  created_at: string;
  user?: UserProfile;
}

export interface OfflineContribution {
  id: string;
  campaign_id: string;
  recorded_by: string;
  contributor_name: string;
  amount: number;
  contribution_method: string;
  notes: string | null;
  contributed_at: string;
  created_at: string;
}

export interface MediaFile {
  id: string;
  title: string | null;
  description: string | null;
  file_url: string;
  thumbnail_url: string | null;
  media_type: 'photo' | 'video' | 'audio';
  file_size: number | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  taken_at: string | null;
  location_name: string | null;
  uploaded_by: string;
  is_featured: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface MediaWithAlbums extends MediaFile {
  albumNames?: string[];
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface Story {
  id: string;
  title: string;
  content: string;
  story_date: string | null;
  decade: string | null;
  cover_image_url: string | null;
  related_media_ids: string[] | null;
  submitted_by: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface Joke {
  id: string;
  content: string;
  punchline: string | null;
  category: string;
  submitted_by: string;
  upvote_count: number;
  created_at: string;
}

export interface Album {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  album_type: string;
  event_date: string | null;
  is_featured: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Cookbook {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  cookbook_type: 'general' | 'holiday' | 'seasonal' | 'family-favorites' | 'quick-meals' | 'special-occasions';
  is_featured: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ThemeSettings {
  id: string;
  theme_name: 'original' | 'dark' | 'light' | 'custom';
  bg_primary: string;
  bg_secondary: string;
  bg_tertiary: string;
  text_primary: string;
  text_secondary: string;
  text_muted: string;
  accent_primary: string;
  accent_secondary: string;
  border_default: string;
  border_interactive: string;
  updated_at: string;
}

export interface MusicRecommendation {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  url: string | null;
  platform: string | null;
  notes: string | null;
  file_url: string | null;
  file_type: string | null;
  file_name: string | null;
  added_by: string;
  like_count: number;
  created_at: string;
  user_profiles?: {
    display_name: string;
  };
}

export interface MusicWithPlaylists extends MusicRecommendation {
  playlistNames?: string[];
}

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_featured: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface JokeCollection {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_featured: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface JokeWithCollections extends Joke {
  collectionNames?: string[];
}

export interface StoryCollection {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_featured: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface StoryWithCollections extends Story {
  collectionNames?: string[];
  user_profiles?: {
    display_name: string;
  };
}

export interface ContentFile {
  id: string;
  content_type: 'joke' | 'story';
  content_id: string | null;
  file_url: string;
  file_type: string;
  file_name: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export interface VoiceTranscription {
  id: string;
  content_type: 'joke' | 'story' | 'music';
  content_id: string | null;
  audio_url: string | null;
  transcription: string;
  language: string;
  confidence: number;
  created_by: string;
  created_at: string;
}
