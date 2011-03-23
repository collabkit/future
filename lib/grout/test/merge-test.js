var vows = require( 'vows' ),
	assert = require( 'assert' );

vows.describe( 'merge' )
	.addBatch( {
		'merge': {
			'topic': function() { return require( '../' ).merge; },
			'can copy members from one object into another object': function( merge ) {
				var from = { 'a': 1 };
				var into = { 'b': 2 };
				merge( from, into );
				assert.deepEqual( into, { 'a': 1, 'b': 2 } );
			},
			'does not modify the source object': function( merge ) {
				var from = { 'a': 1 };
				var into = { 'b': 2 };
				merge( from, into );
				assert.deepEqual( from, { 'a': 1 } );
			}
		}
	} )
	.export( module );