import React from 'react';
import { Check, ShieldBan, UserCheck, UserMinus, X } from 'lucide-react';
import { ConnectionRecord, PublicProfile } from '../utils/soulspark';
import { Avatar } from './MediaFrame';

interface ConnectionsViewProps {
  viewer: PublicProfile | null;
  incoming: ConnectionRecord[];
  outgoing: ConnectionRecord[];
  accepted: ConnectionRecord[];
  blocked: PublicProfile[];
  onRespondRequest: (
    connectionId: number,
    status: 'accepted' | 'declined'
  ) => Promise<void>;
  onRemoveConnection: (connectionId: number) => Promise<void>;
  onBlockUser: (uid: string, displayName: string) => Promise<void>;
  onUnblockUser: (uid: string) => Promise<void>;
  onInspectProfile: (username: string) => void;
  onRequireAuth: () => void;
  onGoDiscover: () => void;
}

export const ConnectionsView: React.FC<ConnectionsViewProps> = ({
  viewer,
  incoming,
  outgoing,
  accepted,
  blocked,
  onRespondRequest,
  onRemoveConnection,
  onBlockUser,
  onUnblockUser,
  onInspectProfile,
  onRequireAuth,
  onGoDiscover,
}) => {
  if (!viewer) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-[#0B1120]/85 p-10 text-center space-y-4">
          <h1 className="font-display text-2xl text-slate-50">
            Soul Connections
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-300">
            Connect with kindred spirits through mutual consent and shared
            interests—with zero public follower counts or private data exposure.
          </p>
          <button
            type="button"
            onClick={onRequireAuth}
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 cursor-pointer"
          >
            Sign in to view your connections
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 pb-24 pt-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-normal tracking-tight text-slate-50 sm:text-3xl">
            Soul Connections
          </h1>
          <p className="text-sm text-slate-400">
            Mutual, consent-based connections anchored in shared curiosity.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoDiscover}
          className="rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium text-slate-200 hover:border-violet-400/50 cursor-pointer whitespace-nowrap shrink-0"
        >
          Find kindred minds
        </button>
      </div>

      {/* Incoming Requests */}
      <section className="space-y-4">
        <h2 className="font-display text-xl text-slate-100">
          Incoming Invitations ({incoming.length})
        </h2>

        {incoming.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-[#0B1120]/60 p-6 text-sm text-slate-400">
            No pending invitations right now.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {incoming.map((req) => (
              <div
                key={req.id}
                className="flex flex-col justify-between rounded-2xl border border-violet-400/30 bg-[#0B1120]/90 p-5 space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={req.peer.avatarUrl}
                      name={req.peer.displayName}
                    />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onInspectProfile(req.peer.username)}
                        className="truncate text-sm font-semibold text-slate-100 hover:text-amber-200 cursor-pointer"
                      >
                        {req.peer.displayName}
                      </button>
                      <p className="truncate text-xs text-slate-400">
                        @{req.peer.username}
                      </p>
                    </div>
                  </div>

                  {req.introNote && (
                    <p className="rounded-xl bg-white/[0.03] p-3 text-sm leading-relaxed text-slate-200">
                      “{req.introNote}”
                    </p>
                  )}

                  {req.sharedInterests.length > 0 && (
                    <p className="text-xs text-amber-200">
                      Shared interests: {req.sharedInterests.join(', ')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 border-t border-white/[0.08] pt-3">
                  <button
                    type="button"
                    onClick={() => onRespondRequest(req.id, 'accepted')}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Accept</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRespondRequest(req.id, 'declined')}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.08] cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Decline</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onBlockUser(req.peer.uid, req.peer.displayName)
                    }
                    aria-label={`Block ${req.peer.displayName}`}
                    className="rounded-lg border border-white/10 p-2 text-slate-400 hover:border-rose-500/40 hover:text-rose-200 cursor-pointer"
                  >
                    <ShieldBan className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Accepted Soul Connections */}
      <section className="space-y-4">
        <h2 className="font-display text-xl text-slate-100">
          Your Soul Connections ({accepted.length})
        </h2>

        {accepted.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#0B1120]/60 p-8 text-center space-y-3">
            <UserCheck className="mx-auto h-6 w-6 text-cyan-300/70" />
            <p className="text-sm text-slate-300">
              You have not formed connections yet. Explore Discover to find
              people who share your creative interests.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {accepted.map((conn) => (
              <div
                key={conn.id}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0B1120]/85 p-5 space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={conn.peer.avatarUrl}
                      name={conn.peer.displayName}
                    />
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onInspectProfile(conn.peer.username)}
                        className="truncate text-base font-medium text-slate-100 hover:text-amber-200 cursor-pointer"
                      >
                        {conn.peer.displayName}
                      </button>
                      <p className="truncate text-xs text-slate-400">
                        @{conn.peer.username}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 line-clamp-2">
                    {conn.peer.bio || 'Kindred traveler on SOULSPARK.'}
                  </p>
                  {conn.sharedInterests.length > 0 && (
                    <p className="text-xs text-cyan-200">
                      Shared: {conn.sharedInterests.join(' · ')}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-white/[0.07] pt-3">
                  <button
                    type="button"
                    onClick={() => onInspectProfile(conn.peer.username)}
                    className="text-xs font-medium text-amber-200 hover:underline underline-offset-4 cursor-pointer"
                  >
                    View sanctuary profile
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onRemoveConnection(conn.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-white/[0.06] hover:text-slate-100 cursor-pointer"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      <span>Disconnect</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onBlockUser(conn.peer.uid, conn.peer.displayName)
                      }
                      aria-label={`Block ${conn.peer.displayName}`}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-200 cursor-pointer"
                    >
                      <ShieldBan className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sent Requests */}
      {outgoing.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg text-slate-200">
            Sent Invitations ({outgoing.length})
          </h2>
          <div className="space-y-2.5">
            {outgoing.map((req) => (
              <div
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0B1120]/60 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={req.peer.avatarUrl}
                    name={req.peer.displayName}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-100">
                      {req.peer.displayName}
                    </p>
                    <p className="text-xs text-slate-400">
                      @{req.peer.username} · Pending mutual consent
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveConnection(req.id)}
                  className="text-xs text-slate-400 hover:text-rose-200 cursor-pointer"
                >
                  Withdraw
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Blocked Users */}
      {blocked.length > 0 && (
        <section className="space-y-3 border-t border-white/10 pt-8">
          <h2 className="font-display text-lg text-slate-200">
            Blocked Accounts ({blocked.length})
          </h2>
          <div className="space-y-2">
            {blocked.map((b) => (
              <div
                key={b.uid}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0B1120]/50 px-4 py-3"
              >
                <span className="text-sm text-slate-300">
                  {b.displayName} (@{b.username})
                </span>
                <button
                  type="button"
                  onClick={() => onUnblockUser(b.uid)}
                  className="rounded-lg border border-white/15 px-3 py-1 text-xs text-slate-200 hover:bg-white/[0.06] cursor-pointer"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
