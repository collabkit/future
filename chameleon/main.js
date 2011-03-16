var http = require( 'http' ),
	chameleon = require( './chameleon' );

http.createServer( function( req, res ) {
	
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
	
	chameleon.render( 'test.html', context, function( html ) {
		res.writeHeader( 200, { 'Content-Type': 'text/html' } );
		res.end( html );
	} );
} ).listen( 8124 );

console.log( 'Server running on port 8124' );
