import React, { useState } from 'react';
import { ShieldAlert, Sparkles, UserPlus, X } from 'lucide-react';
import {
  ExpressionItem,
  INTEREST_CATALOG,
  PublicProfile,
  REPORT_REASONS,
} from '../utils/soulspark';
import { Avatar } from './MediaFrame';
import { SelectedReactionSummary } from './ProfileView';
import { DiscoverCreator } from './DiscoverView';

/* 1. Auth & First-Time Registration Modal */
interface AuthModalProps {
  open: boolean;
  needsOnboarding: boolean;
  initialProfile: PublicProfile | null;
  onClose: () => void;
  onGoogleSignIn: () => Promise<void>;
  onCompleteOnboarding: (input: {
    displayName: string;
    username: string;
    bio: string;
    interests: string[];
    isMinorProtected: boolean;
  }) => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  needsOnboarding,
  initialProfile,
  onClose,
  onGoogleSignIn,
  onCompleteOnboarding,
}) => {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(
    initialProfile?.displayName ?? ''
  );
  const [username, setUsername] = useState(initialProfile?.username ?? '');
  const [bio, setBio] = useState(initialProfile?.bio ?? '');
  const [interests, setInterests] = useState<string[]>(
    initialProfile?.interests ?? ['Poetry', 'Contemplation', 'Kindness']
  );
  const [isMinorProtected, setIsMinorProtected] = useState(false);

  if (!open) return null;

  const handleGoogle = async () => {
    setError(null);
    setSigningIn(true);
    try {
      await onGoogleSignIn();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Google sign-in was cancelled or blocked.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const toggleInterest = (tag: string) => {
    setInterests((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length < 8
          ? [...prev, tag]
          : prev
    );
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSigningIn(true);
    try {
      await onCompleteOnboarding({
        displayName,
        username,
        bio,
        interests,
        isMinorProtected,
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to save registration.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-[#0B1120] p-6 sm:p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign in modal"
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {!needsOnboarding ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Sparkles className="h-5 w-5 text-amber-200" />
              <h2
                id="auth-modal-title"
                className="font-display text-2xl font-normal text-slate-50"
              >
                Enter SOULSPARK
              </h2>
              <p className="text-sm leading-relaxed text-slate-300">
                Sign in securely with Google to publish creative expressions,
                send Vibrancy reactions, and connect through mutual consent.
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-rose-500/35 bg-rose-950/35 p-3 text-xs text-rose-200"
              >
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleGoogle}
              disabled={signingIn}
              className="w-full rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-60 cursor-pointer"
            >
              {signingIn ? 'Connecting with Google...' : 'Continue with Google'}
            </button>

            <p className="text-xs leading-relaxed text-slate-400">
              Your email stays strictly private and is never shown on your
              public profile.
            </p>
          </div>
        ) : (
          <form onSubmit={handleOnboardingSubmit} className="space-y-4">
            <div className="space-y-1">
              <h2
                id="auth-modal-title"
                className="font-display text-2xl font-normal text-slate-50"
              >
                Shape Your Sanctuary Profile
              </h2>
              <p className="text-xs text-slate-400">
                Complete your SOULSPARK registration before entering the stream.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="onboard-name"
                  className="block text-xs text-slate-300 mb-1"
                >
                  Display name
                </label>
                <input
                  id="onboard-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#060913] px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label
                  htmlFor="onboard-username"
                  className="block text-xs text-slate-300 mb-1"
                >
                  Username
                </label>
                <input
                  id="onboard-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#060913] px-3 py-2 text-sm text-slate-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="onboard-bio"
                className="block text-xs text-slate-300 mb-1"
              >
                Short personal introduction
              </label>
              <textarea
                id="onboard-bio"
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What draws your curiosity or creativity?"
                className="w-full rounded-lg border border-white/15 bg-[#060913] p-2.5 text-sm text-slate-100"
              />
            </div>

            <div>
              <span className="block text-xs text-slate-300 mb-1.5">
                Choose a few interests
              </span>
              <div className="flex flex-wrap gap-1.5">
                {INTEREST_CATALOG.slice(0, 10).map((tag) => {
                  const active = interests.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleInterest(tag)}
                      className={`rounded-lg px-2.5 py-1 text-xs cursor-pointer ${
                        active
                          ? 'bg-cyan-400/20 text-cyan-100 border border-cyan-400/40'
                          : 'border border-white/10 text-slate-400'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isMinorProtected}
                onChange={(e) => setIsMinorProtected(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-violet-500"
              />
              <span className="text-xs text-slate-300">
                Enable younger-user protection (pauses unsolicited requests and
                restricts replies to connections).
              </span>
            </label>

            {error && (
              <p className="text-xs text-rose-300" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={signingIn}
              className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 cursor-pointer"
            >
              {signingIn ? 'Saving profile...' : 'Enter Sanctuary'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

/* 2. Report Safety Modal */
interface ReportModalProps {
  target: {
    targetType: 'expression' | 'user';
    targetId: string;
    label: string;
  } | null;
  onClose: () => void;
  onSubmitReport: (input: {
    targetType: 'expression' | 'user';
    targetId: string;
    reason: string;
    details: string;
  }) => Promise<void>;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  target,
  onClose,
  onSubmitReport,
}) => {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!target) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmitReport({
        targetType: target.targetType,
        targetId: target.targetId,
        reason,
        details,
      });
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setDetails('');
        onClose();
      }, 1200);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#0B1120] p-6 space-y-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close report dialog"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 text-amber-200">
          <ShieldAlert className="h-4 w-4" />
          <h2 id="report-modal-title" className="font-display text-lg text-slate-50">
            Report for Safety Review
          </h2>
        </div>

        <p className="text-xs text-slate-400">
          Reporting: <span className="text-slate-200">{target.label}</span>
        </p>

        {done ? (
          <p className="rounded-xl border border-cyan-400/30 bg-cyan-950/30 p-4 text-sm text-cyan-100">
            Thank you. Your report has been logged for moderation review.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="report-reason"
                className="block text-xs text-slate-300 mb-1"
              >
                Reason
              </label>
              <select
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#060913] px-3 py-2 text-sm text-slate-100"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="report-details"
                className="block text-xs text-slate-300 mb-1"
              >
                Additional context (optional)
              </label>
              <textarea
                id="report-details"
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={500}
                className="w-full rounded-lg border border-white/15 bg-[#060913] p-2.5 text-sm text-slate-100"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

/* 3. Connection Request Intro Modal */
interface ConnectModalProps {
  creator: DiscoverCreator | null;
  onClose: () => void;
  onSend: (recipientUid: string, introNote: string) => Promise<void>;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  creator,
  onClose,
  onSend,
}) => {
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!creator) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await onSend(creator.profile.uid, note);
      setNote('');
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to send invitation.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#0B1120] p-6 space-y-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close connection dialog"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <Avatar
            src={creator.profile.avatarUrl}
            name={creator.profile.displayName}
          />
          <div>
            <h2
              id="connect-modal-title"
              className="font-display text-lg text-slate-50"
            >
              Connect with {creator.profile.displayName}
            </h2>
            {creator.sharedInterests.length > 0 && (
              <p className="text-xs text-amber-200">
                Shared: {creator.sharedInterests.join(', ')}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="connect-note"
              className="block text-xs text-slate-300 mb-1.5"
            >
              Short thoughtful introduction (optional)
            </label>
            <textarea
              id="connect-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={280}
              placeholder="Share what resonated with you about their work or shared interests..."
              className="w-full rounded-xl border border-white/15 bg-[#060913] p-3 text-sm text-slate-100"
            />
          </div>
          {error && (
            <p className="text-xs text-rose-300" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>{sending ? 'Sending...' : 'Send Invitation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* 4. Public Member Profile Modal */
export interface InspectedProfileData {
  profile: PublicProfile;
  expressions: ExpressionItem[];
  selectedReactions: SelectedReactionSummary[];
  connections: PublicProfile[] | null;
  canSeeConnections: boolean;
  isConnected: boolean;
}

interface PublicProfileModalProps {
  data: InspectedProfileData | null;
  loading: boolean;
  viewerUid: string | null;
  onClose: () => void;
  onReportUser: (uid: string, name: string) => void;
  onBlockUser: (uid: string, name: string) => Promise<void>;
}

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({
  data,
  loading,
  viewerUid,
  onClose,
  onReportUser,
  onBlockUser,
}) => {
  if (!data && !loading) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Member profile"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="relative max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0B1120] p-6 sm:p-8 space-y-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close member profile"
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {loading || !data ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Loading member sanctuary...
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <Avatar
                  src={data.profile.avatarUrl}
                  name={data.profile.displayName}
                  size="lg"
                />
                <div className="space-y-1.5">
                  <h2 className="font-display text-2xl text-slate-50">
                    {data.profile.displayName}
                  </h2>
                  <p className="text-xs text-slate-400">
                    @{data.profile.username}
                    {data.isConnected && ' · Soul Connection'}
                  </p>
                  <p className="max-w-lg text-sm leading-relaxed text-slate-300">
                    {data.profile.bio}
                  </p>
                  <p className="text-xs text-cyan-200/90">
                    {data.profile.interests.join(' · ')}
                  </p>
                </div>
              </div>

              {viewerUid && viewerUid !== data.profile.uid && (
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      onReportUser(data.profile.uid, data.profile.displayName)
                    }
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:text-amber-200 cursor-pointer"
                  >
                    Report
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await onBlockUser(
                        data.profile.uid,
                        data.profile.displayName
                      );
                      onClose();
                    }}
                    className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/15 cursor-pointer"
                  >
                    Block
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-white/10 pt-5">
              <h3 className="font-display text-lg text-slate-100">
                Creative Expressions ({data.expressions.length})
              </h3>
              {data.expressions.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No public expressions shared yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.expressions.map((expr) => (
                    <div
                      key={expr.id}
                      className="rounded-xl border border-white/10 bg-[#060913]/60 p-4 space-y-1.5"
                    >
                      <p className="text-xs text-slate-400">{expr.category}</p>
                      <h4 className="font-display text-base text-slate-100">
                        {expr.title}
                      </h4>
                      <p className="line-clamp-3 text-sm text-slate-300">
                        {expr.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {data.selectedReactions.length > 0 && (
              <div className="space-y-2 border-t border-white/10 pt-5">
                <h3 className="font-display text-lg text-slate-100">
                  Meaningful Resonances
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {data.selectedReactions.slice(0, 4).map((r, i) => (
                    <li key={i}>
                      <span className="text-amber-200">{r.type}</span> on “
                      {r.expressionTitle}” by {r.authorName}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2 border-t border-white/10 pt-5">
              <h3 className="font-display text-lg text-slate-100">
                Connections
              </h3>
              {data.canSeeConnections && data.connections ? (
                data.connections.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    No connections yet.
                  </p>
                ) : (
                  <p className="text-xs text-slate-300">
                    {data.connections
                      .map((c) => `${c.displayName} (@${c.username})`)
                      .join(' · ')}
                  </p>
                )
              ) : (
                <p className="text-xs text-slate-400">
                  Connection list is kept private by this member’s privacy
                  settings.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
