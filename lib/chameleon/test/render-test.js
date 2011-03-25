var vows = require( 'vows' ),
	assert = require( 'assert' );

vows.describe( 'render' )
	.addBatch( {
		'render': {
			'topic': function() { return require( '../' ).render; },
			'returns the same valid HTML that it receives': function( render ) {
				var html = '<p b="2" a="1"><div><span>test</span></div></p>';
				assert.equal( render( html ), html );
			},
			'normalizes document structure': function( render ) {
				assert.equal(
					render( '<strong>Hello <em>World</strong></em>' ),
					'<strong>Hello <em>World</em></strong>'
				);
			},
			'removes comments when cleaning': function( render ) {
				assert.equal(
					render( 'Hello <!-- comment -->World', { 'clean': true } ),
					'Hello World'
				);
			},
			'protects Internet Explorer conditional comments when cleaning': function( render ) {
				var html = 'Test<!--[if lt IE 6]--> for <!--[endif]--> IE comments';
				assert.equal( render( html, { 'clean': true } ), html );
			},
			'protects whitespace in PRE elements when cleaning': function( render ) {
				var html = '<pre>Test\n\twhitespace\n\t\t\tpreservation</pre>';
				assert.equal( render( html, { 'clean': true } ), html );
			},
			'protects whitespace in TEXTAREA elements when cleaning': function( render ) {
				var html = '<textarea>Test\n\twhitespace\n\t\t\tpreservation</textarea>';
				assert.equal( render( html, { 'clean': true } ), html );
			},
		}
	} )
	.export( module );