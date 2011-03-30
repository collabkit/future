var vows = require( 'vows' ),
	assert = require( 'assert' );

vows.describe( 'mix' )
	.addBatch( {
		'mix': {
			'topic': function() { return require( '../' ).mix; },
			'can mix two objects into a new one': function( mix ) {
				var c = mix( { 'a': 1 }, { 'b': 2 } );
				assert.deepEqual( c, { 'a': 1, 'b': 2 } );
			},
			'does not modify the source objects': function( mix ) {
				var a = { 'a': 1 };
				var b = { 'b': 2 };
				var c = mix( a, b );
				assert.deepEqual( a, { 'a': 1 } );
				assert.deepEqual( b, { 'b': 2 } );
			}
		}
	} )
	.export( module );
