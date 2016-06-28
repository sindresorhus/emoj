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
const npc = require('copy-paste');
const emoj = require('./');

// limit it to 7 results so not to overwhelm the user
// this also reduces the chance of showing unrelated emojis
const fetch = mem(str => emoj(str).then(arr => arr.slice(0, 7).join('  ')));

const debouncer = debounce(cb => cb(), 200);

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

const pre = `\n${chalk.bold.cyan('›')} `;
const query = [];
let prevResult = '';

dns.lookup('emoji.getdango.com', err => {
	if (err && err.code === 'ENOTFOUND') {
		logUpdate(`\n${chalk.bold.red('› ')}${chalk.dim('Please check your internet connection')}\n\n`);
		process.exit(1);
	} else {
		let introText = '';
		introText += `${pre}Relevant emojis will appear when you start writing.`;
		introText += `${pre}You can copy an emoji by holding down the CTRL key and pressing a number from 1 - 7.`;
		introText += `${pre}You can also copy all emoji's with CTRL + 0.`;

		logUpdate(`${chalk.dim(introText)}\n\n`);
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
	} else if (key.ctrl && key.name === 'u') {
		query.length = 0;
	} else if (key.ctrl && key.name === '0') {
		npc.copy(prevResult);
	} else if (key.ctrl && key.name === '1') {
		npc.copy(prevResult[0]);
	} else if (key.ctrl && key.name === '2') {
		npc.copy(prevResult[1]);
	} else if (key.ctrl && key.name === '3') {
		npc.copy(prevResult[2]);
	} else if (key.ctrl && key.name === '4') {
		npc.copy(prevResult[3]);
	} else if (key.ctrl && key.name === '5') {
		npc.copy(prevResult[4]);
	} else if (key.ctrl && key.name === '6') {
		npc.copy(prevResult[5]);
	} else if (key.ctrl && key.name === '7') {
		npc.copy(prevResult[6]);
	} else if (key.name === 'return') {
		npc.copy(prevResult);
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
