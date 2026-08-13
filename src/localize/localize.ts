import en from './languages/en.json';

interface LocaleStrings {
  [key: string]: string;
}

interface LocaleSection {
  [section: string]: LocaleStrings;
}

interface Languages {
  [locale: string]: LocaleSection;
}

const languages: Languages = {
  en,
};

function lookup(string: string, language: string): string {
  const [section, key] = string.split('.');
  const lang = language.replace(/_/, '-');
  return languages[lang]?.[section]?.[key] ?? languages.en?.[section]?.[key] ?? string;
}

// Basic lookup logic
export const localize = (
  string: string,
  search = '',
  replace = '',
  language: string = 'en'
): string => {
  if (!string || typeof string !== 'string') {
    return string;
  }
  let translated = lookup(string, language);

  if (search !== '' && replace !== '') {
    translated = translated.replace(search, replace);
  }
  return translated;
};

export function localizeWithParams(
  string: string,
  params: Record<string, string | number> = {},
  language = 'en'
): string {
  return Object.entries(params).reduce(
    (translated, [name, value]) => translated.replaceAll(`{${name}}`, String(value)),
    lookup(string, language)
  );
}

export function localizePlural(
  string: string,
  count: number,
  params: Record<string, string | number> = {},
  language = 'en'
): string {
  const category = new Intl.PluralRules(language.replace(/_/, '-')).select(count);
  const candidate = `${string}_${category}`;
  const key = lookup(candidate, language) === candidate ? `${string}_other` : candidate;
  return localizeWithParams(key, { ...params, count }, language);
}
