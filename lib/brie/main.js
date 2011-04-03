// Create service
var service = require( './system/server/service' ).create( { 'port': 8124 } );
// Attach providers
var providers = {
	'page': require( './system/server/providers/page' ).create( service ),
	'data': require( './system/server/providers/data' ).create( service ),
	'media': require( './system/server/providers/media' ).create( service ),
	'resource': require( './system/server/providers/resource' ).create( service ),
	'session': require( './system/server/providers/session' ).create( service ),
};
