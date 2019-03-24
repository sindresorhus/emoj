import test from 'ava';
import m from '.';

test('main', async t => {
	const [unicornEmoji] = await m('unicorn');
	const [drool] = await m('drool');
	t.is(unicornEmoji, '🦄');
	t.is(drool, '🤤');
});
