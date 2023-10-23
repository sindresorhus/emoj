import {createRequire} from 'node:module'; // eslint-disable-line import/order

/// import keywordSet from 'emojilib';
// import data from 'unicode-emoji-json';

const require = createRequire(import.meta.url);

const keywordSet = require('emojilib');
const unicodeEmojiJson = require('unicode-emoji-json');

// This value was picked experimentally.
// Substring search returns a lot of noise for shorter search words.
const MIN_WORD_LENGTH_FOR_SUBSTRING_SEARCH = 4;

// We keep this async in case we need to to become async in the future
export default async function getEmojilibEmojis(searchQuery: string): Promise<string[]> {
	const regexSource = searchQuery.toLowerCase().split(/\s/g)
		.map(v => v.replaceAll(/\W/g, ''))
		.filter(v => v.length > 0)
		.map(v => v.length < MIN_WORD_LENGTH_FOR_SUBSTRING_SEARCH ? `^${v}$` : v)
		.join('|');

	if (regexSource.length === 0) {
		return [];
	}

	const regex = new RegExp(regexSource);
	const emojis: string[] = [];

	for (const emojiCharacter of Object.keys(unicodeEmojiJson)) {
		const emojiData = unicodeEmojiJson[emojiCharacter];
		const emojiKeywords = keywordSet[emojiCharacter] ?? [];

		const matches = regex.test(emojiData.name) || emojiKeywords.some(keyword => regex.test(keyword));
		if (matches) {
			emojis.push(emojiCharacter);
		}
	}

	return emojis;
}
