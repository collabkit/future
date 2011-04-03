var util = require( 'util' ),
	events = require( 'events' );

function PageProvider( service ) {
	events.EventEmitter.call( this );
	service.mount( 'page' );
	service.server.on( 'request.page', function( req, res ) {
		res.writeHead( 200, { 'Content-Type': 'text/plain' } );
		res.end( 'Hello PageProvider\n' );
	} );
}
util.inherits( PageProvider, events.EventEmitter );

exports.PageProvider = PageProvider;
exports.create = function( service ) {
	return new PageProvider( service );
};
