var util = require( 'util' ),
	events = require( 'events' ),
	fs = require( 'fs' ),
	static = require('node-static');

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
		( new ( require( 'node-static' ).Server )( './lib/client/', {
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
