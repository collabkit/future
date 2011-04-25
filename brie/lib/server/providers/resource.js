var util = require( 'util' ),
	events = require( 'events' ),
	path = require( 'path' ),
	fs = require( 'fs' ),
	static = require( 'node-static' ),
	moduleIndex = require( '../moduleIndex.js' );

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
	var modules = this.modules = moduleIndex.create( ['lib/client/', 'lib/shared/'] );
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
		
		// Allow requests for modules
		// FIXME: Right now we just fall through to direct file reading, but we should probably
		// explicitly describe whether we are looking for a module or a file in the URL
		var basename = path.basename( target, '.js' );
		if ( modules.exists( basename ) ) {
			target = modules.get( basename ).main;
			base = '';
		} else {
			// XXX: This only exposes client files, not shared ones as well
			base = 'lib/client/';
		}
		// Try to handle requests for actual files
		var ext = require( 'path' ).extname( target );
		// Special hacking for less files
		if ( ext in handlers ) {
			var local = path.join( base, target );
			path.exists( local, function( exists ) {
				if ( exists ) {
					fs.readFile( local, 'utf8', function( err, data ) {
						var query = require( 'querystring' ).parse( req.parsedUrl.query );
						var data = handlers[ext]( data, res, {
							'path': path.dirname( local ),
							'filename': path.basename( target ),
							'compress': 'min' in query
						} );
					} );
				} else {
					res.writeHead( 500, { 'Content-Type': 'text/plain' } );
					res.end( 'File not found: ' + target + '\n' );
				}
			} );
			return;
		}
		// Normal static file delivery
		( new ( require( 'node-static' ).Server )( base, {
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
