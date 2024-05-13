#!/usr/bin/env node
import meow from 'meow';
import React from 'react';
import {render} from 'ink';
import clipboardy from 'clipboardy';
import skinTone from 'skin-tone';
import Conf from 'conf';
import ui from './ui.js';
import emoj from './index.js';

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
	importMeta: import.meta,
	flags: {
		copy: {
			type: 'boolean',
			shortFlag: 'c',
		},
		skinTone: {
			type: 'number',
			shortFlag: 's',
		},
		limit: {
			type: 'number',
			shortFlag: 'l',
		},
	},
});

const config = new Conf({
	projectName: 'emoj',
	defaults: {
		skinNumber: 0,
	},
});

if (cli.flags.skinTone !== undefined) {
	config.set('skinNumber', Math.max(0, Math.min(5, cli.flags.skinTone ?? 0)));
}

const skinNumber = config.get('skinNumber');
const limit = Math.max(1, cli.flags.limit ?? 7);

// TODO: skin-tone package should export this.
const skinToneNames = [
	'none',
	'white',
	'creamWhite',
	'lightBrown',
	'brown',
	'darkBrown',
] as const;

if (cli.input.length > 0) {
	let emojis = await emoj(cli.input[0]);

	emojis = emojis
		.slice(0, limit)
		.map(emoji => skinTone(emoji, skinToneNames[skinNumber]));

	console.log(emojis.join('  '));

	if (cli.flags.copy) {
		clipboardy.writeSync(emojis[0]);
	}
} else {
	let app: any; // eslint-disable-line prefer-const

	const onSelectEmoji = emoji => {
		clipboardy.writeSync(emoji);
		app.unmount();
	};

	// Uses `React.createElement` instead of JSX to avoid transpiling this file.
	app = render(React.createElement(ui, {skinNumber, limit, onSelectEmoji}));

	await app.waitUntilExit();
}
