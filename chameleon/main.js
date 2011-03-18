var http = require( 'http' ),
	chameleon = require( './chameleon' );

http.createServer( function( req, res ) {
	
	// Skip favicon request
	var url = require( 'url' ).parse( req.url );
	if ( typeof url.pathname === 'string' && url.pathname == '/favicon.ico' ) {
		res.writeHeader( 500, { 'Content-Type': 'text/html' } );
		res.end( '500 File Not Found' );
		return;
	}
	
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
	
	var messages = {
		'foo': '$1 and counting... $2!',
		'bar': '<blink>Bah!</blink>'
	};
	
	chameleon.renderFile( 'test.html', context, messages, function( html ) {
		res.writeHeader( 200, { 'Content-Type': 'text/html' } );
		res.end( html );
	} );
} ).listen( 8124 );

console.log( 'Server running on port 8124' );
