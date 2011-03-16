var jsdom = require( 'jsdom' ),
	window = jsdom.jsdom().createWindow()
	fs = require( 'fs' ),
	util = require( 'util' );

function encodeHtmlText( text ) {
	return new String( text )
		.replace( /&/g, '&amp;' )
		.replace( /'/g, '&quot;' )
		.replace( /'/g, '&#039;' )
		.replace( /</g, '&lt;' )
		.replace( />/g, '&gt;' );
}

exports.render = function( template, context, callback ) {
	fs.readFile( template, function( error, data ) {
		if ( error ) {
			throw error;
		}
		jsdom.jQueryify( window, 'jquery.js', function() {
			var $ = window.$;
			/**
			 * Basic JSON query functionality
			 * 
			 * Syntax is identical to JSON "dot" notation with the following additions
			 * 		@	current object; this is the entire query, not a prefix
			 * 		.	start at root, ignoring current object; this is a prefix
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
			 * Recursive transformation of <var:* /> elements
			 * 
			 * Elements can be intermingled with HTML, and will be removed after processing. The
			 * following elements will be processed.
			 * 
			 * 	* Scoping
			 * 		<var:go to="[query]">
			 * 			<!-- elements here inherit the scope of [query] -->
			 * 		</var:go>
			 * 
			 * 	* Iteration
			 * 		<var:go through="[query]">
			 * 			<!-- elements here are repeated for each array element in [query] -->
			 * 			<!-- elements here inherit the scope of [query] -->
			 * 		</var:go>
			 * 
			 * 	* Output: escaped HTML text
			 * 		<var:text from="[query]" />
			 * 
			 * 	* Output: unescaped HTML code
			 * 		<var:html from="[query]" />
			 * 
			 * 	* Output: HTML attribute
			 * 		<div class="a">
			 * 			<var:attr set="id" from="[query]" />
			 * 			<!-- attributes here will be set to the parent element -->
			 * 			<var:attr set="class" from="[query]" />
			 * 			<!-- duplicate attributes are appended with a space delimiter -->
			 * 		</div>
			 */
			function process( $html, root, current ) {
				if ( typeof root === 'undefined' || root === null ) {
					root = {};
				}
				if ( current === null ) {
					current = {};
				}
				if ( typeof current === 'undefined' ) {
					current = root;
				}
				var $go;
				while ( ( $go = $html.find( 'var\\:go[to]:first' ) ).length ) {
					var query = $go.attr( 'to' );
					var val = select( query, root, current );
					$go.replaceWith( process( $go, root, val ).contents() );
				}
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
				$html.find( 'var\\:text:not(var\\:go var\\:text)' ).each( function() {
					var query = $(this).attr( 'from' );
					var val = select( query, root, current );
					$(this).replaceWith( encodeHtmlText( val ) );
				} );
				$html.find( 'var\\:html:not(var\\:go var\\:html)' ).each( function() {
					var query = $(this).attr( 'from' );
					var val = select( query, root, current );
					$(this).replaceWith( val );
				} );
				$html.find( 'var\\:attr:not(var\\:go var\\:attr)' ).each( function() {
					var attr = $(this).attr( 'set' );
					var query = $(this).attr( 'from' );
					var val = select( query, root, current );
					$(this).parent().attr( attr, function( index, attr ) {
						if ( attr ) {
							return [attr, val].join( ' ' );
						}
						return val;
					} );
					$(this).remove();
				} );
				return $html;
			}
			callback( process( $( '<html>' + data + '</html>' ), context ).html() );
		} );
	} );
};
