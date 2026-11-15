import heroCosmicSanctuary from '../assets/images/hero_cosmic_sanctuary_1794767236880.jpg';
import expressionTwilightWater from '../assets/images/expression_twilight_water_1794767236549.jpg';
import expressionStudioJournal from '../assets/images/expression_studio_journal_1794767237557.jpg';
import collectiveIndigoCanvas from '../assets/images/collective_indigo_canvas_1794767237131.jpg';
import avatarCreatorPortrait from '../assets/images/avatar_creator_portrait_1794767237985.jpg';

const ASSET_MAP: Record<string, string> = {
  '/src/assets/images/hero_cosmic_sanctuary_1794767236880.jpg': heroCosmicSanctuary,
  '/src/assets/images/expression_twilight_water_1794767236549.jpg':
    expressionTwilightWater,
  '/src/assets/images/expression_studio_journal_1794767237557.jpg':
    expressionStudioJournal,
  '/src/assets/images/collective_indigo_canvas_1794767237131.jpg':
    collectiveIndigoCanvas,
  '/src/assets/images/avatar_creator_portrait_1794767237985.jpg':
    avatarCreatorPortrait,
};

export const HERO_COSMIC_IMAGE = heroCosmicSanctuary;
export const COLLECTIVE_DEFAULT_IMAGE = collectiveIndigoCanvas;

export function resolveMediaSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  return ASSET_MAP[url] ?? url;
}
