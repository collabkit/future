var util = require( 'util' ),
	events = require( 'events' ),
	fs = require( 'fs' );

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
		// @fixme validate the target
		var path = './lib/client/' + target;
		fs.stat(path, function(err, stats) {
			// There really should be a preexisting easy way to say 'pass through to this filesystem subtree'
			if (stats && stats.isFile()) {
				var ext = require( 'path' ).extname( path );
				res.writeHead( 200, {
					// @fixme support other file types
					'Content-Type': ext in mimetypes ? mimetypes[ext] : 'text/plain',
					'Content-Length': '' + stats.size
				});
				if (req.method == 'HEAD') {
					res.end();
				} else {
					var stream = fs.createReadStream(path);
					stream.pipe(res);
				}
			} else {
				console.log(err);
				res.writeHead( 404, { 'Content-Type': 'text/plain' } );
				res.end('ResourceProvider: resource not found.');
			}
		});
	} );
}
util.inherits( ResourceProvider, events.EventEmitter );

exports.ResourceProvider = ResourceProvider;
exports.create = function( service ) {
	return new ResourceProvider( service );
};
