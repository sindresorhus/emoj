#!/usr/bin/env node
'use strict';

const dns = require('dns');
const readline = require('readline');
const process = require('process');
const meow = require('meow');
const logUpdate = require('log-update');
const chalk = require('chalk');
const debounce = require('lodash.debounce');
const hasAnsi = require('has-ansi');
const mem = require('mem');
const ncp = require('copy-paste');
const emoj = require('./');

// limit it to 7 results so not to overwhelm the user.  this also reduces the
// chance of showing unrelated emojis.

let numEmojis = process.stdout.isTTY ? 7 : 1;
let action = (r => console.log(r));

const fetch = mem(str => emoj(str).then(arr => arr.slice(0, numEmojis).join('  ')));

const debouncer = debounce(cb => cb(), 200);

const cli = meow(`
	Usage
	  $ emoj [text] [-c] [-n number]

  Options
    -n, --number Number of Emojis to return (maximum 10)
		-c, --copy	 Copy emojis to clipboard as well as writing to stdout

	Example
	  $ emoj 'i love unicorns'
	  🦄  🎠  🐴  🐎  ❤  ✨  🌈

	Run it without arguments to enter the live search
`, {
	alias: {
		n: 'number',
		c: 'copy'
	}
});

if ('copy' in cli.flags) {
	numEmojis = 1;
	action = (r => Promise.all([console.log(r), ncp.copy(r)]));
}

if ('number' in cli.flags) {
	numEmojis = cli.flags.number > 10 ? 10 : cli.flags.number;
}

if (cli.input.length > 0) {
	fetch(cli.input[0]).then(action);
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

	if (hasAnsi(key.sequence)) {
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

			prevResult = emojis;
			logUpdate(`${pre}${chalk.bold(query.join(''))}\n${emojis}\n`);
		});
	});
});
