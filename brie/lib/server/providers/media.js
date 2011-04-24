var util = require( 'util' ),
	events = require( 'events' ),
	logger = require( '../logger' ).create( 'MediaProvider' );

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
							if (path[0] == 'library') {
								provider.handleGetLibrary( req, res );
							} else {
								provider.handleGet( req, res, path[0] );
							}
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
	var store = this.store;
	store.getObject( id, function(obj, err) {
		if ( err ) {
			logger.fail('Failure fetching object: ' + err);
			res.writeHead( 500, { 'Content-Type': 'text/plain' });
			res.end( 'Internal error or not found or something.' );
			return;
		}
		var data = obj.data;
		if (data.type == 'application/x-collabkit-photo') {
			if (data.photo.src && data.photo.type) {
				obj.getFile(data.photo.src, function(stream, err) {
					if ( err ) {
						res.writeHead( 500, {'Content-Type': 'text/plain' });
						res.end( 'Error: ' + err );
					} else {
						res.writeHead( 200, { 'Content-Type': data.photo.type });
						stream.pipe( res );
					}
				}, 'stream');
			} else {
				res.writeHead( 404, {'Content-Type': 'text/plain' });
				res.end( 'Not found' );
			}
		} else {
			res.writeHead( 400, { 'Content-Type': 'text/plain' });
			res.end( 'Unknown object type: not a photo' );
			return;
		}
	});
};

/**
 * HTTP request event handler for media list (hack hack)
 *
 * @param {http.ServerRequest} req
 * @param {http.ServerResponse} res
 */
MediaProvider.prototype.handleGetLibrary = function( req, res ) {
	var store = this.store;
	var respondWith = function(list) {
		res.writeHead( 200, {'Content-Type': 'application/json'} );
		res.end(JSON.stringify(list));
	};
	store.getBranchRef( 'refs/heads/collabkit-library', function( id, err ) {
		if ( !id ) {
			respondWith([]);
			return;
		}
		store.getObject( id, function( obj, err ) {
			if ( err ) {
				res.writeHead( 500, {'Content-Type': 'text/plain'});
				res.end('Internal error retrieving media library: ' + err);
				return;
			}
			respondWith(obj.data.library.items);
		});
	});
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
	var types = {
		'image/jpeg': 'jpg',
		'image/png': 'png',
		'image/gif': 'gif'
	};
	if (!(contentType in types)) {
		res.writeHead( 400, {'Content-Type': 'text/plain'});
		res.end('Cannot accept files of type ' + contentType);
		return;
	}
	var filename = 'image.' + types[contentType];

	var store = this.store;
	var obj = store.createObject({
		type: 'application/x-collabkit-photo',
		meta: {
			title: filename
		},
		photo: {
			type: contentType,
			src: filename
			// todo: put width, height, other metadata in here!
			// means we need to understand the image file format
			// and read it in before we create the data. :D
		}
	});
	obj.addFile(filename, req, 'stream');
	obj.commit({}, function(committed, err) {
		if (err) {
			logger.fail('Media upload failure: ' + err);
			res.writeHead( 500, {'Content-Type': 'text/plain'});
			res.end('Internal error saving media file.');
			return;
		}
		var targetUrl = '/:media/' + committed.version;

		// But we're not done yet. Add this new image to our media library...
		// @fixme encapsulate this
		var oldLibraryId = null;
		// Success! Prepare the return...
		var onComplete = function( library, err ) {
			if ( err ) {
				res.writeHead( 500, {'Content-Type': 'text/plain'});
				res.end('Internal error updating media library.');
				return;
			}
			store.updateBranchRef('refs/heads/collabkit-library', library.version, oldLibraryId, function(str, err) {
				if ( err ) {
					res.writeHead( 500, {'Content-Type': 'text/plain'});
					res.end('Internal error updating media library branch ref.');
					return;
				}
				// @fixme this should be 303, but we can't read the redirect without fetching it. Grr!
				res.writeHead( 200, {
					'Content-Type': 'text/html',
					'Location': targetUrl
				} );
				res.end( '<p>New file uploaded as <a href="' + targetUrl + '">' + targetUrl + '</a></p>\n' );
			});
		};
		store.getBranchRef( 'refs/heads/collabkit-library', function( id, err ) {
			if ( !id ) {
				var library = store.createObject({
					type: 'application/x-collabkit-library',
					library: {
						items: [committed.version]
					}
				});
				library.commit({}, onComplete);
			} else {
				oldLibraryId = id;
				store.getObject( id, function( obj, err ) {
					if ( err ) {
						res.writeHead( 500, {'Content-Type': 'text/plain'});
						res.end('Internal error retrieving media library: ' + err);
						return;
					}
					var library = obj.fork();
					library.data.library.items.push(committed.version);
					library.commit({}, onComplete);
				});
			}
		});
	});
};

exports.MediaProvider = MediaProvider;
exports.create = function( service ) {
	return new MediaProvider( service );
};
