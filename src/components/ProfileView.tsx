import React, { useState } from 'react';
import { Camera, LogOut, Save, ShieldCheck } from 'lucide-react';
import {
  ConnectionRecord,
  ExpressionItem,
  INTEREST_CATALOG,
  PublicProfile,
  VibrancyType,
} from '../utils/soulspark';
import { uploadImageFile } from '../lib/api';
import { Avatar } from './MediaFrame';
import { ExpressionCard } from './ExpressionCard';

export interface SelectedReactionSummary {
  type: string;
  expressionId: number;
  expressionTitle: string;
  expressionCategory: string;
  authorName: string;
}

interface ProfileViewProps {
  viewer: PublicProfile | null;
  privateSettings: { email: string; recoveryHintEmail: string };
  myExpressions: ExpressionItem[];
  acceptedConnections: ConnectionRecord[];
  selectedReactions: SelectedReactionSummary[];
  connectedUids: Set<string>;
  onUpdateProfile: (patch: {
    displayName: string;
    username: string;
    bio: string;
    interests: string[];
    avatarUrl: string | null;
    isMinorProtected: boolean;
    connectionPrivacy: 'public' | 'connections' | 'private';
    commentPrivacy: 'everyone' | 'connections' | 'none';
    recoveryHintEmail: string;
  }) => Promise<void>;
  onSignOut: () => Promise<void>;
  onRequireAuth: () => void;
  onToggleVibrancy: (expressionId: number, type: VibrancyType) => Promise<void>;
  onAddComment: (expressionId: number, content: string) => Promise<void>;
  onDeleteExpression: (expressionId: number) => Promise<void>;
  onInspectProfile: (username: string) => void;
  onReport: (targetType: 'expression' | 'user', targetId: string, label: string) => void;
  onBlockUser: (uid: string, displayName: string) => Promise<void>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  viewer,
  privateSettings,
  myExpressions,
  acceptedConnections,
  selectedReactions,
  connectedUids,
  onUpdateProfile,
  onSignOut,
  onRequireAuth,
  onToggleVibrancy,
  onAddComment,
  onDeleteExpression,
  onInspectProfile,
  onReport,
  onBlockUser,
}) => {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(viewer?.displayName ?? '');
  const [username, setUsername] = useState(viewer?.username ?? '');
  const [bio, setBio] = useState(viewer?.bio ?? '');
  const [interests, setInterests] = useState<string[]>(viewer?.interests ?? []);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    viewer?.avatarUrl ?? null
  );
  const [isMinorProtected, setIsMinorProtected] = useState(
    viewer?.isMinorProtected ?? false
  );
  const [connectionPrivacy, setConnectionPrivacy] = useState<
    'public' | 'connections' | 'private'
  >(viewer?.connectionPrivacy ?? 'connections');
  const [commentPrivacy, setCommentPrivacy] = useState<
    'everyone' | 'connections' | 'none'
  >(viewer?.commentPrivacy ?? 'everyone');
  const [recoveryHintEmail, setRecoveryHintEmail] = useState(
    privateSettings.recoveryHintEmail ?? ''
  );

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!viewer) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-[#0B1120]/85 p-10 text-center space-y-4">
          <h1 className="font-display text-2xl text-slate-50">Your Profile</h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-300">
            Create your SOULSPARK space to share expressions, curate your
            meaningful reactions, and manage privacy & younger-user safeguards.
          </p>
          <button
            type="button"
            onClick={onRequireAuth}
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 cursor-pointer"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  const startEditing = () => {
    setDisplayName(viewer.displayName);
    setUsername(viewer.username);
    setBio(viewer.bio);
    setInterests(viewer.interests);
    setAvatarUrl(viewer.avatarUrl);
    setIsMinorProtected(viewer.isMinorProtected);
    setConnectionPrivacy(viewer.connectionPrivacy);
    setCommentPrivacy(viewer.commentPrivacy);
    setRecoveryHintEmail(privateSettings.recoveryHintEmail || '');
    setSaveMessage(null);
    setSaveError(null);
    setEditing(true);
  };

  const toggleInterest = (item: string) => {
    setInterests((prev) =>
      prev.includes(item)
        ? prev.filter((i) => i !== item)
        : prev.length < 10
          ? [...prev, item]
          : prev
    );
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setSaveError(null);
    try {
      const url = await uploadImageFile(file);
      setAvatarUrl(url);
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : 'Unable to upload avatar.'
      );
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      await onUpdateProfile({
        displayName,
        username,
        bio,
        interests,
        avatarUrl,
        isMinorProtected,
        connectionPrivacy,
        commentPrivacy,
        recoveryHintEmail,
      });
      setSaveMessage('Profile & safety preferences saved.');
      setEditing(false);
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : 'Unable to save profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 pb-24 pt-8 sm:px-6">
      {/* Profile Identity Header */}
      <section className="rounded-2xl border border-white/10 bg-[#0B1120]/85 p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-5">
            <Avatar
              src={editing ? avatarUrl : viewer.avatarUrl}
              name={viewer.displayName}
              size="lg"
            />
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-normal text-slate-50 sm:text-3xl">
                {viewer.displayName}
              </h1>
              <p className="text-xs text-slate-400">
                @{viewer.username} · Joined{' '}
                {new Date(viewer.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
                {viewer.isMinorProtected && ' · Younger-user protection active'}
              </p>
              <p className="max-w-xl text-sm leading-relaxed text-slate-300">
                {viewer.bio || 'No personal introduction added yet.'}
              </p>
              {viewer.interests.length > 0 && (
                <p className="text-xs text-cyan-200/90">
                  {viewer.interests.join(' · ')}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => (editing ? setEditing(false) : startEditing())}
              className="rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium text-slate-100 hover:border-violet-400/50 cursor-pointer"
            >
              {editing ? 'Close Editor' : 'Edit Profile & Privacy'}
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-xs text-slate-400 hover:text-rose-200 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>

        {saveMessage && (
          <p className="mt-4 text-xs text-cyan-200" role="status">
            {saveMessage}
          </p>
        )}

        {/* Editor Form */}
        {editing && (
          <form
            onSubmit={handleSave}
            className="mt-8 space-y-6 border-t border-white/10 pt-6"
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="profile-display-name"
                  className="block text-xs font-medium text-slate-300"
                >
                  Display name
                </label>
                <input
                  id="profile-display-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={60}
                  className="w-full rounded-xl border border-white/15 bg-[#060913] px-3.5 py-2.5 text-sm text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="profile-username"
                  className="block text-xs font-medium text-slate-300"
                >
                  Username handle
                </label>
                <input
                  id="profile-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={28}
                  className="w-full rounded-xl border border-white/15 bg-[#060913] px-3.5 py-2.5 text-sm text-slate-100"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="profile-bio"
                className="block text-xs font-medium text-slate-300"
              >
                Short personal introduction
              </label>
              <textarea
                id="profile-bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={400}
                placeholder="Share what inspires your curiosity or creativity (avoid private contact details)..."
                className="w-full rounded-xl border border-white/15 bg-[#060913] p-3.5 text-sm text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-medium text-slate-300">
                Profile Picture
              </span>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2 text-xs font-medium text-slate-200 hover:border-violet-400/50">
                <Camera className="h-3.5 w-3.5 text-cyan-300" />
                <span>
                  {uploadingAvatar ? 'Uploading...' : 'Upload new portrait'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-medium text-slate-300">
                Interests (up to 10)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {INTEREST_CATALOG.map((item) => {
                  const active = interests.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleInterest(item)}
                      className={`rounded-lg px-2.5 py-1 text-xs transition-colors cursor-pointer ${
                        active
                          ? 'bg-cyan-400/20 text-cyan-100 border border-cyan-400/40'
                          : 'border border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Privacy & Safety Settings */}
            <div className="space-y-4 rounded-xl border border-white/10 bg-[#060913]/60 p-5">
              <div className="flex items-center gap-2 text-amber-200">
                <ShieldCheck className="h-4 w-4" />
                <h2 className="text-sm font-semibold text-slate-100">
                  Privacy, Recovery & Younger-User Protection
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="privacy-connections"
                    className="block text-xs text-slate-300"
                  >
                    Who can view your connection list
                  </label>
                  <select
                    id="privacy-connections"
                    value={connectionPrivacy}
                    onChange={(e) =>
                      setConnectionPrivacy(
                        e.target.value as 'public' | 'connections' | 'private'
                      )
                    }
                    className="w-full rounded-lg border border-white/15 bg-[#0B1120] px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="private">Private (only you)</option>
                    <option value="connections">Accepted connections only</option>
                    <option value="public">Visible on public profile</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="privacy-comments"
                    className="block text-xs text-slate-300"
                  >
                    Default reflection & comment setting
                  </label>
                  <select
                    id="privacy-comments"
                    value={commentPrivacy}
                    onChange={(e) =>
                      setCommentPrivacy(
                        e.target.value as 'everyone' | 'connections' | 'none'
                      )
                    }
                    className="w-full rounded-lg border border-white/15 bg-[#0B1120] px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="everyone">Thoughtful members</option>
                    <option value="connections">Connections only</option>
                    <option value="none">Turn off comments by default</option>
                  </select>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMinorProtected}
                  onChange={(e) => setIsMinorProtected(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-violet-500"
                />
                <span className="text-xs leading-relaxed text-slate-300">
                  <strong className="text-slate-100">
                    Enable younger-user protection mode
                  </strong>{' '}
                  — Pauses unsolicited connection requests and restricts replies
                  to accepted connections.
                </span>
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                <div className="space-y-1">
                  <span className="block text-xs text-slate-400">
                    Primary account email (private)
                  </span>
                  <p className="text-xs text-slate-200">
                    {privateSettings.email || 'Managed by Google Auth'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="recovery-email"
                    className="block text-xs text-slate-300"
                  >
                    Safe account recovery backup email (private)
                  </label>
                  <input
                    id="recovery-email"
                    type="email"
                    value={recoveryHintEmail}
                    onChange={(e) => setRecoveryHintEmail(e.target.value)}
                    placeholder="backup@example.com"
                    className="w-full rounded-lg border border-white/15 bg-[#0B1120] px-3 py-2 text-xs text-slate-100"
                  />
                </div>
              </div>
            </div>

            {saveError && (
              <p className="text-xs text-rose-300" role="alert">
                {saveError}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploadingAvatar}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-5 py-2 text-xs font-semibold text-white hover:bg-violet-500 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Two-Column Lower Profile: Selected Meaningful Reactions & Privacy-Controlled Connections */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <h2 className="font-display text-xl text-slate-100">
            Your Expressions ({myExpressions.length})
          </h2>
          {myExpressions.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-[#0B1120]/60 p-8 text-sm text-slate-400">
              You have not shared an expression yet. Visit Express whenever a
              thought feels ready.
            </p>
          ) : (
            <div className="space-y-6">
              {myExpressions.map((item) => (
                <ExpressionCard
                  key={item.id}
                  item={item}
                  viewer={viewer}
                  connectedUids={connectedUids}
                  onToggleVibrancy={onToggleVibrancy}
                  onAddComment={onAddComment}
                  onDeleteExpression={onDeleteExpression}
                  onInspectProfile={onInspectProfile}
                  onReport={onReport}
                  onBlockUser={onBlockUser}
                  onRequireAuth={onRequireAuth}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <div className="rounded-2xl border border-white/10 bg-[#0B1120]/80 p-5 space-y-4">
            <h2 className="font-display text-lg text-slate-100">
              Selected Meaningful Reactions
            </h2>
            {selectedReactions.length === 0 ? (
              <p className="text-xs text-slate-400">
                Expressions you resonate with using Vibrancy reactions appear
                here as a quiet personal archive.
              </p>
            ) : (
              <ul className="space-y-3">
                {selectedReactions.slice(0, 6).map((r, idx) => (
                  <li
                    key={`${r.expressionId}-${r.type}-${idx}`}
                    className="border-b border-white/[0.06] pb-2.5 last:border-none last:pb-0"
                  >
                    <p className="text-xs font-medium text-amber-200">
                      {r.type} · {r.expressionCategory}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-200">
                      {r.expressionTitle}
                    </p>
                    <p className="text-xs text-slate-500">by {r.authorName}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0B1120]/80 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-slate-100">
                Connections ({acceptedConnections.length})
              </h2>
              <span className="text-[11px] text-slate-400 capitalize">
                {viewer.connectionPrivacy}
              </span>
            </div>
            {acceptedConnections.length === 0 ? (
              <p className="text-xs text-slate-400">
                No accepted connections yet.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {acceptedConnections.map((c) => (
                  <li key={c.id} className="flex items-center gap-2.5">
                    <Avatar
                      src={c.peer.avatarUrl}
                      name={c.peer.displayName}
                      size="sm"
                    />
                    <button
                      type="button"
                      onClick={() => onInspectProfile(c.peer.username)}
                      className="truncate text-xs font-medium text-slate-200 hover:text-amber-200 cursor-pointer"
                    >
                      {c.peer.displayName}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
