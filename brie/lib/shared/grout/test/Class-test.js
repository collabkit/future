var vows = require( 'vows' ),
	assert = require( 'assert' );

vows.describe( 'Class' )
	.addBatch( {
		'Class': {
			'topic': function() { return require( '../' ).Class; },
			'creates a named class constructor on a target object': function( Class ) {
				var target = {};
				Class( target, 'Test', {} );
				assert.strictEqual( typeof target.Test, 'function' );
			},
			'uses adds model.has properties as members of constructed objects': function( Class ) {
				var target = {};
				Class( target, 'Test', { 'has': { 'a': 1 } } );
				var test = new target.Test();
				assert.strictEqual( test.a, 1 );
			},
			'uses adds model.can properties as methods of constructed objects': function( Class ) {
				var target = {};
				Class( target, 'Test', { 'can': { 'a': function() { return 1; } } } );
				var test = new target.Test();
				assert.strictEqual( test.a(), 1 );
			}
		}
	} )
	.export( module );
