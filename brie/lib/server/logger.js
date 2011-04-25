/* Requirements */

var util = require( 'util' ),
	grout = require( '../shared/grout' );

/* Members */

/**
 * Logging verbosity
 *   0 = failures only
 *   1 = failures, warnings and successes (default)
 *   2 = failures, warnings, successes and traces
 */
var verbosity = 1;

/* Functions */

/**
 * Encodes color information into text for console output.
 * 
 * Non-string msg parameters with be rendered using util.inspect, so custom rendering must be
 * applied prior to using this function.
 * 
 * @param {Mixed} msg Message to colorize
 * @param {String} color Name of color to apply; "cyan", "yellow", "green", "grey" or "red"
 * @type {String} Color-encoded message
 */
function colorize( msg, color ) {
	if ( grout.typeOf( msg ) !== 'string' ) {
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

/**
 * Sets the global level of verbosity for logging.
 * 
 * @param {Number} level Verobsity level:
 *   0 = failures only
 *   1 = failures, warnings and successes (default)
 *   2 = failures, warnings, successes and traces
 */
function setVerbosity( level ) {
	verbosity = level;
};

/**
 * Gets the global level of verbosity for logging.
 * 
 * @type {Number} Verbosity level
 */
function getVerbosity() {
	return verbosity;
};

/**
 * Creates a Logger object.
 * 
 * @param {String} context Context of logger, a string that will be prepended to each message 
 * @type {Logger} New Logger object
 */
function create( context ) {
	return new Logger( context );
}

/* Classes */

/**
 * Color-coded, context sensitive logging tool.
 * 
 * @param {String} context Context of logger, a string that will be prepended to each message 
 */
function Logger( context ) {
	this.context = null;
	this.prefix = null;
	if ( grout.typeOf( context ) === 'string' ) {
		this.setContext( context );
	}
}

/**
 * Sets the context of the logger.
 * 
 * @param {String} context Context of logger, a string that will be prepended to each message 
 */
Logger.prototype.setContext = function( context ) {
	this.context = context;
	this.prefix = colorize( this.context + ': ', 'cyan' );
}

/**
 * Gets the context of the logger.
 * 
 * @type {String} Context of logger
 */
Logger.prototype.getContext = function( context ) {
	return this.context;
}

/**
 * Outputs a failure message.
 * 
 * Failure messages are always visible, no matter what the verbosity level is set to, and are
 * rendered in red text.
 * 
 * @param {Mixed} msg Message to log
 */
Logger.prototype.fail = function( msg ) {
	console.log( this.prefix + colorize( msg, 'red' ) );
};

/**
 * Outputs a warning message.
 * 
 * Warning messages are normally visible, but may be suppressed if the verbosity level is set to 0,
 * and are rendered in yellow text.
 * 
 * @param {Mixed} msg Message to log
 */
Logger.prototype.warn = function( msg ) {
	if ( verbosity >= 1 ) {
		console.log( this.prefix + colorize( msg, 'yellow' ) );
	}
};

/**
 * Outputs a success message.
 * 
 * Success messages are normally visible, but may be suppressed if the verbosity level is set to 0,
 * and are rendered in green text.
 * 
 * @param {Mixed} msg Message to log
 */
Logger.prototype.succeed = function( msg ) {
	if ( verbosity >= 1 ) {
		console.log( this.prefix + colorize( msg, 'green' ) );
	}
};

/**
 * Outputs a trace message.
 * 
 * Trace messages are normally not visible, but may be displayed if the verbosity level is at least
 * 2, and are rendered in grey text.
 * 
 * @param {Mixed} msg Message to log
 */
Logger.prototype.trace = function( msg ) {
	if ( verbosity >= 2 ) {
		console.log( this.prefix + colorize( msg, 'grey' ) );
	}
};

/* Exports */

exports.getVerbosity = getVerbosity;
exports.setVerbosity = setVerbosity;
exports.Logger = Logger;
exports.create = create;
