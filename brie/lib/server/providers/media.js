var util = require( 'util' ),
	events = require( 'events' ),
	logger = require( '../logger' ).create( 'MediaProvider' ),
	Squisher = require('../../shared/squisher').Squisher,
	grout = require('../../shared/grout');

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
 * GET /:media/[branch-name|commit-id]/list
 * GET /:media/[branch-name|commit-id]/list/thumb
 * GET /:media/[branch-name|commit-id]/list/medium
 * GET /:media/[branch-name|commit-id]/list/large
 *	Returns JSON array containing information about photos in library
 *
 * GET /:media/[branch-name|commit-id]/photo
 * GET /:media/[branch-name|commit-id]/photo/thumb
 * GET /:media/[branch-name|commit-id]/photo/medium
 * GET /:media/[branch-name|commit-id]/photo/large
 *  Return a JPEG, PNG, or GIF image at original, thumb (128x128), medium (640x480), or large
 *  (1280x960) sizes.
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
			} else if ( path.length >= 1 ) {
				// /:media/0123456789abcdef0123456789abcdef012345678
				if (req.method != "GET") {
					throw "Only GET allowed."; // @fixme HEAD also?
				}
				provider.handleGet( req, res, path[0], path.slice(1) );
			} else {
				throw "Unrecognized parameters.";
			}
		} catch (e) {
			res.writeHead( 400, {'Content-Type': 'text/plain'} );
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
 * @param {string[]} params
 */
MediaProvider.prototype.handleGet = function(req, res, id, params) {
	var fail = function(msg, code) {
		logger.fail('media get error: ' + msg);
		res.writeHead(code || 500, {'Content-Type': 'text/plain'});
		res.end('Error: ' + msg);
	};
	var media = this,
		store = this.store,
		etag = 'CollabKit.photo.' + id;
	store.getObject( id, function( obj, err ) {
		if ( err ) {
			fail( err );
		}
		var mode = params[0] || 'list';
		if (mode == 'list') {
			// Return a list of 
			media.renderList(obj, params, function(list, err) {
				if (err) {
					fail(err);
				} else {
					// @fixme add caching headers once versioning is more stable :)
					res.writeHead(200, {'Content-Type': 'application/json'});
					res.end(JSON.stringify(list));
				}
			});
		} else if (mode == 'photo') {
			// Return an image
			media.renderPhoto( obj, params, function( blobId, type, err ) {
				if ( err ) {
					fail( err );
				} else {
					var maxAge = 86400 * 30; // Cache for a month, they're invariant!
					var headers = {
						'Content-Type': type,
						'Cache-Control': 'private, max-age=' + maxAge,
						'ETag': etag
						// @fixme send Content-Length if available
					};
					if ( req.headers['if-none-match'] == etag ) {
						// Cache shortcut!
						res.writeHead( 304, headers );
						res.end();
					} else {
						try {
							var stream = store.streamBlob( blobId );
						} catch ( e ) {
							fail( e );
							return;
						}
						res.writeHead( 200, headers );
						stream.pipe( res );
					}
				}
			})
		} else {
			fail('Invalid media method ' + params[0] + ' on photo object.');
		}
	});
};

MediaProvider.prototype.renderList = function(obj, params, callback) {
	if (obj.data.type !== 'application/x-collabkit-library') {
		callback( null, 'Invalid object type' );
	}
	var media = this,
		store = this.store,
		list = [],
		i = 0,
		items = obj.data.library.items,
		step = function() {
			if (i >= items.length) {
				callback( list, null );
				return;
			}
			store.getObject(items[i], function(obj, err) {
				if (err) {
					callback(null, err);
				} else if (!obj.data.type === 'application/x-collabkit-photo') {
					callback(null, 'Invalid child object type');
				}
				var thumb = media.selectThumb(obj, params[1]);
				list.push({
					'id': obj.version,
					'width': thumb.width,
					'height': thumb.height,
					'src': '/:media/' + obj.version + '/photo'
						+ ( params[1] ? '/' + params[1] : '' )
				});
				i++;
				step();
			});
		};
	step();
};

/**
 * Fetch or render an image file display of this object
 * Return it to caller as a stream and a content type.
 *
 * @param {CollabKitObject} obj
 * @param {object} params
 * @param {function(blobId, contentType, err)} callback
 */
MediaProvider.prototype.renderPhoto = function( obj, params, callback ) {
	if ( obj.data.type == 'application/x-collabkit-photo' ) {
		var display = this.selectThumb( obj, params[1] );
		obj.findFile(display.src, function(blobId, err) {
			callback( blobId, display.type, err );
		}, 'stream');
	} else {
		callback(null, null, 'Cannot load photo of non-photo object');
	}
};

/**
 * Select either the main image size or a thumbnail based on requested size
 *
 * @param {CollabKitObject} obj
 * @param {String} size
 * @return {object} with size & source file name
 */
MediaProvider.prototype.selectThumb = function(obj, size) {
	var size = size || 'original',
		photo = obj.data.photo,
		display;
	if (photo.thumbs && size in photo.thumbs) {
		display = photo.thumbs[size];
	} else {
		display = photo;
	}
	return grout.mix({'size': size}, display);
};

/**
 * HTTP request event handler for uploading original files.
 *
 * Currently we stash the raw file into the git store and build
 * a stock photo object around it, then return its commit id.
 *
 * Actually saving it into a library will need a visit to the
 * data provider, or it will eventually fall into garbage
 * collection.
 *
 * Returns a JSON chunk: {
 *   id: <string commit id>
 *   data: <JSON data blob from the photo>
 * }
 *
 * @param {http.ServerRequest} req
 * @param {http.ServerResponse} res
 */
MediaProvider.prototype.handlePut = function( req, res ) {
	var store = this.store;
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

	var obj = store.createObject({
		type: 'application/x-collabkit-photo',
		meta: {
			title: filename
		},
		photo: {
			width: null,
			height: null,
			type: contentType,
			src: filename,
			thumbs: {}
		}
	});

	var squisher = new Squisher();

	// Save the original image's metadata & data
	squisher.on('metadata', function(data) {
		obj.data.photo.width = data.width;
		obj.data.photo.height = data.height;
		obj.addFile(filename, data.data);
	});

	// Attach standard-sized thumbnail info...
	squisher.on('resized', function(thumb) {
		if (thumb.data) {
			// Save a thumbnail!
			var thumbFilename = thumb.size + '.' + thumb.ext;
			obj.addFile(thumbFilename, thumb.data);
			obj.data.photo.thumbs[thumb.size] = {
				width: thumb.width,
				height: thumb.height,
				src: thumbFilename,
				type: thumb.contentType
			}
		} else {
			// Use the original file, scale client-size
			obj.data.photo[thumb.size] = {
				width: thumb.width,
				height: thumb.height,
				src: filename,
				type: contentType
			}
		}
	});

	// Commit the object once complete :D
	squisher.on('complete', function() {
		obj.commit({}, function( photo, err ) {
			if ( err ) {
				return fail( err );
			}
			res.writeHead( 200, {
				'Content-Type': 'application/json'
			} );
			res.end(JSON.stringify({
				id: photo.version,
				data: photo.data
			}));
		});
	});

	squisher.on('error', function(err) {
		fail(err);
	});

	squisher.readStream(req, contentType);
};

exports.MediaProvider = MediaProvider;
exports.create = function( service ) {
	return new MediaProvider( service );
};
