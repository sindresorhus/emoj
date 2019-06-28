'use strict';
const got = require('got');
const emojilib = require('emojilib');

const getGetdangoEmojis = async input => {
	const {results} = await got('http://emoji.getdango.com/api/emoji', {
		searchParams: {
			q: input
		}
	}).json();

	return results.map(result => result.text);
};

const getEmojilibEmojis = input => {
	const reSource = input.toLowerCase().split(/\s/g)
		.map(v => v.replace(/\W/g, ''))
		.filter(v => v.length > 0)
		.map(v => (v.length >= 4) ? v : '^' + v + '$')
		.join('|');

	if (reSource.length === 0) {
		return [];
	}

	const re = new RegExp(reSource);
	const emojis = [];

	for (const [name, data] of Object.entries(emojilib.lib)) {
		let matches = re.test(name);
		for (const keyword of data.keywords) {
			matches = matches || re.test(keyword);
		}

		if (matches) {
			emojis.push(data.char);
		}
	}

	return emojis;
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
	} catch (error) {
		if (set.size === 0) {
			throw error;
		}
	}

	return [...set];
};
