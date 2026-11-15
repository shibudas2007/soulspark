import React from 'react';
import { PublicProfile } from '../utils/soulspark';

export type NavTab = 'home' | 'discover' | 'express' | 'connections' | 'profile';

interface NavbarProps {
  activeTab: NavTab;
  showLanding: boolean;
  onSelectTab: (tab: NavTab) => void;
  onGoLanding: () => void;
  viewer: PublicProfile | null;
  onOpenAuth: () => void;
  pendingIncomingCount: number;
}

const NAV_ITEMS: { id: NavTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'discover', label: 'Discover' },
  { id: 'express', label: 'Express' },
  { id: 'connections', label: 'Connections' },
  { id: 'profile', label: 'Profile' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  showLanding,
  onSelectTab,
  onGoLanding,
  viewer,
  onOpenAuth,
  pendingIncomingCount,
}) => {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#060913]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={onGoLanding}
            className="font-display text-xl font-medium tracking-tight text-slate-50 transition-colors hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400 whitespace-nowrap shrink-0 cursor-pointer"
          >
            SOULSPARK
          </button>

          {/* Zone 2: 5 Primary Navigation Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = !showLanding && activeTab === item.id;
              const labelText =
                item.id === 'connections' && pendingIncomingCount > 0
                  ? `${item.label} (${pendingIncomingCount})`
                  : item.label;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400 ${
                    isActive
                      ? 'text-amber-200'
                      : 'text-slate-300 hover:text-slate-50'
                  }`}
                >
                  {labelText}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 -bottom-[15px] h-px bg-gradient-to-r from-violet-400 via-cyan-300 to-amber-300"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            {viewer ? (
              <button
                type="button"
                onClick={() => onSelectTab('profile')}
                className="rounded-lg border border-white/15 bg-white/[0.05] px-4 py-2 text-xs font-medium text-slate-100 transition-colors hover:border-violet-400/50 hover:bg-white/[0.09] whitespace-nowrap shrink-0 max-w-[160px] truncate cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
              >
                {viewer.displayName}
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation (compact single bar well within 15% viewport cap) */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-white/10 bg-[#060913]/95 px-2 py-2 backdrop-blur-md md:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = !showLanding && activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`min-h-[44px] px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive ? 'text-amber-200' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </>
  );
};
