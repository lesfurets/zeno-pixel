/*
 * Defines webkit and gecko engines
 */

var pkg = require('phantomjs');
var phantomjs = {
	name: 'phantomjs',
	engine: 'webkit',
	// path: pkg.path,
	path: '/usr/local/bin/phantomjs',
	ssl: '--ssl-protocol=tlsv1',
	version: '2.0'
};

pkg = require('slimerjs');
var slimerjs = {
	name: 'slimerjs',
	engine: 'gecko',
	path: pkg.path,
	ssl: '--ssl-protocol=TLSv1',
	version: pkg.version
};

module.exports.get = function (name) {
	var engine;

	if (typeof name === 'string') {
		if (name === 'slimerjs') {
			engine = slimerjs;
		} else if (name === 'phantomjs') {
			engine = phantomjs;
		} else {
			throw 'Bad argument: engine "' + name + '"';
		}
	// no argument: fallback default
	} else if (typeof name === 'undefined') {
		engine = phantomjs;
	} else {
		throw 'Bad argument: engine "' + name + '"';
	}

	return engine;
}