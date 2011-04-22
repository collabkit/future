var util = require( 'util' ),
	events = require( 'events' );

/**
 * URL patterns
 *
 * GET:
 * /:data/[commit-id]
 * /:data/branch/[branch-name]
 * /:data/history/[commit-id]
 *
 * POST:
 * /:data/new
 * /:data/commit/[parent-commit-id]
 * /:data/merge/[commit-id-1]/[commit-id-2]
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
			//
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
