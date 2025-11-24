export const es = {
	emails: {
		autoResign: {
			subject:
				'¡Tu partida de DistroChess se abandonará automáticamente pronto!',
			greeting: 'Hola {name},',
			body: 'Si tú (u otro jugador de tu lado) no hace un movimiento dentro de las próximas {hours} horas, tu lado perderá la partida. Esto significa que tu lado se rendirá y perderás puntos, resultando en patos tristes.',
			description:
				'Haz clic abajo para volver a la partida antes de que expire el temporizador de abandono automático.',
			ctaText: 'Haz tu movimiento',
			footer: '¡Nos vemos en el tablero!',
			unsubscribeLinkText: 'Cancelar suscripción a estos recordatorios',
		},
	},
};

export type Translations = typeof es;
