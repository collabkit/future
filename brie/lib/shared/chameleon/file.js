var fs = require( 'fs' );

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
		callback( require( './' ).render( data, options ) );
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
	return require( './' ).render( fs.readFileSync( file ), options );
};
