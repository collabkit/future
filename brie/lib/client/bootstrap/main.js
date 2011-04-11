/**
 * Client Module
 * 
 * Missing functionality for web browsers.
 */

/*
 * CommonJS Module/1.0 implementation + asynchronous dynamic loading
 */
function require( name, callback ) {
	if ( typeof callback === 'function' ) {
		try {
			callback( require.execute( name ) );
		} catch ( e ) {
			if ( !( name in require.registrations ) ) {
				throw new Error( 'Missing registration error. "' + name + '" is not registered.' );
			}
			jQuery.getScript( require.registrations[name], function() {
				callback( require.execute( name ) );
			} );
		}
		return;
	}
	return require.execute( name );
}
require.execute = function( name ) {
	if ( name in require.implementations ) {
		if ( typeof require.implementations[name] === 'function' ) {
			// Execute on demand
			require.implementations[name] = require.implementations[name]();
		}
		return require.implementations[name];
	}
	throw new Error( 'Missing implementation error. "' + name + '" is not implemented.' );
}
require.registrations = {};
require.register = function ( name, file ) {
	require.registrations[name] = file;
};
require.implementations = {};
require.implement = function ( name, module ) {
	require.implementations[name] = module;
};
