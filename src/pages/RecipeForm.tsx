import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { IngredientInput } from '../components/recipe/IngredientInput';
import { ArrowLeft, Plus, Trash2, Upload, GripVertical, ChefHat, Camera, X, BookOpen, Check } from 'lucide-react';
import type { RecipeIngredient, Cookbook } from '../types';

const categories = [
  { value: 'appetizers-small-bites', label: 'Appetizers & Small Bites' },
  { value: 'soups-stews', label: 'Soups & Stews' },
  { value: 'salads', label: 'Salads' },
  { value: 'breakfast-brunch', label: 'Breakfast & Brunch' },
  { value: 'main-poultry', label: 'Main Courses - Poultry' },
  { value: 'main-beef-lamb', label: 'Main Courses - Beef & Lamb' },
  { value: 'main-pork', label: 'Main Courses - Pork' },
  { value: 'main-seafood', label: 'Main Courses - Seafood' },
  { value: 'main-vegetarian', label: 'Main Courses - Vegetarian' },
  { value: 'pasta-rice-grains', label: 'Pasta, Rice & Grains' },
  { value: 'vegetables-sides', label: 'Vegetables & Side Dishes' },
  { value: 'breads-rolls', label: 'Breads & Rolls' },
  { value: 'sauces-gravies-condiments', label: 'Sauces, Gravies & Condiments' },
  { value: 'dips-spreads', label: 'Dips & Spreads' },
  { value: 'stocks-broths', label: 'Stocks & Broths' },
  { value: 'desserts-cakes', label: 'Desserts & Cakes' },
  { value: 'cookies-bars-pastries', label: 'Cookies, Bars & Pastries' },
  { value: 'beverages-cocktails', label: 'Beverages & Cocktails' },
  { value: 'preserves-jams-pickles', label: 'Preserves, Jams & Pickles' },
  { value: 'other', label: 'Other' },
];

const difficulties = [
  { value: 'easy', label: 'Easy', desc: 'Simple techniques, basic ingredients' },
  { value: 'medium', label: 'Medium', desc: 'Some cooking skills required' },
  { value: 'hard', label: 'Hard', desc: 'Advanced techniques needed' },
];

function createEmptyIngredient(sortOrder: number): RecipeIngredient {
  return {
    quantity: null,
    quantity_display: '',
    unit: '',
    name: '',
    notes: '',
    is_header: false,
    sort_order: sortOrder,
  };
}

export default function RecipeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingStepImage, setUploadingStepImage] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    original_author: '',
    category: 'main-poultry',
    difficulty: 'medium',
    prep_time_minutes: '',
    cook_time_minutes: '',
    servings: '4',
    instructions: [''],
    tips: '',
    source: '',
    cover_image_url: '',
    is_thanksgiving_classic: false,
  });
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([createEmptyIngredient(0)]);
  const [instructionImages, setInstructionImages] = useState<Record<number, string>>({});
  const [cookbooks, setCookbooks] = useState<Cookbook[]>([]);
  const [selectedCookbookIds, setSelectedCookbookIds] = useState<string[]>([]);

  useEffect(() => {
    fetchCookbooks();
    if (id) fetchRecipe();
  }, [id]);

  const fetchCookbooks = async () => {
    const { data } = await supabase.from('cookbooks').select('*').order('title');
    if (data) setCookbooks(data);
  };

  const fetchRecipe = async () => {
    const { data: recipe } = await supabase.from('recipes').select('*').eq('id', id).maybeSingle();
    if (recipe) {
      setForm({
        title: recipe.title,
        description: recipe.description || '',
        original_author: recipe.original_author || '',
        category: recipe.category,
        difficulty: recipe.difficulty || 'medium',
        prep_time_minutes: recipe.prep_time_minutes?.toString() || '',
        cook_time_minutes: recipe.cook_time_minutes?.toString() || '',
        servings: recipe.servings?.toString() || '4',
        instructions: recipe.instructions?.length ? recipe.instructions : [''],
        tips: recipe.tips || '',
        source: recipe.source || '',
        cover_image_url: recipe.cover_image_url || '',
        is_thanksgiving_classic: recipe.is_thanksgiving_classic || false,
      });

      if (recipe.instruction_images) {
        const imgMap: Record<number, string> = {};
        Object.entries(recipe.instruction_images).forEach(([key, val]) => {
          imgMap[parseInt(key)] = val as string;
        });
        setInstructionImages(imgMap);
      }

      const { data: structuredIngs } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', id)
        .order('sort_order');

      if (structuredIngs && structuredIngs.length > 0) {
        setIngredients(structuredIngs);
      } else if (recipe.ingredients?.length) {
        const parsed = recipe.ingredients.map((ing: string, idx: number) => ({
          ...createEmptyIngredient(idx),
          name: ing,
        }));
        setIngredients(parsed);
      }

      const { data: cookbookRecipes } = await supabase
        .from('cookbook_recipes')
        .select('cookbook_id')
        .eq('recipe_id', id);
      if (cookbookRecipes) {
        setSelectedCookbookIds(cookbookRecipes.map(cr => cr.cookbook_id));
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/recipes/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, file);
    if (error) {
      showError('Failed to upload image');
    } else {
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
      setForm({ ...form, cover_image_url: publicUrl });
    }
    setUploading(false);
  };

  const handleStepImageUpload = async (stepIndex: number, file: File) => {
    if (!user) return;
    setUploadingStepImage(stepIndex);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/recipes/steps/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
      setInstructionImages(prev => ({ ...prev, [stepIndex]: publicUrl }));
    }
    setUploadingStepImage(null);
  };

  const removeStepImage = (stepIndex: number) => {
    setInstructionImages(prev => {
      const updated = { ...prev };
      delete updated[stepIndex];
      return updated;
    });
  };

  const toggleCookbook = (cookbookId: string) => {
    setSelectedCookbookIds(prev =>
      prev.includes(cookbookId)
        ? prev.filter(id => id !== cookbookId)
        : [...prev, cookbookId]
    );
  };

  const addInstruction = () => setForm({ ...form, instructions: [...form.instructions, ''] });

  const removeInstruction = (index: number) => {
    const updated = form.instructions.filter((_, i) => i !== index);
    setForm({ ...form, instructions: updated.length ? updated : [''] });
  };

  const updateInstruction = (index: number, value: string) => {
    const updated = [...form.instructions];
    updated[index] = value;
    setForm({ ...form, instructions: updated });
  };

  const moveInstruction = (from: number, to: number) => {
    if (to < 0 || to >= form.instructions.length) return;
    const updated = [...form.instructions];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setForm({ ...form, instructions: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const validIngredients = ingredients.filter(i => i.name.trim() || i.is_header);
    if (validIngredients.length === 0) {
      showError('Please add at least one ingredient');
      return;
    }

    if (!form.title.trim()) {
      showError('Please enter a recipe title');
      return;
    }

    setLoading(true);

    const legacyIngredients = validIngredients
      .filter(i => !i.is_header)
      .map(i => {
        const parts = [];
        if (i.quantity_display) parts.push(i.quantity_display);
        if (i.unit) parts.push(i.unit);
        parts.push(i.name);
        if (i.notes) parts.push(`(${i.notes})`);
        return parts.join(' ');
      });

    const filteredInstructions = form.instructions.filter(i => i.trim());
    const remappedInstructionImages: Record<number, string> = {};
    form.instructions.forEach((inst, oldIndex) => {
      if (inst.trim() && instructionImages[oldIndex]) {
        const newIndex = filteredInstructions.indexOf(inst);
        if (newIndex !== -1) {
          remappedInstructionImages[newIndex] = instructionImages[oldIndex];
        }
      }
    });

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      original_author: form.original_author.trim() || null,
      category: form.category,
      difficulty: form.difficulty,
      prep_time_minutes: form.prep_time_minutes ? parseInt(form.prep_time_minutes) : null,
      cook_time_minutes: form.cook_time_minutes ? parseInt(form.cook_time_minutes) : null,
      servings: form.servings ? parseInt(form.servings) : 4,
      ingredients: legacyIngredients,
      instructions: filteredInstructions,
      instruction_images: Object.keys(remappedInstructionImages).length > 0 ? remappedInstructionImages : null,
      tips: form.tips.trim() || null,
      source: form.source.trim() || null,
      cover_image_url: form.cover_image_url || null,
      is_thanksgiving_classic: form.is_thanksgiving_classic,
    };

    let recipeId = id;
    let error;

    if (id) {
      ({ error } = await supabase.from('recipes').update(payload).eq('id', id));
    } else {
      const { data, error: insertError } = await supabase
        .from('recipes')
        .insert({ ...payload, submitted_by: user.id })
        .select('id')
        .single();
      error = insertError;
      recipeId = data?.id;
    }

    if (error) {
      showError('Failed to save recipe: ' + error.message);
      setLoading(false);
      return;
    }

    if (recipeId) {
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);

      const ingredientsToInsert = validIngredients.map((ing, idx) => ({
        recipe_id: recipeId,
        quantity: ing.quantity,
        quantity_display: ing.quantity_display || null,
        unit: ing.unit || null,
        name: ing.name.trim(),
        notes: ing.notes || null,
        is_header: ing.is_header,
        sort_order: idx,
        image_url: ing.image_url || null,
      }));

      const { error: ingError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientsToInsert);

      if (ingError) {
        console.error('Failed to save ingredients:', ingError);
      }

      await supabase.from('cookbook_recipes').delete().eq('recipe_id', recipeId);
      if (selectedCookbookIds.length > 0) {
        const cookbookInserts = selectedCookbookIds.map((cookbookId, idx) => ({
          cookbook_id: cookbookId,
          recipe_id: recipeId,
          sort_order: idx,
        }));
        await supabase.from('cookbook_recipes').insert(cookbookInserts);
      }
    }

    success(id ? 'Recipe updated!' : 'Recipe created!');
    navigate('/recipes');
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/recipes')}
        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] mb-6 transition-colors"
      >
        <ArrowLeft size={20} /> Back to Recipes
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-full bg-[rgba(var(--accent-primary-rgb),0.20)] flex items-center justify-center">
          <ChefHat className="text-[var(--accent-gold)]" size={24} />
        </div>
        <div>
          <h1 className="font-serif text-3xl text-[var(--text-primary)]">
            {id ? 'Edit Recipe' : 'Share a Recipe'}
          </h1>
          <p className="text-[var(--text-secondary)]">
            {id ? 'Update your family recipe' : 'Add a new recipe to the family cookbook'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Basic Information</h2>
          <div className="space-y-4">
            <Input
              label="Recipe Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Grandma's Apple Pie"
              required
            />

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50 resize-none"
                rows={3}
                placeholder="A brief description of this recipe..."
              />
            </div>

            <Input
              label="Recipe Created By"
              value={form.original_author}
              onChange={(e) => setForm({ ...form, original_author: e.target.value })}
              placeholder="e.g., Grandma Betty, Aunt Sarah"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
                >
                  {categories.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {difficulties.map(d => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setForm({ ...form, difficulty: d.value })}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        form.difficulty === d.value
                          ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-primary-rgb),0.10)] text-[var(--accent-gold)]'
                          : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent-gold)]/50'
                      }`}
                    >
                      <span className="text-sm font-medium">{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Prep Time (min)"
                type="number"
                value={form.prep_time_minutes}
                onChange={(e) => setForm({ ...form, prep_time_minutes: e.target.value })}
                placeholder="15"
                min={0}
              />
              <Input
                label="Cook Time (min)"
                type="number"
                value={form.cook_time_minutes}
                onChange={(e) => setForm({ ...form, cook_time_minutes: e.target.value })}
                placeholder="45"
                min={0}
              />
              <Input
                label="Servings"
                type="number"
                value={form.servings}
                onChange={(e) => setForm({ ...form, servings: e.target.value })}
                placeholder="4"
                min={1}
                max={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Cover Photo
              </label>
              {form.cover_image_url ? (
                <div className="relative rounded-lg overflow-hidden">
                  <img
                    src={form.cover_image_url}
                    alt="Cover"
                    className="w-full h-48 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, cover_image_url: '' })}
                    className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--border-default)] rounded-lg cursor-pointer hover:border-[var(--accent-gold)]/50 transition-colors">
                  <Upload className="text-[var(--text-muted)] mb-2" size={24} />
                  <span className="text-sm text-[var(--text-muted)]">
                    {uploading ? 'Uploading...' : 'Click to upload a photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            <label className="flex items-center gap-3 cursor-pointer p-3 bg-[var(--bg-tertiary)] rounded-lg">
              <input
                type="checkbox"
                checked={form.is_thanksgiving_classic}
                onChange={(e) => setForm({ ...form, is_thanksgiving_classic: e.target.checked })}
                className="w-5 h-5 rounded border-[var(--border-default)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
              />
              <div>
                <span className="text-[var(--text-primary)] font-medium">Thanksgiving Classic</span>
                <p className="text-sm text-[var(--text-muted)]">Mark this as a traditional Thanksgiving recipe</p>
              </div>
            </label>

            {cookbooks.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Add to Cookbooks
                </label>
                <div className="flex flex-wrap gap-2">
                  {cookbooks.map(cookbook => {
                    const isSelected = selectedCookbookIds.includes(cookbook.id);
                    return (
                      <button
                        key={cookbook.id}
                        type="button"
                        onClick={() => toggleCookbook(cookbook.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                          isSelected
                            ? 'bg-[var(--accent-gold)] text-black'
                            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                        }`}
                      >
                        {isSelected ? <Check size={14} /> : <BookOpen size={14} />}
                        {cookbook.title}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Select one or more cookbooks to organize this recipe
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Ingredients</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Enter each ingredient with quantity, unit, and name. The recipe will automatically scale when viewers adjust servings.
          </p>
          <IngredientInput ingredients={ingredients} onChange={setIngredients} />
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Instructions</h2>
            <Button type="button" variant="secondary" onClick={addInstruction}>
              <Plus size={16} className="mr-1" /> Add Step
            </Button>
          </div>
          <div className="space-y-3">
            {form.instructions.map((instruction, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="flex flex-col items-center gap-1 pt-2">
                  <button
                    type="button"
                    onClick={() => moveInstruction(i, i - 1)}
                    disabled={i === 0}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-30"
                  >
                    <GripVertical size={14} />
                  </button>
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[rgba(var(--accent-primary-rgb),0.20)] text-[var(--accent-gold)] font-medium text-sm">
                    {i + 1}
                  </span>
                </div>
                <div className="flex-1 space-y-2">
                  <textarea
                    value={instruction}
                    onChange={(e) => updateInstruction(i, e.target.value)}
                    placeholder={`Step ${i + 1}: What to do...`}
                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50 resize-none"
                    rows={2}
                  />
                  {instructionImages[i] ? (
                    <div className="relative inline-block">
                      <img
                        src={instructionImages[i]}
                        alt={`Step ${i + 1}`}
                        className="h-16 rounded object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeStepImage(i)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                      >
                        <X size={12} className="text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${uploadingStepImage === i ? 'text-[var(--accent-gold)]' : 'text-[var(--text-muted)] hover:text-[var(--accent-gold)] hover:bg-[var(--bg-tertiary)]'}`}>
                      <Camera size={14} />
                      <span>{uploadingStepImage === i ? 'Uploading...' : 'Add photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleStepImageUpload(i, file);
                        }}
                        className="hidden"
                        disabled={uploadingStepImage !== null}
                      />
                    </label>
                  )}
                </div>
                {form.instructions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeInstruction(i)}
                    className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Additional Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Tips & Notes
              </label>
              <textarea
                value={form.tips}
                onChange={(e) => setForm({ ...form, tips: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50 resize-none"
                rows={3}
                placeholder="Any tips, variations, or special notes about this recipe..."
              />
            </div>
            <Input
              label="Source / Attribution"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="e.g., Grandma Betty's original recipe, adapted from..."
            />
          </div>
        </Card>

        <div className="flex gap-4 sticky bottom-4 p-4 -mx-4 bg-[var(--bg-primary)]/95 backdrop-blur-sm border-t border-[var(--border-default)] rounded-t-xl">
          <Button
            type="button"
            onClick={() => navigate('/recipes')}
            className="flex-1 bg-[#6b8cae] hover:bg-[#5a7b9d] text-white border-none"
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            {loading ? 'Saving...' : id ? 'Save Changes' : 'Create Recipe'}
          </Button>
        </div>
      </form>
    </div>
  );
}
