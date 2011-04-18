var options = {
    port: 8124
};
var args = require( 'argsparser' ).parse();
if ( '--port' in args ) {
    var port = parseInt( args['--port'] );
    if ( port && port > 0 && port < 65536 ) {
        options.port = port;
    } else {
        throw 'Invalid listening port ' + port;
    }
}
if ( '--git-repo' in args ) {
	options.gitPath = args['--git-repo'];
}
if ( '--help' in args ) {
    console.log('--port <number> (default 8124)\n\tSet HTTP server listening port');
    console.log('--git-repo <path> (default current dir)\n\tStore data in the given git repository');
    console.log('--help\n\tshow this help and exit');
    process.exit(0);
}

// Create service
var service = require( './lib/server/service' ).create( options );
// Attach providers
var providers = {
	'page': require( './lib/server/providers/page' ).create( service ),
	'data': require( './lib/server/providers/data' ).create( service ),
	'media': require( './lib/server/providers/media' ).create( service ),
	'resource': require( './lib/server/providers/resource' ).create( service ),
	'session': require( './lib/server/providers/session' ).create( service ),
};
