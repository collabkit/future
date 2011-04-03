var util = require( 'util' ),
	events = require( 'events' );

function ResourceProvider( service ) {
	events.EventEmitter.call( this );
	service.mount( 'resource' );
	service.server.on( 'request.resource', function( req, res ) {
		res.writeHead( 200, { 'Content-Type': 'text/plain' } );
		res.end( 'Hello ResourceProvider\n' );
	} );
}
util.inherits( ResourceProvider, events.EventEmitter );

exports.ResourceProvider = ResourceProvider;
exports.create = function( service ) {
	return new ResourceProvider( service );
};
