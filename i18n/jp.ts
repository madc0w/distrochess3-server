export const jp = {
	emails: {
		autoResign: {
			subject: 'あなたのDistroChessゲームはまもなく自動投了します！',
			greeting: 'こんにちは、{name}さん',
			body: 'あなた（またはあなたの側の他のプレイヤー）が今後{hours}時間以内に手を指さない場合、あなたの側はゲームに敗北します。これは、あなたの側が投了することを意味し、ポイントを失い、悲しいアヒルになります。',
			description:
				'自動投了タイマーが切れる前に、以下をクリックしてゲームに戻ってください。',
			ctaText: '手を指す',
			footer: 'ボードでお会いしましょう！',
			unsubscribeLinkText: 'これらのリマインダーの購読を解除',
		},
	},
};

export type Translations = typeof jp;
