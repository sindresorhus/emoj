import test from 'ava';
import emoj from '.';

test('main', async t => {
	const [unicornEmoji] = await emoj('unicorn');
	t.is(unicornEmoji, '🦄');
});
