import React from 'react';
import { ArrowRight, Compass, Feather, ShieldCheck } from 'lucide-react';
import { HERO_COSMIC_IMAGE } from '../lib/assets';
import { ExpressionItem } from '../utils/soulspark';
import { Avatar, ResilientImage } from './MediaFrame';

interface LandingViewProps {
  previewExpressions: ExpressionItem[];
  onEnterSanctuary: () => void;
  onSignIn: () => void;
  isAuthenticated: boolean;
}

export const LandingView: React.FC<LandingViewProps> = ({
  previewExpressions,
  onEnterSanctuary,
  onSignIn,
  isAuthenticated,
}) => {
  const featured = previewExpressions.slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:pt-14">
      {/* Hero Split */}
      <section className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col justify-between gap-8 lg:col-span-6">
          <div className="space-y-6">
            <p className="text-xs font-medium tracking-[0.14em] text-amber-200/90 uppercase">
              A Sanctuary for Human Vibrancy
            </p>
            <h1
              className="font-display font-normal tracking-tight text-slate-50 leading-[1.08]"
              style={{
                fontSize: 'clamp(2.4rem, 4.4vw, 3.85rem)',
                textWrap: 'balance',
              }}
            >
              Let inner worlds meet in quiet light.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-300">
              SOULSPARK is a calm social universe for poetry, photography,
              philosophical inquiry, and collective imagination. Built without
              follower contests, algorithmic urgency, or infinite-scroll traps.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={onEnterSanctuary}
                className="inline-flex items-center gap-2.5 rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                <span>Open Home Feed</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="inline-flex items-center gap-2.5 rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                >
                  <span>Join with Google</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onEnterSanctuary}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-400/40 hover:text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
                >
                  <span>Browse Sanctuary</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="relative h-full min-h-[280px] overflow-hidden rounded-2xl border border-white/10 vibrancy-aura">
            <img
              src={HERO_COSMIC_IMAGE}
              alt="Starlit indigo night sky reflecting over quiet mountain water"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover lg:min-h-[380px]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#060913]/85 via-[#060913]/20 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="font-display text-lg text-slate-100">
                “Every human carries a quiet constellation worth listening to.”
              </p>
              <p className="mt-1 text-xs text-slate-300">
                Poetry · Visual Art · Philosophy · Collective Creation
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ethos Row (Full-width below hero split) */}
      <section
        aria-label="Design philosophy"
        className="mt-16 grid grid-cols-1 gap-8 border-y border-white/10 py-10 md:grid-cols-3"
      >
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-amber-200">
            <Feather className="h-4 w-4 shrink-0" />
            <h2 className="font-display text-lg font-medium text-slate-100">
              Vibrancy Over Vanity
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            Instead of hollow likes or public follower leaderboards, respond with
            six meaningful resonances: Inspired, Understood, Hopeful, Curious,
            Moved, or Appreciated.
          </p>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-cyan-300">
            <Compass className="h-4 w-4 shrink-0" />
            <h2 className="font-display text-lg font-medium text-slate-100">
              Curated Calm & Diversity
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            Feeds interleave diverse voices and disciplines chronologically—never
            amplifying outrage or trapping you in endless algorithmic loops.
          </p>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-violet-300">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <h2 className="font-display text-lg font-medium text-slate-100">
              Mutual Consent & Safety
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            Connections require mutual consent, private details stay protected,
            and younger-user safeguards plus instant blocking keep the space safe.
          </p>
        </div>
      </section>

      {/* Featured Community Expressions */}
      <section className="mt-16 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl font-normal tracking-tight text-slate-50 sm:text-3xl">
              Recent sparks in the sanctuary
            </h2>
            <p className="text-sm text-slate-400">
              A glimpse into thoughtful reflections, photography, and verse shared
              by members.
            </p>
          </div>
          <button
            type="button"
            onClick={onEnterSanctuary}
            className="text-sm font-medium text-amber-200 underline-offset-4 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            Read all expressions
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {featured.map((item) => (
            <article
              key={item.id}
              onClick={onEnterSanctuary}
              className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0B1120]/80 p-5 transition-colors hover:border-violet-400/35 cursor-pointer"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={item.author.avatarUrl}
                    name={item.author.displayName}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">
                      {item.author.displayName}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      @{item.author.username} · {item.category}
                    </p>
                  </div>
                </div>

                {item.imageUrl && (
                  <ResilientImage
                    src={item.imageUrl}
                    alt={item.title}
                    aspectClass="aspect-[4/3]"
                  />
                )}

                <div className="space-y-2">
                  <h3 className="font-display text-lg font-medium text-slate-50 group-hover:text-amber-100 transition-colors">
                    {item.title}
                  </h3>
                  <p className="line-clamp-3 text-sm leading-relaxed text-slate-300">
                    {item.content}
                  </p>
                </div>
              </div>

              <p className="mt-5 pt-4 border-t border-white/[0.06] text-xs text-slate-400">
                {item.tags.slice(0, 3).join(' · ') || item.category}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
