import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { resolveMediaSrc } from '../lib/assets';

interface AvatarProps {
  src: string | null | undefined;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md' }) => {
  const [failed, setFailed] = useState(false);
  const resolved = resolveMediaSrc(src);

  const dims =
    size === 'sm'
      ? 'h-8 w-8 text-xs'
      : size === 'lg'
        ? 'h-20 w-20 text-xl'
        : 'h-10 w-10 text-sm';

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  if (resolved && !failed) {
    return (
      <img
        src={resolved}
        alt={`${name} portrait`}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${dims} rounded-full object-cover border border-white/15 shrink-0`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${dims} rounded-full bg-gradient-to-br from-violet-900/70 via-slate-800 to-cyan-950/70 border border-white/15 flex items-center justify-center font-medium text-amber-100 shrink-0`}
    >
      {initials || 'S'}
    </div>
  );
};

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectClass?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  aspectClass = 'aspect-[4/3]',
}) => {
  const [failed, setFailed] = useState(false);
  const resolved = resolveMediaSrc(src);

  if (!resolved || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`${aspectClass} w-full rounded-xl border border-white/10 bg-gradient-to-br from-violet-950/60 via-[#0C1326] to-amber-950/30 flex flex-col items-center justify-center gap-2 p-6 text-center ${className}`}
      >
        <Sparkles className="h-5 w-5 text-amber-200/70" />
        <p className="text-xs text-slate-400 max-w-xs">{alt}</p>
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${aspectClass} w-full rounded-xl object-cover border border-white/10 ${className}`}
    />
  );
};
