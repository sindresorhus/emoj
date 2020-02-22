'use strict';
const got = require('got');

module.exports = async input => {
	const {results} = await got('http://emoji.getdango.com/api/emoji', {
		searchParams: {
			q: input
		}
	}).json();

	return results.map(result => result.text);
};
