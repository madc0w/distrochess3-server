export const en = {
	emails: {
		autoResign: {
			subject: 'Your DistroChess game will auto-resign soon!',
			greeting: 'Hi {name},',
			body: "If you (or one of your teammates) don't make a move within the next {hours} hours, your side will forfeit the game. This means your side will be resigning, and you will lose points, resulting in sad ducks.",
			description:
				'Click below to jump back into the game before the auto-resign timer expires.',
			ctaText: 'Make your move',
			footer: 'See you on the board!',
			unsubscribeLinkText: 'Unsubscribe from these reminders',
		},
	},
};

export type Translations = typeof en;
