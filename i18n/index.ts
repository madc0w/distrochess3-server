import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { jp } from './jp';

const dictionaries = {
	en,
	fr,
	de,
	es,
	jp,
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
