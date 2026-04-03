import type { LucideIcon } from 'lucide-react';
import {
  Image, UtensilsCrossed, Building2, Calendar, Heart, Settings, Users, ClipboardList, BarChart3
} from 'lucide-react';
import type { SectionId } from '../../contexts/TrainingContext';

export interface TourStep {
  id: string;
  title: string;
  content: string;
  target?: string;
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  action?: string;
}

export interface TooltipContent {
  id: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface SectionWelcome {
  title: string;
  content: string;
  icon?: LucideIcon;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to the Campbell Family Hub!',
    content: "This is your family's digital home—a place to share memories, recipes, coordinate property visits, and stay connected.\n\nYou'll find everything organized into clear sections: Media for photos and videos, Recipes for family dishes, Properties for vacation bookings, Polls for decisions, and more. The navigation is simple—just click around and explore.\n\nClick your name in the top right to access your profile and settings. Use the theme switcher to choose between light and dark modes.",
    position: 'center',
    action: 'Next'
  },
  {
    id: 'training',
    title: 'How the Help System Works',
    content: "See the \"Help\" toggle in the top navigation? That's your training mode.\n\nWhen turned ON (gold), helpful tips appear as you explore. Just hover over elements to see explanations. When you understand a feature, click \"Got it!\" to dismiss the tip.\n\nWhen turned OFF, the interface is clean with no tooltips.\n\nYou can toggle it anytime, and you can restart this welcome tour from your profile settings.\n\nThat's it—you're ready to explore!",
    position: 'center',
    action: 'Start Exploring'
  }
];

export const SECTION_WELCOMES: Record<SectionId, SectionWelcome> = {
  media: {
    title: 'Media Gallery',
    content: "This is your family's photo and video library. Here you can:\n\n• Upload photos, videos, and audio files\n• Organize media into albums for easy browsing\n• Select multiple items to move or delete them\n• Drag and drop files directly onto albums\n• Use different view modes (grid or masonry)\n• Search and filter to find specific memories\n\nLook for the flashing indicators on interactive elements to learn more about each feature.",
    icon: Image
  },
  recipes: {
    title: 'Family Recipes',
    content: "Welcome to the family cookbook! This is where treasured recipes live.\n\n• Browse recipes by category, cuisine, or difficulty\n• Create cookbooks to organize your favorites\n• Use Cook Mode for hands-free cooking with large text\n• Scale servings up or down automatically\n• Rate recipes and see family favorites\n• Drag recipes onto cookbooks to organize them\n\nEach recipe shows prep time, cook time, and servings at a glance.",
    icon: UtensilsCrossed
  },
  'properties-list': {
    title: 'Family Properties',
    content: "Browse family vacation properties available for booking.\n\n• View property photos, amenities, and capacity\n• See location details and descriptions\n• Click any property card to see full details\n• Check availability and make reservations\n\nEach card shows key info like bedrooms, bathrooms, and maximum guests.",
    icon: Building2
  },
  'property-detail': {
    title: 'Property Details & Booking',
    content: "You're viewing a property's full details. Here's how to book:\n\n• Browse the photo gallery at the top\n• Check the availability calendar - green dates are open\n• Click a date or use \"Check Availability\" to start booking\n• Review amenities, house rules, and property details\n• See your existing reservations in the sidebar\n\nThe calendar shows all approved and pending reservations so you can find open dates.",
    icon: Calendar
  },
  reservations: {
    title: 'Your Reservations',
    content: "This page shows all your property bookings.\n\n• Filter between upcoming, past, or all reservations\n• See status at a glance: pending, approved, or cancelled\n• Click any reservation to view details or make changes\n• Pending reservations are awaiting admin approval\n\nYou'll receive notifications when your reservation status changes.",
    icon: ClipboardList
  },
  crowdfunding: {
    title: 'Family Fundraising',
    content: "Support family projects and causes together.\n\n• Browse active fundraising campaigns\n• See progress bars showing how close each goal is\n• View campaign deadlines and contribution amounts\n• Click any campaign to learn more and contribute\n\nAdmins can create new campaigns for family initiatives.",
    icon: Heart
  },
  polls: {
    title: 'Family Polls',
    content: "Make family decisions together with polls.\n\n• Create polls with multiple choice, rating, ranking, or open text\n• Use templates for quick poll creation (RSVP, event dates, etc.)\n• Schedule polls to start in the future\n• Set up recurring polls for regular decisions\n• View results in real-time or after voting closes\n• Export results to CSV for record-keeping\n\nPolls are perfect for planning gatherings, choosing locations, or settling friendly debates.",
    icon: BarChart3
  },
  'poll-detail': {
    title: 'Voting & Results',
    content: "This is where you cast your vote and see results.\n\n• Vote by clicking options, dragging to rank, or rating with stars\n• Change your vote if the poll allows it\n• See live results or wait until the poll closes\n• Join the discussion in the comments section\n• Export results to share with the family\n\nAnonymous polls hide who voted for what, but still show totals.",
    icon: BarChart3
  },
  'admin-settings': {
    title: 'Hub Settings',
    content: "Configure your family hub's identity and appearance.\n\n• Set the hub name and tagline shown throughout the site\n• Add family names that rotate in the animated logo\n• Customize theme colors, fonts, and hero images\n• Changes save automatically and apply site-wide\n\nThe theme manager lets you create a unique look for your family.",
    icon: Settings
  },
  'admin-members': {
    title: 'Member Management',
    content: "Manage who has access to the family hub.\n\n• View all registered family members\n• Add new members by sending email invites\n• Edit member details and profile information\n• Assign admin privileges to trusted members\n• Reset passwords for members who need help\n• Deactivate accounts that are no longer needed\n\nPending invites show members who haven't accepted yet.",
    icon: Users
  },
  'admin-properties': {
    title: 'Property Administration',
    content: "Manage family properties and reservations.\n\n• Reservations: Approve or deny booking requests\n• Properties: Add, edit, or remove properties\n• Blackout Dates: Block dates for maintenance or private use\n• Custom Attributes: Define property-specific fields\n\nUse the sub-tabs to switch between different management areas.",
    icon: Building2
  }
};

export const TOOLTIPS: Record<string, TooltipContent> = {
  logo: {
    id: 'logo',
    content: "Click here anytime to return home. The cycling names represent all the families in our hub.",
    position: 'bottom'
  },
  theme: {
    id: 'theme',
    content: "Switch between dark, light, original, or custom themes. Your preference is saved automatically.",
    position: 'bottom'
  },
  profile: {
    id: 'profile',
    content: "Access your profile, settings, explanation mode toggle, and sign out from here.",
    position: 'bottom'
  },
  notifications: {
    id: 'notifications',
    content: "See recent activity, reservation updates, new recipes, and family announcements. Click to view all notifications.",
    position: 'bottom'
  },
  media: {
    id: 'media',
    content: "Your family's photo and video library. Create albums, upload new media, and organize memories.",
    position: 'top'
  },
  recipes: {
    id: 'recipes',
    content: "Browse family recipes, create cookbooks, and add your own treasured dishes. Includes cook mode for hands-free cooking.",
    position: 'top'
  },
  properties: {
    id: 'properties',
    content: "View family properties, check availability, and make reservations. See pricing, amenities, and upcoming stays.",
    position: 'top'
  },
  polls: {
    id: 'polls',
    content: "Vote on family decisions or create your own polls. Perfect for planning gatherings or settling friendly debates.",
    position: 'top'
  },
  music: {
    id: 'music',
    content: "Share music you're enjoying with the family. Like others' recommendations and discover new favorites.",
    position: 'top'
  },
  crowdfunding: {
    id: 'crowdfunding',
    content: "Pool resources for family projects, gifts, or causes. Track contributions and stay updated on campaign progress.",
    position: 'top'
  },
  jokes: {
    id: 'jokes',
    content: "Share family jokes and stories from different decades. Vote for favorites and preserve family humor for generations.",
    position: 'top'
  },
  members: {
    id: 'members',
    content: "See all family members, view profiles, and explore how everyone connects. Update your own profile here too.",
    position: 'top'
  },

  'media-gallery-title': {
    id: 'media-gallery-title',
    content: "Your family's complete photo and video library. Upload new media, organize everything into albums (like vacation, holidays, etc.), then use the master database below to search, filter, and find any photo instantly. Unorganized photos appear in 'Unclassified' until you add them to albums.",
    position: 'bottom'
  },
  'media-albums-heading': {
    id: 'media-albums-heading',
    content: "Albums are like folders that group related photos together—think 'Summer 2025' or 'Birthday Party'. Create albums to organize your media, then drag photos onto them or use select mode to add multiple at once.",
    position: 'top'
  },
  'media-new-album-button': {
    id: 'media-new-album-button',
    content: "Create a new album to organize your photos. Give it a name like 'Vacation' or 'Holidays', and you can add a cover image and description to help identify it.",
    position: 'bottom'
  },
  'media-album-select-button': {
    id: 'media-album-select-button',
    content: "Select multiple photos within this album to move them to a different album or remove them in bulk.",
    position: 'bottom'
  },
  'media-upload': {
    id: 'media-upload',
    content: "Click to upload photos, videos, or audio files. You can also drag and drop files anywhere on this page, or press 'U' as a shortcut.",
    position: 'bottom'
  },
  'media-select-mode': {
    id: 'media-select-mode',
    content: "Enter select mode to choose multiple items at once. Then you can move them to albums or delete them in bulk.",
    position: 'bottom'
  },
  'media-view-toggle': {
    id: 'media-view-toggle',
    content: "Switch between grid view (uniform squares) and masonry view (natural photo proportions).",
    position: 'bottom'
  },
  'media-filters': {
    id: 'media-filters',
    content: "Filter media by type: show only photos, videos, or audio files.",
    position: 'bottom'
  },
  'media-sort': {
    id: 'media-sort',
    content: "Change how media is sorted: by upload date, alphabetically, or by when the photo was taken.",
    position: 'bottom'
  },
  'media-albums': {
    id: 'media-albums',
    content: "Albums help organize your media. Create new albums, drag photos onto them, or click to view album contents.",
    position: 'top'
  },
  'media-unclassified': {
    id: 'media-unclassified',
    content: "Photos not yet added to any album appear here. Drag them to an album or use select mode to organize multiple at once.",
    position: 'top'
  },
  'media-all-photos': {
    id: 'media-all-photos',
    content: "Browse all photos that are in albums. Use the search bar to find specific photos by name, description, location, or album.",
    position: 'top'
  },
  'media-all-photos-select': {
    id: 'media-all-photos-select',
    content: "Select multiple photos from your entire collection to organize into albums or perform bulk actions.",
    position: 'bottom'
  },
  'media-search': {
    id: 'media-search',
    content: "Search by photo name, description, location, album name, or who uploaded it.",
    position: 'bottom'
  },
  'media-drag-hint': {
    id: 'media-drag-hint',
    content: "Drag photos directly onto album cards to add them. You can drag multiple selected photos at once.",
    position: 'top'
  },
  'media-shift-select': {
    id: 'media-shift-select',
    content: "Hold Shift and click to select a range of photos between your last click and this one.",
    position: 'top'
  },
  'media-add-to-album': {
    id: 'media-add-to-album',
    content: "Choose an album from the dropdown, then click Add to move all selected photos to that album.",
    position: 'bottom'
  },
  'media-delete-selected': {
    id: 'media-delete-selected',
    content: "Permanently delete all selected photos. This cannot be undone.",
    position: 'bottom'
  },
  'media-lightbox': {
    id: 'media-lightbox',
    content: "Click any photo to open it full-screen. Use arrow keys or swipe to navigate between photos.",
    position: 'top'
  },
  'media-upload-fab': {
    id: 'media-upload-fab',
    content: "Quick access to upload new media. Press 'U' anywhere on this page as a keyboard shortcut.",
    position: 'left'
  },

  'recipes-add': {
    id: 'recipes-add',
    content: "Create a new recipe. You'll enter the title, ingredients, instructions, and can add a cover photo.",
    position: 'bottom'
  },
  'recipes-cookbooks': {
    id: 'recipes-cookbooks',
    content: "Cookbooks group related recipes together. Create cookbooks like 'Holiday Favorites' or 'Quick Weeknight Meals'. Drag recipes onto cookbooks to add them.",
    position: 'top'
  },
  'recipes-search': {
    id: 'recipes-search',
    content: "Search by recipe name, ingredients, category, cuisine type, or the original author.",
    position: 'bottom'
  },
  'recipes-filters': {
    id: 'recipes-filters',
    content: "Filter recipes by category, difficulty, dietary restrictions, cuisine type, or who created them.",
    position: 'bottom'
  },
  'recipes-categories': {
    id: 'recipes-categories',
    content: "Quick filter by category. Click any category pill to see only those recipes.",
    position: 'top'
  },
  'recipes-all': {
    id: 'recipes-all',
    content: "All recipes that are organized into cookbooks. The cookbook badges show which collections each recipe belongs to.",
    position: 'top'
  },
  'recipes-unclassified': {
    id: 'recipes-unclassified',
    content: "Recipes not yet added to any cookbook. Use select mode to add multiple to a cookbook at once.",
    position: 'top'
  },
  'recipes-drag-hint': {
    id: 'recipes-drag-hint',
    content: "Drag recipes directly onto cookbook cards to add them. The cookbook will highlight when you can drop.",
    position: 'top'
  },
  'recipes-select-mode': {
    id: 'recipes-select-mode',
    content: "Enter select mode to choose multiple recipes. Then add them to a cookbook or delete them in bulk.",
    position: 'bottom'
  },
  'recipes-view-toggle': {
    id: 'recipes-view-toggle',
    content: "Switch between grid view (uniform cards) and masonry view (varied heights).",
    position: 'bottom'
  },
  'recipes-card-info': {
    id: 'recipes-card-info',
    content: "Each recipe card shows total time, servings, and average rating. The chef badge shows who created the recipe.",
    position: 'top'
  },
  'recipes-add-to-cookbook': {
    id: 'recipes-add-to-cookbook',
    content: "Select a cookbook from the dropdown to add all selected recipes to it.",
    position: 'bottom'
  },
  'recipes-cook-mode': {
    id: 'recipes-cook-mode',
    content: "Cook Mode displays the recipe with large, easy-to-read text. Perfect for following along while cooking.",
    position: 'top'
  },
  'recipes-serving-scaler': {
    id: 'recipes-serving-scaler',
    content: "Adjust the serving size and all ingredient quantities will scale automatically.",
    position: 'top'
  },
  'recipes-rating': {
    id: 'recipes-rating',
    content: "Rate this recipe to help family members find the best dishes. Your rating is saved automatically.",
    position: 'top'
  },
  'recipes-title': {
    id: 'recipes-title',
    content: "Your family's collection of recipes - from grandma's classics to new favorites. Share culinary traditions and create new ones together.",
    position: 'bottom'
  },
  'recipes-cookbooks-section': {
    id: 'recipes-cookbooks-section',
    content: "Organize recipes into cookbooks by theme, occasion, or family member. Makes it easy to find the perfect recipe for any situation.",
    position: 'top'
  },
  'recipes-new-cookbook': {
    id: 'recipes-new-cookbook',
    content: "Create a custom cookbook to organize related recipes together. Great for holidays, meal planning, or family member favorites.",
    position: 'bottom'
  },
  'recipes-categories-section': {
    id: 'recipes-categories-section',
    content: "Filter recipes by category to quickly find what you're looking for. Categories include Breakfast, Lunch, Dinner, Desserts, and more.",
    position: 'top'
  },
  'recipes-all-recipes': {
    id: 'recipes-all-recipes',
    content: "Browse your complete recipe collection. Use filters and search to find exactly what you need.",
    position: 'top'
  },

  'properties-card': {
    id: 'properties-card',
    content: "Click any property to see full details, photos, amenities, and availability calendar.",
    position: 'top'
  },
  'properties-location': {
    id: 'properties-location',
    content: "The property's city and state. Click through for the full address.",
    position: 'top'
  },
  'properties-capacity': {
    id: 'properties-capacity',
    content: "Key details: maximum guests, number of bedrooms, and bathrooms.",
    position: 'top'
  },
  'properties-book-button': {
    id: 'properties-book-button',
    content: "Click to view the property details and check availability for booking.",
    position: 'top'
  },
  'properties-description': {
    id: 'properties-description',
    content: "A brief overview of the property. Click through for the full description.",
    position: 'top'
  },
  'properties-empty': {
    id: 'properties-empty',
    content: "No properties are available right now. Check back later or contact an admin.",
    position: 'top'
  },

  'property-back': {
    id: 'property-back',
    content: "Return to the list of all family properties.",
    position: 'bottom'
  },
  'property-gallery': {
    id: 'property-gallery',
    content: "Browse property photos. Click thumbnails to switch images, or click the main image to view full-screen.",
    position: 'bottom'
  },
  'property-stats': {
    id: 'property-stats',
    content: "Key property details: guest capacity, bedrooms, and bathrooms.",
    position: 'top'
  },
  'property-calendar': {
    id: 'property-calendar',
    content: "The availability calendar shows reserved dates (colored) and available dates (empty). Click any available date to start a booking.",
    position: 'top'
  },
  'property-check-availability': {
    id: 'property-check-availability',
    content: "Open the booking form to select your dates and request a reservation.",
    position: 'top'
  },
  'property-amenities': {
    id: 'property-amenities',
    content: "Features available at this property, like WiFi, parking, kitchen, pool, etc.",
    position: 'top'
  },
  'property-details': {
    id: 'property-details',
    content: "Additional property information like check-in/out times, parking details, etc.",
    position: 'top'
  },
  'property-house-rules': {
    id: 'property-house-rules',
    content: "Important rules and guidelines for staying at this property. Please read before booking.",
    position: 'top'
  },
  'property-upcoming': {
    id: 'property-upcoming',
    content: "See who has upcoming reservations at this property. Your own reservations show a cancel option.",
    position: 'top'
  },
  'property-my-reservations': {
    id: 'property-my-reservations',
    content: "Your reservations at this property. Click View/Edit to see details or request changes.",
    position: 'top'
  },
  'property-reservation-modal': {
    id: 'property-reservation-modal',
    content: "Fill out the booking form with your dates, guest count, and any notes. You'll see the price breakdown before submitting.",
    position: 'top'
  },
  'property-date-select': {
    id: 'property-date-select',
    content: "Choose your check-in and check-out dates. The calendar highlights which dates are already booked.",
    position: 'top'
  },

  'reservations-filter': {
    id: 'reservations-filter',
    content: "Filter your reservations: All shows everything, Upcoming shows future stays, Past shows completed or cancelled bookings.",
    position: 'bottom'
  },
  'reservations-card': {
    id: 'reservations-card',
    content: "Click any reservation to view full details, make changes, or cancel.",
    position: 'top'
  },
  'reservations-status': {
    id: 'reservations-status',
    content: "Pending means awaiting admin approval. Approved means confirmed. Denied or Cancelled reservations cannot be used.",
    position: 'left'
  },
  'reservations-dates': {
    id: 'reservations-dates',
    content: "Your check-in and check-out dates for this reservation.",
    position: 'top'
  },
  'reservations-duration': {
    id: 'reservations-duration',
    content: "Total number of nights for your stay.",
    position: 'top'
  },
  'reservations-guests': {
    id: 'reservations-guests',
    content: "Number of guests included in this reservation.",
    position: 'top'
  },
  'reservations-view-edit': {
    id: 'reservations-view-edit',
    content: "View full reservation details, see pricing breakdown, or request changes to your booking.",
    position: 'top'
  },
  'reservations-browse': {
    id: 'reservations-browse',
    content: "Go to the properties page to find and book a new stay.",
    position: 'top'
  },

  'crowdfunding-new': {
    id: 'crowdfunding-new',
    content: "Create a new fundraising campaign for a family project, gift, or cause. Only admins can create campaigns.",
    position: 'bottom'
  },
  'crowdfunding-card': {
    id: 'crowdfunding-card',
    content: "Click to see full campaign details, updates from the organizer, and to make a contribution.",
    position: 'top'
  },
  'crowdfunding-progress': {
    id: 'crowdfunding-progress',
    content: "The progress bar shows how much has been raised toward the goal. Green means fully funded!",
    position: 'top'
  },
  'crowdfunding-deadline': {
    id: 'crowdfunding-deadline',
    content: "Time remaining until the campaign ends. Contribute before the deadline to support the cause.",
    position: 'top'
  },
  'crowdfunding-funded': {
    id: 'crowdfunding-funded',
    content: "This campaign has reached its goal! You can still contribute to help exceed the target.",
    position: 'top'
  },
  'crowdfunding-goal': {
    id: 'crowdfunding-goal',
    content: "The total amount the campaign is trying to raise.",
    position: 'top'
  },
  'crowdfunding-current': {
    id: 'crowdfunding-current',
    content: "Total amount raised so far from all contributors.",
    position: 'top'
  },
  'crowdfunding-contribute': {
    id: 'crowdfunding-contribute',
    content: "Make a contribution to support this campaign. Every amount helps!",
    position: 'top'
  },

  'admin-tabs': {
    id: 'admin-tabs',
    content: "Switch between different admin areas: Settings for hub configuration, Members for user management, Properties for reservations and property management.",
    position: 'bottom'
  },
  'admin-hub-name': {
    id: 'admin-hub-name',
    content: "The name of your family hub, displayed in the header and throughout the site.",
    position: 'top'
  },
  'admin-tagline': {
    id: 'admin-tagline',
    content: "A short tagline or motto shown on the home page under the welcome message.",
    position: 'top'
  },
  'admin-family-names': {
    id: 'admin-family-names',
    content: "Family names that rotate in the animated logo. Enter names separated by commas (e.g., Smith, Johnson, Williams).",
    position: 'top'
  },
  'admin-save-settings': {
    id: 'admin-save-settings',
    content: "Save your changes to hub settings. Changes apply immediately across the site.",
    position: 'top'
  },
  'admin-theme-manager': {
    id: 'admin-theme-manager',
    content: "Customize colors, fonts, and hero images for the hub. Create a unique look for your family.",
    position: 'top'
  },
  'admin-color-picker': {
    id: 'admin-color-picker',
    content: "Click to choose a custom color. You can enter a hex code or use the color picker.",
    position: 'right'
  },
  'admin-typography': {
    id: 'admin-typography',
    content: "Choose fonts for headings, body text, and the logo. Changes preview instantly.",
    position: 'top'
  },
  'admin-hero-image': {
    id: 'admin-hero-image',
    content: "Upload or select a hero image for the login page background.",
    position: 'top'
  },
  'admin-reset-theme': {
    id: 'admin-reset-theme',
    content: "Reset all theme settings back to the default colors and fonts.",
    position: 'top'
  },

  'admin-add-member': {
    id: 'admin-add-member',
    content: "Invite a new family member by email. They'll receive an invitation to create their account.",
    position: 'bottom'
  },
  'admin-member-list': {
    id: 'admin-member-list',
    content: "All registered family members. Click to expand and see more details or actions.",
    position: 'top'
  },
  'admin-member-roles': {
    id: 'admin-member-roles',
    content: "Member roles: Regular members can view and contribute. Admins can manage settings and approve reservations. Super Admins have full control.",
    position: 'left'
  },
  'admin-edit-member': {
    id: 'admin-edit-member',
    content: "Edit this member's profile information, including name and email.",
    position: 'left'
  },
  'admin-reset-password': {
    id: 'admin-reset-password',
    content: "Send a password reset email to this member if they're having trouble logging in.",
    position: 'left'
  },
  'admin-deactivate': {
    id: 'admin-deactivate',
    content: "Deactivate this account to prevent login. The account can be reactivated later.",
    position: 'left'
  },
  'admin-pending-invites': {
    id: 'admin-pending-invites',
    content: "Invitations that have been sent but not yet accepted. You can resend or cancel pending invites.",
    position: 'top'
  },
  'admin-super-admin': {
    id: 'admin-super-admin',
    content: "Super Admins have the highest permission level and can manage other admins.",
    position: 'left'
  },

  'admin-property-subtabs': {
    id: 'admin-property-subtabs',
    content: "Switch between Reservations (approve bookings), Properties (manage listings), Blackouts (block dates), and Attributes (custom fields).",
    position: 'bottom'
  },
  'admin-reservations-list': {
    id: 'admin-reservations-list',
    content: "All reservation requests. Pending ones need your approval before guests can confirm their stay.",
    position: 'top'
  },
  'admin-approve-deny': {
    id: 'admin-approve-deny',
    content: "Approve to confirm the reservation, or Deny to reject it. The member will be notified either way.",
    position: 'left'
  },
  'admin-property-list': {
    id: 'admin-property-list',
    content: "All family properties. Click Edit to modify details, or toggle Active to show/hide from the listings.",
    position: 'top'
  },
  'admin-add-property': {
    id: 'admin-add-property',
    content: "Add a new family property with photos, description, amenities, and pricing.",
    position: 'bottom'
  },
  'admin-edit-property': {
    id: 'admin-edit-property',
    content: "Update this property's details, photos, amenities, or pricing.",
    position: 'left'
  },
  'admin-blackout-dates': {
    id: 'admin-blackout-dates',
    content: "Dates when the property is unavailable for booking (maintenance, private use, etc.).",
    position: 'top'
  },
  'admin-add-blackout': {
    id: 'admin-add-blackout',
    content: "Block a date range to prevent any reservations during that time.",
    position: 'bottom'
  },
  'admin-custom-attributes': {
    id: 'admin-custom-attributes',
    content: "Define custom fields that appear on property pages (e.g., 'Boat Slip Number', 'Gate Code').",
    position: 'top'
  },
  'admin-add-attribute': {
    id: 'admin-add-attribute',
    content: "Create a new custom attribute that can be added to any property.",
    position: 'bottom'
  },

  'property-book-box': {
    id: 'property-book-box',
    content: "Submit a reservation request by clicking this button. Select your dates, enter guest count, and see the price breakdown before submitting for admin approval.",
    position: 'top'
  },
  'property-your-reservations': {
    id: 'property-your-reservations',
    content: "All your reservations for this property. View details, request changes, or cancel bookings. Status badges show if pending approval or confirmed.",
    position: 'top'
  },

  'polls-title': {
    id: 'polls-title',
    content: "Family polls for group decisions. Create polls for event planning, preferences, or friendly votes. Multiple poll types available including rating, ranking, and open text.",
    position: 'bottom'
  },
  'polls-create': {
    id: 'polls-create',
    content: "Create a new poll. Choose from templates or build custom polls with multiple choice, rating scales, ranking, or open text responses.",
    position: 'bottom'
  },
  'polls-filter-tabs': {
    id: 'polls-filter-tabs',
    content: "Filter polls by status: Active shows open polls, Scheduled shows future polls, Closed shows completed polls.",
    position: 'bottom'
  },
  'polls-card': {
    id: 'polls-card',
    content: "Click to view poll details and cast your vote. The badge shows the poll type and the count shows how many have voted.",
    position: 'top'
  },
  'polls-type-badge': {
    id: 'polls-type-badge',
    content: "Poll type indicator: Rating for star votes, Ranking for priority ordering, Open for text responses, Image for visual choices.",
    position: 'top'
  },

  'poll-back': {
    id: 'poll-back',
    content: "Return to the list of all family polls.",
    position: 'bottom'
  },
  'poll-vote-options': {
    id: 'poll-vote-options',
    content: "Select your choice(s) and click Submit Vote. Some polls allow multiple selections or changing your vote later.",
    position: 'top'
  },
  'poll-rating': {
    id: 'poll-rating',
    content: "Click the stars to set your rating. The average of all ratings is displayed after you vote.",
    position: 'top'
  },
  'poll-ranking': {
    id: 'poll-ranking',
    content: "Drag items to reorder by preference. Position 1 is your top choice. Results show aggregated rankings from all voters.",
    position: 'top'
  },
  'poll-text-response': {
    id: 'poll-text-response',
    content: "Type your response and submit. All responses are displayed in a list for everyone to see.",
    position: 'top'
  },
  'poll-results': {
    id: 'poll-results',
    content: "Vote counts and percentages for each option. The colored bar shows relative popularity.",
    position: 'top'
  },
  'poll-export': {
    id: 'poll-export',
    content: "Download poll results as a CSV file. Includes all votes, timestamps, and voter names (unless anonymous).",
    position: 'left'
  },
  'poll-comments': {
    id: 'poll-comments',
    content: "Discuss the poll with family members. Comments are visible to everyone and help explain voting decisions.",
    position: 'top'
  },
  'poll-status': {
    id: 'poll-status',
    content: "Active polls are open for voting. Scheduled polls start later. Closed polls show final results.",
    position: 'left'
  }
};
