import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { TrainingTooltip } from '../training/TrainingTooltip';
import { TOOLTIPS } from '../training/training-content';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { BookOpen, Trash2, CreditCard as Edit2, Check, X, Plus } from 'lucide-react';
import type { Cookbook } from '../../types';

const COOKBOOK_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'family-favorites', label: 'Family Favorites' },
  { value: 'quick-meals', label: 'Quick Meals' },
  { value: 'special-occasions', label: 'Special Occasions' },
];

interface CookbookManagerProps {
  cookbooks: Cookbook[];
  cookbookRecipeCounts: Record<string, number>;
  cookbookCoverImages: Record<string, string>;
  selectedCookbook: Cookbook | null;
  onSelectCookbook: (cookbook: Cookbook | null) => void;
  onUpdate: () => void;
  isDraggingRecipe?: boolean;
  onDropRecipe?: (cookbookId: string, recipeIds: string[]) => void;
}

export function CookbookManager({
  cookbooks,
  cookbookRecipeCounts,
  cookbookCoverImages,
  selectedCookbook,
  onSelectCookbook,
  onUpdate,
  isDraggingRecipe,
  onDropRecipe,
}: CookbookManagerProps) {
  const { user, profile } = useAuth();
  const { success, error: showError } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [dropTargetCookbookId, setDropTargetCookbookId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    cookbook_type: 'general',
  });
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCookbookDragOver = (e: React.DragEvent, cookbookId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/x-recipe-ids')) {
      e.dataTransfer.dropEffect = 'copy';
      setDropTargetCookbookId(cookbookId);
    }
  };

  const handleCookbookDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetCookbookId(null);
  };

  const handleCookbookDrop = (e: React.DragEvent, cookbookId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetCookbookId(null);

    const recipeIdsJson = e.dataTransfer.getData('application/x-recipe-ids');
    if (recipeIdsJson && onDropRecipe) {
      try {
        const recipeIds = JSON.parse(recipeIdsJson) as string[];
        onDropRecipe(cookbookId, recipeIds);
      } catch {
        showError('Failed to add recipe to cookbook');
      }
    }
  };

  useEffect(() => {
    if (inlineEditingId && inlineInputRef.current) {
      inlineInputRef.current.focus();
      inlineInputRef.current.select();
    }
  }, [inlineEditingId]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const resetForm = () => {
    setForm({ title: '', description: '', cookbook_type: 'general' });
    setShowCreate(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!user || !form.title.trim()) {
      showError('Please enter a cookbook title');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('cookbooks').insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      cookbook_type: form.cookbook_type,
      created_by: user.id,
    });

    if (error) {
      showError('Failed to create cookbook');
    } else {
      success('Cookbook created');
      resetForm();
      onUpdate();
    }
    setLoading(false);
  };

  const handleUpdate = async (id: string) => {
    if (!form.title.trim()) {
      showError('Please enter a cookbook title');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('cookbooks')
      .update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        cookbook_type: form.cookbook_type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      showError('Failed to update cookbook');
    } else {
      success('Cookbook updated');
      resetForm();
      onUpdate();
    }
    setLoading(false);
  };

  const handleInlineSave = async (cookbookId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      const cookbook = cookbooks.find((c) => c.id === cookbookId);
      setInlineEditValue(cookbook?.title || '');
      return;
    }

    const { error } = await supabase
      .from('cookbooks')
      .update({
        title: newTitle.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', cookbookId);

    if (error) {
      showError('Failed to save');
    } else {
      onUpdate();
    }
  };

  const handleInlineChange = (value: string, cookbookId: string) => {
    setInlineEditValue(value);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleInlineSave(cookbookId, value);
    }, 500);
  };

  const handleInlineBlur = (cookbookId: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    handleInlineSave(cookbookId, inlineEditValue);
    setInlineEditingId(null);
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent, cookbookId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      handleInlineSave(cookbookId, inlineEditValue);
      setInlineEditingId(null);
    } else if (e.key === 'Escape') {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      setInlineEditingId(null);
    }
  };

  const startInlineEdit = (e: React.MouseEvent, cookbook: Cookbook) => {
    e.stopPropagation();
    setInlineEditingId(cookbook.id);
    setInlineEditValue(cookbook.title);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this cookbook? Recipes will not be deleted.')) return;

    setLoading(true);
    await supabase.from('cookbook_recipes').delete().eq('cookbook_id', id);
    const { error } = await supabase.from('cookbooks').delete().eq('id', id);

    if (error) {
      showError('Failed to delete cookbook');
    } else {
      success('Cookbook deleted');
      if (selectedCookbook?.id === id) {
        onSelectCookbook(null);
      }
      onUpdate();
    }
    setLoading(false);
  };

  const startEdit = (e: React.MouseEvent, cookbook: Cookbook) => {
    e.stopPropagation();
    setForm({
      title: cookbook.title,
      description: cookbook.description || '',
      cookbook_type: cookbook.cookbook_type,
    });
    setEditingId(cookbook.id);
    setShowCreate(false);
  };

  const handleCookbookClick = (cookbook: Cookbook) => {
    if (editingId === cookbook.id || inlineEditingId === cookbook.id) return;
    if (selectedCookbook?.id === cookbook.id) {
      onSelectCookbook(null);
    } else {
      onSelectCookbook(cookbook);
    }
  };

  const canManage = (cookbook: Cookbook) =>
    cookbook.created_by === user?.id || profile?.is_admin;

  const sortedCookbooks = [...cookbooks].sort((a, b) => {
    const countA = cookbookRecipeCounts[a.id] || 0;
    const countB = cookbookRecipeCounts[b.id] || 0;
    if (countB !== countA) return countB - countA;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-[var(--text-primary)]">Cookbooks</h2>
        {!showCreate && !editingId && (
          <TrainingTooltip tipId="recipes-new-cookbook" content={TOOLTIPS['recipes-new-cookbook']?.content || ''} position="bottom">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={16} className="mr-1" /> New Cookbook
            </Button>
          </TrainingTooltip>
        )}
      </div>

      {(showCreate || editingId) && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4 mb-4 border border-[var(--border-default)]">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
            {editingId ? 'Edit Cookbook' : 'Create New Cookbook'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Cookbook Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Holiday Favorites"
              required
            />
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Cookbook Type
              </label>
              <select
                value={form.cookbook_type}
                onChange={(e) => setForm({ ...form, cookbook_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
              >
                {COOKBOOK_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Input
                label="Description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What's this cookbook about?"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => (editingId ? handleUpdate(editingId) : handleCreate())}
              loading={loading}
              className="bg-[#6b8cae] hover:bg-[#5a7b9d] text-white"
            >
              {editingId ? 'Save Changes' : 'Create Cookbook'}
            </Button>
            <Button
              variant="secondary"
              onClick={resetForm}
              className="bg-[#6b8cae] hover:bg-[#5a7b9d] text-white border-none"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="max-h-[240px] overflow-y-auto pr-1 scrollbar-thin">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {sortedCookbooks.map((cookbook) => {
          const isSelected = selectedCookbook?.id === cookbook.id;
          const recipeCount = cookbookRecipeCounts[cookbook.id] || 0;
          const coverImage = cookbook.cover_image_url || cookbookCoverImages[cookbook.id];
          const isDropTarget = dropTargetCookbookId === cookbook.id;

          return (
            <div
              key={cookbook.id}
              onClick={() => handleCookbookClick(cookbook)}
              onDragOver={(e) => handleCookbookDragOver(e, cookbook.id)}
              onDragLeave={handleCookbookDragLeave}
              onDrop={(e) => handleCookbookDrop(e, cookbook.id)}
              className={`group relative cursor-pointer rounded-lg overflow-hidden transition-all ${
                isDropTarget
                  ? 'ring-2 ring-[var(--accent-gold)] scale-105'
                  : isSelected
                  ? 'ring-2 ring-[var(--accent-gold)]'
                  : isDraggingRecipe
                  ? 'ring-1 ring-dashed ring-[var(--border-default)] hover:ring-[var(--accent-gold)]'
                  : 'hover:ring-1 hover:ring-[var(--border-default)]'
              }`}
            >
              <div className="h-[86px] bg-[var(--bg-tertiary)]">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)]">
                    <BookOpen size={20} className="text-[var(--text-muted)]" />
                  </div>
                )}
              </div>

              {isDropTarget && (
                <div className="absolute inset-0 bg-[rgba(var(--accent-primary-rgb),0.20)] flex items-center justify-center">
                  <div className="bg-[var(--bg-primary)] rounded px-2 py-1 flex items-center gap-1 text-[var(--accent-gold)]">
                    <Plus size={14} />
                    <span className="text-xs font-medium">Drop</span>
                  </div>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-2 py-1">
                {inlineEditingId === cookbook.id ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      ref={inlineInputRef}
                      type="text"
                      value={inlineEditValue}
                      onChange={(e) => handleInlineChange(e.target.value, cookbook.id)}
                      onBlur={() => handleInlineBlur(cookbook.id)}
                      onKeyDown={(e) => handleInlineKeyDown(e, cookbook.id)}
                      className="flex-1 bg-black/50 text-white text-xs font-medium px-1.5 py-0.5 rounded border border-[var(--accent-gold)] focus:outline-none focus:border-[var(--accent-gold)]"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInlineBlur(cookbook.id);
                      }}
                      className="p-0.5 text-[var(--accent-gold)] hover:bg-white/10 rounded"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                        setInlineEditingId(null);
                      }}
                      className="p-0.5 text-white/70 hover:bg-white/10 rounded"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <p
                    className="text-white text-xs font-medium truncate transition-colors"
                    onDoubleClick={(e) => {
                      if (canManage(cookbook)) {
                        startInlineEdit(e, cookbook);
                      }
                    }}
                    title={cookbook.title}
                  >
                    {cookbook.title}
                  </p>
                )}
                <p className="text-white/70 text-[10px]">
                  {recipeCount} {recipeCount === 1 ? 'recipe' : 'recipes'}
                </p>
              </div>

              {canManage(cookbook) && !isDropTarget && inlineEditingId !== cookbook.id && (
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                  <button
                    onClick={(e) => startEdit(e, cookbook)}
                    className="p-1 bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 rounded"
                    title="Edit details"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(cookbook.id);
                    }}
                    className="p-1 bg-black/60 backdrop-blur-sm text-white hover:bg-red-600 rounded"
                    title="Delete cookbook"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}

              {isSelected && (
                <div className="absolute top-1 left-1">
                  <div className="w-4 h-4 rounded-full bg-[var(--accent-gold)] flex items-center justify-center">
                    <Check size={10} className="text-black" />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {cookbooks.length === 0 && !showCreate && (
          <div
            onClick={() => setShowCreate(true)}
            className="h-[86px] rounded-lg border-2 border-dashed border-[var(--border-default)] hover:border-[var(--accent-gold)] hover:bg-[rgba(var(--accent-primary-rgb),0.05)] transition-colors cursor-pointer flex flex-col items-center justify-center"
          >
            <BookOpen size={20} className="text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-muted)]">Create Cookbook</span>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
