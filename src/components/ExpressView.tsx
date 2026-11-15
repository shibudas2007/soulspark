import React, { useState } from 'react';
import { ImagePlus, Send, X } from 'lucide-react';
import {
  EXPRESSION_CATEGORIES,
  INTEREST_CATALOG,
  PublicProfile,
  validateExpressionInput,
} from '../utils/soulspark';
import { uploadImageFile } from '../lib/api';

interface ExpressViewProps {
  viewer: PublicProfile | null;
  onPublish: (input: {
    title: string;
    category: string;
    content: string;
    imageUrl: string | null;
    tags: string[];
    allowComments: 'everyone' | 'connections' | 'off';
  }) => Promise<void>;
  onRequireAuth: () => void;
}

export const ExpressView: React.FC<ExpressViewProps> = ({
  viewer,
  onPublish,
  onRequireAuth,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Reflection');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Contemplation']);
  const [allowComments, setAllowComments] = useState<
    'everyone' | 'connections' | 'off'
  >('everyone');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length < 5
          ? [...prev, tag]
          : prev
    );
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!viewer) {
      onRequireAuth();
      return;
    }
    setError(null);
    setUploadingImage(true);
    try {
      const uploadedUrl = await uploadImageFile(file);
      setImageUrl(uploadedUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewer) {
      onRequireAuth();
      return;
    }
    const validation = validateExpressionInput({ title, category, content });
    if (!validation.valid) {
      setError(validation.error || 'Please check your expression.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onPublish({
        title: title.trim(),
        category,
        content: content.trim(),
        imageUrl,
        tags: selectedTags,
        allowComments,
      });
      setTitle('');
      setContent('');
      setImageUrl(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to publish expression.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-6">
      <div className="space-y-2 border-b border-white/10 pb-6">
        <h1 className="font-display text-2xl font-normal tracking-tight text-slate-50 sm:text-3xl">
          Share a Soul Expression
        </h1>
        <p className="text-sm text-slate-400">
          Write poetry, reflect on a quiet question, or share photography and
          artwork with care.
        </p>
      </div>

      {!viewer && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-300/30 bg-amber-950/20 p-5">
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-100">
              Sign in to publish to the sanctuary
            </p>
            <p className="text-xs text-slate-300">
              You can draft your expression below, then sign in with Google to
              publish it to your profile and the feed.
            </p>
          </div>
          <button
            type="button"
            onClick={onRequireAuth}
            className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Sign in with Google
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-2xl border border-white/10 bg-[#0B1120]/85 p-6 sm:p-8 space-y-6"
      >
        {/* Category Selector */}
        <div className="space-y-2">
          <span className="block text-xs font-medium text-slate-300">
            Expression Form
          </span>
          <div className="flex flex-wrap gap-2">
            {EXPRESSION_CATEGORIES.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'border-violet-400/60 bg-violet-600/25 text-amber-100'
                      : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label
            htmlFor="express-title"
            className="block text-xs font-medium text-slate-300"
          >
            Title
          </label>
          <input
            id="express-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            placeholder="Give your thought or artwork a title..."
            className="w-full rounded-xl border border-white/15 bg-[#060913]/85 px-4 py-3 font-display text-lg text-slate-50 placeholder:text-slate-500 focus:border-violet-400 focus:outline-none"
          />
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <label
            htmlFor="express-content"
            className="block text-xs font-medium text-slate-300"
          >
            Your Expression
          </label>
          <textarea
            id="express-content"
            rows={7}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={4000}
            placeholder="Share a poem, philosophical reflection, story, or the quiet context behind your photograph..."
            className="w-full rounded-xl border border-white/15 bg-[#060913]/85 p-4 text-[15px] leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-violet-400 focus:outline-none"
          />
          <p className="text-right text-[11px] text-slate-500 tabular-nums">
            {content.length} / 4,000
          </p>
        </div>

        {/* Real Image Upload */}
        <div className="space-y-2.5">
          <span className="block text-xs font-medium text-slate-300">
            Photography or Artwork (optional, JPEG/PNG/WebP up to 3 MB)
          </span>

          {imageUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-white/15">
              <img
                src={imageUrl}
                alt="Uploaded artwork preview"
                className="max-h-72 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                aria-label="Remove uploaded image"
                className="absolute right-3 top-3 rounded-lg bg-[#060913]/85 p-2 text-slate-200 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-4 py-5 text-sm text-slate-300 transition-colors hover:border-violet-400/50 hover:bg-white/[0.04]">
              <ImagePlus className="h-4 w-4 text-cyan-300" />
              <span>
                {uploadingImage
                  ? 'Uploading image...'
                  : 'Choose photography or artwork to attach'}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                disabled={uploadingImage}
                className="sr-only"
              />
            </label>
          )}
        </div>

        {/* Themes / Interests */}
        <div className="space-y-2">
          <span className="block text-xs font-medium text-slate-300">
            Themes (choose up to 5)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {INTEREST_CATALOG.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-lg px-2.5 py-1 text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-cyan-400/20 text-cyan-100 border border-cyan-400/40'
                      : 'border border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comment Controls */}
        <div className="space-y-1.5">
          <label
            htmlFor="express-comment-policy"
            className="block text-xs font-medium text-slate-300"
          >
            Reflection & Comment Controls
          </label>
          <select
            id="express-comment-policy"
            value={allowComments}
            onChange={(e) =>
              setAllowComments(
                e.target.value as 'everyone' | 'connections' | 'off'
              )
            }
            className="w-full rounded-xl border border-white/15 bg-[#060913]/85 px-3.5 py-2.5 text-sm text-slate-100 focus:border-violet-400 focus:outline-none"
          >
            <option value="everyone">Open to thoughtful members</option>
            <option value="connections">Accepted Soul Connections only</option>
            <option value="off">Turn off comments for quiet reading</option>
          </select>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/35 bg-rose-950/35 px-4 py-3 text-sm text-rose-200"
          >
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-5">
          <p className="text-xs text-slate-400">
            Protected by anti-spam and respectful content checks.
          </p>
          <button
            type="submit"
            disabled={submitting || uploadingImage}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="h-4 w-4" />
            <span>{submitting ? 'Publishing...' : 'Publish Expression'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
