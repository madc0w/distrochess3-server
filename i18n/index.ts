import { en } from './en';
import { fr } from './fr';

const dictionaries = {
	en,
	fr,
};

type LocaleKey = keyof typeof dictionaries;

export type { Translations } from './en';

export function getTranslations(locale?: string | null) {
	if (!locale) {
		return en;
	}

	const normalized = locale.trim().toLowerCase();
	if (!normalized) {
		return en;
	}

	const base = normalized.split('-')[0] as LocaleKey;
	return dictionaries[base] ?? en;
}
