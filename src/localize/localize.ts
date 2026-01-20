import { en } from './languages/en';

const languages: any = {
  en,
};

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
  const [section, key] = string.split('.');

  let translated: string;
  const lang = language.replace(/_/, '-');

  try {
    translated = languages[lang][section][key];
  } catch (_) {
    try {
      translated = languages.en[section][key];
    } catch (_) {
      translated = string;
    }
  }

  if (translated === undefined) {
    translated = string;
  }

  if (search !== '' && replace !== '') {
    translated = translated.replace(search, replace);
  }
  return translated;
};
