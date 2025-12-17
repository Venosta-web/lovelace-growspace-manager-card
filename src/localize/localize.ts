import { en } from './languages/en';

const languages: any = {
    en,
};

// Basic flattening/lookup logic
// For this MVP, we just use English or allow for future language injection
export function localize(string: string, search = '', replace = ''): string {
    const lang = 'en'; // Hardcoded for now until we hook up hass.language to context

    let translated: any;

    try {
        translated = string.split('.').reduce((o, i) => o[i], languages[lang]);
    } catch (e) {
        translated = string;
    }

    if (translated === undefined) {
        translated = string;
    }

    if (search !== '' && replace !== '') {
        translated = translated.replace(search, replace);
    }
    return translated;
}
