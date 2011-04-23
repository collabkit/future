var less = require( 'less' );

exports.render = function( data, res, options ) {
	var parser = new less.Parser( {
		'paths': [options.path],
		'filename': options.filename
	} );
	parser.parse( data, function ( err, tree ) {
		res.writeHead( 200, { 'Content-Type': 'text/css' } );
		res.end( tree.toCSS( {
			'compress': options.compress
		} ) );
	} );
};
