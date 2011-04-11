/**
 * Message system for i18n/L10n.
 * 
 * This is a hybrid node/browser module.
 * 
 * @see Readme.md
 * @author Trevor Parscal <trevorparscal@gmail.com>
 * @license Apache v2
 */

( function( exports, global ) {

exports.Language = function( code ) {
	
	/* Private Members */
	
	var that = this;
	var messages = {};
	
	/* Private Methods */
	
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
	
	/* Methods */
	
	this.setMessages = function( msgs ) {
		if ( typeof msgs === 'object' && msgs !== null ) {
			for ( key in msgs ) {
				messages[key] = msgs[key];
			}
		}
	};
	
	this.getMessage = function( key, args ) {
		if ( key in messages ) {
			if ( typeof args !== 'undefined' ) {
				return replaceArguments( messages[key], args );
			}
			return messages[key];
		}
		return '<' + key + '>';
	};
	
	this.createMessageGetter = function( options ) {
		if ( typeof options.prefix === 'string' ) {
			return function( key, args ) {
				return that.getMessage( prefix + key, args );
			};
		} else {
			return function( key, args ) {
				return that.getMessage( key, args );
			};
		}
	};
}

exports.createLanguage = function( code ) {
	return new exports.Language( code );
};

} )( typeof exports === 'undefined' ? window : exports );
