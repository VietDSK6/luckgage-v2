import type { GuideSection } from '@/data/repositories/GuidesRepository';

const WORDS_PER_MINUTE = 200;

function sectionText(section: GuideSection): string {
  if (section.type === 'bulletList') return section.items.join(' ');
  if (section.type === 'image') return '';
  return section.text;
}

export function estimateReadingMinutes(summary: string, sections: readonly GuideSection[]): number {
  const text = [summary, ...sections.map(sectionText)].join(' ').trim();
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
