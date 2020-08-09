'use strict';
const got = require('got');
const emojilib = require('emojilib');

const getGetdangoEmojis = async input => {
	// Intentionally using `http` as the `https` endpoint has some stability problems.
	const {results} = await got('http://emoji.getdango.com/api/emoji', {
		searchParams: {
			q: input
		}
	}).json();

	return results.map(result => result.text);
};

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

module.exports = async input => {
	const set = new Set();

	for (const emoji of getEmojilibEmojis(input)) {
		set.add(emoji);
	}

	try {
		for (const emoji of await getGetdangoEmojis(input)) {
			set.add(emoji);
		}
	} catch {}

	return [...set];
};
