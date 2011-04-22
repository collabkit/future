var util = require( 'util' ),
	events = require( 'events' ),
	path = require( 'path' ),
	fs = require( 'fs' ),
	static = require( 'node-static' ),
	less = require( 'less' );

var mimetypes = {
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.eot': 'application/vnd.ms-fontobject',
	'.ttf': 'font/ttf',
	'.otf': 'font/otf',
	'.woff': 'application/x-font-woff',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.gif': 'image/gif',
	'.jpg': 'image/jpeg'
};

var basePath = './lib/client/';

function ResourceProvider( service ) {
	events.EventEmitter.call( this );
	service.mount( 'resource' );
	service.server.on( 'request.resource', function( req, res ) {
		if ( req.method != 'GET' && req.method != 'HEAD') {
			res.writeHead( 400, { 'Content-Type': 'text/plain' } );
			res.end( 'Can only GET page resources.\n' );
			return;
		}
		if ( typeof req.parsedUrl.target === 'string' ) {
			var target = req.parsedUrl.target;
		} else {
			res.writeHead( 404, { 'Content-Type': 'text/plain' } );
			res.end( 'Invalid thingy.\n' );
			return;
		}
		var ext = require( 'path' ).extname( target );
		// Special hacking for less files
		if ( ext === '.less' ) {
			path.exists( basePath + target, function( exists ) {
				if ( exists ) {
					fs.readFile( basePath + target, 'utf8', function( err, data ) {
						if ( err ) {
							throw err;
						}
						var parser = new ( less.Parser ) ( {
							'paths': [path.dirname( basePath + target )],
							'filename': path.basename( target )
						} );
						parser.parse( data, function ( err, tree ) {
							if ( err ) {
								throw err;
							}
							res.writeHead( 200, { 'Content-Type': 'text/css' } );
							res.end( tree.toCSS( /* { compress: true } */ ) );
						} );
					} );
				} else {
					res.writeHead( 500, { 'Content-Type': 'text/plain' } );
					res.end( 'Missing whirlygig.\n' );
				}
			} );
			return;
		}
		// Normal static file delivery
		( new ( require( 'node-static' ).Server )( basePath, {
			'headers': {
				'Content-Type': ext in mimetypes ? mimetypes[ext] : 'text/plain'
			}
		} ) ).serveFile( target, 200, {}, req, res );
	} );
}
util.inherits( ResourceProvider, events.EventEmitter );

exports.ResourceProvider = ResourceProvider;
exports.create = function( service ) {
	return new ResourceProvider( service );
};
