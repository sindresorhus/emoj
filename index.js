'use strict';
const got = require('got');

module.exports = str => got('emoji.getdango.com/api/emoji', {
	json: true,
	query: {
		q: str
	}
}).then(res => res.body.results.map(x => x.text));
