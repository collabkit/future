var fs = require( 'fs' ),
	util = require( 'util' ),
	document = require( 'jsdom' ).jsdom();

// HTML elements which may appear within a line of text.
var htmlTextElements = [
	'A', 'ABBR', 'B', 'BDI', 'BDO', 'BLINK', 'BR', 'CITE', 'CODE', 'DFN', 'EM', 'FONT', 'I',
	'IMG', 'KBD', 'MARK', 'Q', 'RP', 'RT', 'RUBY', 'S', 'SAMP', 'SMALL', 'SPAN', 'STRIKE',
	'STRONG', 'SUB', 'SUP', 'TIME', 'TT', 'U', 'VAR', 'WBR'
];
// HTML elements within which whitespace should always be preserved.
var htmlWhitespacePreservingElements = ['PRE', 'TEXTAREA', 'STYLE', 'SCRIPT'];

/**
 * Escapes special HTML characters using HTML entities.
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
 * Selects a value within an object using JSON "dot" syntax.
 * 
 * Syntax is identical to JSON "dot" syntax with the following additions:
 *   @ current object; this is the entire query, not a prefix
 *   . start at root, ignoring current scope; this is a prefix
 * 
 * @param query String: Selection query
 * @param root Object: Root object to select from
 * @param current Object: Scoped object to select from, a descendant of root
 * @returns Mixed: Value of selection, null if selection is invalid
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
 * Creates a document fragment from an HTML string.
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
 * Removes HTML comments, preserving IE conditionals.
 * 
 * @param node HTMLElmement: Node to remove comments from
 */
function removeComments( node ) {
	for ( var i = 0; i < node.childNodes.length; i++ ) {
		child = node.childNodes[i];
		if ( child.nodeType === 8 ) {
			if ( !/^\[(if|endif)/.test( child.nodeValue ) ) {
				node.removeChild( child );
				i--;
			}
		} else if ( child.nodeType === 1 ) {
			removeComments( child );
		}
	}
}

/**
 * Removes non-functional text nodes and non-functional whitespace within text nodes.
 * 
 * The contents of elements defined in htmlWhitespacePreservingElements are not affected, and
 * in-line elements defined in htmlTextElements are handled with care as to ensure that spaces are
 * left where they have meaning.
 * 
 * @param node HTMLElement: Node to clean
 */
function cleanWhitespace( node ) {
	var child, l, r;
	for ( var i = 0; i < node.childNodes.length; i++ ) {
		child = node.childNodes[i];
		if ( child.nodeType === 3 ) {
			if ( /\S/.test( child.nodeValue ) ) {
				if ( !child.previousSibling
						|| ( child.previousSibling.nodeType === 1
						&& htmlTextElements.indexOf( child.previousSibling.nodeName ) === -1 ) ) {
					child.nodeValue = child.nodeValue.replace( /^\s+/g, '' );
				} else {
					child.nodeValue = child.nodeValue.replace( /^\s+/g, ' ' );
				}
				if ( !child.nextSibling
						|| ( child.nextSibling.nodeType === 1
						&& htmlTextElements.indexOf( child.nextSibling.nodeName ) === -1 ) ) {
					child.nodeValue = child.nodeValue.replace( /\s+$/g, '' );
				} else {
					child.nodeValue = child.nodeValue.replace( /\s+$/g, ' ' );
				}
				child.nodeValue = child.nodeValue.replace( /(\S)(\s+)(\S)/g, '$1 $3' );
			} else {
				l = r = false;
				if ( child.previousSibling
						&& child.previousSibling.nodeType === 3
						&& /\S/.test( child.previousSibling.nodeValue.substr( -1, 1 ) ) ) {
					l = ( child.nextSibling && child.nextSibling.nodeType === 1 );
				}
				if ( child.nextSibling
						&& child.nextSibling.nodeType === 3
						&& /\S/.test( child.nextSibling.nodeValue.substr( 0, 1 ) ) ) {
					r = ( child.previousSibling && child.previousSibling.nodeType === 1 );
				}
				if ( l || r ) {
					child.nodeValue = ' ';
				} else {
					node.removeChild( child );
					i--;
				}
			}
		} else if ( child.nodeType == 1
				&& child.childNodes.length
				&& htmlWhitespacePreservingElements.indexOf( child.nodeName ) === -1 ) {
			cleanWhitespace( child );
		}
	}
}

/**
 * Recursive transformation of <tpl:* /> elements.
 * 
 * Elements can be intermingled with HTML, and will be removed after processing. The
 * following elements will be processed.
 * 
 * * Template definition
 *   <tpl:define template="[name]">
 *       <p>Template contents</p>
 *   </tpl:define>
 * 
 * * Template application
 *   <tpl:apply template="[name]" />
 * 
 * @param node HTMLElement: Node to process
 * @param templates Array: List of HTMLElement objects keyed by template name
 */
function processTplElements( node, templates ) {
	if ( typeof templates === 'undefined' ) {
		templates = {};
	}
	for ( var i = 0; i < node.childNodes.length; i++ ) {
		var child = node.childNodes[i];
		switch ( child.nodeName ) {
			case 'TPL:DEFINE':
				if ( child.hasAttribute( 'template' ) ) {
					var name = child.getAttribute( 'template' );
					templates[name] = child.cloneNode( true );
				}
				node.removeChild( child );
				break;
			case 'TPL:APPLY':
				if ( child.hasAttribute( 'template' ) ) {
					var name = child.getAttribute( 'template' );
					var copy = templates[name].cloneNode( true );
					while ( copy.firstChild ) {
						node.insertBefore( copy.firstChild, child );
					}
				}
				node.removeChild( child );
				break;
			default:
				if ( child.childNodes.length ) {
					// Continue walking
					processTplElements( child, templates );
				}
				break;
		}
	}
}

/**
 * Recursive transformation of <var:* /> elements.
 * 
 * Elements can be intermingled with HTML, and will be removed after processing. The
 * following elements will be processed.
 * 
 * * Variable scoping
 *   <var:go to="[query]">
 *       <!-- elements here inherit the scope of [query] -->
 *   </var:go>
 * 
 * * Variable iteration
 *   <var:go through="[query]">
 *       <!-- elements here are repeated for each array element in [query] -->
 *       <!-- elements here inherit the scope of [query] -->
 *   </var:go>
 * 
 * * Variable text (HTML escaped)
 *   <var:text from="[query]" />
 * 
 * * Variable HTML (raw)
 *   <var:html from="[query]" />
 * 
 * * Variable attributes
 *   <div class="a">
 *       <!-- attributes here will be set to the parent element, replacing existing values -->
 *       <var:attr set="id" from="[query]" />
 *       <!-- append flag means existing attributes are appended using a space delimiter -->
 *       <var:attr set="class" from="[query]" append />
 *   </div>
 * 
 * @param node HTMLElement: Node to process
 * @param root Object: Structured information for var:* elements
 * @param current Object: Portion of the data structure this node is scoped to
 */
function processVarElements( node, root, current ) {
	if ( typeof current === 'undefined' ) {
		current = root;
	}
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
			case 'VAR:ATTR':
				// Variable text/html
				if ( child.hasAttribute( 'from' ) ) {
					var value = select( child.getAttribute( 'from' ), root, current );
					switch( child.nodeName ) {
						case 'VAR:TEXT':
							value = encodeHtmlText( value );
						case 'VAR:HTML':
							node.insertBefore( createDocumentFragmentFromHtml( value ), child );
							break;
						case 'VAR:ATTR':
							if ( child.hasAttribute( 'set' ) ) {
								var attr = child.getAttribute( 'set' );
								if ( node.hasAttribute( attr ) && child.hasAttribute( 'append' ) ) {
									node.setAttribute(
										attr, node.getAttribute( attr ) + ' ' + value
									);
								} else {
									node.setAttribute( attr, value );
								}
							}
							break;
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
 * Recursive transformation of <msg:* /> elements.
 * 
 * Elements can be intermingled with HTML, and will be removed after processing. The
 * following elements will be processed.
 * 
 * * Message text
 *   <msg:text from="[key]" />
 * 
 * * Message HTML
 *   <msg:html from="[key]" />
 * 
 * * Message attributes
 *   <div class="a">
 *       <!-- attributes here will be set to the parent element, replacing existing values -->
 *       <msg:attr set="id" from="[query]" />
 *       <!-- append flag means existing attributes are appended using a space delimiter -->
 *       <msg:attr set="class" from="[query]" append />
 *   </div>
 * 
 * * Message arguments (corresponding to $1, $2, etc.)
 *   <msg:text from="key">
 *       <msg:arg>text</msg:arg>
 *       <msg:arg><var:text from="[query]" /></msg:arg>
 *   </msg:text>
 * 
 * @param node HTMLElement: Node to process
 * @param msg Function: Message text callback that takes a message key and arguments array
 */
function processMsgElements( node, msg ) {
	for ( var i = 0; i < node.childNodes.length; i++ ) {
		var child = node.childNodes[i];
		switch ( child.nodeName ) {
			case 'MSG:TEXT':
			case 'MSG:HTML':
			case 'MSG:ATTR':
				// Message text/html
				if ( child.hasAttribute( 'from' ) ) {
					var args = [];
					for ( var j = 0; j < child.childNodes.length; j++ ) {
						if ( child.childNodes[j].nodeName === 'MSG:ARG' ) {
							args.push( child.childNodes[j].innerHTML );
						}
					}
					var value = msg( child.getAttribute( 'from' ), args );
					switch ( child.nodeName ) {
						case 'MSG:TEXT':
							value = encodeHtmlText( value );
						case 'MSG:HTML':
							node.insertBefore( createDocumentFragmentFromHtml( value ), child );
							break;
						case 'MSG:ATTR':
							if ( child.hasAttribute( 'set' ) ) {
								var attr = child.getAttribute( 'set' );
								if ( node.hasAttribute( attr ) && child.hasAttribute( 'append' ) ) {
									node.setAttribute(
										attr, node.getAttribute( attr ) + ' ' + value
									);
								} else {
									node.setAttribute( attr, value );
								}
							}
							break;
					}
				}
				node.removeChild( child );
				break;
			default:
				if ( child.childNodes.length ) {
					// Continue walking
					processMsgElements( child, msg );
				}
				break;
		}
	}
}

/**
 * Renders tpl:*, var:* and msg:* elements in an HTML string.
 * 
 * Rendering happens in 3 complete passes.
 * * Template definition and application
 * * Variable scoping, iteration and output
 * * Message output
 * 
 * @param html String: HTML containing var:* and msg:* elements to render
 * @param options Object: Optional arguments
 * @param options.context Object: Structured information for var:* elements
 * @param options.msg Function: Message text callback that takes a message key and arguments array
 * @param options.clean Boolean: Remove non-functional comments and whitespace from rendered HTML
 * @return String: HTML of rendered string
 */
exports.render = function( html, options ) {
	var defaultOptions = {
		'context': {},
		'msg': function( key, args ) {
			return '[' + key + ']';
		},
		'clean': false
	};
	if ( typeof options === 'object' ) {
		for ( option in defaultOptions ) {
			if ( option in options ) {
				defaultOptions[option] = options[option];
			}
		}
	}
	var doc = createDocumentFragmentFromHtml( html );
	if ( defaultOptions.clean ) {
		removeComments( doc );
	}
	processTplElements( doc );
	processVarElements( doc, defaultOptions.context );
	processMsgElements( doc, defaultOptions.msg );
	if ( defaultOptions.clean ) {
		cleanWhitespace( doc );
	}
	return doc.innerHTML;
};

/**
 * Asynchronously renders tpl:*, var:* and msg:* elements in an HTML file.
 * 
 * @see chameleon.render
 * 
 * @param file String: Path to HTML file containing var:* and msg:* elements to render
 * @param options Object: Optional arguments passed to chameleon.render
 * @throws Error: If file can not be read
 */
exports.renderFile = function( file, options, callback ) {
	fs.readFile( file, function( error, data ) {
		if ( error ) {
			throw error;
		}
		callback( exports.render( data, options ) );
	} );
};

/**
 * Synchronously renders tpl:*, var:* and msg:* elements in an HTML file.
 * 
 * @see chameleon.render
 * 
 * @param file String: Path to HTML file containing var:* and msg:* elements to render
 * @param options Object: Optional arguments passed to chameleon.render
 * @return String: HTML of rendered file
 * @throws Error: If file can not be read
 */
exports.renderFileSync = function( file, options ) {
	return exports.render( fs.readFileSync( file ), options );
};
