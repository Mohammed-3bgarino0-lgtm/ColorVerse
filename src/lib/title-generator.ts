import type { BookTemplateId } from './book-schema';

export interface TitleGeneratorInput {
  heroName: string;
  template: BookTemplateId;
  adventure: string;
  customTitle?: string;
}

const normalize = (value: string): string => value.trim().replace(/\s+/g, ' ');

function adventureKeyword(adventure: string): string | null {
  const text = normalize(adventure);
  const keywords = [
    'الكنز',
    'النجوم',
    'الكوكب',
    'القصر',
    'الغابة',
    'المدينة',
    'الألوان',
    'الجزيرة',
    'التنين',
    'الصديق',
    'اللغز',
  ];

  return keywords.find((keyword) => text.includes(keyword)) ?? null;
}

export function generateBookTitle(input: TitleGeneratorInput): string {
  const customTitle = normalize(input.customTitle ?? '');
  if (customTitle) return customTitle;

  const hero = normalize(input.heroName) || 'البطل الصغير';
  const keyword = adventureKeyword(input.adventure);

  const titles: Record<BookTemplateId, string> = {
    space: keyword === 'الكوكب'
      ? `${hero} وسر الكوكب المضيء`
      : `مغامرة ${hero} بين النجوم`,
    princess: keyword === 'القصر'
      ? `${hero} وسر القصر الساحر`
      : `${hero} والوردة السحرية`,
    jungle: keyword === 'الكنز'
      ? `${hero} وكنز الغابة المفقود`
      : `${hero} وأصدقاء الغابة`,
    hero: keyword === 'الألوان'
      ? `${hero} يعيد الألوان إلى المدينة`
      : `البطل ${hero} ينقذ المدينة`,
    unicorn: keyword === 'الألوان'
      ? `${hero} ووادي الألوان`
      : `${hero} وقوس القزح السحري`,
  };

  return titles[input.template];
}

export function suggestBookTitles(input: TitleGeneratorInput): string[] {
  const hero = normalize(input.heroName) || 'البطل الصغير';
  const primary = generateBookTitle({ ...input, customTitle: '' });
  const alternatives: Record<BookTemplateId, string[]> = {
    space: [`${hero} ورحلة الكوكب البعيد`, `${hero} ومفتاح النجوم`],
    princess: [`${hero} وحديقة القصر السرية`, `${hero} وتاج الأمنيات`],
    jungle: [`${hero} وممر الحيوانات العجيب`, `${hero} وسر الشجرة القديمة`],
    hero: [`${hero} والنجمة الخارقة`, `${hero} وحراس المدينة`],
    unicorn: [`${hero} ووادي اليونيكورن`, `${hero} وسحابة الأمنيات`],
  };

  return [primary, ...alternatives[input.template]];
}
