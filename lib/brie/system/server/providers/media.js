var util = require( 'util' ),
	events = require( 'events' );

function MediaProvider( service ) {
	var provider = this;
	provider.store = service.store;

	events.EventEmitter.call( this );
	service.mount( 'media' );
	service.server.on( 'request.media', function( req, res ) {
		try {
			// @fixme ideally the URL mapper should be able to divide this down further first
			if ( typeof req.parsedUrl.target === 'string' ) {
				var path = req.parsedUrl.target.split( '/' );

				if ( path.length < 1 ) {
					throw "Invalid.";
				} else if ( path.length == 1 ) {
					if ( path[0] == 'new' ) {
						if ( req.method == "PUT" ) {
							provider.handlePut( req, res );
						} else {
							throw "Uploading a media resource requires HTTP PUT.";
						}
					} else {
						if (req.method == "GET") {
							provider.handleGet( req, res, path[0] );
						} else {
							throw "Only GET allowed."; // @fixme HEAD also?
						}
					}
				} else if ( path.length > 1 ) {
					throw "Unrecognized parameters.";
				}
			} else {
				throw "No path given.";
			}
		} catch (e) {
			res.writeHead( 400, { 'Content-Type': 'text/plain' } );
			res.end( 'MediaProvider error: ' + e + '\n' );
		}
	} );
}
util.inherits( MediaProvider, events.EventEmitter );

/**
 * HTTP request event handler for fetching original files
 *
 * @param {http.ServerRequest} req
 * @param {http.ServerResponse} res
 * @param {string} id
 */
MediaProvider.prototype.handleGet = function( req, res, id ) {
   try {
	   // @fixme we'll be wanting to start with a commit id here,
	   // pulling a standard or thumb file from a versioned 'directory'.
	   var stream = this.store.streamBlob(id);
   } catch (e) {
	   res.writeHead( 500, { 'Content-Type': 'text/plain' });
	   res.end( 'Internal error or not found or something.' );
   }
   // @fixme we'll need to get the type from the tree metadata...
   res.writeHead( 200, { 'Content-Type': 'image/jpeg' });
   stream.pipe( res );
};

/**
 * HTTP request event handler for fetching original files.
 * Currently we just stash the file into some internal array.
 *
 * @param {http.ServerRequest} req
 * @param {http.ServerResponse} res
 * @param {string} id
 */
MediaProvider.prototype.handlePut = function( req, res ) {
	var contentType = req.headers['content-type'];
	if (contentType != 'image/jpeg') {
		res.writeHead( 400, {'Content-Type': 'text/plain'});
		res.end('Only JPEG files accepted at this stage of testing');
		return;
	}
	this.store.createBlobFromStream(req, function( id, err ) {
		var targetUrl = 'http://localhost:8124/:media/' + id;
		res.writeHead( 303, {
			'Content-Type': 'text/html',
			'Location': targetUrl
		} );
		res.end( '<p>New file uploaded as <a href="' + targetUrl + '">' + targetUrl + '</a></p>\n' );
	});
};

exports.MediaProvider = MediaProvider;
exports.create = function( service ) {
	return new MediaProvider( service );
};
