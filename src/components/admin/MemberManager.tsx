import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Skeleton } from '../ui/Skeleton';
import AddMemberModal from './AddMemberModal';
import EditMemberModal from './EditMemberModal';
import {
  Search,
  MapPin,
  Shield,
  ShieldCheck,
  UserX,
  UserCheck,
  UserPlus,
  Plus,
  Copy,
  Trash2,
  Check,
  Users,
  Clock,
  UserMinus,
  Pencil,
} from 'lucide-react';
import { getInitials, formatDate, generateInviteCode } from '../../lib/utils';
import type { UserProfile, MemberInvite } from '../../types';

type SubTab = 'active' | 'invites' | 'inactive';

export default function MemberManager() {
  const { profile } = useAuth();
  const { success, error: showError } = useToast();
  const [subTab, setSubTab] = useState<SubTab>('active');
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [inactiveMembers, setInactiveMembers] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<MemberInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  const [deletingMember, setDeletingMember] = useState<UserProfile | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchMembers();
    fetchInvites();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    const [activeResult, inactiveResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('*')
        .eq('is_active', true)
        .order('display_name'),
      supabase
        .from('user_profiles')
        .select('*')
        .eq('is_active', false)
        .order('display_name'),
    ]);
    setMembers(activeResult.data || []);
    setInactiveMembers(inactiveResult.data || []);
    setLoading(false);
  };

  const fetchInvites = async () => {
    const { data } = await supabase
      .from('member_invites')
      .select('*, creator:created_by(display_name), user:used_by(display_name)')
      .order('created_at', { ascending: false });
    setInvites(data || []);
  };

  const handleGenerateInvite = async () => {
    if (!profile) return;
    setGeneratingInvite(true);
    const code = generateInviteCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error } = await supabase.from('member_invites').insert({
      code,
      created_by: profile.id,
      email: newInviteEmail || null,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      showError('Failed to generate invite');
    } else {
      success('Invite code generated');
      setNewInviteEmail('');
      fetchInvites();
    }
    setGeneratingInvite(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    success('Code copied to clipboard');
  };

  const deleteInvite = async (id: string) => {
    await supabase.from('member_invites').delete().eq('id', id);
    success('Invite deleted');
    fetchInvites();
  };

  const toggleActive = async (member: UserProfile, activate: boolean) => {
    if (member.is_super_admin) {
      showError('Cannot deactivate super admin');
      return;
    }
    if (member.id === profile?.id) {
      showError('Cannot deactivate yourself');
      return;
    }
    if (!profile?.is_super_admin && member.is_admin) {
      showError('Only super admins can deactivate other admins');
      return;
    }
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: activate })
      .eq('id', member.id);

    if (error) {
      showError('Failed to update member');
    } else {
      success(activate ? 'Member reactivated' : 'Member deactivated');
      fetchMembers();
    }
  };

  const handleDeleteMember = async () => {
    if (!deletingMember || deleteConfirmText !== 'DELETE') return;

    setDeleting(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        showError('Not authenticated');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/${deletingMember.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete member');
      }

      success('Member permanently deleted');
      setDeletingMember(null);
      setDeleteConfirmText('');
      fetchMembers();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete member');
    } finally {
      setDeleting(false);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.display_name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredInactive = inactiveMembers.filter(
    (m) =>
      m.display_name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  const subTabs = [
    { id: 'active', label: 'Active', icon: Users, count: members.length },
    { id: 'invites', label: 'Invites', icon: Clock, count: invites.filter((i) => !i.used_at).length },
    { id: 'inactive', label: 'Inactive', icon: UserMinus, count: inactiveMembers.length },
  ] as const;

  const getRoleBadge = (member: UserProfile) => {
    if (member.is_super_admin) {
      return (
        <span className="px-2 py-0.5 text-xs bg-[rgba(var(--accent-primary-rgb),0.2)] text-[var(--accent-gold)] rounded-full flex items-center gap-1">
          <ShieldCheck size={10} /> Super Admin
        </span>
      );
    }
    if (member.is_admin || member.user_type === 'admin') {
      return (
        <span className="px-2 py-0.5 text-xs bg-[rgba(var(--accent-secondary-rgb),0.2)] text-[var(--accent-sage)] rounded-full flex items-center gap-1">
          <Shield size={10} /> Admin
        </span>
      );
    }
    if (member.user_type === 'guest') {
      return (
        <span className="px-2 py-0.5 text-xs bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded-full">
          Guest
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs bg-[rgba(var(--accent-primary-rgb),0.1)] text-[var(--accent-gold)] rounded-full">
        Family
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              subTab === tab.id
                ? 'bg-[var(--accent-gold)] text-[#0f0f0f]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
            {tab.count > 0 && (
              <span
                className={`px-1.5 py-0.5 text-xs rounded-full ${
                  subTab === tab.id ? 'bg-[#0f0f0f]/20' : 'bg-[var(--bg-secondary)]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {subTab === 'active' && (
        <>
          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                size={20}
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members..."
                className="pl-10"
              />
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <UserPlus size={18} className="mr-2" /> Add Member
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <Card className="text-center py-8">
              <Users className="mx-auto mb-3 text-[var(--text-muted)]" size={40} />
              <p className="text-[var(--text-secondary)]">
                {search ? 'No members found' : 'No active members'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredMembers.map((member) => (
                <Card key={member.id}>
                  <div className="flex items-center gap-4">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.display_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[rgba(var(--accent-primary-rgb),0.2)] flex items-center justify-center">
                        <span className="text-lg font-medium text-[var(--accent-gold)]">
                          {getInitials(member.display_name)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-[var(--text-primary)]">
                          {member.display_name}
                        </h3>
                        {getRoleBadge(member)}
                      </div>
                      <p className="text-sm text-[var(--text-muted)] truncate">{member.email}</p>
                      {member.location && (
                        <p className="text-sm text-[var(--text-muted)] flex items-center gap-1">
                          <MapPin size={12} /> {member.location}
                        </p>
                      )}
                    </div>
                    {(profile?.is_admin || profile?.is_super_admin) && (
                      <div className="flex items-center gap-1">
                        {(profile.is_super_admin ? (member.id === profile.id || !member.is_super_admin) : !member.is_super_admin) && (
                          <button
                            onClick={() => setEditingMember(member)}
                            className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-gold)] hover:bg-[rgba(var(--accent-primary-rgb),0.1)] rounded-lg transition-colors"
                            title="Edit member"
                          >
                            <Pencil size={18} />
                          </button>
                        )}
                        {member.id !== profile.id && !member.is_super_admin && (profile.is_super_admin || !member.is_admin) && (
                          <button
                            onClick={() => toggleActive(member, false)}
                            className="p-2 text-[var(--text-muted)] hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                            title="Deactivate member"
                          >
                            <UserX size={18} />
                          </button>
                        )}
                        {profile.is_super_admin && member.id !== profile.id && !member.is_super_admin && (
                          <button
                            onClick={() => setDeletingMember(member)}
                            className="p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete member permanently"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {subTab === 'invites' && (
        <>
          <Card>
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-3">Generate Invite</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Email (optional - leave blank for anyone)"
                value={newInviteEmail}
                onChange={(e) => setNewInviteEmail(e.target.value)}
              />
              <Button onClick={handleGenerateInvite} loading={generatingInvite}>
                <Plus size={18} className="mr-2" /> Generate
              </Button>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Invite codes expire after 7 days
            </p>
          </Card>

          {invites.length === 0 ? (
            <Card className="text-center py-8">
              <Clock className="mx-auto mb-3 text-[var(--text-muted)]" size={40} />
              <p className="text-[var(--text-secondary)]">No invite codes yet</p>
            </Card>
          ) : (
            <Card>
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-3">Invite Codes</h3>
              <div className="space-y-3">
                {invites.map((invite) => {
                  const isExpired = new Date(invite.expires_at) < new Date();
                  const isUsed = !!invite.used_at;
                  return (
                    <div
                      key={invite.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isUsed
                          ? 'bg-green-500/5 border border-green-500/20'
                          : isExpired
                          ? 'bg-red-500/5 border border-red-500/20'
                          : 'bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="text-[var(--accent-gold)] font-mono text-sm">{invite.code}</code>
                          {isUsed && (
                            <span className="flex items-center gap-1 text-xs text-green-500">
                              <Check size={12} /> Used
                            </span>
                          )}
                          {!isUsed && isExpired && (
                            <span className="text-xs text-red-400">Expired</span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {invite.email && <span>For: {invite.email} | </span>}
                          Expires: {formatDate(invite.expires_at)}
                          {isUsed && invite.user && (
                            <span className="text-green-500">
                              {' '}
                              | Used by: {(invite.user as unknown as { display_name: string }).display_name}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!isUsed && !isExpired && (
                          <button
                            onClick={() => copyCode(invite.code)}
                            className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-gold)] transition-colors"
                            title="Copy code"
                          >
                            <Copy size={16} />
                          </button>
                        )}
                        {!isUsed && (
                          <button
                            onClick={() => deleteInvite(invite.id)}
                            className="p-2 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                            title="Delete invite"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}

      {subTab === 'inactive' && (
        <>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              size={20}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search inactive members..."
              className="pl-10"
            />
          </div>

          {filteredInactive.length === 0 ? (
            <Card className="text-center py-8">
              <UserMinus className="mx-auto mb-3 text-[var(--text-muted)]" size={40} />
              <p className="text-[var(--text-secondary)]">
                {search ? 'No members found' : 'No inactive members'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredInactive.map((member) => (
                <Card key={member.id} className="opacity-75">
                  <div className="flex items-center gap-4">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.display_name}
                        className="w-12 h-12 rounded-full object-cover grayscale"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                        <span className="text-lg font-medium text-[var(--text-muted)]">
                          {getInitials(member.display_name)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[var(--text-secondary)]">
                        {member.display_name}
                      </h3>
                      <p className="text-sm text-[var(--text-muted)] truncate">{member.email}</p>
                    </div>
                    {(profile?.is_super_admin || !member.is_admin) && (
                      <button
                        onClick={() => toggleActive(member, true)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--accent-gold)] hover:bg-[rgba(var(--accent-primary-rgb),0.1)] rounded-lg transition-colors"
                      >
                        <UserCheck size={16} /> Reactivate
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <AddMemberModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchMembers}
      />

      <EditMemberModal
        member={editingMember}
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        onSuccess={fetchMembers}
      />

      {deletingMember && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-display text-[var(--text-primary)] mb-4">
              Delete Member Permanently
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              This will permanently delete <strong>{deletingMember.display_name}</strong> and all
              their data. This action cannot be undone.
            </p>
            <p className="text-sm text-[var(--text-muted)] mb-3">
              Type <strong className="text-red-400">DELETE</strong> to confirm:
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="mb-4"
            />
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setDeletingMember(null);
                  setDeleteConfirmText('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteMember}
                disabled={deleteConfirmText !== 'DELETE'}
                loading={deleting}
                className="flex-1"
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
