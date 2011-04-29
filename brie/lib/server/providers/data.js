var util = require( 'util' ),
	events = require( 'events' );

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
		if (reBlobId.exec(first)) {
			store.getObject(first, function( obj, err ) {
				if ( err ) {
					return fail( err );
				}
				res.writeHead( 200, { 'Content-Type': 'application/json' } );
				res.end( JSON.stringify(obj.data) );
			});
		} else if (first == 'commit') {
			// update zee data!!!
			
		} else if (first == 'merge') {
			// combine whee
		}
		return null;
	} );
}
util.inherits( DataProvider, events.EventEmitter );

/**
 * HTTP request event handler for media list (hack hack)
 *
 * @param {http.ServerRequest} req
 * @param {http.ServerResponse} res
 * @param {string} version
 */
DataProvider.prototype.handleGet = function( req, res, version ) {
	var fail = function( msg, code ) {
		res.writeHead( code || 500, {'Content-Type': 'text/plain'});
		res.end( 'Error: ' + msg );
		return null;
	};
	this.store.getObject( version, function( obj, err ) {
		if ( err ) {
			return fail( err );
		}
		res.writeHead( 200, {'Content-Type': 'application/json'} );
		res.end( JSON.stringify( obj.data ) );
	} );
};

exports.DataProvider = DataProvider;
exports.create = function( service ) {
	return new DataProvider( service );
};
