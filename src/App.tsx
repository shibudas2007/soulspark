import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from './lib/firebase';
import { apiFetch } from './lib/api';
import {
  CollectiveSpaceItem,
  ConnectionRecord,
  ExpressionComment,
  ExpressionItem,
  PublicProfile,
  VibrancySummary,
  VibrancyType,
} from './utils/soulspark';
import { Navbar, NavTab } from './components/Navbar';
import { LandingView } from './components/LandingView';
import { HomeView } from './components/HomeView';
import { DiscoverCreator, DiscoverView } from './components/DiscoverView';
import { ExpressView } from './components/ExpressView';
import { ConnectionsView } from './components/ConnectionsView';
import { ProfileView, SelectedReactionSummary } from './components/ProfileView';
import {
  AuthModal,
  ConnectModal,
  InspectedProfileData,
  PublicProfileModal,
  ReportModal,
} from './components/Modals';

export default function App() {
  const autostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [showLanding, setShowLanding] = useState(!autostart);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [discoverSubTab, setDiscoverSubTab] = useState<
    'creators' | 'expressions' | 'collectives'
  >('creators');

  const [viewer, setViewer] = useState<PublicProfile | null>(null);
  const [privateSettings, setPrivateSettings] = useState({
    email: '',
    recoveryHintEmail: '',
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [expressions, setExpressions] = useState<ExpressionItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  const [creators, setCreators] = useState<DiscoverCreator[]>([]);
  const [collectives, setCollectives] = useState<CollectiveSpaceItem[]>([]);

  const [incomingConns, setIncomingConns] = useState<ConnectionRecord[]>([]);
  const [outgoingConns, setOutgoingConns] = useState<ConnectionRecord[]>([]);
  const [acceptedConns, setAcceptedConns] = useState<ConnectionRecord[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<PublicProfile[]>([]);
  const [selectedReactions, setSelectedReactions] = useState<
    SelectedReactionSummary[]
  >([]);

  const [reportTarget, setReportTarget] = useState<{
    targetType: 'expression' | 'user';
    targetId: string;
    label: string;
  } | null>(null);

  const [connectTarget, setConnectTarget] = useState<DiscoverCreator | null>(
    null
  );

  const [inspectedProfile, setInspectedProfile] =
    useState<InspectedProfileData | null>(null);
  const [loadingInspected, setLoadingInspected] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);

  const flashNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3200);
  };

  const connectedUids = useMemo(
    () => new Set(acceptedConns.map((c) => c.peer.uid)),
    [acceptedConns]
  );

  const loadPublicData = useCallback(async () => {
    setLoadingFeed(true);
    setFeedError(null);
    try {
      const [exprRes, discoverRes, collectiveRes] = await Promise.all([
        apiFetch<{ expressions: ExpressionItem[] }>('/api/expressions'),
        apiFetch<{ creators: DiscoverCreator[] }>('/api/discover'),
        apiFetch<{ spaces: CollectiveSpaceItem[] }>('/api/collectives'),
      ]);
      setExpressions(exprRes.expressions);
      setCreators(discoverRes.creators);
      setCollectives(collectiveRes.spaces);
    } catch (err: unknown) {
      setFeedError(
        err instanceof Error ? err.message : 'Unable to load SOULSPARK stream.'
      );
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  const loadAuthedState = useCallback(async () => {
    try {
      const meRes = await apiFetch<{
        profile: PublicProfile;
        privateSettings: { email: string; recoveryHintEmail: string };
      }>('/api/me');

      setViewer(meRes.profile);
      setPrivateSettings(meRes.privateSettings);

      if (!meRes.profile.onboardingComplete) {
        setAuthModalOpen(true);
      }

      const [connRes, profRes] = await Promise.all([
        apiFetch<{
          incoming: ConnectionRecord[];
          outgoing: ConnectionRecord[];
          accepted: ConnectionRecord[];
          blocked: PublicProfile[];
        }>('/api/connections'),
        apiFetch<{ selectedReactions: SelectedReactionSummary[] }>(
          `/api/profiles/${encodeURIComponent(meRes.profile.username)}`
        ),
      ]);

      setIncomingConns(connRes.incoming);
      setOutgoingConns(connRes.outgoing);
      setAcceptedConns(connRes.accepted);
      setBlockedUsers(connRes.blocked);
      setSelectedReactions(profRes.selectedReactions);
    } catch (err) {
      console.error('Failed to sync authenticated state:', err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await loadAuthedState();
        await loadPublicData();
      } else {
        setViewer(null);
        setPrivateSettings({ email: '', recoveryHintEmail: '' });
        setIncomingConns([]);
        setOutgoingConns([]);
        setAcceptedConns([]);
        setBlockedUsers([]);
        setSelectedReactions([]);
        await loadPublicData();
      }
    });
    return () => unsubscribe();
  }, [loadAuthedState, loadPublicData]);

  const handleSelectTab = (tab: NavTab) => {
    setShowLanding(false);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoogleSignIn = async () => {
    await signInWithPopup(auth, googleAuthProvider);
    await loadAuthedState();
    await loadPublicData();
    setShowLanding(false);
  };

  const handleCompleteOnboarding = async (input: {
    displayName: string;
    username: string;
    bio: string;
    interests: string[];
    isMinorProtected: boolean;
  }) => {
    const res = await apiFetch<{
      profile: PublicProfile;
      privateSettings: { email: string; recoveryHintEmail: string };
    }>('/api/me', {
      method: 'PATCH',
      body: JSON.stringify({
        ...input,
        onboardingComplete: true,
      }),
    });
    setViewer(res.profile);
    setPrivateSettings(res.privateSettings);
    setAuthModalOpen(false);
    setShowLanding(false);
    flashNotice('Welcome to SOULSPARK.');
    await loadPublicData();
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setViewer(null);
    setShowLanding(true);
    flashNotice('You have signed out peacefully.');
  };

  const handlePublishExpression = async (input: {
    title: string;
    category: string;
    content: string;
    imageUrl: string | null;
    tags: string[];
    allowComments: 'everyone' | 'connections' | 'off';
  }) => {
    const res = await apiFetch<{ expression: ExpressionItem }>(
      '/api/expressions',
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
    setExpressions((prev) => [res.expression, ...prev]);
    setActiveTab('home');
    setShowLanding(false);
    flashNotice('Expression shared with the sanctuary.');
  };

  const handleToggleVibrancy = async (
    expressionId: number,
    type: VibrancyType
  ) => {
    const res = await apiFetch<{ vibrancy: VibrancySummary }>(
      `/api/expressions/${expressionId}/reactions`,
      {
        method: 'POST',
        body: JSON.stringify({ type }),
      }
    );
    setExpressions((prev) =>
      prev.map((item) =>
        item.id === expressionId ? { ...item, vibrancy: res.vibrancy } : item
      )
    );
    if (viewer) {
      const profRes = await apiFetch<{
        selectedReactions: SelectedReactionSummary[];
      }>(`/api/profiles/${encodeURIComponent(viewer.username)}`);
      setSelectedReactions(profRes.selectedReactions);
    }
  };

  const handleAddComment = async (expressionId: number, content: string) => {
    const res = await apiFetch<{ comment: ExpressionComment }>(
      `/api/expressions/${expressionId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      }
    );
    setExpressions((prev) =>
      prev.map((item) =>
        item.id === expressionId
          ? { ...item, comments: [...item.comments, res.comment] }
          : item
      )
    );
  };

  const handleDeleteExpression = async (expressionId: number) => {
    await apiFetch(`/api/expressions/${expressionId}`, { method: 'DELETE' });
    setExpressions((prev) => prev.filter((e) => e.id !== expressionId));
    flashNotice('Expression removed.');
  };

  const handleSendConnection = async (
    recipientUid: string,
    introNote: string
  ) => {
    await apiFetch('/api/connections', {
      method: 'POST',
      body: JSON.stringify({ recipientUid, introNote }),
    });
    await Promise.all([loadAuthedState(), loadPublicData()]);
    flashNotice('Connection invitation sent.');
  };

  const handleRespondConnection = async (
    connectionId: number,
    status: 'accepted' | 'declined'
  ) => {
    await apiFetch(`/api/connections/${connectionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await Promise.all([loadAuthedState(), loadPublicData()]);
    flashNotice(
      status === 'accepted' ? 'Soul Connection formed.' : 'Invitation declined.'
    );
  };

  const handleRemoveConnection = async (connectionId: number) => {
    await apiFetch(`/api/connections/${connectionId}`, { method: 'DELETE' });
    await Promise.all([loadAuthedState(), loadPublicData()]);
    flashNotice('Connection updated.');
  };

  const handleBlockUser = async (uid: string, displayName: string) => {
    await apiFetch('/api/blocks', {
      method: 'POST',
      body: JSON.stringify({ blockedUid: uid }),
    });
    await Promise.all([loadAuthedState(), loadPublicData()]);
    flashNotice(`${displayName} has been blocked.`);
  };

  const handleUnblockUser = async (uid: string) => {
    await apiFetch(`/api/blocks/${encodeURIComponent(uid)}`, {
      method: 'DELETE',
    });
    await Promise.all([loadAuthedState(), loadPublicData()]);
    flashNotice('Account unblocked.');
  };

  const handleSubmitReport = async (input: {
    targetType: 'expression' | 'user';
    targetId: string;
    reason: string;
    details: string;
  }) => {
    await apiFetch('/api/reports', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    await loadPublicData();
  };

  const handleUpdateProfile = async (patch: {
    displayName: string;
    username: string;
    bio: string;
    interests: string[];
    avatarUrl: string | null;
    isMinorProtected: boolean;
    connectionPrivacy: 'public' | 'connections' | 'private';
    commentPrivacy: 'everyone' | 'connections' | 'none';
    recoveryHintEmail: string;
  }) => {
    const res = await apiFetch<{
      profile: PublicProfile;
      privateSettings: { email: string; recoveryHintEmail: string };
    }>('/api/me', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    setViewer(res.profile);
    setPrivateSettings(res.privateSettings);
    await loadPublicData();
  };

  const handleContributeCollective = async (
    spaceId: number,
    content: string
  ) => {
    await apiFetch(`/api/collectives/${spaceId}/contributions`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    const res = await apiFetch<{ spaces: CollectiveSpaceItem[] }>(
      '/api/collectives'
    );
    setCollectives(res.spaces);
    flashNotice('Contribution woven into collective space.');
  };

  const handleCreateCollective = async (input: {
    title: string;
    kind: string;
    prompt: string;
    tags: string[];
  }) => {
    await apiFetch('/api/collectives', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    const res = await apiFetch<{ spaces: CollectiveSpaceItem[] }>(
      '/api/collectives'
    );
    setCollectives(res.spaces);
    flashNotice('Collective creation space opened.');
  };

  const handleInspectProfile = async (username: string) => {
    if (viewer && username === viewer.username) {
      setShowLanding(false);
      setActiveTab('profile');
      return;
    }
    setLoadingInspected(true);
    try {
      const res = await apiFetch<InspectedProfileData>(
        `/api/profiles/${encodeURIComponent(username)}`
      );
      setInspectedProfile(res);
    } catch (err: unknown) {
      flashNotice(
        err instanceof Error ? err.message : 'Unable to load member profile.'
      );
    } finally {
      setLoadingInspected(false);
    }
  };

  const myExpressions = useMemo(
    () =>
      viewer ? expressions.filter((e) => e.author.uid === viewer.uid) : [],
    [expressions, viewer]
  );

  const needsOnboarding = Boolean(viewer && !viewer.onboardingComplete);

  return (
    <div className="min-h-screen cosmic-canvas text-[#EEF2FF]">
      <Navbar
        activeTab={activeTab}
        showLanding={showLanding}
        onSelectTab={handleSelectTab}
        onGoLanding={() => setShowLanding(true)}
        viewer={viewer}
        onOpenAuth={() => setAuthModalOpen(true)}
        pendingIncomingCount={incomingConns.length}
      />

      {notice && (
        <div
          role="status"
          className="fixed right-4 top-16 z-50 rounded-xl border border-cyan-400/40 bg-[#0B1120]/95 px-4 py-2.5 text-xs font-medium text-cyan-100 shadow-lg"
        >
          {notice}
        </div>
      )}

      <main>
        {showLanding ? (
          <LandingView
            previewExpressions={expressions}
            onEnterSanctuary={() => {
              setShowLanding(false);
              setActiveTab('home');
            }}
            onSignIn={() => setAuthModalOpen(true)}
            isAuthenticated={Boolean(viewer)}
          />
        ) : activeTab === 'home' ? (
          <HomeView
            expressions={expressions}
            collectives={collectives}
            loading={loadingFeed}
            error={feedError}
            viewer={viewer}
            connectedUids={connectedUids}
            onToggleVibrancy={handleToggleVibrancy}
            onAddComment={handleAddComment}
            onDeleteExpression={handleDeleteExpression}
            onInspectProfile={handleInspectProfile}
            onReport={(targetType, targetId, label) =>
              setReportTarget({ targetType, targetId, label })
            }
            onBlockUser={handleBlockUser}
            onRequireAuth={() => setAuthModalOpen(true)}
            onGoExpress={() => handleSelectTab('express')}
            onOpenCollective={() => {
              setDiscoverSubTab('collectives');
              handleSelectTab('discover');
            }}
          />
        ) : activeTab === 'discover' ? (
          <DiscoverView
            key={discoverSubTab}
            creators={creators}
            expressions={expressions}
            collectives={collectives}
            viewer={viewer}
            connectedUids={connectedUids}
            initialSubTab={discoverSubTab}
            onRequestConnection={(creator) => setConnectTarget(creator)}
            onInspectProfile={handleInspectProfile}
            onToggleVibrancy={handleToggleVibrancy}
            onAddComment={handleAddComment}
            onDeleteExpression={handleDeleteExpression}
            onReport={(targetType, targetId, label) =>
              setReportTarget({ targetType, targetId, label })
            }
            onBlockUser={handleBlockUser}
            onContributeCollective={handleContributeCollective}
            onCreateCollective={handleCreateCollective}
            onRequireAuth={() => setAuthModalOpen(true)}
          />
        ) : activeTab === 'express' ? (
          <ExpressView
            viewer={viewer}
            onPublish={handlePublishExpression}
            onRequireAuth={() => setAuthModalOpen(true)}
          />
        ) : activeTab === 'connections' ? (
          <ConnectionsView
            viewer={viewer}
            incoming={incomingConns}
            outgoing={outgoingConns}
            accepted={acceptedConns}
            blocked={blockedUsers}
            onRespondRequest={handleRespondConnection}
            onRemoveConnection={handleRemoveConnection}
            onBlockUser={handleBlockUser}
            onUnblockUser={handleUnblockUser}
            onInspectProfile={handleInspectProfile}
            onRequireAuth={() => setAuthModalOpen(true)}
            onGoDiscover={() => {
              setDiscoverSubTab('creators');
              handleSelectTab('discover');
            }}
          />
        ) : (
          <ProfileView
            viewer={viewer}
            privateSettings={privateSettings}
            myExpressions={myExpressions}
            acceptedConnections={acceptedConns}
            selectedReactions={selectedReactions}
            connectedUids={connectedUids}
            onUpdateProfile={handleUpdateProfile}
            onSignOut={handleSignOut}
            onRequireAuth={() => setAuthModalOpen(true)}
            onToggleVibrancy={handleToggleVibrancy}
            onAddComment={handleAddComment}
            onDeleteExpression={handleDeleteExpression}
            onInspectProfile={handleInspectProfile}
            onReport={(targetType, targetId, label) =>
              setReportTarget({ targetType, targetId, label })
            }
            onBlockUser={handleBlockUser}
          />
        )}
      </main>

      <footer className="border-t border-white/[0.06] py-8 text-center text-xs text-slate-500 pb-20 md:pb-8">
        <p>SOULSPARK — Let Inner Worlds Meet. Designed for calm human presence.</p>
      </footer>

      <AuthModal
        key={viewer?.uid || 'guest'}
        open={authModalOpen || needsOnboarding}
        needsOnboarding={needsOnboarding}
        initialProfile={viewer}
        onClose={() => {
          if (!needsOnboarding) setAuthModalOpen(false);
        }}
        onGoogleSignIn={handleGoogleSignIn}
        onCompleteOnboarding={handleCompleteOnboarding}
      />

      <ReportModal
        target={reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmitReport={handleSubmitReport}
      />

      <ConnectModal
        creator={connectTarget}
        onClose={() => setConnectTarget(null)}
        onSend={handleSendConnection}
      />

      <PublicProfileModal
        data={inspectedProfile}
        loading={loadingInspected}
        viewerUid={viewer?.uid ?? null}
        onClose={() => setInspectedProfile(null)}
        onReportUser={(uid, name) =>
          setReportTarget({ targetType: 'user', targetId: uid, label: name })
        }
        onBlockUser={handleBlockUser}
      />
    </div>
  );
}
