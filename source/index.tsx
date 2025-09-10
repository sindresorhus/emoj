import {createRequire} from 'node:module';

/// import keywordSet from 'emojilib';
// import data from 'unicode-emoji-json';

const require = createRequire(import.meta.url);

const keywordSet = require('emojilib') as Record<string, string[]>;
const unicodeEmojiJson = require('unicode-emoji-json') as Record<string, {[key: string]: any; name: string}>;

// This value was picked experimentally.
// Substring search returns a lot of noise for shorter search words.
const minWordLengthForSubstringSearch = 4;

// We keep this async in case we need to to become async in the future
export default async function getEmojilibEmojis(searchQuery: string): Promise<string[]> {
	const regexSource = searchQuery.toLowerCase().split(/\s/g)
		.map(v => v.replaceAll(/\W/g, ''))
		.filter(v => v.length > 0)
		.map(v => v.length < minWordLengthForSubstringSearch ? `^${v}$` : v)
		.join('|');

	if (regexSource.length === 0) {
		return [];
	}

	const regex = new RegExp(regexSource);
	const emojis: string[] = [];

	for (const emojiCharacter of Object.keys(unicodeEmojiJson)) {
		const emojiData = unicodeEmojiJson[emojiCharacter];
		if (!emojiData) {
			continue;
		}

		const emojiKeywords = keywordSet[emojiCharacter] ?? [];

		const matches = regex.test(emojiData.name) || emojiKeywords.some((keyword: string) => regex.test(keyword));
		if (matches) {
			emojis.push(emojiCharacter);
		}
	}

	return emojis;
}
