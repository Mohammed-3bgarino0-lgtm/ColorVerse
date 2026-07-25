import type {
  BookCover,
  BookDraftInput,
  BookTemplateId,
  CoverStyle,
} from './book-schema';
import { generateBookTitle } from './title-generator';

export interface CoverTemplateConfig {
  id: BookTemplateId;
  backgroundImage: string;
  palette: BookCover['palette'];
}

const TEMPLATE_CONFIG: Record<BookTemplateId, CoverTemplateConfig> = {
  space: {
    id: 'space',
    backgroundImage: '/marketing/cover-space.webp',
    palette: { primary: '#5D5FEF', secondary: '#7437EA', accent: '#FF8A00', text: '#FFFFFF' },
  },
  princess: {
    id: 'princess',
    backgroundImage: '/marketing/cover-princess.webp',
    palette: { primary: '#A855F7', secondary: '#EC4899', accent: '#F5C451', text: '#FFFFFF' },
  },
  jungle: {
    id: 'jungle',
    backgroundImage: '/marketing/cover-jungle.webp',
    palette: { primary: '#169B62', secondary: '#43B96F', accent: '#FFB02E', text: '#FFFFFF' },
  },
  hero: {
    id: 'hero',
    backgroundImage: '/marketing/cover-hero.webp',
    palette: { primary: '#2563EB', secondary: '#F97316', accent: '#EF4444', text: '#FFFFFF' },
  },
  unicorn: {
    id: 'unicorn',
    backgroundImage: '/marketing/cover-unicorn.webp',
    palette: { primary: '#8B5CF6', secondary: '#EC4899', accent: '#38BDF8', text: '#FFFFFF' },
  },
};

export interface GenerateCoverInput {
  draft: BookDraftInput;
  heroImage?: string;
  logo?: string;
  style?: CoverStyle;
}

export function generateCover(input: GenerateCoverInput): BookCover {
  const { draft } = input;
  const config = TEMPLATE_CONFIG[draft.story.template];
  const heroName = draft.story.heroName.trim() || draft.child.name.trim();
  const title = generateBookTitle({
    heroName,
    template: draft.story.template,
    adventure: draft.story.adventure,
    customTitle: draft.story.title,
  });

  return {
    style: input.style ?? draft.coverStyle ?? 'primary',
    title,
    subtitle: `قصة مخصصة لـ ${draft.child.name.trim()}`,
    heroImage: input.heroImage,
    backgroundImage: config.backgroundImage,
    logo: input.logo ?? '/brand/colorverse-logo-full.webp',
    palette: config.palette,
  };
}

export function getCoverTemplateConfig(template: BookTemplateId): CoverTemplateConfig {
  return TEMPLATE_CONFIG[template];
}
