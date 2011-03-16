var jsdom = require( 'jsdom' ),
	window = jsdom.jsdom().createWindow()
	fs = require( 'fs' ),
	util = require( 'util' );

/**
 * HTML escaping
 * 
 * @param text String: Text to escape
 * @returns String: Escaped text
 */
function encodeHtmlText( text ) {
	return new String( text )
		.replace( /&/g, '&amp;' )
		.replace( /'/g, '&quot;' )
		.replace( /'/g, '&#039;' )
		.replace( /</g, '&lt;' )
		.replace( />/g, '&gt;' );
}
/**
 * Variable replacement using $1, $2, etc. syntax
 * 
 * @param text String: Text to replace $1, $2, etc. in
 * @param args Array: List of argument values which correspond to $1, $2, etc. in text
 * @returns String: Text with $1, $2 etc. replaced with values from args
 */
function replaceArguments( text, args ) {
	return text.replace( /\$(\d+)/g, function( string, match ) {
		var i = parseInt( match, 10 ) - 1;
		return i in args ? args[i] : '$' + match;
	} );
}

/**
 * Renders var:* and msg:* tags in an HTML string
 * 
 * @param template String: HTML containing var:* and msg:* tags to render
 * @param context Object: Structured information for var:* tags
 * @param messages Object: List of key/value pairs for msg:* tags
 * @param callback Function: Callback to execute when done, taking the rendered HTML as an argument.
 */
exports.render = function( html, context, messages, callback ) {
	jsdom.jQueryify( window, 'jquery.js', function() {
		var $ = window.$;
		/**
		 * Basic JSON query functionality
		 * 
		 * Syntax is identical to JSON "dot" notation with the following additions
		 * 		@	current object; this is the entire query, not a prefix
		 * 		.	start at root, ignoring current scope; this is a prefix
		 */
		function select( query, root, current ) {
			if ( typeof query == 'string' && $.isPlainObject( root ) ) {
				var dot = query.indexOf( '.' );
				if ( typeof current === undefined || dot === 0 ) {
					current = root;
				}
				if ( query.indexOf( '@' ) === 0 ) {
					return current;
				}
				if ( $.isPlainObject( current ) ) {
					parts = query.split( '.' );
					if ( dot === 0 ) {
						parts.shift();
					}
					// FIXME: Lock this down
					return eval( 'current.' + parts.join( '.' ) );
				}
			}
			return 'HELLO';
		}
		/**
		 * Recursive transformation of <var:* /> and <msg:* /> elements
		 * 
		 * Elements can be intermingled with HTML, and will be removed after processing. The
		 * following elements will be processed.
		 * 
		 * 	* Variable scoping
		 * 		<var:go to="[query]">
		 * 			<!-- elements here inherit the scope of [query] -->
		 * 		</var:go>
		 * 
		 * 	* Variable iteration
		 * 		<var:go through="[query]">
		 * 			<!-- elements here are repeated for each array element in [query] -->
		 * 			<!-- elements here inherit the scope of [query] -->
		 * 		</var:go>
		 * 
		 * 	* Variable text (HTML escaped)
		 * 		<var:text from="[query]" />
		 * 
		 * 	* Variable HTML (raw)
		 * 		<var:html from="[query]" />
		 * 
		 * 	* Variable attributes
		 * 		<div class="a">
		 * 			<var:attr set="id" from="[query]" />
		 * 			<!-- attributes here will be set to the parent element -->
		 * 			<var:attr set="class" from="[query]" />
		 * 			<!-- duplicate attributes are appended with a space delimiter -->
		 * 		</div>
		 * 
		 * 	* Message text
		 * 		<msg:text from="[key]" />
		 * 
		 * 	* Message HTML
		 * 		<msg:html from="[key]" />
		 * 
		 * 	* Message arguments (corresponding to $1, $2, etc.)
		 * 		<msg:text from="key">
		 * 			<msg:arg>text</msg:arg>
		 * 			<msg:arg><var:text from="[query]" /></msg:arg>
		 * 		</msg:text>
		 */
		function process( $html, root, current ) {
			// Input normalization
			if ( typeof root === 'undefined' || root === null ) {
				root = {};
			}
			if ( current === null ) {
				current = {};
			}
			if ( typeof current === 'undefined' ) {
				current = root;
			}
			// Variable scoping
			var $go;
			while ( ( $go = $html.find( 'var\\:go[to]:first' ) ).length ) {
				var query = $go.attr( 'to' );
				var val = select( query, root, current );
				$go.after( process( $go, root, val ).contents() ).remove();
			}
			// Variable iteration
			while ( ( $go = $html.find( 'var\\:go[through]:first' ) ).length ) {
				var query = $go.attr( 'through' );
				var vals = select( query, root, current );
				if ( $.isArray( vals ) ) {
					for ( var i in vals ) {
						$go.after( process( $go.clone(), root, vals[i] ).contents() );
					}
				}
				$go.remove();
			}
			// Variable text/html
			$html.find(
				'var\\:text:not(var\\:go var\\:text),var\\:html:not(var\\:go var\\:html)'
			).each( function() {
				var val = select( $(this).attr( 'from' ), root, current );
				if ( $(this).is( 'var\\:text' ) ) {
					val = encodeHtmlText( val );
				}
				$(this).after( val ).remove();
			} );
			// Variable attributes
			$html.find( 'var\\:attr:not(var\\:go var\\:attr)' ).each( function() {
				var attr = $(this).attr( 'set' );
				var val = select( $(this).attr( 'from' ), root, current );
				$(this).parent().attr( attr, function( index, attr ) {
					if ( attr ) {
						return [attr, val].join( ' ' );
					}
					return val;
				} );
				$(this).remove();
			} );
			// Message text/html
			$html.find( 'msg\\:text,msg\\:html' ).each( function() {
				var key = $(this).attr( 'from' );
				var msg = key in messages ? messages[key] : '[' + key + ']';
				var args = [];
				$(this).find( 'msg\\:arg' ).each( function() {
					args.push( $(this).text() );
				} );
				var text = replaceArguments( msg, args );
				if ( $(this).is( 'msg\\:text' ) ) {
					text = encodeHtmlText( text );
				}
				$(this).after( text ).remove();
			} );
			return $html;
		}
		callback( process( $( '<html>' + html + '</html>' ), context ).html() );
	} );
};

/**
 * Renders var:* and msg:* tags in an HTML file
 * 
 * @param template String: Path to HTML file containing var:* and msg:* tags to render
 * @param context Object: Structured information for var:* tags
 * @param messages Object: List of key/value pairs for msg:* tags
 * @param callback Function: Callback to execute when done, taking the rendered HTML as an argument.
 * @throws Error: If file can not be read
 */
exports.renderFile = function( file, context, messages, callback ) {
	fs.readFile( file, function( error, data ) {
		if ( error ) {
			throw error;
		}
		exports.render( data, context, messages, callback );
	} );
}
