var http = require( 'http' ),
	chameleon = require( '../../lib/chameleon' ),
	lang = require( '../../lib/localizr' ).create( 'en' );

http.createServer( function( req, res ) {
	
	// Skip favicon request
	var url = require( 'url' ).parse( req.url );
	if ( typeof url.pathname === 'string' && url.pathname == '/favicon.ico' ) {
		res.writeHeader( 500, { 'Content-Type': 'text/html' } );
		res.end( '500 File Not Found' );
		return;
	}
	
	// Test messages
	lang.set( {
		'foo': '$1 and counting... $2!',
		'bar': '<blink>Bah!</blink>'
	} );
	
	// Test context
	var context = {
		'body': {
			'text': 'Chameleon Test',
			'html': '<strong>Strength</strong> and <em>emphasis</em>.',
			'attr': 'colors',
			'lists': {
				'colors': ['red', 'green', 'blue'],
				'people': [{ 'name': 'joe', 'age': 12 }, { 'name': 'sally', 'age': 15 }]
			}
		},
	};
	
	try {
		chameleon.renderFile(
			'template.html',
			context,
			function( k, a ) { return lang.get( k, a ) },
			true,
			function( html ) {
				res.writeHeader( 200, { 'Content-Type': 'text/html' } );
				res.end( html );
			}
		);
	} catch ( e ) {
		res.writeHeader( 500, { 'Content-Type': 'text/plain' } );
		res.end( e.name + ': ' + e.message );
	}
	
} ).listen( 8124 );

console.log( 'Server running on port 8124' );
