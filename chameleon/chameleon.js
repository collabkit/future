var fs = require( 'fs' ),
	util = require( 'util' ),
	document = require( 'jsdom' ).jsdom();

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
 * Creates a document fragment from an HTML string
 * 
 * @param html String: HTML to parse into a document fragment
 * @returns HTMLDocumentFragment: Document fragment containing parsed HTML
 */
function createDocumentFragmentFromHtml( html ) {
	var frag = document.createDocumentFragment(),
		temp = document.createElement( 'div' );
	temp.innerHTML = html;
	while ( temp.firstChild ) {
		frag.appendChild( temp.firstChild );
	}
	return frag;
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
 * Basic JSON query functionality
 * 
 * Syntax is identical to JSON "dot" notation with the following additions
 * 		@	current object; this is the entire query, not a prefix
 * 		.	start at root, ignoring current scope; this is a prefix
 */
function select( query, root, current ) {
	if ( typeof query === 'string' && typeof root === 'object' && root !== null ) {
		var dot = query.indexOf( '.' );
		if ( typeof current === undefined || dot === 0 ) {
			current = root;
		}
		if ( query.indexOf( '@' ) === 0 ) {
			return current;
		}
		if ( typeof current === 'object' && current !== null ) {
			parts = query.split( '.' );
			if ( dot === 0 ) {
				parts.shift();
			}
			// FIXME: Lock this down
			return eval( 'current.' + parts.join( '.' ) );
		}
	}
	return null;
}

/**
 * Recursive transformation of <var:* /> elements
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
 * @param node HTMLElement: Node to process
 * @param root Object: Data structure to render variables from
 * @param current Object: Portion of the data structure this node is scoped to
 */
function processVarElements( node, root, current ) {
	for ( var i = 0; i < node.childNodes.length; i++ ) {
		var child = node.childNodes[i];
		switch ( child.nodeName ) {
			case 'VAR:GO':
				// Variable scoping
				if ( child.hasAttribute( 'to' ) ) {
					var scope = select( child.getAttribute( 'to' ), root, current );
					processVarElements( child, root, scope );
					while ( child.firstChild ) {
						node.insertBefore( child.firstChild, child );
					}
				}
				// Variable iteration
				else if ( child.hasAttribute( 'through' ) ) {
					var scope = select( child.getAttribute( 'through' ), root, current );
					var copy;
					if ( typeof scope === 'object'
						&& scope.constructor.toString().indexOf( 'Array' ) >= 0 ) {
						for ( var j = 0; j < scope.length; j++ ) {
							copy = child.cloneNode( true );
							processVarElements( copy, root, scope[j] );
							while ( copy.firstChild ) {
								node.insertBefore( copy.firstChild, child );
							}
						}
					}
				}
				node.removeChild( child );
				break;
			case 'VAR:TEXT':
			case 'VAR:HTML':
				// Variable text/html
				if ( child.hasAttribute( 'from' ) ) {
					var value = select( child.getAttribute( 'from' ), root, current );
					if ( child.nodeName === 'VAR:TEXT' ) {
						var value = encodeHtmlText( value );
					}
					node.insertBefore( createDocumentFragmentFromHtml( value ), child );
				}
				node.removeChild( child );
				break;
			case 'VAR:ATTR':
				// Variable attributes
				if ( child.hasAttribute( 'set' ) && child.hasAttribute( 'from' ) ) {
					var value = select( child.getAttribute( 'from' ), root, current );
					var attr = child.getAttribute( 'set' );
					if ( node.hasAttribute( attr ) ) {
						node.setAttribute( attr, node.getAttribute( attr ) + ' ' + value );
					} else {
						node.setAttribute( attr, value );
					}
				}
				node.removeChild( child );
				break;
			default:
				if ( child.childNodes.length ) {
					// Continue walking
					processVarElements( child, root, current );
				}
				break;
		}
	}
}

/**
 * Recursive transformation of <msg:* /> elements
 * 
 * Elements can be intermingled with HTML, and will be removed after processing. The
 * following elements will be processed.
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
 * 
 * @param node HTMLElement: Node to process
 * @param messages Object: List of key/value pairs, each a message key and it's localized text
 */
function processMsgElements( node, messages ) {
	for ( var i = 0; i < node.childNodes.length; i++ ) {
		var child = node.childNodes[i];
		switch ( child.nodeName ) {
			case 'MSG:TEXT':
			case 'MSG:HTML':
				// Message text/html
				if ( child.hasAttribute( 'from' ) ) {
					var args = [];
					for ( var j = 0; j < child.childNodes.length; j++ ) {
						if ( child.childNodes[j].nodeName === 'MSG:ARG' ) {
							args.push( child.childNodes[j].innerHTML );
						}
					}
					var key = child.getAttribute( 'from' );
					var value = replaceArguments(
						key in messages ? messages[key] : '[' + key + ']', args
					);
					if ( child.nodeName === 'VAR:TEXT' ) {
						value = encodeHtmlText( value );
					}
					node.insertBefore( createDocumentFragmentFromHtml( value ), child );
				}
				node.removeChild( child );
				break;
			default:
				if ( child.childNodes.length ) {
					// Continue walking
					processMsgElements( child, messages );
				}
				break;
		}
	}
}

/**
 * Renders var:* and msg:* tags in an HTML string
 * 
 * @param template String: HTML containing var:* and msg:* tags to render
 * @param context Object: Structured information for var:* tags
 * @param messages Object: List of key/value pairs for msg:* tags
 * @return String: HTML of rendered string
 */
exports.render = function( html, context, messages ) {
	var doc = createDocumentFragmentFromHtml( html );
	processVarElements( doc, context, context );
	processMsgElements( doc, messages );
	return doc.innerHTML;
};

/**
 * Asynchronously Renders var:* and msg:* tags in an HTML file
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
		callback( exports.render( data, context, messages ) );
	} );
}

/**
 * Synchronously renders var:* and msg:* tags in an HTML file
 * 
 * @param template String: Path to HTML file containing var:* and msg:* tags to render
 * @param context Object: Structured information for var:* tags
 * @param messages Object: List of key/value pairs for msg:* tags
 * @return String: HTML of rendered file
 * @throws Error: If file can not be read
 */
exports.renderFileSync = function( file, context, messages ) {
	return exports.render( fs.readFileSync( file ), context, messages );
}
