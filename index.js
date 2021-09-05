'use strict';
const emojilib = require('emojilib');

// This value was picked experimentally.
// Substring search returns a lot of noise for shorter search words.
const MIN_WORD_LENGTH_FOR_SUBSTRING_SEARCH = 4;

const getEmojilibEmojis = input => {
	const regexSource = input.toLowerCase().split(/\s/g)
		.map(v => v.replace(/\W/g, ''))
		.filter(v => v.length > 0)
		.map(v => v.length < MIN_WORD_LENGTH_FOR_SUBSTRING_SEARCH ? `^${v}$` : v)
		.join('|');

	if (regexSource.length === 0) {
		return [];
	}

	const regex = new RegExp(regexSource);
	const emoji = [];

	for (const [name, data] of Object.entries(emojilib.lib)) {
		let matches = regex.test(name);
		for (const keyword of data.keywords) {
			matches = matches || regex.test(keyword);
		}

		if (matches) {
			emoji.push(data.char);
		}
	}

	return emoji;
};

module.exports = getEmojilibEmojis;
