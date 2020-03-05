import test from 'ava';
import emoj from '.';

test('main', async t => {
	const [unicornEmoji] = await emoj('unicorn');
	t.is(unicornEmoji, '🦄');
});

test('local db emojis', async t => {
	t.true((await emoj('crossed')).includes('🤞'));
	t.true((await emoj('drool')).includes('🤤'));
});
