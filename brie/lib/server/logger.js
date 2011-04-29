/* Requirements */
var util = require( 'util' );

/* Private Members */

/**
 * Logging verbosity
 *   0: failures only
 *   1: failures, warnings and successes (default)
 *   2: failures, warnings, successes and traces
 */
var verbosity = 1;

/* Private Functions */

function colorize( msg, color ) {
	if ( typeof msg !== 'string' ) {
		msg = util.inspect( msg );
	}
	var colors = {
		'cyan': [96, 39],
		'yellow': [33, 39],
		'green': [32, 39],
		'grey': [90, 39],
		'red': [31, 39]
	};
	return '\033[' + colors[color][0] + 'm' + msg + '\033[' + colors[color][1] + 'm';
};

/* Functions */

exports.setVerbosity = function( level ) {
	verbosity = level;
};

exports.getVerbosity = function() {
	return verbosity;
};

exports.create = function( prefix ) {
	return new exports.Logger( prefix );
};

/* Classes */

exports.Logger = function( prefix, level ) {
	this.prefix = prefix;
}

exports.Logger.prototype.fail = function( msg ) {
	console.log( colorize( this.prefix + ': ', 'cyan' ) + colorize( msg, 'red' ) );
};

exports.Logger.prototype.warn = function( msg ) {
	if ( verbosity >= 1 ) {
		console.log( colorize( this.prefix + ': ', 'cyan' ) + colorize( msg, 'yellow' ) );
	}
};

exports.Logger.prototype.succeed = function( msg ) {
	if ( verbosity >= 1 ) {
		console.log( colorize( this.prefix + ': ', 'cyan' ) + colorize( msg, 'green' ) );
	}
};

exports.Logger.prototype.trace = function( msg ) {
	if ( verbosity >= 2 ) {
		console.log( colorize( this.prefix + ': ', 'cyan' ) + colorize( msg, 'grey' ) );
	}
};
