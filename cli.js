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

// Limit it to 7 results so not to overwhelm the user
// This also reduces the chance of showing unrelated emojis
const fetch = mem(str => emoj(str).then(arr => arr.slice(0, 7)));

const debouncer = debounce(cb => cb(), 200);

const cli = meow(`
	Usage
	  $ emoj [OPTIONS] [text]

	Example
	  $ emoj 'i love unicorns'
	  🦄  🎠  🐴  🐎  ❤  ✨  🌈

	Options
	  --copy -c [choice]  Copy the emoji on index <choice> to the clipboard
	                      <choice> defaults to 1.

	Run it without arguments to enter the live search
`, {
	boolean: [
		'copy'
	],
	alias: {
		c: 'copy'
	}
});

if (cli.input.length > 0) {
	fetch(cli.input[0]).then(val => {
		console.log(val.join('  '));
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

			prevResult = emojis = emojis.join('  ');
			logUpdate(`${pre}${chalk.bold(query.join(''))}\n${emojis}\n`);
		});
	});
});
