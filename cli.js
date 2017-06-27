#!/usr/bin/env node
'use strict';
const readline = require('readline');
const meow = require('meow');
const importJsx = require('import-jsx');
const {h, mount} = require('ink');
const clipboardy = require('clipboardy');
const skinTone = require('skin-tone');
const Conf = require('conf');
const emoj = require('.');

const ui = importJsx('./ui');

// Limit it to 7 results so not to overwhelm the user
// This also reduces the chance of showing unrelated emojis
const fetch = str => emoj(str).then(arr => arr.slice(0, 7));

const config = new Conf({
	defaults: {
		skinNumber: 0
	}
});

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

if (cli.flags.skinTone !== undefined) {
	config.set('skinNumber', Math.max(0, Math.min(5, Number(cli.flags.skinTone) || 0)));
}

const skinNumber = config.get('skinNumber');

const main = () => {
	readline.emitKeypressEvents(process.stdin);
	process.stdin.setRawMode(true);

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

	// Use `h` instead of JSX to avoid transpiling this file
	unmount = mount(h(ui, {skinNumber, onSelectEmoji, onError, onExit}));
};

if (cli.input.length > 0) {
	fetch(cli.input[0]).then(emojis => {
		emojis = emojis.map(emoji => skinTone(emoji, skinNumber));

		console.log(emojis.join('  '));

		if (cli.flags.copy) {
			clipboardy.writeSync(emojis[0]);
		}
	});
} else {
	main();
}
