'use strict';
const got = require('got');

module.exports = async input => {
	const response = await got('emoji.getdango.com/api/emoji', {
		json: true,
		query: {
			q: input
		}
	});

	return response.body.results.map(x => x.text);
};
