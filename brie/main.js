// Create service
var service = require( './lib/server/service' ).create( { 'port': 8124 } );
// Attach providers
var providers = {
	'page': require( './lib/server/providers/page' ).create( service ),
	'data': require( './lib/server/providers/data' ).create( service ),
	'media': require( './lib/server/providers/media' ).create( service ),
	'resource': require( './lib/server/providers/resource' ).create( service ),
	'session': require( './lib/server/providers/session' ).create( service ),
};
