
/**
 * Service
 * 
 * A service provides access to one or more providers, each "mounted" at a different point in the
 * URL's path. 
 * 
 * @returns {Service}
 */
function Service( options ) {
	
	/* Members */
	
	var server = require( 'http' ).createServer();
	var routing = {
		'source': 'pathname',
		'pattern': /\/(?:\:([a-z]+))?(?:\/\:([a-z]+))?(?:\/(.*))?/,
		'targets': { 'service': 1, 'app': 2, 'target': 3 }
	};
	
	/* Private Members */
	
	var providers = [];
	
	/* Members */
	
	this.server = server;
	var storeOpts = {};
	if (options && 'gitPath' in options) {
		storeOpts.path = options.gitPath;
	}
	this.store = require( './collabkitstore.js' ).create(storeOpts);
	
	/* Methods */
	
	this.mount = function( name ) {
		if ( name in providers ) {
			throw "Duplicate provider error. Cannot attach, a provider exists by the name: " + name;
		}
		providers.push( name );
		return this;
	};
	
	this.unmount = function( name ) {
		var i = providers.indexOf( name );
		if ( i === -1 ) {
			throw "Missing provider error. Cannot detach, no provider exists by the name: " + name
		}
		providers.splice( i, 1 );
		return this;
	};
	
	/* Initialization */
	
	server.on( 'request', function( req, res ) {
		// URL Parsing
		var url = require( 'url' ).parse( req.url );
		if ( routing.source in url ) {
			var matches = url[routing.source].match( routing.pattern );
			if ( matches !== null ) {
				for ( target in routing.targets ) {
					if ( typeof matches[routing.targets[target]] === 'string' ) {
						url[target] = matches[routing.targets[target]];
					}
				}
			}
		}
		// Service provider selection
		if ( providers.length === 0 ) {
			throw "Nowhere to go error. No providers have been mounted.";
		}
		if ( !( 'service' in url ) ) {
			url.service = providers[0];
		}
		if ( providers.indexOf( url.service ) === -1 ) {
			throw "Unknown provider error. No provider exists by the name: " + url.service;
		}
		req.parsedUrl = url;
		// Sub-request event triggering
		server.emit( 'request.' + url.service, req, res );
	} );
	server.listen( options.port );
}

exports.Service = Service;
exports.create = function( options ) {
	return new Service( options );
};
