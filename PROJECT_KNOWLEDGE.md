# CAMPBELL FAMILY HUB - Project Knowledge

```
CAMPBELL FAMILY HUB
Digital home for 50+ family members
React + TypeScript + Vite + TailwindCSS + Supabase
```

---

## ESSENCE

This is a family heirloom, not a startup MVP. Every feature should feel like it belongs at Thanksgiving dinner: warm, inclusive, functional. Build with the care you'd give something meant to last generations.

**Design Language:**
- Dark mode default
- Gold `#c9a962` (accent-primary) / Sage `#7a9a6d` (accent-secondary)
- Playfair Display headings, Inter body
- Lucide icons exclusively
- Pexels stock photos when needed
- CSS variables for theming: `var(--bg-primary)`, `var(--text-primary)`, `var(--accent-gold)`, etc.

---

## HARD RULES

These are non-negotiable. Violating any is a failure state.

| Rule | Reason |
|------|--------|
| No purple/indigo/violet | Brand violation |
| No code comments | Clean code speaks |
| No `single()`, always `maybeSingle()` | Prevents errors on empty results |
| No tables without RLS | Security requirement |
| No over-engineering | Build what's asked, nothing more |
| No verbose explanations | Do the work, summarize briefly |
| No emojis in responses | Professional tone |
| Run `npm run build` after changes | Verify compilation |

---

## ARCHITECTURE

**Stack:**
- Frontend: React 19, TypeScript, Vite, TailwindCSS 4
- Backend: Supabase (Auth, Database, Storage, Edge Functions)
- Icons: Lucide React only
- State: React Context (AuthContext, ThemeContext, HubContext, ToastContext)

**File Organization:**
```
/src/pages/          - Route components
/src/components/     - Reusable components by domain
  /admin/            - Admin panel components
  /layout/           - Header, PageLayout, AnimatedLogo
  /media/            - Media gallery components
  /property/         - Property/reservation components
  /recipe/           - Recipe-specific components
  /ui/               - Shared UI primitives (Button, Card, Input, Skeleton)
/src/contexts/       - React contexts
/src/lib/            - Utilities (supabase.ts, utils.ts)
/src/types/          - TypeScript interfaces
/supabase/migrations/ - Database migrations
/supabase/functions/ - Edge functions
```

**Supabase Patterns:**
- Always use `maybeSingle()` for 0-or-1 row queries
- All tables require RLS enabled
- Migrations must include detailed markdown summary comments
- Use `IF NOT EXISTS` / `IF EXISTS` for safety
- Edge functions must handle CORS with exact headers: `Content-Type, Authorization, X-Client-Info, Apikey`

---

## QUALITY STANDARD

**Media.tsx and Recipes.tsx define the gold standard.** Every new section must match their patterns:

| Pattern | Implementation |
|---------|---------------|
| Select mode | Toggle with checkbox icon, track `selectedIds` as Set |
| Shift-click range | Track `lastSelectedIndex`, select/deselect range on shift+click |
| Drag-to-collection | `draggingMediaIds` state, drop targets on albums/cookbooks |
| Bulk actions | Floating action bar when items selected |
| Collections | Albums (media) / Cookbooks (recipes) with junction tables |
| View modes | Grid / Masonry / List toggles |
| Filtering | Category, type, difficulty dropdowns |
| Search | Debounced search with `useMemo` filtering |
| "Back to all" | ArrowLeft button when viewing collection |
| Badges | Featured stars, difficulty pills, count badges |
| Lightbox | Full-screen view with prev/next navigation |
| Empty states | Centered icon + message + action button |
| Loading states | Skeleton components matching layout |

**UX Interactions to preserve:**
- Keyboard shortcuts (e.g., 'u' for upload in Media)
- Drag and drop file uploads
- Image error handling with fallbacks
- Optimistic UI updates
- Toast notifications for success/error feedback

---

## MODULES (Living Inventory)

### Complete
- **Media Gallery** - photos, videos, audio, albums, select mode, drag-to-album
- **Recipes** - cookbooks, ratings, cook mode, serving scaler, structured ingredients
- **Properties** - pricing, amenities, gallery, calendar
- **Reservations** - pricing breakdown, change requests, payment status
- **Admin Panel** - members, reservations, properties, theme, blackout dates

### Functional
- **Authentication** - email/password via Supabase Auth
- **User Profiles** - avatar, bio, birthday, location
- **Notifications** - in-app notification system
- **Polls** - create, vote, anonymous option
- **Crowdfunding** - campaigns, contributions, updates
- **Jokes & Stories** - submit, vote, decades
- **Music Recommendations** - add, like
- **Members Directory** - family tree view
- **Theme System** - dark/light/original/custom, admin-configurable colors

### Database Tables (40+)

**Core:**
`user_profiles`, `hub_settings`, `theme_settings`, `notifications`, `activity_log`, `member_invites`

**Media:**
`media_files`, `albums`, `media_album_items`, `tags`, `media_tags`

**Recipes:**
`recipes`, `recipe_ingredients`, `recipe_ratings`, `cookbooks`, `cookbook_recipes`

**Properties:**
`properties`, `reservations`, `reservation_change_requests`, `property_blackout_dates`, `property_attributes`, `property_attribute_values`, `property_projects`

**Social:**
`polls`, `poll_options`, `poll_votes`, `crowdfunding_campaigns`, `campaign_contributions`, `campaign_updates`, `jokes`, `joke_votes`, `stories`, `music_recommendations`, `music_likes`

**Financial:**
`payments`

### Edge Functions
- `admin-users` - User management
- `bootstrap-admin` - Initial admin setup
- `create-admin` - Admin creation
- `reset-password` - Password reset flow

---

## WHEN UNCERTAIN

```
1. Is there an existing pattern in Media.tsx or Recipes.tsx?
   YES -> Follow it exactly
   NO  -> Continue to 2

2. Is there a similar component elsewhere in the codebase?
   YES -> Match its approach
   NO  -> Continue to 3

3. Is the decision reversible and low-risk?
   YES -> Make conservative choice, proceed
   NO  -> Ask the user
```

**Conservative defaults:**
- Fetch with `maybeSingle()` not `single()`
- Enable RLS immediately after creating table
- Use CSS variables not hardcoded colors
- Match existing component structure
- Keep files under 300 lines when possible
- No new dependencies without checking package.json first

---

## RESPONSE STYLE

**During work:** Concise, 1-3 lines max. No commentary after edits.

**After completing task:** Brief plain-English summary of WHAT was done (not HOW). Suggest logical next steps. No code explanations unless asked.

**Never mention:** `.env` values, how to run dev server, added features beyond what was asked.

---

## TYPE DEFINITIONS

Key interfaces are defined in `/src/types/index.ts`:

- `UserProfile` - User data with roles (is_admin, is_super_admin, user_type)
- `Property` - Family properties with pricing, amenities, custom_attributes
- `Reservation` - Bookings with payment tracking and change requests
- `Recipe` / `RecipeWithCookbooks` - Recipes with structured ingredients and ratings
- `MediaFile` / `MediaWithAlbums` - Media with album associations
- `Poll`, `CrowdfundingCampaign`, `Story`, `Joke` - Social features
- `HubSettings` - Global configuration
- `ThemeSettings` - Theme color definitions

---

## CONTEXTS

| Context | Purpose | Key Values |
|---------|---------|------------|
| `AuthContext` | Auth state | `user`, `profile`, `signIn`, `signOut`, `signUp` |
| `ThemeContext` | Theme management | `theme`, `setTheme`, `resolvedTheme` |
| `HubContext` | Global hub settings | `settings`, `loading`, `refreshSettings` |
| `ToastContext` | Notifications | `success()`, `error()`, `info()` |

---

## ROUTES

```
/                   - Home (dashboard)
/login              - Login page
/register           - Registration page
/media              - Media gallery
/music              - Music recommendations
/recipes            - Recipe list
/recipes/new        - Create recipe
/recipes/:id        - Recipe detail
/recipes/:id/edit   - Edit recipe
/properties         - Property list
/properties/:id     - Property detail
/reservations       - User reservations
/reservations/:id   - Reservation detail
/polls              - Poll list
/polls/new          - Create poll
/polls/:id          - Poll detail
/crowdfunding       - Campaign list
/crowdfunding/new   - Create campaign
/crowdfunding/:id   - Campaign detail
/jokes              - Jokes & Stories
/stories/new        - Create story
/stories/:id        - Story detail
/stories/:id/edit   - Edit story
/notifications      - User notifications
/profile            - User profile
/family-tree        - Members directory
/admin              - Admin panel
```

---

*Last updated: January 2026*
*This document evolves. Update the MODULES section as features are built.*
