var vows = require( 'vows' ),
	assert = require( 'assert' );

vows.describe( 'mix' )
	.addBatch( {
		'mix': {
			'topic': function() { return require( '../' ).mix; },
			'modifies the first object in the arguments list': function( mix ) {
				var a = { 'a': 1 };
				mix( a, { 'b': 2 } );
				assert.deepEqual( a, { 'a': 1, 'b': 2 } );
			},
			'returns the modified first argument': function( mix ) {
				var a = { 'a': 1 };
				var b = { 'b': 2 };
				var c = mix( a, b );
				assert.deepEqual( c, a );
			}
		}
	} )
	.export( module );
