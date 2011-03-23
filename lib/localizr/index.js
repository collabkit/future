/* Variables */

/**
 * List of language objects, each containing a list of messages
 * 
 * {
 *     'en': {
 *         'hello': 'Hello'
 *     },
 *     'ja': {
 *         'hello': 'こんにちは'
 *     }
 * }
 */
var messages = {};

/* Functions */

/**
 * Variable replacement using $1, $2, etc. syntax.
 * 
 * @param text String: Text to replace $1, $2, etc. in
 * @param args Array: List of argument values which correspond to $1, $2, etc. in text
 * @returns String: Text with $1, $2 etc. replaced with values from args
 */
function replaceArguments( text, args ) {
	return String( text ).replace( /\$(\d+)/g, function( string, match ) {
		var i = parseInt( match, 10 ) - 1;
		return i in args ? args[i] : '$' + match;
	} );
}

function set( lang, key, value ) {
	if ( !( lang in messages ) ) {
		messages[lang] = {};
	}
	if ( typeof key === 'string' && typeof value === 'string' ) {
		messages[lang][key] = value;
	} else if ( typeof key === 'object' ) {
		for ( k in key ) {
			messages[lang][k] = key[k];
		}
	}
};

function get( lang, key, args ) {
	if ( lang in messages && key in messages[lang] ) {
		if ( typeof args !== 'undefined' ) {
			return replaceArguments( messages[lang][key], args );
		}
		return messages[lang][key];
	}
	return '<' + lang + ':' + key + '>';
};

/* Classes */

function Language( lang ) {
	this.lang = lang;
	this.set = function( key, value ) {
		return set( this.lang, key, value );
	};
	this.get = function( key, args ) {
		return get( this.lang, key, args );
	};
}

/* Exports */

exports.replaceArguments = replaceArguments;
exports.get = get;
exports.set = set;
exports.Language = Language;
exports.create = function( lang ) {
	return new Language( lang );
};
