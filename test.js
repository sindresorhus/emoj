import test from 'ava';
import m from '.';

test(async t => {
	const [unicornEmoji] = await m('unicorn');
	t.is(unicornEmoji, '🦄');
});
