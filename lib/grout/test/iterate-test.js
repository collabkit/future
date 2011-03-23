var vows = require( 'vows' ),
	assert = require( 'assert' );

vows.describe( 'iterate' )
	.addBatch( {
		'iterate': {
			'topic': function() { return require( '../' ).iterate; },
			'can modify the object': function( iterate ) {
				var obj = { 'a': 1, 'b': 2 };
				iterate( obj, function( v, i ) {
					this[i] = v + 5;
				} );
				assert.deepEqual( obj, { 'a': 6, 'b': 7 } );
			},
			'can remove members from the object': function( iterate ) {
				var obj = { 'a': 1, 'b': 2 };
				iterate( obj, function( v, i ) {
					if ( i == 'b' ) {
						delete this[i];
					}
				} );
				assert.deepEqual( obj, { 'a': 1 } );
			},
			'can add members to the object': function( iterate ) {
				var obj = { 'a': 1 };
				iterate( obj, function( v, i ) {
					this[i + i] = v;
				} );
				assert.deepEqual( obj, { 'a': 1, 'aa': 1 } );
			}
		}
	} )
	.export( module );