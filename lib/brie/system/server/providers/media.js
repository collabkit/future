var util = require( 'util' ),
	events = require( 'events' );

function MediaProvider( service ) {
	var provider = this;
	provider.objects = {}; // @fixme use persistent storage ;)

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
	var obj = this.getObject(id);

	res.writeHead( 200, { 'Content-Type': obj.contentType } );
	res.end( obj.data );
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
	var provider = this;
	var contentType = req.headers['content-type'];
	var data = new Buffer(0);
	req.on('data', function(chunk) {
		// Append the next chunk...
		var newBuffer = new Buffer(data.length + chunk.length);
		data.copy(newBuffer);
		chunk.copy(newBuffer, data.length);
		data = newBuffer;
	});
	req.on('end', function() {
		var id = provider.putObject(contentType, data);
		var targetUrl = 'http://localhost:8124/:media/' + id;
		res.writeHead( 303, {
			'Content-Type': 'text/html',
			'Location': targetUrl
		} );
		res.end( '<p>New file uploaded as <a href="' + targetUrl + '">' + targetUrl + '</a></p>\n' );
	});
};

/**
 * Fetch a stored media file object from the temporary space.
 *
 * @param {string} id: object ID key
 * @return object {contentType, data}
 *
 * @throws exception if object is not found
 */
MediaProvider.prototype.getObject = function(id) {
	if ( id in this.objects ) {
		return this.objects[id];
	} else {
		throw "No such object " + id;
	}
};

/**
 * @param {string} contentType
 * @param {Buffer} data
 * @return {string} new object ID
 */
MediaProvider.prototype.putObject = function(contentType, data) {
	var id = Math.random();
	this.objects[id] = {
		contentType: contentType,
		data: data
	};
	return id;
};

exports.MediaProvider = MediaProvider;
exports.create = function( service ) {
	return new MediaProvider( service );
};
