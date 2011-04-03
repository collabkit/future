var util = require( 'util' ),
	events = require( 'events' ),
	faye = require('faye');

function SessionProvider( service ) {
	events.EventEmitter.call( this );
	var bayeux = new faye.NodeAdapter( {
		'mount': '/:session',
		'timeout': 45
	} );
	bayeux.attach( service.server );
}
util.inherits( SessionProvider, events.EventEmitter );

exports.SessionProvider = SessionProvider;
exports.create = function( service ) {
	return new SessionProvider( service );
};
