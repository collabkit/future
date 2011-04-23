var util = require( 'util' ),
	events = require( 'events' ),
	path = require( 'path' ),
	fs = require( 'fs' ),
	static = require( 'node-static' );

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
	var handlers = this.handlers = {};
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
		if ( ext in handlers ) {
			path.exists( basePath + target, function( exists ) {
				if ( exists ) {
					fs.readFile( basePath + target, 'utf8', function( err, data ) {
						var query = require( 'querystring' ).parse( req.parsedUrl.query );
						var data = handlers[ext]( data, res, {
							'path': path.dirname( basePath + target ),
							'filename': path.basename( target ),
							'compress': 'min' in query
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

ResourceProvider.prototype.addHandler = function( ext, render ) {
	this.handlers[ext] = render;
};

exports.ResourceProvider = ResourceProvider;
exports.create = function( service ) {
	return new ResourceProvider( service );
};
