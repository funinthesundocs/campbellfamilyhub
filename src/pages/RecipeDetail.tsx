import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ServingScaler, formatIngredientDisplay } from '../components/recipe/ServingScaler';
import { CookMode } from '../components/recipe/CookMode';
import {
  ArrowLeft, Clock, ChefHat, Edit, Trash2, Star, Check,
  Printer, PlayCircle, Share2
} from 'lucide-react';
import { formatDate, getInitials, formatCategoryLabel } from '../lib/utils';
import type { Recipe, UserProfile, RecipeIngredient } from '../types';

interface RecipeRating {
  id: string;
  rating: number;
  comment: string | null;
  made_it: boolean;
  user_id: string;
  created_at: string;
  user?: UserProfile;
}

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { success, error: showError } = useToast();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [submitter, setSubmitter] = useState<UserProfile | null>(null);
  const [ratings, setRatings] = useState<RecipeRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [myRating, setMyRating] = useState({ rating: 5, comment: '', made_it: false });
  const [submitting, setSubmitting] = useState(false);
  const [currentServings, setCurrentServings] = useState(4);
  const [showCookMode, setShowCookMode] = useState(false);

  useEffect(() => {
    if (id) fetchRecipe();
  }, [id]);

  const fetchRecipe = async () => {
    const { data } = await supabase.from('recipes').select('*').eq('id', id).maybeSingle();
    if (data) {
      setRecipe(data);
      setCurrentServings(data.servings || 4);

      const { data: structuredIngs } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', id)
        .order('sort_order');

      if (structuredIngs && structuredIngs.length > 0) {
        setIngredients(structuredIngs);
      } else if (data.ingredients?.length) {
        const parsed = (data.ingredients as string[]).map((ing: string, idx: number) => ({
          id: `legacy-${idx}`,
          recipe_id: id,
          quantity: null,
          quantity_display: null,
          unit: null,
          name: ing,
          notes: null,
          is_header: false,
          sort_order: idx,
        }));
        setIngredients(parsed);
      }

      const { data: userData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.submitted_by)
        .maybeSingle();
      setSubmitter(userData);
      fetchRatings();
    }
    setLoading(false);
  };

  const fetchRatings = async () => {
    const { data } = await supabase
      .from('recipe_ratings')
      .select('*')
      .eq('recipe_id', id)
      .order('created_at', { ascending: false });
    if (data) {
      const userIds = [...new Set(data.map(r => r.user_id))];
      if (userIds.length > 0) {
        const { data: users } = await supabase.from('user_profiles').select('*').in('id', userIds);
        const ratingsWithUsers = data.map(r => ({
          ...r,
          user: users?.find(u => u.id === r.user_id),
        }));
        setRatings(ratingsWithUsers);
      } else {
        setRatings(data);
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) {
      showError('Failed to delete recipe');
    } else {
      success('Recipe deleted');
      navigate('/recipes');
    }
  };

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    setSubmitting(true);

    const existing = ratings.find(r => r.user_id === user.id);
    let error;
    if (existing) {
      ({ error } = await supabase.from('recipe_ratings').update({
        rating: myRating.rating,
        comment: myRating.comment || null,
        made_it: myRating.made_it,
      }).eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('recipe_ratings').insert({
        recipe_id: id,
        user_id: user.id,
        rating: myRating.rating,
        comment: myRating.comment || null,
        made_it: myRating.made_it,
      }));
    }

    if (error) {
      showError('Failed to submit rating');
    } else {
      success('Rating submitted');
      setShowRatingForm(false);
      fetchRatings();
    }
    setSubmitting(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe?.title,
          text: recipe?.description || `Check out this recipe: ${recipe?.title}`,
          url: window.location.href,
        });
      } catch {
        navigator.clipboard.writeText(window.location.href);
        success('Link copied to clipboard');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      success('Link copied to clipboard');
    }
  };

  const baseServings = recipe?.servings || 4;
  const scaleFactor = currentServings / baseServings;
  const avgRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : null;

  const isOwner = recipe?.submitted_by === user?.id;
  const canEdit = isOwner || profile?.is_admin;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-64 mb-6 rounded-lg" />
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-[var(--text-secondary)]">Recipe not found</p>
        <Link to="/recipes" className="text-[var(--accent-gold)] hover:underline">Back to recipes</Link>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-8 print:max-w-none print:px-8">
        <div className="print:hidden">
          <button
            onClick={() => navigate('/recipes')}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] mb-6 transition-colors"
          >
            <ArrowLeft size={20} /> Back to Recipes
          </button>
        </div>

        {recipe.cover_image_url && (
          <div className="relative rounded-xl overflow-hidden mb-8 print:mb-4">
            <img
              src={recipe.cover_image_url}
              alt={recipe.title}
              className="w-full h-72 object-cover print:h-48"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="px-3 py-1 text-sm bg-[var(--accent-gold)] text-[#0f0f0f] rounded-full font-medium">
                  {formatCategoryLabel(recipe.category)}
                </span>
                {recipe.is_thanksgiving_classic && (
                  <span className="px-3 py-1 text-sm bg-[var(--accent-sage)] text-white rounded-full font-medium">
                    Thanksgiving Classic
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
          <div className="flex-1">
            {!recipe.cover_image_url && (
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-3 py-1 text-sm bg-[rgba(var(--accent-primary-rgb),0.20)] text-[var(--accent-gold)] rounded-full">
                  {formatCategoryLabel(recipe.category)}
                </span>
                {recipe.is_thanksgiving_classic && (
                  <span className="px-3 py-1 text-sm bg-[rgba(var(--accent-secondary-rgb),0.20)] text-[var(--accent-sage)] rounded-full">
                    Thanksgiving Classic
                  </span>
                )}
              </div>
            )}
            <h1 className="font-serif text-4xl text-[var(--text-primary)] mb-3">{recipe.title}</h1>
            {recipe.description && (
              <p className="text-lg text-[var(--text-secondary)] mb-4">{recipe.description}</p>
            )}

            <div className="flex flex-col gap-2 text-sm text-[var(--text-secondary)] mb-2">
              {recipe.original_author && (
                <div className="flex items-center gap-2">
                  <ChefHat size={16} className="text-[var(--accent-gold)]" />
                  <span className="text-[var(--text-primary)] font-medium">Recipe by:</span>
                  <span>{recipe.original_author}</span>
                </div>
              )}
              {recipe.source && (
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-primary)] font-medium">Source:</span>
                  <span>{recipe.source}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button variant="secondary" onClick={() => setShowCookMode(true)}>
              <PlayCircle size={18} className="mr-2" /> Cook Mode
            </Button>
            <Button variant="secondary" onClick={handlePrint} className="w-11 h-11 !p-0 flex items-center justify-center">
              <Printer size={18} />
            </Button>
            <Button variant="secondary" onClick={handleShare} className="w-11 h-11 !p-0 flex items-center justify-center">
              <Share2 size={18} />
            </Button>
            {canEdit && (
              <>
                <Button variant="secondary" onClick={() => navigate(`/recipes/${id}/edit`)} className="w-11 h-11 !p-0 flex items-center justify-center">
                  <Edit size={18} />
                </Button>
                <Button variant="secondary" onClick={handleDelete} className="w-11 h-11 !p-0 flex items-center justify-center">
                  <Trash2 size={18} />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-6 mb-8 text-[var(--text-secondary)] print:gap-4">
          {recipe.prep_time_minutes && (
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-[var(--accent-gold)]" />
              <div>
                <span className="text-sm text-[var(--text-muted)]">Prep</span>
                <p className="font-medium text-[var(--text-primary)]">{recipe.prep_time_minutes} min</p>
              </div>
            </div>
          )}
          {recipe.cook_time_minutes && (
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-[var(--accent-gold)]" />
              <div>
                <span className="text-sm text-[var(--text-muted)]">Cook</span>
                <p className="font-medium text-[var(--text-primary)]">{recipe.cook_time_minutes} min</p>
              </div>
            </div>
          )}
          {(recipe.prep_time_minutes || recipe.cook_time_minutes) && (
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-[var(--accent-sage)]" />
              <div>
                <span className="text-sm text-[var(--text-muted)]">Total</span>
                <p className="font-medium text-[var(--text-primary)]">
                  {(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} min
                </p>
              </div>
            </div>
          )}
          {recipe.difficulty && (
            <div className="flex items-center gap-2">
              <ChefHat size={18} className="text-[var(--accent-gold)]" />
              <div>
                <span className="text-sm text-[var(--text-muted)]">Difficulty</span>
                <p className="font-medium text-[var(--text-primary)] capitalize">{recipe.difficulty}</p>
              </div>
            </div>
          )}
          {avgRating && (
            <div className="flex items-center gap-2">
              <Star size={18} className="text-[var(--accent-gold)] fill-accent-gold" />
              <div>
                <span className="text-sm text-[var(--text-muted)]">Rating</span>
                <p className="font-medium text-[var(--text-primary)]">{avgRating} ({ratings.length})</p>
              </div>
            </div>
          )}
        </div>

        <Card className="mb-6 print:border-none print:shadow-none print:p-0">
          <ServingScaler
            baseServings={baseServings}
            currentServings={currentServings}
            onChange={setCurrentServings}
          />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-[40%_1fr] gap-6 mb-8">
          <Card className="print:border print:border-gray-200">
            <h2 className="text-xl font-serif text-[var(--text-primary)] mb-4 pb-2 border-b border-[var(--border-default)]">
              Ingredients
            </h2>
            <ul className="space-y-2">
              {ingredients.map((ingredient, i) => (
                <li
                  key={ingredient.id || i}
                  className={ingredient.is_header
                    ? 'font-medium text-[var(--accent-gold)] mt-4 first:mt-0 text-sm uppercase tracking-wide'
                    : 'flex items-start gap-3 text-[var(--text-secondary)] group'
                  }
                >
                  {ingredient.is_header ? (
                    ingredient.name
                  ) : (
                    <>
                      {ingredient.image_url ? (
                        <div className="relative flex-shrink-0">
                          <img
                            src={ingredient.image_url}
                            alt=""
                            className="w-6 h-6 rounded object-cover"
                          />
                        </div>
                      ) : (
                        <span className="w-2 h-2 mt-2 rounded-full bg-[var(--accent-gold)] flex-shrink-0" />
                      )}
                      <span>{formatIngredientDisplay(ingredient, scaleFactor)}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="print:border print:border-gray-200">
            <h2 className="text-xl font-serif text-[var(--text-primary)] mb-4 pb-2 border-b border-[var(--border-default)]">
              Instructions
            </h2>
            <ol className="space-y-6">
              {(recipe.instructions as string[])?.map((instruction, i) => {
                const stepImage = recipe.instruction_images?.[i];
                return (
                  <li key={i} className="flex gap-4">
                    <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[rgba(var(--accent-primary-rgb),0.20)] text-[var(--accent-gold)] flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-[var(--text-secondary)] pt-2 leading-relaxed">{instruction}</p>
                      {stepImage && (
                        <img
                          src={stepImage}
                          alt={`Step ${i + 1}`}
                          className="mt-3 rounded-lg max-h-48 object-cover"
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        {recipe.tips && (
          <Card className="mb-8 bg-[rgba(var(--accent-secondary-rgb),0.05)] border-[var(--accent-sage)]/20 print:border print:border-gray-200">
            <h2 className="text-lg font-medium text-[var(--text-primary)] mb-2 flex items-center gap-2">
              <ChefHat size={18} className="text-[var(--accent-sage)]" />
              Tips & Notes
            </h2>
            <p className="text-[var(--text-secondary)]">{recipe.tips}</p>
          </Card>
        )}

        {submitter && (
          <div className="flex items-center gap-3 mb-8 py-4 border-t border-b border-[var(--border-default)] print:border-gray-200">
            {submitter.avatar_url ? (
              <img src={submitter.avatar_url} alt={submitter.display_name} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[rgba(var(--accent-primary-rgb),0.20)] flex items-center justify-center">
                <span className="text-sm font-medium text-[var(--accent-gold)]">{getInitials(submitter.display_name)}</span>
              </div>
            )}
            <div>
              <p className="font-medium text-[var(--text-primary)]">Shared by {submitter.display_name}</p>
              <p className="text-sm text-[var(--text-muted)]">
                {formatDate(recipe.created_at)}
                {recipe.source && <span> | {recipe.source}</span>}
              </p>
            </div>
          </div>
        )}

        <Card className="print:hidden">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-serif text-[var(--text-primary)]">Reviews ({ratings.length})</h2>
            {user && (
              <Button variant="secondary" onClick={() => setShowRatingForm(!showRatingForm)}>
                {showRatingForm ? 'Cancel' : 'Write Review'}
              </Button>
            )}
          </div>

          {showRatingForm && (
            <form onSubmit={handleRatingSubmit} className="mb-6 p-4 bg-[var(--bg-tertiary)] rounded-lg">
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMyRating({ ...myRating, rating: n })}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        size={28}
                        className={n <= myRating.rating ? 'text-[var(--accent-gold)] fill-accent-gold' : 'text-[var(--text-muted)]'}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Comment</label>
                <textarea
                  value={myRating.comment}
                  onChange={(e) => setMyRating({ ...myRating, comment: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
                  rows={3}
                  placeholder="Share your experience with this recipe..."
                />
              </div>
              <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={myRating.made_it}
                  onChange={(e) => setMyRating({ ...myRating, made_it: e.target.checked })}
                  className="w-5 h-5 rounded border-[var(--border-default)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                />
                <span className="text-[var(--text-secondary)]">I made this recipe</span>
              </label>
              <Button type="submit" loading={submitting}>Submit Review</Button>
            </form>
          )}

          {ratings.length === 0 ? (
            <p className="text-[var(--text-muted)] text-center py-8">No reviews yet. Be the first to share your thoughts!</p>
          ) : (
            <div className="space-y-4">
              {ratings.map(rating => (
                <div key={rating.id} className="border-b border-[var(--border-default)] pb-4 last:border-0">
                  <div className="flex items-center gap-3 mb-2">
                    {rating.user?.avatar_url ? (
                      <img src={rating.user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[rgba(var(--accent-primary-rgb),0.20)] flex items-center justify-center">
                        <span className="text-xs font-medium text-[var(--accent-gold)]">{getInitials(rating.user?.display_name || '')}</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text-primary)]">{rating.user?.display_name}</span>
                        {rating.made_it && (
                          <span className="flex items-center gap-1 text-xs bg-[rgba(var(--accent-secondary-rgb),0.20)] text-[var(--accent-sage)] px-2 py-0.5 rounded-full">
                            <Check size={12} /> Made it
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star
                              key={n}
                              size={14}
                              className={n <= rating.rating ? 'text-[var(--accent-gold)] fill-accent-gold' : 'text-[var(--text-muted)]'}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">{formatDate(rating.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  {rating.comment && (
                    <p className="text-[var(--text-secondary)] ml-13 pl-13">{rating.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {showCookMode && (
        <CookMode
          recipe={recipe}
          ingredients={ingredients}
          scaleFactor={scaleFactor}
          onClose={() => setShowCookMode(false)}
        />
      )}
    </>
  );
}
