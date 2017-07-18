#!/usr/bin/env node
'use strict';
const meow = require('meow');
const importJsx = require('import-jsx');
const {h, render} = require('ink');
const clipboardy = require('clipboardy');
const skinTone = require('skin-tone');
const Conf = require('conf');
const emoj = require('.');

const ui = importJsx('./ui');

const cli = meow(`
	Usage
	  $ emoj [text]

	Example
	  $ emoj 'i love unicorns'
	  🦄  🎠  🐴  🐎  ❤  ✨  🌈

	Options
	  --copy -c       Copy the first emoji to the clipboard
	  --skin-tone -s  Set and persist the default emoji skin tone (0 to 5)

	Run it without arguments to enter the live search
	Use the up/down keys during live search to change the skin tone
	Use the left/right or 1..9 keys during live search to select the emoji
`, {
	boolean: [
		'copy'
	],
	alias: {
		c: 'copy',
		s: 'skinTone'
	}
});

const config = new Conf({
	defaults: {
		skinNumber: 0
	}
});

if (cli.flags.skinTone !== undefined) {
	config.set('skinNumber', Math.max(0, Math.min(5, Number(cli.flags.skinTone) || 0)));
}

const skinNumber = config.get('skinNumber');

const main = () => {
	const onSelectEmoji = emoji => {
		clipboardy.writeSync(emoji);
		process.exit();
	};

	let unmount; // eslint-disable-line prefer-const

	const onError = () => {
		unmount();
		process.exit(1);
	};

	const onExit = () => {
		unmount();
		process.exit();
	};

	// Uses `h` instead of JSX to avoid transpiling this file
	unmount = render(h(ui, {skinNumber, onSelectEmoji, onError, onExit}));
};

if (cli.input.length > 0) {
	(async () => {
		const emojis = (await emoj(cli.input[0]))
			.slice(0, 7)
			.map(emoji => skinTone(emoji, skinNumber));

		console.log(emojis.join('  '));

		if (cli.flags.copy) {
			clipboardy.writeSync(emojis[0]);
		}
	})();
} else {
	main();
}
