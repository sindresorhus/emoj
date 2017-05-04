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
const emoj = require('./');
const skinTone = require('skin-tone');


// Limit it to 7 results so not to overwhelm the user
// This also reduces the chance of showing unrelated emojis
const fetch = mem(str => emoj(str).then(arr => arr.slice(0, 7)));

const debouncer = debounce(cb => cb(), 200);

const cli = meow(`
	Usage
	  $ emoj [text]

	Example
	  $ emoj 'i love unicorns'
	  🦄  🎠  🐴  🐎  ❤  ✨  🌈

	Options
	  --copy -c  Copy the first emoji to the clipboard
	  --skin-tone -s  Set the skin tone of the emojis

	Run it without arguments to enter the live search
	Use Up/Down keys during live search to change the skin tones
`, {
	boolean: [
		'copy',
		'skinTone'
	],
	alias: {
		c: 'copy',
		s: 'skinTone'
	}
});

let skinNumber = 0;
if(cli.flags.skinTone){
	skinNumber = cli.flags.skinTone;
}

if (cli.input.length > 0) {
	fetch(cli.input[0]).then(val => {
		console.log(val.map( x => skinTone(x, skinNumber)).join('  '));
		clipboardy.writeSync(val[0]);
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

	// Filter out all Ansi sequences except the Up/Down keys which change the skin tone
	if (hasAnsi(key.sequence) && key.name !== 'up' && key.name !== 'down') {
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
	} else if (key.name === 'up' && skinNumber < 5) {
		skinNumber++;
	} else if(key.name === 'down' && skinNumber > 0) {
		skinNumber--;
	}
	else {
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
