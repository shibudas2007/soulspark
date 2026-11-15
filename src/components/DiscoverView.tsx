import React, { useState } from 'react';
import {
  Check,
  Compass,
  Layers,
  Plus,
  Search,
  Send,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  COLLECTIVE_KINDS,
  CollectiveSpaceItem,
  EXPRESSION_CATEGORIES,
  ExpressionItem,
  INTEREST_CATALOG,
  PublicProfile,
  VibrancyType,
} from '../utils/soulspark';
import { Avatar, ResilientImage } from './MediaFrame';
import { ExpressionCard } from './ExpressionCard';

export interface DiscoverCreator {
  profile: PublicProfile;
  sharedInterests: string[];
  connectionStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'declined';
  connectionId: number | null;
}

interface DiscoverViewProps {
  creators: DiscoverCreator[];
  expressions: ExpressionItem[];
  collectives: CollectiveSpaceItem[];
  viewer: PublicProfile | null;
  connectedUids: Set<string>;
  initialSubTab?: 'creators' | 'expressions' | 'collectives';
  onRequestConnection: (creator: DiscoverCreator) => void;
  onInspectProfile: (username: string) => void;
  onToggleVibrancy: (expressionId: number, type: VibrancyType) => Promise<void>;
  onAddComment: (expressionId: number, content: string) => Promise<void>;
  onDeleteExpression: (expressionId: number) => Promise<void>;
  onReport: (targetType: 'expression' | 'user', targetId: string, label: string) => void;
  onBlockUser: (uid: string, displayName: string) => Promise<void>;
  onContributeCollective: (spaceId: number, content: string) => Promise<void>;
  onCreateCollective: (input: {
    title: string;
    kind: string;
    prompt: string;
    tags: string[];
  }) => Promise<void>;
  onRequireAuth: () => void;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  creators,
  expressions,
  collectives,
  viewer,
  connectedUids,
  initialSubTab = 'creators',
  onRequestConnection,
  onInspectProfile,
  onToggleVibrancy,
  onAddComment,
  onDeleteExpression,
  onReport,
  onBlockUser,
  onContributeCollective,
  onCreateCollective,
  onRequireAuth,
}) => {
  const [subTab, setSubTab] = useState<'creators' | 'expressions' | 'collectives'>(
    initialSubTab
  );
  const [selectedInterest, setSelectedInterest] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Collective state
  const [activeSpaceId, setActiveSpaceId] = useState<number | null>(
    collectives[0]?.id ?? null
  );
  const [contribText, setContribText] = useState('');
  const [contribError, setContribError] = useState<string | null>(null);
  const [submittingContrib, setSubmittingContrib] = useState(false);

  const [showNewSpace, setShowNewSpace] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newKind, setNewKind] = useState<string>(COLLECTIVE_KINDS[0]);
  const [newPrompt, setNewPrompt] = useState('');
  const [newSpaceError, setNewSpaceError] = useState<string | null>(null);
  const [creatingSpace, setCreatingSpace] = useState(false);

  const q = searchQuery.trim().toLowerCase();

  const filteredCreators = creators.filter((c) => {
    if (
      selectedInterest !== 'All' &&
      !c.profile.interests.some(
        (i) => i.toLowerCase() === selectedInterest.toLowerCase()
      )
    ) {
      return false;
    }
    if (q) {
      const hay = `${c.profile.displayName} ${c.profile.username} ${c.profile.bio} ${c.profile.interests.join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const filteredExpressions = expressions.filter((e) => {
    if (
      selectedCategory !== 'All' &&
      e.category.toLowerCase() !== selectedCategory.toLowerCase()
    ) {
      return false;
    }
    if (selectedInterest !== 'All') {
      const needle = selectedInterest.toLowerCase();
      const match =
        e.tags.some((t) => t.toLowerCase() === needle) ||
        e.author.interests.some((t) => t.toLowerCase() === needle);
      if (!match) return false;
    }
    if (q) {
      const hay = `${e.title} ${e.content} ${e.author.displayName} ${e.tags.join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const activeSpace =
    collectives.find((s) => s.id === activeSpaceId) ?? collectives[0] ?? null;

  const handleContribSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewer) {
      onRequireAuth();
      return;
    }
    if (!activeSpace) return;
    setContribError(null);
    setSubmittingContrib(true);
    try {
      await onContributeCollective(activeSpace.id, contribText);
      setContribText('');
    } catch (err: unknown) {
      setContribError(
        err instanceof Error ? err.message : 'Unable to add contribution.'
      );
    } finally {
      setSubmittingContrib(false);
    }
  };

  const handleCreateSpaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewer) {
      onRequireAuth();
      return;
    }
    setNewSpaceError(null);
    setCreatingSpace(true);
    try {
      await onCreateCollective({
        title: newTitle,
        kind: newKind,
        prompt: newPrompt,
        tags: selectedInterest !== 'All' ? [selectedInterest] : ['Creativity'],
      });
      setNewTitle('');
      setNewPrompt('');
      setShowNewSpace(false);
    } catch (err: unknown) {
      setNewSpaceError(
        err instanceof Error ? err.message : 'Unable to create space.'
      );
    } finally {
      setCreatingSpace(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 pb-24 pt-8 sm:px-6">
      {/* Header & Sub-navigation */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-normal tracking-tight text-slate-50 sm:text-3xl">
            Discover & Co-Create
          </h1>
          <p className="text-sm text-slate-400">
            Explore kindred minds, diverse expressions, and collaborative spaces
            shaped by shared curiosity.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Discovery sections"
          className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0B1120] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'creators'}
            onClick={() => setSubTab('creators')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'creators'
                ? 'bg-violet-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Kindred Minds</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'expressions'}
            onClick={() => setSubTab('expressions')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'expressions'
                ? 'bg-violet-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Expressions</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'collectives'}
            onClick={() => setSubTab('collectives')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'collectives'
                ? 'bg-violet-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Collective Creation</span>
          </button>
        </div>
      </div>

      {/* Search & Interest Filters (for creators & expressions) */}
      {subTab !== 'collectives' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <label htmlFor="discover-search" className="sr-only">
                Search people, ideas, or themes
              </label>
              <input
                id="discover-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by interest, perspective, name, or title..."
                className="w-full rounded-xl border border-white/15 bg-[#0B1120] py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-400 focus:outline-none"
              />
            </div>

            {subTab === 'expressions' && (
              <div className="flex items-center gap-2">
                <label htmlFor="discover-category" className="sr-only">
                  Filter by category
                </label>
                <select
                  id="discover-category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-xl border border-white/15 bg-[#0B1120] px-3.5 py-2.5 text-sm text-slate-100 focus:border-violet-400 focus:outline-none"
                >
                  <option value="All">All Categories</option>
                  {EXPRESSION_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div
            aria-label="Filter by shared interest"
            className="flex flex-wrap items-center gap-1.5"
          >
            {['All', ...INTEREST_CATALOG.slice(0, 12)].map((interest) => {
              const active = selectedInterest === interest;
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => setSelectedInterest(interest)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-cyan-400/20 text-cyan-100 border border-cyan-400/40'
                      : 'border border-white/10 bg-white/[0.02] text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {interest}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-tab 1: Creators */}
      {subTab === 'creators' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCreators.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-white/10 bg-[#0B1120]/70 p-10 text-center space-y-2">
              <p className="font-display text-lg text-slate-100">
                No matching members found
              </p>
              <p className="text-sm text-slate-400">
                Try clearing your interest filter or search phrase.
              </p>
            </div>
          ) : (
            filteredCreators.map((creator) => (
              <div
                key={creator.profile.uid}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0B1120]/85 p-6 space-y-5"
              >
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => onInspectProfile(creator.profile.username)}
                    className="flex items-center gap-3.5 text-left group cursor-pointer"
                  >
                    <Avatar
                      src={creator.profile.avatarUrl}
                      name={creator.profile.displayName}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-slate-100 group-hover:text-amber-200 transition-colors">
                        {creator.profile.displayName}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        @{creator.profile.username}
                      </p>
                    </div>
                  </button>

                  <p className="text-sm leading-relaxed text-slate-300">
                    {creator.profile.bio || 'Exploring inner worlds on SOULSPARK.'}
                  </p>

                  <div className="space-y-1.5">
                    {creator.sharedInterests.length > 0 && (
                      <p className="text-xs font-medium text-amber-200">
                        {creator.sharedInterests.length} shared{' '}
                        {creator.sharedInterests.length === 1
                          ? 'interest'
                          : 'interests'}
                        : {creator.sharedInterests.join(', ')}
                      </p>
                    )}
                    <p className="text-xs text-slate-400">
                      {creator.profile.interests.join(' · ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
                  <button
                    type="button"
                    onClick={() => onInspectProfile(creator.profile.username)}
                    className="text-xs font-medium text-slate-300 hover:text-white underline-offset-4 hover:underline cursor-pointer"
                  >
                    View profile
                  </button>

                  {creator.connectionStatus === 'accepted' ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-200">
                      <Check className="h-3.5 w-3.5" />
                      Connected
                    </span>
                  ) : creator.connectionStatus === 'pending_sent' ? (
                    <span className="text-xs text-slate-400">
                      Request sent
                    </span>
                  ) : creator.connectionStatus === 'pending_received' ? (
                    <span className="text-xs text-amber-200">
                      Invited you
                    </span>
                  ) : creator.profile.isMinorProtected ? (
                    <span className="text-xs text-slate-400">
                      Protected mode
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!viewer) return onRequireAuth();
                        onRequestConnection(creator);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/40 bg-violet-600/20 px-3.5 py-1.5 text-xs font-medium text-violet-100 transition-colors hover:bg-violet-600/40 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Connect</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Sub-tab 2: Filtered Expressions */}
      {subTab === 'expressions' && (
        <div className="mx-auto max-w-3xl space-y-6">
          {filteredExpressions.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0B1120]/70 p-10 text-center space-y-2">
              <p className="font-display text-lg text-slate-100">
                No expressions match these filters
              </p>
              <p className="text-sm text-slate-400">
                Try another interest or category to uncover different
                perspectives.
              </p>
            </div>
          ) : (
            filteredExpressions.map((item) => (
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
            ))
          )}
        </div>
      )}

      {/* Sub-tab 3: Collective Creation */}
      {subTab === 'collectives' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Spaces List */}
          <div className="space-y-4 lg:col-span-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-slate-100">
                Collaborative Spaces
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (!viewer) return onRequireAuth();
                  setShowNewSpace((p) => !p);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-100 hover:border-violet-400/50 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Space</span>
              </button>
            </div>

            {showNewSpace && (
              <form
                onSubmit={handleCreateSpaceSubmit}
                className="rounded-2xl border border-violet-400/30 bg-[#0B1120] p-4 space-y-3"
              >
                <h3 className="text-sm font-medium text-slate-100">
                  Start a Collective Project
                </h3>
                <div>
                  <label htmlFor="space-title" className="block text-xs text-slate-400 mb-1">
                    Project title
                  </label>
                  <input
                    id="space-title"
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Night Letters on Gratitude"
                    className="w-full rounded-lg border border-white/15 bg-[#060913] px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="space-kind" className="block text-xs text-slate-400 mb-1">
                    Format
                  </label>
                  <select
                    id="space-kind"
                    value={newKind}
                    onChange={(e) => setNewKind(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-[#060913] px-3 py-2 text-sm text-slate-100"
                  >
                    {COLLECTIVE_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="space-prompt" className="block text-xs text-slate-400 mb-1">
                    Invitation prompt
                  </label>
                  <textarea
                    id="space-prompt"
                    rows={3}
                    required
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    placeholder="Invite others with an open, thoughtful creative prompt..."
                    className="w-full rounded-lg border border-white/15 bg-[#060913] px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                {newSpaceError && (
                  <p className="text-xs text-rose-300" role="alert">
                    {newSpaceError}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewSpace(false)}
                    className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingSpace}
                    className="rounded-lg bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 cursor-pointer"
                  >
                    {creatingSpace ? 'Creating...' : 'Create Space'}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {collectives.map((space) => {
                const isSelected = activeSpace?.id === space.id;
                return (
                  <button
                    key={space.id}
                    type="button"
                    onClick={() => setActiveSpaceId(space.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-violet-400/50 bg-violet-950/25'
                        : 'border-white/10 bg-[#0B1120]/70 hover:border-white/20'
                    }`}
                  >
                    <p className="text-xs text-cyan-200/90">
                      {space.kind} · {space.contributions.length}{' '}
                      {space.contributions.length === 1
                        ? 'contribution'
                        : 'contributions'}
                    </p>
                    <h3 className="mt-1 font-display text-lg text-slate-100">
                      {space.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                      Started by {space.creator.displayName}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Collective Canvas */}
          <div className="lg:col-span-8">
            {activeSpace ? (
              <div className="rounded-2xl border border-white/10 bg-[#0B1120]/85 p-6 sm:p-8 space-y-6">
                {activeSpace.coverImageUrl && (
                  <ResilientImage
                    src={activeSpace.coverImageUrl}
                    alt={activeSpace.title}
                    aspectClass="aspect-[16/7]"
                  />
                )}

                <div className="space-y-2">
                  <p className="text-xs font-medium text-cyan-200">
                    {activeSpace.kind} · Curated by {activeSpace.creator.displayName}
                  </p>
                  <h2 className="font-display text-2xl font-normal text-slate-50">
                    {activeSpace.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {activeSpace.prompt}
                  </p>
                </div>

                <div className="space-y-4 border-t border-white/10 pt-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Community Contributions ({activeSpace.contributions.length})
                  </h3>

                  {activeSpace.contributions.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      No contributions yet. Offer the first stanza or reflection.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {activeSpace.contributions.map((contrib) => (
                        <div
                          key={contrib.id}
                          className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-2.5"
                        >
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              src={contrib.author.avatarUrl}
                              name={contrib.author.displayName}
                              size="sm"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                onInspectProfile(contrib.author.username)
                              }
                              className="text-xs font-medium text-slate-200 hover:text-amber-200 cursor-pointer"
                            >
                              {contrib.author.displayName}
                            </button>
                            <span className="text-xs text-slate-500">
                              @{contrib.author.username} ·{' '}
                              {new Date(contrib.createdAt).toLocaleDateString(
                                'en-US',
                                { month: 'short', day: 'numeric' }
                              )}
                            </span>
                          </div>
                          <p className="whitespace-pre-line font-display text-base leading-relaxed text-slate-100">
                            {contrib.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form
                  onSubmit={handleContribSubmit}
                  className="space-y-3 border-t border-white/10 pt-6"
                >
                  <label
                    htmlFor="collective-contrib"
                    className="block text-sm font-medium text-slate-200"
                  >
                    Add your voice to this space
                  </label>
                  <textarea
                    id="collective-contrib"
                    rows={3}
                    value={contribText}
                    onChange={(e) => setContribText(e.target.value)}
                    placeholder="Write a stanza, reflection, or question in dialogue with the entries above..."
                    className="w-full rounded-xl border border-white/15 bg-[#060913]/80 p-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-400 focus:outline-none"
                  />
                  {contribError && (
                    <p className="text-xs text-rose-300" role="alert">
                      {contribError}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-slate-400">
                      Contributions are checked for kindness and safety.
                    </p>
                    <button
                      type="submit"
                      disabled={submittingContrib}
                      className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>
                        {submittingContrib ? 'Contributing...' : 'Contribute'}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 p-10 text-center text-sm text-slate-400">
                Select or create a collective project to begin.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
