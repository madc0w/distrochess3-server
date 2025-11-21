import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getTranslations } from '../i18n';

interface AutoResignUser {
	email: string;
	name?: string | null;
	preferredLocale?: string | null;
}

interface AutoResignNotificationOptions {
	user: AutoResignUser;
	gameId: string;
	autoResignDelayHours: number;
}

const templatePath = resolve(
	process.cwd(),
	'assets/email-templates/auto-resign-notification.html'
);

const DEFAULT_BASE_URL = 'https://www.distrochess.com';

let cachedTemplate: string | null = null;

async function loadTemplate(): Promise<string> {
	if (cachedTemplate) {
		return cachedTemplate;
	}

	const template = await readFile(templatePath, 'utf8');
	cachedTemplate = template;
	return template;
}

export async function sendAutoResignNotification(
	options: AutoResignNotificationOptions
): Promise<void> {
	const apiKey = process.env.MAILJET_API_KEY;
	const secretKey = process.env.MAILJET_SECRET_KEY;

	if (!apiKey || !secretKey) {
		throw new Error(
			'Mailjet API credentials not configured. Please set MAILJET_API_KEY and MAILJET_SECRET_KEY.'
		);
	}

	const { user, gameId, autoResignDelayHours } = options;
	const locale = user.preferredLocale ?? undefined;
	const t = getTranslations(locale);
	const copy = t.emails.autoResign;
	const playerName = (user.name || '').trim();

	const greeting = copy.greeting.replace('{name}', playerName);
	const hoursText = String(autoResignDelayHours);
	const bodyCopy = copy.body.replace('{hours}', hoursText);
	const description = copy.description.replace('{hours}', hoursText);
	const ctaText = copy.ctaText;
	const footer = copy.footer;
	const subject = copy.subject;

	const baseUrl = process.env.APP_BASE_URL || DEFAULT_BASE_URL;
	const ctaUrl = `${baseUrl.replace(/\/$/, '')}/?gameId=${encodeURIComponent(
		gameId
	)}`;

	const template = await loadTemplate();
	const htmlBody = applyReplacements(template, {
		'{{subjectHeading}}': subject,
		'{{greeting}}': greeting,
		'{{bodyCopy}}': bodyCopy,
		'{{descriptionMessage}}': description,
		'{{ctaText}}': ctaText,
		'{{ctaUrl}}': ctaUrl,
		'{{footerMessage}}': footer,
	});

	const textBody = [
		greeting,
		'',
		bodyCopy,
		description,
		'',
		`${ctaText}: ${ctaUrl}`,
	]
		.filter(Boolean)
		.join('\n');

	const payload = {
		Messages: [
			{
				From: {
					Email: 'support@distrochess.com',
					Name: 'DistroChess',
				},
				To: [
					{
						Email: user.email,
						Name: playerName,
					},
				],
				Subject: subject,
				TextPart: textBody,
				HTMLPart: htmlBody,
			},
		],
	};

	const response = await fetch('https://api.mailjet.com/v3.1/send', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization:
				'Basic ' + Buffer.from(`${apiKey}:${secretKey}`).toString('base64'),
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`Mailjet API error (${response.status}) for auto-resign notice: ${errorText}`
		);
	}
}

function applyReplacements(
	template: string,
	replacements: Record<string, string>
): string {
	return Object.entries(replacements).reduce((acc, [token, value]) => {
		const parts = acc.split(token);
		return parts.join(value);
	}, template);
}
