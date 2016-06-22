#!/usr/bin/env node
'use strict';
const readline = require('readline');
const meow = require('meow');
const logUpdate = require('log-update');
const chalk = require('chalk');
const debounce = require('lodash.debounce');
const hasAnsi = require('has-ansi');
const emoj = require('./');

const cli = meow(`
	Usage
	  $ emoj [text]

	Example
	  $ emoj 'i love unicorns'
	  🦄  🎠  🐴  🐎  ❤  ✨  🌈

	Run it without arguments to enter the live search
`);

if (cli.input.length > 0) {
	emoj(cli.input[0]).then(emojis => {
		// limit it to 7 results to not overwhelm the user
		// and reduce the chance of showing unrelated emojis
		console.log(emojis.slice(0, 7).join('  '));
	});

	return;
}

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

readline.emitKeypressEvents(process.stdin, rl);
process.stdin.setRawMode(true);

const pre = `\n${chalk.cyan('›')} `;
const query = [];
let prevResult = '';

// TODO: so some heavy caching of the query using my `mem` module

logUpdate(`${pre}${chalk.dim('Relevant emojis will appear when you start writing')}\n`);

process.stdin.on('keypress', (ch, key) => {
	if (!key) {
		return;
	}

	if (hasAnsi(key.sequence)) {
		return;
	}

	if (key.name === 'backspace') {
		query.pop();
	} else if (key.name === 'return') {
		query.length = 0;
		readline.moveCursor(process.stdin, 0, -1);
	} else if (key.sequence) {
		query.push(key.sequence);
	}

	const queryStr = query.join('');

	logUpdate(`${pre}${chalk.bold(queryStr)}\n${prevResult}`);

	if (query.length <= 1) {
		prevResult = '';
		logUpdate(`${pre}${chalk.bold(queryStr)}\n`);
		return;
	}

	emoj(queryStr).then(debounce(emojis => {
		if (query.length <= 1) {
			return;
		}

		const emojisStr = prevResult = emojis.slice(0, 7).join('  ');
		logUpdate(`${pre}${chalk.bold(query.join(''))}\n${emojisStr}`);
	}, 300));
});
