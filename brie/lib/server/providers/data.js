var util = require( 'util' ),
	events = require( 'events' ),
	logger = require( '../logger' ).create( 'MediaProvider' );

/**
 * URL patterns
 *
 * GET /:data/[branch-name|commit-id]
 *  Returns the JSON data from the given object version.
 *
 * GET /:data/history/[branch-name|commit-id]
 *  Return the commit history tree as JSON data (format?)
 *
 * PUT /:data/new
 *	Create a new thingy from scratch!
 *
 * PUT /:data/[branch-name]
 *  Save a new version of this object's data and update the branch.
 *  Request body: JSON data for the new object version.
 *
 * PUT /:data/[branch-name]/[branch-name-2|commit-id-2]
 *  Save a new version of this object's data and update the branch,
 *  marking history as a merge with the other given branch/commit.
 *  Request body: JSON data for the new object version.
 */
function DataProvider( service ) {
	events.EventEmitter.call( this );
	var reBlobId = /^[0-9a-f]{1,40}$/;
	var provider = this;
	var store = this.store = service.store;

	service.mount( 'data' );
	service.server.on( 'request.data', function( req, res ) {
		var fail = function( msg, code ) {
			res.writeHead( code || 500, {'Content-Type': 'text/plain'});
			res.end( 'Error: ' + msg );
			return null;
		};
		// @fixme ideally the URL mapper should be able to divide this down further first
		if ( typeof req.parsedUrl.target !== 'string' ) {
			return fail( "No path given." );
		}
		var path = req.parsedUrl.target.split( '/' );

		if (path.length < 1) {
			return fail( 'need some params' );
		}
		var first = path[0];

		// Common callback function to dump JSON data from a fetched object.
		var dumpObject = function( obj, err ) {
			if ( err ) {
				fail( err );
			} else {
				res.writeHead( 200, { 'Content-Type': 'application/json' } );
				res.end( JSON.stringify( {
					id: obj.version,
					parents: obj.parents,
					data: obj.data
				} ) );
			}
		};

		if (reBlobId.exec(first)) {
			store.getObject(first, dumpObject);
		} else if (first == 'collabkit-library') {
			if (req.method == 'PUT') {
				var str = '';
				req.on('data', function(buf) {
					str += buf.toString('utf-8');
				});
				req.on('end', function() {
					try {
						var data = JSON.parse(str);
					} catch (e) {
						logger.fail(e);
						logger.trace(str);
					} finally {
						store.updateObjectRef('refs/heads/collabkit-library', {}, data, dumpObject);
					}
				});
			} else {
				store.initLibrary(dumpObject);
			}
		} else if (first == 'history') {
			var id = path[1];
			if (reBlobId.exec(id)) {
				provider.showHistory(id, res);
			} else if (id == 'collabkit-library') {
				store.getBranchRef('refs/heads/collabkit-library', function(id, err) {
					provider.showHistory(id, res);
				});
			} else {
				throw 'blaaaaaah';
			}
		} else if (first == 'merge') {
			// combine whee
		}
		return null;
	} );
}
util.inherits( DataProvider, events.EventEmitter );

/**
 * @param {String} id
 * @param {Stream} res
 */
DataProvider.prototype.showHistory = function(id, res) {
	var max = 100;
	var store = this.store;
	store.getCommit(id, function(commit, err) {
		res.writeHead( 200, { 'Content-Type': 'application/json' } );
		res.end(JSON.stringify({
			id: commit.id,
			commit: commit.props
		}));
	});
}

exports.DataProvider = DataProvider;
exports.create = function( service ) {
	return new DataProvider( service );
};
