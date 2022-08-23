#!/usr/bin/env node
'use strict';
const meow = require('meow');
const importJsx = require('import-jsx');
const React = require('react');
const {render} = require('ink');
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
	  --limit -l      Maximum number of emojis to display (default: 7)

	Run it without arguments to enter the live search
	Use the up/down keys during live search to change the skin tone
	Use the left/right or 1..9 keys during live search to select the emoji
`, {
	flags: {
		copy: {
			type: 'boolean',
			alias: 'c'
		},
		skinTone: {
			type: 'number',
			alias: 's'
		},
		limit: {
			type: 'number',
			alias: 'l'
		}
	}
});

const config = new Conf({
	projectName: 'emoj',
	defaults: {
		skinNumber: 0
	}
});

if (cli.flags.skinTone !== undefined) {
	config.set('skinNumber', Math.max(0, Math.min(5, cli.flags.skinTone || 0)));
}

const skinNumber = config.get('skinNumber');
const limit = Math.max(1, cli.flags.limit || 7);

const main = async () => {
	let app; // eslint-disable-line prefer-const

	const onSelectEmoji = emoji => {
		clipboardy.writeSync(emoji);
		app.unmount();
	};

	// Uses `React.createElement` instead of JSX to avoid transpiling this file.
	app = render(React.createElement(ui, {skinNumber, limit, onSelectEmoji}));

	await app.waitUntilExit();
};

if (cli.input.length > 0) {
	(async () => {
		const emojis = (await emoj(cli.input[0]))
			.slice(0, limit)
			.map(emoji => skinTone(emoji, skinNumber));

		console.log(emojis.join('  '));

		if (cli.flags.copy) {
			clipboardy.writeSync(emojis[0]);
		}
	})();
} else {
	main();
}
