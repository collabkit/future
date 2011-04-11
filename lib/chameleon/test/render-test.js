var vows = require( 'vows' ),
	assert = require( 'assert' ),
	grout = require( '../../grout' );

/**
 * Generates a vows batch for testing various input/output scenarios.
 * 
 * @param scenarios Object: List of behavior string/scenario object pairs. Each scenario object may
 * have either a set of "in" and "out" properties, or a single "inout" member if the input and
 * output are expected to be identical. Additionally, an "options" object may be used to specify
 * additional scenario specific rendering options.
 * @param options Object: List of rendering options, overridden by scenario specific ones.
 */
function makeBatch( scenarios, options ) {
	var batch = { 'topic': function() { return require( '../' ).render; } };
	grout.apply( scenarios, function( scenario, behavior ) {
		batch[behavior] = function( render )  {
			if ( 'inout' in scenario ) {
				assert.equal(
					render( scenario['inout'], grout.mix( {}, scenario.options, options ) ),
					scenario['inout']
				);
			} else if ( 'in' in scenario && 'out' in scenario ) {
				assert.equal(
					render( scenario['in'], grout.mix( {}, scenario.options, options ) ),
					scenario['out']
				);
			} else {
				throw 'Invalid scenario error. Expected: "in" and "out" or "inout" properties.';
			}
		};
	} );
	return batch;
}

vows.describe( 'render' ).addBatch( {
	'when rendering': makeBatch( {
		'templates can be defined and applied ': {
			'in': '<tpl:define template="b"><em>b</em></tpl:define>a<tpl:apply template="b" />c',
			'out': 'a<em>b</em>c'
		},
		'variables can be output as escaped text': {
			'in': 'a<var:text from="b" />c',
			'out': 'a&lt;em x=&quot;y&quot;&gt;b&amp;&apos;b&lt;/em&gt;c',
			'options': {
				'var': { 'b': '<em x="y">b&\'b</em>' }
			}
		},
		'variables can be output as raw HTML': {
			'in': 'a<var:html from="b" />c',
			'out': 'a<em x="y">b&amp;&apos;b</em>c',
			'options': {
				'var': { 'b': '<em x="y">b&amp;&apos;b</em>' }
			}
		},
		'messages can be output as escaped text': {
			'in': 'a<msg:text from="b" />c',
			'out': 'a&lt;em x=&quot;y&quot;&gt;b&amp;&apos;b&lt;/em&gt;c',
			'options': {
				'msg': function( k, a ) { return '<em x="y">b&\'b</em>'; }
			}
		},
		'messages can be output as raw HTML': {
			'in': 'a<msg:html from="b" />c',
			'out': 'a<em x="y">b&amp;&apos;b</em>c',
			'options': {
				'msg': function( k, a ) { return '<em x="y">b&amp;&apos;b</em>'; }
			}
		},
		'messages arguments are passed through callback': {
			'in': '<msg:text from="a"><msg:arg>b</msg:arg><msg:arg>c</msg:arg></msg:text>',
			'out': 'b-c',
			'options': {
				'msg': function( k, a ) { return a.join( '-' ); }
			}
		},
		'valid HTML makes a clean round trip': {
			'inout': '<p b="2" a="1"><div><span>test</span></div></p>'
		},
		'invalid HTML becomes normalized': {
			'in': '<strong>Hello <em>World</strong></em>',
			'out': '<strong>Hello <em>World</em></strong>'
		}
	} ),
	'when cleaning': makeBatch( {
		'non-functional whitespace is removed': {
			'in': '<em>Hello     </em>World',
			'out': '<em>Hello </em>World'
		},
		'comments are removed': {
			'in': 'Hello <!-- comment -->World',
			'out': 'Hello World'
		},
		'Internet Explorer conditional comments are preserved': {
			'inout': 'Test<!--[if lt IE 6]--> for <!--[endif]--> IE comments',
		},
		'text within PRE elements is not changed': {
			'inout': '<pre>Test\n\twhitespace\n\t\t\tpreservation</pre>'
		},
		'text within TEXTAREA elements is not changed': {
			'inout': '<textarea>Test\n\t   whitespace\n\t\t   \tpreservation</textarea>'
		}
	}, { 'clean': true } )
} ).export( module );
