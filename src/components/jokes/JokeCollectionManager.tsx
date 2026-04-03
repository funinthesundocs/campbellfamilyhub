import { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Smile, Trash2, CreditCard as Edit2, Check, Plus, X, FolderPlus } from 'lucide-react';
import type { JokeCollection } from '../../types';

interface JokeCollectionManagerProps {
  collections: JokeCollection[];
  collectionJokeCounts: Record<string, number>;
  selectedCollection: JokeCollection | null;
  onSelectCollection: (collection: JokeCollection | null) => void;
  onUpdate: () => void;
  isDraggingJoke?: boolean;
  onDropJoke?: (collectionId: string, jokeIds: string[]) => void;
}

export function JokeCollectionManager({
  collections,
  collectionJokeCounts,
  selectedCollection,
  onSelectCollection,
  onUpdate,
  isDraggingJoke,
  onDropJoke,
}: JokeCollectionManagerProps) {
  const { user, profile } = useAuth();
  const { success, error: showError } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
  });
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleDragOver = (e: React.DragEvent, collectionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/x-joke-ids')) {
      e.dataTransfer.dropEffect = 'copy';
      setDropTargetId(collectionId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetId(null);
  };

  const handleDrop = (e: React.DragEvent, collectionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetId(null);

    const jokeIdsJson = e.dataTransfer.getData('application/x-joke-ids');
    if (jokeIdsJson && onDropJoke) {
      try {
        const jokeIds = JSON.parse(jokeIdsJson) as string[];
        onDropJoke(collectionId, jokeIds);
      } catch {
        showError('Failed to add jokes to collection');
      }
    }
  };

  const resetForm = () => {
    setForm({ name: '', description: '' });
    setShowCreate(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!user || !form.name.trim()) {
      showError('Please enter a collection name');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('joke_collections').insert({
      name: form.name.trim(),
      description: form.description.trim() || null,
      created_by: user.id,
    });

    if (error) {
      showError('Failed to create collection');
    } else {
      success('Collection created');
      resetForm();
      onUpdate();
    }
    setLoading(false);
  };

  const handleUpdate = async (id: string) => {
    if (!form.name.trim()) {
      showError('Please enter a collection name');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('joke_collections')
      .update({
        name: form.name.trim(),
        description: form.description.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      showError('Failed to update collection');
    } else {
      success('Collection updated');
      resetForm();
      onUpdate();
    }
    setLoading(false);
  };

  const handleInlineSave = async (collectionId: string, newName: string) => {
    if (!newName.trim()) {
      const collection = collections.find((c) => c.id === collectionId);
      setInlineEditValue(collection?.name || '');
      return;
    }

    const { error } = await supabase
      .from('joke_collections')
      .update({
        name: newName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', collectionId);

    if (error) {
      showError('Failed to save');
    } else {
      onUpdate();
    }
  };

  const handleInlineChange = (value: string, collectionId: string) => {
    setInlineEditValue(value);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleInlineSave(collectionId, value);
    }, 500);
  };

  const handleInlineBlur = (collectionId: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    handleInlineSave(collectionId, inlineEditValue);
    setInlineEditingId(null);
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent, collectionId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      handleInlineSave(collectionId, inlineEditValue);
      setInlineEditingId(null);
    } else if (e.key === 'Escape') {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      setInlineEditingId(null);
    }
  };

  const startInlineEdit = (e: React.MouseEvent, collection: JokeCollection) => {
    e.stopPropagation();
    setInlineEditingId(collection.id);
    setInlineEditValue(collection.name);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this collection? Jokes will not be deleted.')) return;

    setLoading(true);
    await supabase.from('joke_collection_items').delete().eq('collection_id', id);
    const { error } = await supabase.from('joke_collections').delete().eq('id', id);

    if (error) {
      showError('Failed to delete collection');
    } else {
      success('Collection deleted');
      if (selectedCollection?.id === id) {
        onSelectCollection(null);
      }
      onUpdate();
    }
    setLoading(false);
  };

  const startEdit = (e: React.MouseEvent, collection: JokeCollection) => {
    e.stopPropagation();
    setForm({
      name: collection.name,
      description: collection.description || '',
    });
    setEditingId(collection.id);
    setShowCreate(false);
  };

  const handleCollectionClick = (collection: JokeCollection) => {
    if (editingId === collection.id || inlineEditingId === collection.id) return;
    if (selectedCollection?.id === collection.id) {
      onSelectCollection(null);
    } else {
      onSelectCollection(collection);
    }
  };

  const canManage = (collection: JokeCollection) =>
    collection.created_by === user?.id || profile?.is_admin;

  const sortedCollections = useMemo(() => {
    return [...collections].sort((a, b) => {
      const countA = collectionJokeCounts[a.id] || 0;
      const countB = collectionJokeCounts[b.id] || 0;
      if (countB !== countA) return countB - countA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [collections, collectionJokeCounts]);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-[var(--text-primary)]">Joke Collections</h2>
        {!showCreate && !editingId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} className="mr-1" /> New Collection
          </Button>
        )}
      </div>

      {(showCreate || editingId) && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4 mb-4 border border-[var(--border-default)]">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
            {editingId ? 'Edit Collection' : 'Create New Collection'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Collection Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Dad Jokes"
              required
            />
            <Input
              label="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What's this collection about?"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => (editingId ? handleUpdate(editingId) : handleCreate())}
              loading={loading}
            >
              {editingId ? 'Save Changes' : 'Create Collection'}
            </Button>
            <Button variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="max-h-[240px] overflow-y-auto pr-1 scrollbar-thin">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {sortedCollections.map((collection) => {
            const isSelected = selectedCollection?.id === collection.id;
            const jokeCount = collectionJokeCounts[collection.id] || 0;
            const isDropTarget = dropTargetId === collection.id;

            return (
              <div
                key={collection.id}
                onClick={() => handleCollectionClick(collection)}
                onDragOver={(e) => handleDragOver(e, collection.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, collection.id)}
                className={`group relative cursor-pointer rounded-lg overflow-hidden transition-all ${
                  isDropTarget
                    ? 'ring-2 ring-[var(--accent-gold)] scale-105'
                    : isSelected
                    ? 'ring-2 ring-[var(--accent-gold)]'
                    : isDraggingJoke
                    ? 'ring-1 ring-dashed ring-[var(--border-default)] hover:ring-[var(--accent-gold)]'
                    : 'hover:ring-1 hover:ring-[var(--border-default)]'
                }`}
              >
                <div className="h-[86px] bg-[var(--bg-tertiary)]">
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)]">
                    <Smile size={24} className="text-[var(--accent-gold)]" />
                  </div>
                </div>

                {isDropTarget && (
                  <div className="absolute inset-0 bg-[rgba(var(--accent-primary-rgb),0.20)] flex items-center justify-center">
                    <div className="bg-[var(--bg-primary)] rounded px-2 py-1 flex items-center gap-1 text-[var(--accent-gold)]">
                      <FolderPlus size={14} />
                      <span className="text-xs font-medium">Drop</span>
                    </div>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-2 py-1">
                  {inlineEditingId === collection.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        ref={inlineInputRef}
                        type="text"
                        value={inlineEditValue}
                        onChange={(e) => handleInlineChange(e.target.value, collection.id)}
                        onBlur={() => handleInlineBlur(collection.id)}
                        onKeyDown={(e) => handleInlineKeyDown(e, collection.id)}
                        className="flex-1 bg-black/50 text-white text-xs font-medium px-1.5 py-0.5 rounded border border-[var(--accent-gold)] focus:outline-none focus:border-[var(--accent-gold)]"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInlineBlur(collection.id);
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
                        if (canManage(collection)) {
                          startInlineEdit(e, collection);
                        }
                      }}
                      title={collection.name}
                    >
                      {collection.name}
                    </p>
                  )}
                  <p className="text-white/70 text-[10px]">
                    {jokeCount} {jokeCount === 1 ? 'joke' : 'jokes'}
                  </p>
                </div>

                {canManage(collection) && !isDropTarget && inlineEditingId !== collection.id && (
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                    <button
                      onClick={(e) => startEdit(e, collection)}
                      className="p-1 bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 rounded"
                      title="Edit details"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(collection.id);
                      }}
                      className="p-1 bg-black/60 backdrop-blur-sm text-white hover:bg-red-600 rounded"
                      title="Delete collection"
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

          {collections.length === 0 && !showCreate && (
            <div
              onClick={() => setShowCreate(true)}
              className="h-[86px] rounded-lg border-2 border-dashed border-[var(--border-default)] hover:border-[var(--accent-gold)] hover:bg-[rgba(var(--accent-primary-rgb),0.05)] transition-colors cursor-pointer flex flex-col items-center justify-center"
            >
              <Smile size={20} className="text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">Create Collection</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
