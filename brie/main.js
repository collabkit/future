var logger = require( './lib/server/logger' );
var options = {
	port: 8124
};
var args = require( 'argsparser' ).parse();
if ( 'C9_PORT' in process.env ) {
	options.port = process.env.C9_PORT;
} else if ( '--port' in args ) {
	var port = parseInt( args['--port'], 10 );
	if ( port && port > 0 && port < 65536 ) {
		options.port = port;
	} else {
		throw 'Invalid listening port ' + port;
	}
}
if ( '--latency' in args ) {
	var latency = parseInt( args['--latency'], 10 );
	if (latency && latency > 0) {
		options.latency = latency;
	} else {
		throw 'Invalid latency ' + latency;
	}
}
if ( '--git-repo' in args ) {
	options.gitPath = args['--git-repo'];
}
if ( '--help' in args ) {
	console.log('--port <number> (default 8124)\n\tSet HTTP server listening port');
	console.log('--latency <milliseconds> (default 0)\n\tSimulate latency on all HTTP hits');
	console.log('--git-repo <path> (default current dir)\n\tStore data in the given git repository');
	console.log('--help\n\tshow this help and exit');
	console.log('--verbose\n\tshow all logging, including failures, warnings, successes and traces');
	console.log('--quiet\n\thide most logging, showing failures only');
	process.exit(0);
}
if ( '--verbose' in args ) {
	logger.setVerbosity( 2 );
} else if ( '--quiet' in args ) {
	logger.setVerbosity( 0 );
}

// Ensure relative paths are consistent
process.chdir( __dirname );
// Create service
var service = require( './lib/server/service' ).create( options );
// Attach providers
var providers = {
	'page': require( './lib/server/providers/page' ).create( service ),
	'data': require( './lib/server/providers/data' ).create( service ),
	'media': require( './lib/server/providers/media' ).create( service ),
	'resource': require( './lib/server/providers/resource' ).create( service ),
	'session': require( './lib/server/providers/session' ).create( service )
};

providers.resource.addHandler( '.less', require( './lib/server/handlers/less' ).render );
providers.resource.addHandler( '.js', require( './lib/server/handlers/uglifyjs' ).render );
