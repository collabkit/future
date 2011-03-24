var vows = require( 'vows' ),
	assert = require( 'assert' );

vows.describe( 'createClass' )
	.addBatch( {
		'createClass': {
			'topic': function() { return require( '../' ).createClass; },
			'returns a class constructor function': function( createClass ) {
				var Class = createClass( {} );
				assert.strictEqual( typeof Class, 'function' );
			},
			'uses model.has members for property getter/setter methods': function( createClass ) {
				var Class = createClass( { 'has': { 'a': 1 } } );
				assert.strictEqual( typeof Class, 'function' );
			},
			'uses model.can members for methods': function( createClass ) {
				var Class = createClass( { 'can': { 'a': function() { return 1; } } } );
				var obj = new Class();
				assert.strictEqual( obj.a(), 1 );
			}
		}
	} )
	.export( module );