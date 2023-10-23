import test from 'ava';
import emoj from './source/index.js';

test('main', async t => {
	const [unicornEmoji] = await emoj('unicorn');
	t.is(unicornEmoji, '🦄');
});

test('local database emojis', async t => {
	const result1 = await emoj('crossed');
	const result2 = await emoj('drool');
	t.true(result1.includes('🤞'));
	t.true(result2.includes('🤤'));
});
