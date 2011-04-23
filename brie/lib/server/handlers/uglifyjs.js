var jsp = require( 'uglify-js' ).parser;
var pro = require( 'uglify-js' ).uglify;

exports.render = function( data, res, options ) {
	if ( options.compress ) {
		var ast = jsp.parse( data );
		ast = pro.ast_mangle( ast );
		ast = pro.ast_squeeze( ast );
		data = pro.gen_code( ast );
	}
	res.writeHead( 200, { 'Content-Type': 'text/javascript' } );
	res.end( data );
};
