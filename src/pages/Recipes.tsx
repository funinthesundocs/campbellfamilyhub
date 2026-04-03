import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useTraining } from '../contexts/TrainingContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { CookbookManager } from '../components/recipe/CookbookManager';
import { SectionWelcome } from '../components/training/SectionWelcome';
import { TrainingTooltip } from '../components/training/TrainingTooltip';
import { TOOLTIPS } from '../components/training/training-content';
import {
  UtensilsCrossed, Plus, Clock, Users, Search,
  Star, X, SlidersHorizontal, Check, FolderPlus, ArrowLeft, ChefHat
} from 'lucide-react';
import type { Recipe, Cookbook, RecipeWithCookbooks } from '../types';

const categories = [
  { value: 'all', label: 'All Categories', icon: UtensilsCrossed },
  { value: 'appetizers-small-bites', label: 'Appetizers & Small Bites' },
  { value: 'soups-stews', label: 'Soups & Stews' },
  { value: 'salads', label: 'Salads' },
  { value: 'breakfast-brunch', label: 'Breakfast & Brunch' },
  { value: 'main-poultry', label: 'Poultry' },
  { value: 'main-beef-lamb', label: 'Beef & Lamb' },
  { value: 'main-pork', label: 'Pork' },
  { value: 'main-seafood', label: 'Seafood' },
  { value: 'main-vegetarian', label: 'Vegetarian' },
  { value: 'pasta-rice-grains', label: 'Pasta & Grains' },
  { value: 'vegetables-sides', label: 'Vegetables & Sides' },
  { value: 'breads-rolls', label: 'Breads & Rolls' },
  { value: 'sauces-gravies-condiments', label: 'Sauces & Gravies' },
  { value: 'dips-spreads', label: 'Dips & Spreads' },
  { value: 'stocks-broths', label: 'Stocks & Broths' },
  { value: 'desserts-cakes', label: 'Desserts & Cakes' },
  { value: 'cookies-bars-pastries', label: 'Cookies & Pastries' },
  { value: 'beverages-cocktails', label: 'Beverages' },
  { value: 'preserves-jams-pickles', label: 'Preserves & Pickles' },
  { value: 'other', label: 'Other' },
];

const difficulties = [
  { value: 'all', label: 'Any Difficulty' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const dietaryRestrictions = [
  { value: 'all', label: 'Any Dietary' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten-free', label: 'Gluten-Free' },
  { value: 'dairy-free', label: 'Dairy-Free' },
  { value: 'nut-free', label: 'Nut-Free' },
];

const cuisineTypes = [
  { value: 'all', label: 'Any Cuisine' },
  { value: 'american-new-england', label: 'American (New England)' },
  { value: 'american-southern', label: 'American (Southern)' },
  { value: 'argentinian', label: 'Argentinian' },
  { value: 'australian', label: 'Australian' },
  { value: 'austrian', label: 'Austrian' },
  { value: 'bangladeshi', label: 'Bangladeshi' },
  { value: 'belgian', label: 'Belgian' },
  { value: 'brazilian', label: 'Brazilian' },
  { value: 'british', label: 'British' },
  { value: 'burmese', label: 'Burmese' },
  { value: 'cajun-creole', label: 'Cajun/Creole' },
  { value: 'cambodian', label: 'Cambodian' },
  { value: 'canadian', label: 'Canadian' },
  { value: 'caribbean', label: 'Caribbean' },
  { value: 'chilean', label: 'Chilean' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'colombian', label: 'Colombian' },
  { value: 'dutch', label: 'Dutch' },
  { value: 'egyptian', label: 'Egyptian' },
  { value: 'ethiopian', label: 'Ethiopian' },
  { value: 'filipino', label: 'Filipino' },
  { value: 'french', label: 'French' },
  { value: 'fusion', label: 'Fusion' },
  { value: 'german', label: 'German' },
  { value: 'greek', label: 'Greek' },
  { value: 'indian', label: 'Indian' },
  { value: 'indonesian', label: 'Indonesian' },
  { value: 'iraqi', label: 'Iraqi' },
  { value: 'irish', label: 'Irish' },
  { value: 'israeli', label: 'Israeli' },
  { value: 'italian', label: 'Italian' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'korean', label: 'Korean' },
  { value: 'lebanese', label: 'Lebanese' },
  { value: 'malaysian', label: 'Malaysian' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'moroccan', label: 'Moroccan' },
  { value: 'modern-american', label: 'Modern American' },
  { value: 'nepalese', label: 'Nepalese' },
  { value: 'north-african', label: 'North African' },
  { value: 'pacific-islander', label: 'Pacific Islander' },
  { value: 'pakistani', label: 'Pakistani' },
  { value: 'pan-asian', label: 'Pan-Asian' },
  { value: 'persian', label: 'Persian' },
  { value: 'peruvian', label: 'Peruvian' },
  { value: 'polish', label: 'Polish' },
  { value: 'portuguese', label: 'Portuguese' },
  { value: 'russian', label: 'Russian' },
  { value: 'scandinavian', label: 'Scandinavian' },
  { value: 'singaporean', label: 'Singaporean' },
  { value: 'south-african', label: 'South African' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'sri-lankan', label: 'Sri Lankan' },
  { value: 'syrian', label: 'Syrian' },
  { value: 'tex-mex', label: 'Tex-Mex' },
  { value: 'thai', label: 'Thai' },
  { value: 'turkish', label: 'Turkish' },
  { value: 'vietnamese', label: 'Vietnamese' },
  { value: 'west-african', label: 'West African' },
  { value: 'other', label: 'Other' },
];

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'alphabetical', label: 'Alphabetical (A-Z)' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'cooktime', label: 'Cook Time' },
];

const getCategoryLabel = (value: string): string => {
  return categories.find(c => c.value === value)?.label || '';
};

const getDifficultyLabel = (value: string): string => {
  return difficulties.find(d => d.value === value)?.label || '';
};

const getDietaryLabel = (value: string): string => {
  return dietaryRestrictions.find(d => d.value === value)?.label || '';
};

const getCuisineLabel = (value: string): string => {
  return cuisineTypes.find(c => c.value === value)?.label || '';
};

interface RecipeWithRating extends Recipe {
  avgRating?: number;
  ratingCount?: number;
  dietary_restrictions?: string[];
  cuisine_type?: string;
  view_count?: number;
}

export default function Recipes() {
  const { success, error: showError } = useToast();
  const { trainingMode } = useTraining();
  const [recipes, setRecipes] = useState<RecipeWithRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [dietaryRestriction, setDietaryRestriction] = useState('all');
  const [cuisineType, setCuisineType] = useState('all');
  const [recipeBy, setRecipeBy] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [cookbooks, setCookbooks] = useState<Cookbook[]>([]);
  const [selectedCookbook, setSelectedCookbook] = useState<Cookbook | null>(null);
  const [cookbookRecipeCounts, setCookbookRecipeCounts] = useState<Record<string, number>>({});
  const [cookbookCoverImages, setCookbookCoverImages] = useState<Record<string, string>>({});
  const [cookbookRecipeIds, setCookbookRecipeIds] = useState<Record<string, string[]>>({});
  const [draggingRecipeIds, setDraggingRecipeIds] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [addToCookbookId, setAddToCookbookId] = useState<string>('');
  const [recipeCookbooks, setRecipeCookbooks] = useState<Record<string, string[]>>({});
  const dragImageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRecipes();
    fetchCookbooks();
  }, []);

  const fetchRecipes = async () => {
    const { data: recipesData } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false });

    if (recipesData) {
      const { data: ratingsData } = await supabase
        .from('recipe_ratings')
        .select('recipe_id, rating');

      const ratingsMap = new Map<string, { sum: number; count: number }>();
      ratingsData?.forEach(r => {
        const existing = ratingsMap.get(r.recipe_id) || { sum: 0, count: 0 };
        ratingsMap.set(r.recipe_id, {
          sum: existing.sum + r.rating,
          count: existing.count + 1,
        });
      });

      const recipesWithRatings = recipesData.map(recipe => {
        const ratingInfo = ratingsMap.get(recipe.id);
        return {
          ...recipe,
          avgRating: ratingInfo ? ratingInfo.sum / ratingInfo.count : undefined,
          ratingCount: ratingInfo?.count || 0,
        };
      });

      setRecipes(recipesWithRatings);
    }
    setLoading(false);
  };

  const fetchCookbooks = async () => {
    const { data: cookbooksData } = await supabase.from('cookbooks').select('*').order('title');
    if (cookbooksData) {
      setCookbooks(cookbooksData);

      const { data: cookbookRecipesData } = await supabase.from('cookbook_recipes').select('cookbook_id, recipe_id');
      if (cookbookRecipesData) {
        const counts: Record<string, number> = {};
        const recipeIds: Record<string, string[]> = {};
        const recipeCookbooksMap: Record<string, string[]> = {};

        cookbookRecipesData.forEach(cr => {
          counts[cr.cookbook_id] = (counts[cr.cookbook_id] || 0) + 1;
          if (!recipeIds[cr.cookbook_id]) recipeIds[cr.cookbook_id] = [];
          recipeIds[cr.cookbook_id].push(cr.recipe_id);

          if (!recipeCookbooksMap[cr.recipe_id]) recipeCookbooksMap[cr.recipe_id] = [];
          recipeCookbooksMap[cr.recipe_id].push(cr.cookbook_id);
        });

        setCookbookRecipeCounts(counts);
        setCookbookRecipeIds(recipeIds);
        setRecipeCookbooks(recipeCookbooksMap);
      }

      const { data: recipesForCovers } = await supabase
        .from('recipes')
        .select('id, cover_image_url')
        .not('cover_image_url', 'is', null);

      if (recipesForCovers && cookbookRecipesData) {
        const coverImages: Record<string, string> = {};
        cookbooksData.forEach(cookbook => {
          if (!cookbook.cover_image_url) {
            const recipeIdsInCookbook = cookbookRecipesData
              .filter(cr => cr.cookbook_id === cookbook.id)
              .map(cr => cr.recipe_id);
            const firstWithImage = recipesForCovers.find(r => recipeIdsInCookbook.includes(r.id));
            if (firstWithImage?.cover_image_url) {
              coverImages[cookbook.id] = firstWithImage.cover_image_url;
            }
          }
        });
        setCookbookCoverImages(coverImages);
      }
    }
  };

  const handleRecipeDragStart = (e: React.DragEvent, recipeId: string, recipeTitle: string) => {
    setDraggingRecipeIds([recipeId]);
    e.dataTransfer.setData('application/x-recipe-ids', JSON.stringify([recipeId]));
    e.dataTransfer.effectAllowed = 'copy';

    if (dragImageRef.current) {
      dragImageRef.current.textContent = recipeTitle;
      dragImageRef.current.style.display = 'block';
      e.dataTransfer.setDragImage(dragImageRef.current, 75, 20);
      setTimeout(() => {
        if (dragImageRef.current) dragImageRef.current.style.display = 'none';
      }, 0);
    }
  };

  const handleRecipeDragEnd = () => {
    setDraggingRecipeIds([]);
  };

  const handleBulkDelete = async (ids: string[]): Promise<void> => {
    if (!confirm(`Delete ${ids.length} recipe${ids.length > 1 ? 's' : ''} permanently?`)) return;

    for (const recipeId of ids) {
      await supabase.from('cookbook_recipes').delete().eq('recipe_id', recipeId);
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
      await supabase.from('recipe_ratings').delete().eq('recipe_id', recipeId);
      await supabase.from('recipes').delete().eq('id', recipeId);
    }

    success(`Deleted ${ids.length} recipe${ids.length > 1 ? 's' : ''}`);
    setSelectMode(false);
    setSelectedIds(new Set());
    fetchRecipes();
    fetchCookbooks();
  };

  const handleDropOnCookbook = async (cookbookId: string, recipeIds: string[]) => {
    const existingInCookbook = cookbookRecipeIds[cookbookId] || [];
    const toAdd = recipeIds.filter((id) => !existingInCookbook.includes(id));

    if (toAdd.length === 0) {
      showError('Recipe is already in this cookbook');
      return;
    }

    const { error } = await supabase.from('cookbook_recipes').insert(
      toAdd.map((recipe_id) => ({
        cookbook_id: cookbookId,
        recipe_id,
      }))
    );

    if (error) {
      showError('Failed to add recipe to cookbook');
    } else {
      success(`Added recipe to cookbook`);
      fetchCookbooks();
    }
  };

  const applyFiltersAndSort = useCallback((recipeList: RecipeWithRating[]) => {
    let result = [...recipeList];

    if (category !== 'all') {
      result = result.filter(r => r.category === category);
    }

    if (difficulty !== 'all') {
      result = result.filter(r => r.difficulty === difficulty);
    }

    if (dietaryRestriction !== 'all') {
      result = result.filter(r => {
        const restrictions = r.dietary_restrictions as string[] | null;
        return restrictions && restrictions.includes(dietaryRestriction);
      });
    }

    if (cuisineType !== 'all') {
      result = result.filter(r => r.cuisine_type === cuisineType);
    }

    if (recipeBy !== 'all') {
      result = result.filter(r => r.original_author === recipeBy);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => {
        if (r.title.toLowerCase().includes(query)) return true;

        if (r.description?.toLowerCase().includes(query)) return true;

        if ((r.ingredients as string[])?.some(i => i.toLowerCase().includes(query))) return true;

        if (r.category) {
          const categoryLabel = getCategoryLabel(r.category).toLowerCase();
          if (r.category.toLowerCase().includes(query) || categoryLabel.includes(query)) return true;
        }

        if (r.difficulty) {
          const difficultyLabel = getDifficultyLabel(r.difficulty).toLowerCase();
          if (r.difficulty.toLowerCase().includes(query) || difficultyLabel.includes(query)) return true;
        }

        if (r.dietary_restrictions && Array.isArray(r.dietary_restrictions)) {
          const matchesDietary = r.dietary_restrictions.some(dr => {
            const dietaryLabel = getDietaryLabel(dr).toLowerCase();
            return dr.toLowerCase().includes(query) || dietaryLabel.includes(query);
          });
          if (matchesDietary) return true;
        }

        if (r.cuisine_type) {
          const cuisineLabel = getCuisineLabel(r.cuisine_type).toLowerCase();
          if (r.cuisine_type.toLowerCase().includes(query) || cuisineLabel.includes(query)) return true;
        }

        if (r.original_author?.toLowerCase().includes(query)) return true;

        return false;
      });
    }

    switch (sortBy) {
      case 'alphabetical':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'popular':
        result.sort((a, b) => {
          const countA = Object.values(cookbookRecipeIds).filter(ids => ids.includes(a.id)).length;
          const countB = Object.values(cookbookRecipeIds).filter(ids => ids.includes(b.id)).length;
          if (countB !== countA) return countB - countA;
          return (b.view_count || 0) - (a.view_count || 0);
        });
        break;
      case 'cooktime':
        result.sort((a, b) => {
          const timeA = (a.prep_time_minutes || 0) + (a.cook_time_minutes || 0);
          const timeB = (b.prep_time_minutes || 0) + (b.cook_time_minutes || 0);
          return timeA - timeB;
        });
        break;
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [category, difficulty, dietaryRestriction, cuisineType, recipeBy, sortBy, searchQuery, cookbookRecipeIds]);

  const allRecipesInCookbooks = useMemo(() => {
    const set = new Set<string>();
    Object.values(cookbookRecipeIds).forEach((recipeIds) => {
      recipeIds.forEach((id) => set.add(id));
    });
    return set;
  }, [cookbookRecipeIds]);

  const unclassifiedRecipes = useMemo(() => {
    return recipes.filter((recipe) => !allRecipesInCookbooks.has(recipe.id));
  }, [recipes, allRecipesInCookbooks]);

  const classifiedRecipes = useMemo(() => {
    return recipes.filter((recipe) => allRecipesInCookbooks.has(recipe.id));
  }, [recipes, allRecipesInCookbooks]);

  const filteredUnclassified = useMemo(() => {
    return applyFiltersAndSort(unclassifiedRecipes);
  }, [unclassifiedRecipes, applyFiltersAndSort]);

  const filteredClassified = useMemo(() => {
    return applyFiltersAndSort(classifiedRecipes);
  }, [classifiedRecipes, applyFiltersAndSort]);

  const classifiedWithCookbooks: RecipeWithCookbooks[] = useMemo(() => {
    return filteredClassified.map(recipe => ({
      ...recipe,
      cookbookNames: (recipeCookbooks[recipe.id] || []).map(cookbookId => {
        const cookbook = cookbooks.find(c => c.id === cookbookId);
        return cookbook?.title || '';
      }).filter(Boolean)
    }));
  }, [filteredClassified, recipeCookbooks, cookbooks]);

  const filteredAlbumRecipes = useMemo(() => {
    if (!selectedCookbook) return [];
    const recipeIdsInCookbook = cookbookRecipeIds[selectedCookbook.id] || [];
    const albumRecipes = recipes.filter(r => recipeIdsInCookbook.includes(r.id));
    return applyFiltersAndSort(albumRecipes);
  }, [recipes, selectedCookbook, cookbookRecipeIds, applyFiltersAndSort]);


  const toggleSelect = (id: string, index: number, shiftKey: boolean, recipeList: RecipeWithRating[]) => {
    if (shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const newSelected = new Set(selectedIds);
      for (let i = start; i <= end; i++) {
        newSelected.add(recipeList[i].id);
      }
      setSelectedIds(newSelected);
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      setLastSelectedIndex(index);
    }
  };

  const handleAddToCookbook = async () => {
    if (!addToCookbookId || selectedIds.size === 0) return;

    const existingInCookbook = cookbookRecipeIds[addToCookbookId] || [];
    const toAdd = Array.from(selectedIds).filter(id => !existingInCookbook.includes(id));

    if (toAdd.length === 0) {
      showError('Selected recipes are already in this cookbook');
      return;
    }

    const { error } = await supabase.from('cookbook_recipes').insert(
      toAdd.map(recipe_id => ({
        cookbook_id: addToCookbookId,
        recipe_id,
      }))
    );

    if (error) {
      showError('Failed to add to cookbook');
    } else {
      success(`Added ${toAdd.length} recipe${toAdd.length > 1 ? 's' : ''} to cookbook`);
      setSelectMode(false);
      setSelectedIds(new Set());
      setAddToCookbookId('');
      setLastSelectedIndex(null);
      fetchCookbooks();
    }
  };

  const handleRemoveFromCookbook = async () => {
    if (!selectedCookbook || selectedIds.size === 0) return;

    const { error } = await supabase
      .from('cookbook_recipes')
      .delete()
      .eq('cookbook_id', selectedCookbook.id)
      .in('recipe_id', Array.from(selectedIds));

    if (error) {
      showError('Failed to remove from cookbook');
    } else {
      success(`Removed ${selectedIds.size} recipe${selectedIds.size > 1 ? 's' : ''} from cookbook`);
      setSelectMode(false);
      setSelectedIds(new Set());
      setLastSelectedIndex(null);
      fetchCookbooks();
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setAddToCookbookId('');
    setLastSelectedIndex(null);
  };

  const activeFiltersCount = [
    category !== 'all',
    difficulty !== 'all',
    dietaryRestriction !== 'all',
    cuisineType !== 'all',
    recipeBy !== 'all',
    searchQuery.trim(),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setCategory('all');
    setDifficulty('all');
    setDietaryRestriction('all');
    setCuisineType('all');
    setRecipeBy('all');
    setSearchQuery('');
    setSortBy('newest');
  };

  if (selectedCookbook) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl text-[var(--text-primary)]">{selectedCookbook.title}</h1>
            <p className="text-[var(--text-secondary)]">
              {filteredAlbumRecipes.length} recipe{filteredAlbumRecipes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!selectMode ? (
              <Link to="/recipes/new">
                <Button>
                  <Plus size={18} className="mr-2" /> Add Recipe
                </Button>
              </Link>
            ) : (
              <>
                <span className="text-sm text-[var(--text-secondary)]">
                  {selectedIds.size} selected
                </span>
                <Button variant="ghost" onClick={exitSelectMode}>
                  <X size={18} className="mr-1" /> Cancel
                </Button>
              </>
            )}
          </div>
        </div>

      {selectMode && selectedIds.size > 0 && (
        <Card className="mb-6 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => {
                if (selectedIds.size === filteredAlbumRecipes.length) {
                  setSelectedIds(new Set());
                } else {
                  setSelectedIds(new Set(filteredAlbumRecipes.map(r => r.id)));
                }
              }}
              className="text-sm text-[var(--accent-gold)] hover:underline"
            >
              {selectedIds.size === filteredAlbumRecipes.length ? 'Deselect All' : 'Select All'}
            </button>

            <Button variant="secondary" size="sm" onClick={handleRemoveFromCookbook}>
              <ArrowLeft size={16} className="mr-1" /> Remove from Cookbook
            </Button>

            <p className="text-xs text-[var(--text-muted)] ml-auto hover-only">
              Tip: Hold Shift and click to select a range
            </p>
          </div>
        </Card>
      )}

      <div className="mb-6 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ingredients, category, author, cuisine..."
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
              showFilters || activeFiltersCount > 0
                ? 'bg-[rgba(var(--accent-primary-rgb),0.1)] border-[var(--accent-gold)] text-[var(--accent-gold)]'
                : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent-gold)]'
            }`}
          >
            <SlidersHorizontal size={18} />
            <span className="hidden sm:inline">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[var(--accent-gold)] text-[#0f0f0f] text-xs flex items-center justify-center font-medium">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                >
                  {categories.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                >
                  {difficulties.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Dietary</label>
                <select
                  value={dietaryRestriction}
                  onChange={(e) => setDietaryRestriction(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                >
                  {dietaryRestrictions.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Cuisine</label>
                <select
                  value={cuisineType}
                  onChange={(e) => setCuisineType(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                >
                  {cuisineTypes.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Recipe By</label>
                <select
                  value={recipeBy}
                  onChange={(e) => setRecipeBy(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                >
                  <option value="all">Any Recipe Author</option>
                  {[...new Set(recipes.map(r => r.original_author).filter((a): a is string => Boolean(a)))].sort().map(author => (
                    <option key={author} value={author}>{author}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                >
                  {sortOptions.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-3 text-sm text-[var(--accent-gold)] hover:underline"
              >
                Clear all filters
              </button>
            )}
          </Card>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={() => setSelectedCookbook(null)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/20 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to All Recipes</span>
        </button>

        <div className="flex-1" />

        {!selectMode && filteredAlbumRecipes.length > 0 && (
          <button
            onClick={() => setSelectMode(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <Check size={18} />
            <span className="text-sm">Select</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 -m-4 mb-4 rounded-b-none" />
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      ) : filteredAlbumRecipes.length === 0 ? (
        <Card className="text-center py-16">
          <UtensilsCrossed className="mx-auto mb-4 text-[var(--text-muted)]" size={56} />
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
            {searchQuery || activeFiltersCount > 0
              ? 'No recipes found'
              : 'No recipes in this cookbook yet'}
          </h3>
          <p className="text-[var(--text-secondary)] mb-6">
            {searchQuery || activeFiltersCount > 0
              ? 'Try adjusting your filters or search terms'
              : 'Drag recipes here or use the select feature to add them'}
          </p>
          {(searchQuery || activeFiltersCount > 0) ? (
            <Button variant="secondary" onClick={clearFilters}>
              Clear Filters
            </Button>
          ) : (
            <Link to="/recipes/new">
              <Button>
                <Plus size={18} className="mr-2" /> Add Recipe
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredAlbumRecipes.map((recipe, index) => {
            const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
            const isDragging = draggingRecipeIds.includes(recipe.id);
            const isSelected = selectedIds.has(recipe.id);

            const handleClick = (e: React.MouseEvent) => {
              if (selectMode) {
                e.preventDefault();
                toggleSelect(recipe.id, index, e.shiftKey, filteredAlbumRecipes);
              }
            };

            const cardContent = (
              <div className={`group relative overflow-hidden rounded-lg cursor-pointer bg-[var(--bg-tertiary)] aspect-square ${
                selectMode && isSelected ? 'ring-2 ring-[var(--accent-gold)]' : ''
              }`}>
                {recipe.cover_image_url ? (
                  <img
                    src={recipe.cover_image_url}
                    alt={recipe.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[rgba(var(--accent-primary-rgb),0.2)] to-[rgba(var(--accent-secondary-rgb),0.2)]">
                    <UtensilsCrossed size={48} className="text-[var(--accent-gold)]/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                {selectMode && (
                  <div className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)]'
                      : 'bg-black/30 border-white/70'
                  }`}>
                    {isSelected && <Check size={14} className="text-black" />}
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="font-serif text-sm text-white mb-1 line-clamp-1 font-medium">
                    {recipe.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-white/80">
                    {totalTime > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {totalTime}m
                      </span>
                    )}
                    {recipe.servings && (
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {recipe.servings}
                      </span>
                    )}
                    {recipe.avgRating && (
                      <span className="flex items-center gap-1">
                        <Star size={12} className="text-[var(--accent-gold)] fill-accent-gold" />
                        {recipe.avgRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );

            return (
              <div
                key={recipe.id}
                draggable={!selectMode}
                onDragStart={(e) => !selectMode && handleRecipeDragStart(e, recipe.id, recipe.title)}
                onDragEnd={handleRecipeDragEnd}
                onClick={handleClick}
                className={`relative ${isDragging ? 'opacity-50 scale-95' : ''} transition-all ${
                  selectMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
                }`}
              >
                {selectMode ? (
                  cardContent
                ) : (
                  <Link to={`/recipes/${recipe.id}`}>
                    {cardContent}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div
        ref={dragImageRef}
        className="fixed -left-[9999px] px-4 py-2 bg-[var(--accent-gold)] text-[#0f0f0f] rounded-lg font-medium shadow-xl text-sm max-w-[200px] truncate"
        style={{ display: 'none' }}
      />
    </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {trainingMode && <SectionWelcome sectionId="recipes" />}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <TrainingTooltip tipId="recipes-title" content={TOOLTIPS['recipes-title']?.content || ''} position="bottom">
            <h1 className="font-serif text-3xl text-[var(--text-primary)]">Family Recipes</h1>
          </TrainingTooltip>
          <p className="text-[var(--text-secondary)]">
            {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} across {cookbooks.length} cookbook{cookbooks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TrainingTooltip tipId="recipes-add" content={TOOLTIPS['recipes-add']?.content || ''} position="bottom">
            <Link to="/recipes/new">
              <Button>
                <Plus size={18} className="mr-2" /> Add Recipe
              </Button>
            </Link>
          </TrainingTooltip>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 -m-4 mb-4 rounded-b-none" />
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      )}

      {!loading && cookbooks.length > 0 && (
        <div className="mb-8">
          <CookbookManager
            cookbooks={cookbooks}
            cookbookRecipeCounts={cookbookRecipeCounts}
            cookbookCoverImages={cookbookCoverImages}
            selectedCookbook={selectedCookbook}
            onSelectCookbook={setSelectedCookbook}
            onUpdate={fetchCookbooks}
            isDraggingRecipe={draggingRecipeIds.length > 0}
            onDropRecipe={handleDropOnCookbook}
          />
        </div>
      )}

      {!loading && (
        <div className="mb-6 space-y-4">
        <div className="flex gap-3">
          <TrainingTooltip tipId="recipes-search" content={TOOLTIPS['recipes-search']?.content || ''} position="bottom">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ingredients, category, author, cuisine..."
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </TrainingTooltip>
          <TrainingTooltip tipId="recipes-filters" content={TOOLTIPS['recipes-filters']?.content || ''} position="bottom">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-[rgba(var(--accent-primary-rgb),0.1)] border-[var(--accent-gold)] text-[var(--accent-gold)]'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent-gold)]'
              }`}
            >
              <SlidersHorizontal size={18} />
              <span className="hidden sm:inline">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[var(--accent-gold)] text-[#0f0f0f] text-xs flex items-center justify-center font-medium">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </TrainingTooltip>
        </div>

        {showFilters && (
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                >
                  {categories.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                >
                  {difficulties.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Dietary</label>
                <select
                  value={dietaryRestriction}
                  onChange={(e) => setDietaryRestriction(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                >
                  {dietaryRestrictions.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Cuisine</label>
                <select
                  value={cuisineType}
                  onChange={(e) => setCuisineType(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                >
                  {cuisineTypes.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Recipe By</label>
                <select
                  value={recipeBy}
                  onChange={(e) => setRecipeBy(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                >
                  <option value="all">Any Recipe Author</option>
                  {[...new Set(recipes.map(r => r.original_author).filter((a): a is string => Boolean(a)))].sort().map(author => (
                    <option key={author} value={author}>{author}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                >
                  {sortOptions.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-3 text-sm text-[var(--accent-gold)] hover:underline"
              >
                Clear all filters
              </button>
            )}
          </Card>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                category === cat.value
                  ? 'bg-[var(--accent-gold)] text-[#0f0f0f] shadow-lg shadow-[var(--accent-gold)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        </div>
      )}

      {!loading && filteredClassified.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <TrainingTooltip tipId="recipes-all-recipes" content={TOOLTIPS['recipes-all-recipes']?.content || ''} position="top">
              <div className="flex items-center gap-2">
                <UtensilsCrossed size={20} className="text-[var(--text-muted)]" />
                <h2 className="text-xl font-medium text-[var(--text-primary)]">All Recipes</h2>
                <span className="text-sm text-[var(--text-muted)]">
                  ({filteredClassified.length} recipe{filteredClassified.length !== 1 ? 's' : ''})
                </span>
              </div>
            </TrainingTooltip>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {classifiedWithCookbooks.map((recipe) => {
              const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
              const isDragging = draggingRecipeIds.includes(recipe.id);

              return (
                <div
                  key={recipe.id}
                  draggable
                  onDragStart={(e) => handleRecipeDragStart(e, recipe.id, recipe.title)}
                  onDragEnd={handleRecipeDragEnd}
                  className={`relative ${isDragging ? 'opacity-50 scale-95' : ''} transition-all cursor-grab active:cursor-grabbing`}
                >
                  <Link to={`/recipes/${recipe.id}`}>
                    <div className="group relative overflow-hidden rounded-lg cursor-pointer bg-[var(--bg-tertiary)] aspect-square">
                      {recipe.cover_image_url ? (
                        <img
                          src={recipe.cover_image_url}
                          alt={recipe.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[rgba(var(--accent-primary-rgb),0.2)] to-[rgba(var(--accent-secondary-rgb),0.2)]">
                          <UtensilsCrossed size={48} className="text-[var(--accent-gold)]/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                      {recipe.original_author && (
                        <div className="absolute top-2 left-2 right-2">
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] bg-[var(--accent-gold)]/90 text-black rounded-full font-medium">
                            <ChefHat size={10} />
                            {recipe.original_author}
                          </span>
                        </div>
                      )}

                      {recipe.cookbookNames && recipe.cookbookNames.length > 0 && (
                        <div className="absolute bottom-14 left-2 right-2 flex flex-wrap gap-1">
                          {recipe.cookbookNames.slice(0, 2).map((name, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-[10px] bg-black/70 text-white rounded-full backdrop-blur-sm"
                            >
                              {name}
                            </span>
                          ))}
                          {recipe.cookbookNames.length > 2 && (
                            <span className="px-2 py-0.5 text-[10px] bg-black/70 text-white rounded-full backdrop-blur-sm">
                              +{recipe.cookbookNames.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="font-serif text-sm text-white mb-1 line-clamp-1 font-medium">
                          {recipe.title}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-white/80">
                          {totalTime > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock size={12} /> {totalTime}m
                            </span>
                          )}
                          {recipe.servings && (
                            <span className="flex items-center gap-1">
                              <Users size={12} /> {recipe.servings}
                            </span>
                          )}
                          {recipe.avgRating && (
                            <span className="flex items-center gap-1">
                              <Star size={12} className="text-[var(--accent-gold)] fill-accent-gold" />
                              {recipe.avgRating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && filteredUnclassified.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UtensilsCrossed size={20} className="text-[var(--text-muted)]" />
              <h2 className="text-xl font-medium text-[var(--text-primary)]">Unclassified</h2>
              <span className="text-sm text-[var(--text-muted)]">
                ({filteredUnclassified.length} recipe{filteredUnclassified.length !== 1 ? 's' : ''})
              </span>
            </div>

            <div className="flex items-center gap-2">
              {selectMode ? (
                <>
                  <span className="text-sm text-[var(--text-secondary)]">
                    {selectedIds.size} selected
                  </span>
                  <button
                    onClick={() => {
                      if (selectedIds.size === filteredUnclassified.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(filteredUnclassified.map(r => r.id)));
                      }
                    }}
                    className="text-sm text-[var(--accent-gold)] hover:underline"
                  >
                    {selectedIds.size === filteredUnclassified.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={exitSelectMode}
                  >
                    <X size={18} className="mr-1" /> Cancel
                  </Button>
                </>
              ) : (
                filteredUnclassified.length > 0 && (
                  <button
                    onClick={() => setSelectMode(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    <Check size={18} />
                    <span className="text-sm">Select</span>
                  </button>
                )
              )}
            </div>
          </div>

          {selectMode && selectedIds.size > 0 && (
            <Card className="mb-4 p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <FolderPlus size={18} className="text-[var(--text-muted)]" />
                  <select
                    value={addToCookbookId}
                    onChange={(e) => setAddToCookbookId(e.target.value)}
                    className="px-3 py-1.5 text-sm rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                  >
                    <option value="">Add to cookbook...</option>
                    {cookbooks.map((cookbook) => (
                      <option key={cookbook.id} value={cookbook.id}>
                        {cookbook.title}
                      </option>
                    ))}
                  </select>
                  {addToCookbookId && (
                    <Button size="sm" onClick={handleAddToCookbook}>
                      <Check size={16} className="mr-1" /> Add
                    </Button>
                  )}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleBulkDelete(Array.from(selectedIds))}
                >
                  Delete Selected
                </Button>

                <p className="text-xs text-[var(--text-muted)] ml-auto hover-only">
                  Tip: Hold Shift and click to select a range
                </p>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredUnclassified.map((recipe, index) => {
              const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
              const isDragging = draggingRecipeIds.includes(recipe.id);
              const isSelected = selectedIds.has(recipe.id);

              const handleClick = (e: React.MouseEvent) => {
                if (selectMode) {
                  e.preventDefault();
                  toggleSelect(recipe.id, index, e.shiftKey, filteredUnclassified);
                }
              };

              const cardContent = (
                <div className={`group relative overflow-hidden rounded-lg cursor-pointer bg-[var(--bg-tertiary)] aspect-square ${
                  selectMode && isSelected ? 'ring-2 ring-[var(--accent-gold)]' : ''
                }`}>
                  {recipe.cover_image_url ? (
                    <img
                      src={recipe.cover_image_url}
                      alt={recipe.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[rgba(var(--accent-primary-rgb),0.2)] to-[rgba(var(--accent-secondary-rgb),0.2)]">
                      <UtensilsCrossed size={48} className="text-[var(--accent-gold)]/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  {selectMode && (
                    <div className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)]'
                        : 'bg-black/30 border-white/70'
                    }`}>
                      {isSelected && <Check size={14} className="text-black" />}
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="font-serif text-sm text-white mb-1 line-clamp-1 font-medium">
                      {recipe.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-white/80">
                      {totalTime > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {totalTime}m
                        </span>
                      )}
                      {recipe.servings && (
                        <span className="flex items-center gap-1">
                          <Users size={12} /> {recipe.servings}
                        </span>
                      )}
                      {recipe.avgRating && (
                        <span className="flex items-center gap-1">
                          <Star size={12} className="text-[var(--accent-gold)] fill-accent-gold" />
                          {recipe.avgRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );

              return (
                <div
                  key={recipe.id}
                  draggable={!selectMode}
                  onDragStart={(e) => !selectMode && handleRecipeDragStart(e, recipe.id, recipe.title)}
                  onDragEnd={handleRecipeDragEnd}
                  onClick={handleClick}
                  className={`relative ${isDragging ? 'opacity-50 scale-95' : ''} transition-all ${
                    selectMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
                  }`}
                >
                  {selectMode ? (
                    cardContent
                  ) : (
                    <Link to={`/recipes/${recipe.id}`}>
                      {cardContent}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div
        ref={dragImageRef}
        className="fixed -left-[9999px] px-4 py-2 bg-[var(--accent-gold)] text-[#0f0f0f] rounded-lg font-medium shadow-xl text-sm max-w-[200px] truncate"
        style={{ display: 'none' }}
      />
    </div>
  );
}
