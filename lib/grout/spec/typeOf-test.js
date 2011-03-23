var vows = require( 'vows' ),
	assert = require( 'assert' );

vows.describe( 'typeOf' )
	.addBatch( {
		'typeOf describes': {
			'topic': function() { return require( '../' ).typeOf; },
			// Function
			'a constructed function as "function"': function( typeOf ) {
				assert.equal( typeOf( new Function() ), 'function' );
			},
			'a declared function as "function"': function( typeOf ) {
				assert.equal( typeOf( function() { } ), 'function' );
			},
			// Arguments
			'an arguments object within function as "arguments"': function( typeOf ) {
				assert.equal( typeOf( ( function() { return arguments; } )() ), 'arguments' );
			},
			// Null
			'null as "null"': function( typeOf ) {
				assert.equal( typeOf( null ), 'null' );
			},
			// Object
			'a constructed object as "object"': function( typeOf ) {
				assert.equal( typeOf( new Object() ), 'object' );
			},
			'a declared object as "object"': function( typeOf ) {
				assert.equal( typeOf( {} ), 'object' );
			},
			// Array
			'a constructed array as "array"': function( typeOf ) {
				assert.equal( typeOf( new Array() ), 'array' );
			},
			'a declared array as "array"': function( typeOf ) {
				assert.equal( typeOf( [] ), 'array' );
			},
			// String
			'a constructed string as "string"': function( typeOf ) {
				assert.equal( typeOf( new String() ), 'string' );
			},
			'a declared string as "string"': function( typeOf ) {
				assert.equal( typeOf( '' ), 'string' );
			},
			// Number
			'a constructed number as "number"': function( typeOf ) {
				assert.equal( typeOf( new Number() ), 'number' );
			},
			'a declared integer as "number"': function( typeOf ) {
				assert.equal( typeOf( 0 ), 'number' );
			},
			'a declared float as "number"': function( typeOf ) {
				assert.equal( typeOf( 0.0 ), 'number' );
			},
			// Boolean
			'a constructed boolean as "boolean"': function( typeOf ) {
				assert.equal( typeOf( new Boolean() ), 'boolean' );
			},
			'a declared boolean true as "boolean"': function( typeOf ) {
				assert.equal( typeOf( true ), 'boolean' );
			},
			'a declared boolean false as "boolean"': function( typeOf ) {
				assert.equal( typeOf( false ), 'boolean' );
			},
			// Undefined
			'an undefined value as "undefined"': function( typeOf ) {
				assert.equal( typeOf( undefined ), 'undefined' );
			},
		}
	} )
	.export( module );
