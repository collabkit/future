var util = require( 'util' ),
	events = require( 'events' );

function MediaProvider( service ) {
	events.EventEmitter.call( this );
	service.mount( 'media' );
	service.server.on( 'request.media', function( req, res ) {
		res.writeHead( 200, { 'Content-Type': 'text/plain' } );
		res.end( 'Hello MediaProvider\n' );
	} );
}
util.inherits( MediaProvider, events.EventEmitter );

exports.MediaProvider = MediaProvider;
exports.create = function( service ) {
	return new MediaProvider( service );
};
