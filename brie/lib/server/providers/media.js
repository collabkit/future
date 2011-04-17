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
	var store = this.store;
	store.getCommit( id, function(commit, err) {
		if ( err ) {
			console.log('Failure fetching commit: ' + err);
			res.writeHead( 500, { 'Content-Type': 'text/plain' });
			res.end( 'Internal error or not found or something.' );
			return;
		}
		store.getTree( commit.tree, function( tree, err ) {
			if ( err ) {
				console.log('Failure fetching tree: ' + err);
				res.writeHead( 500, { 'Content-Type': 'text/plain' });
				res.end( 'Internal error or not found or something.' );
				return;
			}
			tree.getBlob('data.json', function(data, err) {
				if ( err ) {
					console.log('Failure fetching data blob: ' + err);
					res.writeHead( 500, { 'Content-Type': 'text/plain' });
					res.end( 'Internal error or not found or something.' );
					return;
				}
				if (data.type != 'application/x-collabkit-photo') {
					res.writeHead( 400, { 'Content-Type': 'text/plain' });
					res.end( 'Wrong object type: not a photo' );
					return;
				}
				if (data.photo.src && data.photo.type) {
					var stream = tree.streamBlob(data.photo.src);
					res.writeHead( 200, { 'Content-Type': data.photo.type });
					stream.pipe( res );
				} else {
					res.writeHead( 404, {'Content-Type': 'text/plain' });
					res.end( 'Not found' );
				}
			});
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
	store.createBlobFromStream(req, function( imgBlobId, err ) {
		if (err) {
			console.log('Media upload blob save failure: ' + err);
			res.writeHead( 500, {'Content-Type': 'text/plain'});
			res.end('Internal error saving file blob.');
			return;
		}
		var obj = {
			type: 'application/x-collabkit-photo',
			photo: {
				type: contentType,
				src: filename
				// todo: put width, height, other metadata in here!
				// means we need to understand the image file format
				// and read it in before we create the data. :D
			}
		};
		store.createBlob(obj, function(objBlobId, err) {
			if (err) {
				console.log('Metadata blob save failure: ' + err);
				res.writeHead( 500, {'Content-Type': 'text/plain'});
				res.end('Internal error saving data blob.');
				return;
			}
			store.createTree([
				{mode: '100664', type: 'blob', id: objBlobId, name: 'data.json'},
				{mode: '100664', type: 'blob', id: imgBlobId, name: filename}
			], function( treeId, err ) {
				if (err) {
					console.log('Media upload tree save failure: ' + err);
					res.writeHead( 500, {'Content-Type': 'text/plain'});
					res.end('Internal error saving file tree.');
					return;
				}
				store.createCommit({
					tree: treeId,
					parents: [], // first version upload!
					desc: 'web upload: ' + filename
				}, function(commitId, err) {
					if (err) {
						console.log('Media upload tree save failure: ' + err);
						res.writeHead( 500, {'Content-Type': 'text/plain'});
						res.end('Internal error saving file commit.');
						return;
					}
					var targetUrl = '/:media/' + commitId;
					// @fixme this should be 303, but we can't read the redirect without fetching it. Grr!
					res.writeHead( 200, {
						'Content-Type': 'text/html',
						'Location': targetUrl
					} );
					res.end( '<p>New file uploaded as <a href="' + targetUrl + '">' + targetUrl + '</a></p>\n' );
				});
			});
		});
	});
};

exports.MediaProvider = MediaProvider;
exports.create = function( service ) {
	return new MediaProvider( service );
};
