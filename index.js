'use strict';
const got = require('got');
const emojilib = require('emojilib');

const searchEmojilib = input => {
	const results = [];
	for (const key in emojilib.lib) {
		if (key.includes(input) || emojilib.lib[key].keywords.includes(input)) {
			results.push(emojilib.lib[key].char);
		}
	}

	return results;
};

module.exports = async input => {
	if (input.split(' ').length === 1) {
		const results = searchEmojilib(input);
		if (results.length > 0) {
			return results;
		}
	}

	const response = await got('emoji.getdango.com/api/emoji', {
		json: true,
		query: {
			q: input
		}
	});

	return response.body.results.map(x => x.text);
};
