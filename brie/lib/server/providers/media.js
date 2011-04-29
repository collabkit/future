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
 */
MediaProvider.prototype.handleGet = function( req, res, id ) {
	var fail = function( msg, code ) {
		logger.fail('media get error: ' + msg);
		res.writeHead( code || 500, {'Content-Type': 'text/plain'});
		res.end( 'Error: ' + msg );
		return null;
	};
	var store = this.store;
	store.getObject( id, function(obj, err) {
		if ( err ) {
			return fail( err );
		}
		var data = obj.data;
		if (data.type == 'application/x-collabkit-photo') {
			obj.getFile(data.photo.src, function(stream, err) {
				if ( err ) {
					fail( err );
				} else {
					res.writeHead( 200, {'Content-Type': data.photo.type});
					stream.pipe( res );
				}
			}, 'stream');
		} else {
			fail( 'Invalid object type' );
		}
	});
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
			type: contentType,
			src: filename
			// todo: put width, height, other metadata in here!
			// means we need to understand the image file format
			// and read it in before we create the data. :D
		}
	});
	obj.addFile(filename, req, 'stream');
	obj.commit({}, function( photo, err ) {
		if ( err ) {
			fail( err );
		} else {
			// hack hack... add to the library
			store.initLibrary(function(obj, err) {
				if (err) {
					fail( err );
				}
				// hack... should work for now
				var old = obj.version;
				console.log('photo is', photo);
				console.log('old library', obj);
				var updated = obj.fork();
				console.log('photo.version', photo.version);
				console.log('updated.data.library.items', updated.data.library.items);
				updated.data.library.items.push(photo.version);
				console.log('updated.data.library.items', updated.data.library.items);
				console.log('updated.data.library', updated.data.library);
				console.log('updated.data', updated.data);
				console.log('committing...', updated);
				updated.commit({}, function(library, err) {
					if (err) {
						return fail( err );
					}
					store.updateBranchRef('refs/heads/collabkit-library', updated.version, old, function(ok, err) {
						if (err) {
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
			});
		}
	});
};

exports.MediaProvider = MediaProvider;
exports.create = function( service ) {
	return new MediaProvider( service );
};
