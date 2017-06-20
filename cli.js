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

/**
 * isArrowKey - Return, whether given key is an arrow key.
 *
 * @param {object} key Key object to check.
 * @return {boolean} True, if key object is an arrow key, false
 *                   otherwise.
 */
function isArrowKey(key) {
	return key.name === 'up' || key.name === 'down' || key.name === 'left' || key.name === 'right';
}

/**
 * stringifyEmojis - Pad list of emojis into a string.
 *
 * @param {Array} emojis Array of emojis.
 * @return {string} Stringified and padded emoji-list.
 */
function stringifyEmojis(emojis) {
	return emojis.join('  ');
}

/**
 * clampIndex - Return index between min and max, one-indexed.
 *
 * @param {string} index Index to clamp.
 * @param {number} min   Minimum value to clamp.
 * @param {number} max   Maximum value to clamp.
 * @return {number} Index between min and max.
 */
function clampIndex(index, min, max) {
	const copyIndex = parseInt(index, 10);

	if (isNaN(copyIndex) || copyIndex < min + 1) {
		// return minimum if index is no number or below minimum
		return min;
	} else if (copyIndex > max) {
		// return maximum if index is above maximum
		return max;
	}

	// return index one-indexed
	return copyIndex - 1;
}

// Limit it to 7 results so not to overwhelm the user
// This also reduces the chance of showing unrelated emojis
const emojiLimit = 7;
const fetch = mem(str => emoj(str).then(arr => arr.slice(0, emojiLimit)));

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
	string: [
		'copy'
	],
	alias: {
		c: 'copy'
	}
});

const pre = `\n${chalk.bold.cyan('›')} `;
const shouldCopy = Object.prototype.hasOwnProperty.call(cli.flags, 'copy');

// move `--copy` argument to input, if it's no index (NaN)
if (shouldCopy && cli.input.length === 0 && isNaN(cli.flags.copy)) {
	cli.input = [cli.flags.copy];
	cli.flags = {};
}

if (cli.input.length > 0) {
	fetch(cli.input[0]).then(choices => {
		// if `--copy` is set, use the (optional) index to copy into
		// clipboard
		const index = shouldCopy ? clampIndex(cli.flags.copy, 0, choices.length - 1) : 0;

		const selection = choices[index];

		if (shouldCopy) {
			// copy selection to clipboard
			clipboardy.writeSync(selection);
		}

		// highlight selection
		const elements = choices.map((item, mapIndex) => {
			// highlight selection for non-color emoji terminals
			if (mapIndex === index) {
				return chalk.cyan(item);
			}

			return item;
		});

		// return highlighted selection
		const suffix = shouldCopy ? ` : ${selection}` : '';
		logUpdate(`${pre} ${elements.join('  ')}${suffix}\n`);
	});

	return;
}

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

const query = [];
let emojiIndex = 0;
let prevResult = [];

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

	if (hasAnsi(key.sequence) && (!isArrowKey(key) || query.length <= 1)) {
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
	} else if (key.name === 'return') {
		// only if there is a result return it
		if (query.length > 0 && prevResult.length > 0) {
			// get selection
			const selection = prevResult[emojiIndex];

			// print and copy selection to clipboard
			logUpdate(`${pre}${stringifyEmojis(prevResult)} : ${selection}\n`);
			clipboardy.writeSync(selection);

			// exit program
			process.exit();
		}
	} else if (key.ctrl && key.name === 'u') {
		query.length = 0;
	} else if (key.name === 'left') {
		// decrease selected index
		emojiIndex = Math.max(0, emojiIndex - 1);
	} else if (key.name === 'right') {
		// increase selected index
		emojiIndex = Math.min(emojiIndex + 1, emojiLimit - 1);
	} else {
		query.push(ch);
	}

	const queryStr = query.join('');
	let indicator = prevResult.length <= 0 ? '' : `${'   '.repeat(emojiIndex)}^`;

	// display emojis and indicator
	logUpdate(`${pre}${chalk.bold(queryStr)}\n${stringifyEmojis(prevResult)}\n${indicator}`);

	if (query.length <= 1) {
		prevResult = [];
		logUpdate(`${pre}${chalk.bold(queryStr)}\n\n`);
		return;
	}

	debouncer(() => {
		fetch(queryStr).then(emojis => {
			if (query.length <= 1) {
				return;
			}

			// check and update upper bounds of emoji index
			prevResult = emojis;
			indicator = prevResult.length <= 0 ? '' : `${'   '.repeat(emojiIndex)}^`;

			// update emojis and indicator for new emoji
			logUpdate(`${pre}${chalk.bold(queryStr)}\n${stringifyEmojis(prevResult)}\n${indicator}`);
		});
	});
});
