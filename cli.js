#!/usr/bin/env node
'use strict';
const readline = require('readline');
const meow = require('meow');
const logUpdate = require('log-update');
const chalk = require('chalk');
const debounce = require('lodash.debounce');
const hasAnsi = require('has-ansi');
const mem = require('mem');
const emoj = require('./');

// limit it to 7 results so not to overwhelm the user
// this also reduces the chance of showing unrelated emojis
const fetch = mem(str => emoj(str).then(arr => arr.slice(0, 7).join('  ')));

const cli = meow(`
	Usage
	  $ emoj [text]

	Example
	  $ emoj 'i love unicorns'
	  🦄  🎠  🐴  🐎  ❤  ✨  🌈

	Run it without arguments to enter the live search
`);

if (cli.input.length > 0) {
	fetch(cli.input[0]).then(console.log);
	return;
}

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

const pre = `\n${chalk.cyan('›')} `;
const query = [];
let prevResult = '';

logUpdate(`${pre}${chalk.dim('Relevant emojis appear when you start writing')}\n`);

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

	logUpdate(`${pre}${chalk.bold(queryStr)}\n${prevResult}`);

	if (query.length <= 1) {
		prevResult = '';
		logUpdate(`${pre}${chalk.bold(queryStr)}\n`);
		return;
	}

	fetch(queryStr).then(debounce(emojis => {
		if (query.length <= 1) {
			return;
		}

		prevResult = emojis;
		logUpdate(`${pre}${chalk.bold(query.join(''))}\n${emojis}`);
	}, 300));
});
