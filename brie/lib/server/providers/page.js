var util = require( 'util' ),
	events = require( 'events' ),
	fs = require( 'fs' );

function PageProvider( service ) {
	events.EventEmitter.call( this );
	service.mount( 'page' );
	service.server.on( 'request.page', function( req, res ) {
		console.log(req);
		if ( req.method != 'GET' && req.method != 'HEAD') {
			res.writeHead( 400, { 'Content-Type': 'text/plain' } );
			res.end( 'Can only GET page resources.\n' );
			return;
		}
		var target = 'demo/index';
		if ( typeof req.parsedUrl.target === 'string' ) {
			target = req.parsedUrl.target;
		}
		var path = './lib/server/pages/' + target + '.html';
		console.log(path);
		fs.stat(path, function(err, stats) {
			if (stats && stats.isFile()) {
				res.writeHead( 200, {
					'Content-Type': 'text/html',
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
				res.end('Page not found.');
			}
		});
	} );
}
util.inherits( PageProvider, events.EventEmitter );

exports.PageProvider = PageProvider;
exports.create = function( service ) {
	return new PageProvider( service );
};
