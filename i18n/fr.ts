import type { Translations } from './en';

export const fr: Translations = {
	emails: {
		autoResign: {
			subject: 'Votre partie DistroChess va bientôt être abandonnée !',
			greeting: 'Bonjour {name},',
			body: 'Si vous (ou un autre joueur de votre équipe) ne jouez pas dans les {hours} prochaines heures, votre camp perdra la partie. Cela signifie que votre camp abandonnera et vous perdrez des points.',
			description:
				'Cliquez ci-dessous pour rouvrir votre partie avant la défaite automatique.',
			ctaText: 'Jouez votre coup',
			footer: "À bientôt sur l'échiquier !",
			unsubscribeLinkText: 'Se désabonner de ces rappels',
		},
	},
};
