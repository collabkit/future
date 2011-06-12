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
 * GET /:media/[branch-name|commit-id]/embed
 * GET /:media/[branch-name|commit-id]/embed/thumb
 * GET /:media/[branch-name|commit-id]/embed/medium
 * GET /:media/[branch-name|commit-id]/embed/large
 *	Returns HTML fragment showing a thumbnail, medium, or large view of the object.
 *
 * GET /:media/[branch-name|commit-id]/photo
 * GET /:media/[branch-name|commit-id]/photo/thumb
 * GET /:media/[branch-name|commit-id]/photo/medium
 * GET /:media/[branch-name|commit-id]/photo/large
 *  Return a JPEG, PNG, or GIF image at original, thumb (128x128), medium (640x480), or large (1280x960) sizes.
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
MediaProvider.prototype.handleGet = function( req, res, id, params ) {
	var fail = function( msg, code ) {
		logger.fail('media get error: ' + msg);
		res.writeHead( code || 500, {'Content-Type': 'text/plain'});
		res.end( 'Error: ' + msg );
	};
	var media = this;
	var store = this.store;
	store.getObject( id, function( obj, err ) {
		if ( err ) {
			fail( err );
		}
		var mode = params[0] || 'embed';
		if ( mode == 'embed' ) {
			// HTML embed display
			media.renderEmbed( obj, params, function( html, err ) {
				if ( err ) {
					fail( err );
				} else {
					res.writeHead( 200, {'Content-Type': 'text/html'});
					res.end( html );
				}
			} );
		} else if ( mode == 'photo' ) {
			// Return an image
			media.renderPhoto( obj, params, function( stream, type, err ) {
				if ( err ) {
					fail( err );
				} else {
					res.writeHead( 200, {'Content-Type': type});
					stream.pipe( res );
				}
			})
		} else {
			fail( 'Invalid media method ' + params[0] + ' on photo object.' );
		}
	});
};

/**
 * Render an object as an HTML fragment
 * Return a string to the caller
 *
 * @param {CollabKitObject} obj
 * @param {object} params
 * @param {function(html, err)} callback
 */
MediaProvider.prototype.renderEmbed = function( obj, params, callback ) {
	var media = this, store = this.store;
	var data = obj.data, id = obj.version;
	if (data.type == 'application/x-collabkit-photo') {
		var display = media.selectThumb( obj, params[1] );
		callback(
			'<div class="collabkit-photo size-' + display.size + ' collabkit-object-' + id + '">' +
				'<img src="/:media/' + id + '/photo/' + display.size + '" ' +
					'width="' + display.width + '" ' +
					'height="' + display.height + '" />' +
			'</div>',
			null
		);
	} else if (data.type == 'application/x-collabkit-library') {
		var size = 'thumb';
		//var html = '<div class="collabkit-library size-' + size + ' collabkit-object-' + id + '">';
		var html = '';
		var i = 0;
		var items = data.library.items;
		var step = function() {
			if (i < items.length) {
				var id = items[i];
				store.getObject( id, function( obj, err ) {
					if ( err ) {
						callback( null, err );
					} else {
						media.renderEmbed( obj, params, function( itemHtml ) {
							html += '<div class="photo-entry">';
							html += itemHtml;
							html += '</div>';
							i++;
							step();
						});
					}
				});
			} else {
				//html += '</div>';
				callback( html, null );
			}
		};
		step();
	} else {
		callback( null, 'Invalid object type' );
	}
};

/**
 * Fetch or render an image file display of this object
 * Return it to caller as a stream and a content type.
 *
 * @param {CollabKitObject} obj
 * @param {object} params
 * @param {function(stream, contentType, err)} callback
 */
MediaProvider.prototype.renderPhoto = function( obj, params, callback ) {
	if ( obj.data.type == 'application/x-collabkit-photo' ) {
		var display = this.selectThumb( obj, params[1] );
		obj.getFile(display.src, function(stream, err) {
			callback( stream, display.type, err );
		}, 'stream');
	} else {
		callback( null, null, "Cannot load photo of non-photo object" );
	}
};

/**
 * Select either the main image size or a thumbnail based on requested size
 *
 * @param {CollabKitObject} obj
 * @param {String} size
 * @return {object} with size & source file name
 */
MediaProvider.prototype.selectThumb = function( obj, size ) {
	var size = size || 'original',
		photo = obj.data.photo,
		display;
	if (photo.thumbs && size in photo.thumbs) {
		display = photo.thumbs[size];
	} else {
		display = photo;
	}
	return grout.mix( {
		size: size
	}, display );
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
