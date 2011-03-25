var vows = require( 'vows' ),
	assert = require( 'assert' );

vows.describe( 'render' )
	.addBatch( {
		'when rendering': {
			'topic': function() { return require( '../' ).render; },
			'valid HTML makes a clean round trip': function( render ) {
				var html = '<p b="2" a="1"><div><span>test</span></div></p>';
				assert.equal( render( html ), html );
			},
			'invalid HTML becomes normalized': function( render ) {
				assert.equal(
					render( '<strong>Hello <em>World</strong></em>' ),
					'<strong>Hello <em>World</em></strong>'
				);
			}
		},
		'when rendering and cleaning': {
			'topic': function() { return require( '../' ).render; },
			'non-functional whitespace is removed': function( render ) {
				assert.equal(
					render( '<em>Hello     </em>World', { 'clean': true } ),
					'<em>Hello </em>World'
				);
			},
			'comments are removed': function( render ) {
				assert.equal(
					render( 'Hello <!-- comment -->World', { 'clean': true } ),
					'Hello World'
				);
			},
			'Internet Explorer conditional comments are preserved': function( render ) {
				var html = 'Test<!--[if lt IE 6]--> for <!--[endif]--> IE comments';
				assert.equal( render( html, { 'clean': true } ), html );
			},
			'text within PRE elements is not changed': function( render ) {
				var html = '<pre>Test\n\twhitespace\n\t\t\tpreservation</pre>';
				assert.equal( render( html, { 'clean': true } ), html );
			},
			'text within TEXTAREA elements is not changed': function( render ) {
				var html = '<textarea>Test\n\twhitespace\n\t\t\tpreservation</textarea>';
				assert.equal( render( html, { 'clean': true } ), html );
			}
		}
	} )
	.export( module );