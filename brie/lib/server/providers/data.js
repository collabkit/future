var util = require( 'util' ),
	events = require( 'events' );

function DataProvider( service ) {
	events.EventEmitter.call( this );
	service.mount( 'data' );
	service.server.on( 'request.data', function( req, res ) {
		res.writeHead( 200, { 'Content-Type': 'text/plain' } );
		res.end( 'Hello DataProvider\n' );
	} );
}
util.inherits( DataProvider, events.EventEmitter );

exports.DataProvider = DataProvider;
exports.create = function( service ) {
	return new DataProvider( service );
};
