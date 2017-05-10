#!/usr/bin/env node
'use strict';
const dns = require('dns');
const readline = require('readline');
const meow = require('meow');
const logUpdate = require('log-update');
const chalk = require('chalk');
const debounce = require('lodash.debounce');
const hasAnsi = require('has-ansi');
const mem = require('mem');
const clipboardy = require('clipboardy');
const skinTone = require('skin-tone');
const Conf = require('conf');
const emoj = require('.');

// Limit it to 7 results so not to overwhelm the user
// This also reduces the chance of showing unrelated emojis
const fetch = mem(str => emoj(str).then(arr => arr.slice(0, 7)));

const debouncer = debounce(cb => cb(), 200);

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
`, {
	boolean: [
		'copy'
	],
	alias: {
		c: 'copy',
		s: 'skinTone'
	}
});

if (cli.flags.skinTone !== null) {
	config.set('skinNumber', Math.max(0, Math.min(5, Number(cli.flags.skinTone) || 0)));
}

let skinNumber = config.get('skinNumber');

if (cli.input.length > 0) {
	fetch(cli.input[0]).then(val => {
		val = val.map(x => skinTone(x, skinNumber));

		console.log(val.join('  '));

		if (cli.flags.copy) {
			clipboardy.writeSync(val[0]);
		}
	});

	return;
}

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

const pre = `\n${chalk.bold.cyan('›')} `;
const query = [];
let prevResult = '';

dns.lookup('emoji.getdango.com', err => {
	if (err && err.code === 'ENOTFOUND') {
		logUpdate(`\n${chalk.bold.red('› ')}${chalk.dim('Please check your internet connection')}\n\n`);
		process.exit(1);
	} else {
		logUpdate(`${pre}${chalk.dim('Relevant emojis will appear when you start writing')}\n\n`);
	}
});

process.stdin.on('keypress', (ch, key) => {
	key = key || {};

	// Filter out all ansi sequences except the up/down keys which change the skin tone
	if (hasAnsi(key.sequence) && ((key.name !== 'up' && key.name !== 'down') || query.length <= 1)) {
		return;
	}

	if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
		if (query.length <= 1) {
			logUpdate();
			readline.moveCursor(process.stdout, 0, -1);
		}

		process.exit();
	}

	if (key.name === 'backspace') {
		query.pop();
	} else if (key.name === 'return' || (key.ctrl && key.name === 'u')) {
		query.length = 0;
	} else if (key.name === 'up') {
		if (skinNumber < 5) {
			skinNumber++;
		}
	} else if (key.name === 'down') {
		if (skinNumber > 0) {
			skinNumber--;
		}
	} else {
		query.push(ch);
	}

	const queryStr = query.join('');

	logUpdate(`${pre}${chalk.bold(queryStr)}\n${prevResult}\n`);

	if (query.length <= 1) {
		prevResult = '';
		logUpdate(`${pre}${chalk.bold(queryStr)}\n\n`);
		return;
	}

	debouncer(() => {
		fetch(queryStr).then(emojis => {
			if (query.length <= 1) {
				return;
			}

			prevResult = emojis = emojis.map(x => skinTone(x, skinNumber)).join('  ');
			logUpdate(`${pre}${chalk.bold(query.join(''))}\n${emojis}\n`);
		});
	});
});
