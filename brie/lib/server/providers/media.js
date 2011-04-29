var util = require( 'util' ),
	events = require( 'events' ),
	logger = require( '../logger' ).create( 'MediaProvider' );

/**
 * URL patterns
 *
 * PUT /:media/new/photo
 *	Creates a new CollabKit photo object from the uploaded image file.
 *	Returns {commit: 'commit-id'}
 *
 * GET /:media/[branch-name|commit-id]
 *	Returns HTML fragment showing the object full-sizeish.
 *
 * GET /:media/[branch-name|commit-id]/embed
 *	Returns HTML fragment showing a thumbnail of the object.
 *
 * GET /:media/[branch-name|commit-id]/photo/thumb
 * GET /:media/[branch-name|commit-id]/photo/large
 * GET /:media/[branch-name|commit-id]/photo/original
 *  Return a JPEG, PNG, or GIF image at thumb (128x128), large (800x600), or original sizes.
 */
function MediaProvider( service ) {
	var provider = this;
	provider.store = service.store;

	var reBlobId = /^[0-9a-f]{1,40}$/;

	events.EventEmitter.call( this );
	service.mount( 'media' );
	service.server.on( 'request.media', function( req, res ) {
		try {
			// @fixme ideally the URL mapper should be able to divide this down further first
			if ( typeof req.parsedUrl.target !== 'string' ) {
				throw "No path given.";
			}
			var path = req.parsedUrl.target.split( '/' );

			if ( path.length < 1 ) {
				throw "Invalid.";
			} else if ( path.length == 1 && path[0] == 'new' ) {
				// /:media/new
				if ( req.method != "PUT" ) {
					throw "Uploading a media resource requires HTTP PUT.";
				}
				provider.handlePut( req, res );
			} else if ( path.length == 1 ) {
				// /:media/0123456789abcdef0123456789abcdef012345678
				if (req.method != "GET") {
					throw "Only GET allowed."; // @fixme HEAD also?
				}
				provider.handleGet( req, res, path[0] );
			} else {
				throw "Unrecognized parameters.";
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
MediaProvider.prototype.handleGet = function( req, res, version, filename ) {
	var fail = function( msg, code ) {
		logger.fail('media get error: ' + msg);
		res.writeHead( code || 500, {'Content-Type': 'text/plain'});
		res.end( 'Error: ' + msg );
		return null;
	};
	var store = this.store;
	store.getObject( version, function(obj, err) {
		if ( err ) {
			return fail( err );
		}
		if ( obj.data.type != 'application/x-collabkit-library' ) {
			return fail( 'Invalid commit id; not a CollabKit library.' );
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
				return;
			}
		} else {
			res.writeHead( 400, { 'Content-Type': 'text/plain' });
			res.end( 'Unknown object type: not a photo' );
			return;
		}
	});
};

/**
 * HTTP request event handler for uploading original files.
 * Currently we just stash the raw file into the git store and
 * return its blob ID; actually saving it into a library will
 * need a visit to the data provider.
 *
 * @param {http.ServerRequest} req
 * @param {http.ServerResponse} res
 * @param {string} id
 */
MediaProvider.prototype.handlePut = function( req, res ) {
	var fail = function( msg, code ) {
		logger.fail( 'media put error: ' + msg);
		res.writeHead( code || 500, {'Content-Type': 'text/plain'});
		res.end( 'Error: ' + msg );
		return null;
	};
	var contentType = req.headers['content-type'];
	var types = {
		'image/jpeg': 'jpg',
		'image/png': 'png',
		'image/gif': 'gif'
	};
	if (!(contentType in types)) {
		return fail( 'Cannot accept files of type ' + contentType, 400 );
	}
	var ts = Date.now();
	var filename = 'image-' + ts + '.' + types[contentType];

	var store = this.store;
	store.initLibrary( function( oldLibrary, err ) {
		if ( err ) {
			return fail( err );
		}
		var library = oldLibrary.fork();
		library.data.items.push({
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
		library.addFile(filename, req, 'stream');
		library.commit({}, function( library, err ) {
			if ( err ) {
				return fail( err );
			}
			store.updateBranchRef('refs/heads/collabkit-library', library.version, oldLibrary.Id, function(str, err) {
				if ( err ) {
					return fail( err );
				}
				// @fixme this should be 303, but we can't read the redirect without fetching it. Grr!
				var targetUrl = '/:media/' + library.version + '/' + filename;
				res.writeHead( 200, {
					'Content-Type': 'text/html',
					'Location': targetUrl
				} );
				res.end( '<p>New file uploaded as <a href="' + targetUrl + '">' + targetUrl + '</a></p>\n' );
			});
		});
	});
};

exports.MediaProvider = MediaProvider;
exports.create = function( service ) {
	return new MediaProvider( service );
};
