// Basic application structure
var header = new ui.Group( {
	'element': 'header',
	'classes': ['app-header']
} );
var sections = new ui.Group( {
	'element': 'section',
	'classes': ['app-sections']
} );
$( 'body' ).append( sections.$, header.$ );

// Group with buttons in the header
header.add( 'buttons', new ui.Html( '<h1>collabkit</h1>' ) );

// Panel with test content as one of the sections
sections
	.add(
		'toolbar',
		new ui.Group( {
			'widgets': {
				'one': new ui.Button( { 'text': 'One' } ),
				'two': new ui.Button( { 'text': 'Two' } ),
				'three': new ui.Button( { 'text': 'Three' } ),
			},
			'orientation': 'horizontal'
		} ),
		'5em'
	)
	.add(
		'content',
		new ui.Panel( {
			'html': '\
				<h1>h1</h1><h2>h2</h2><h3>h3</h3><h4>h4</h4><h5>h5</h5><h6>h6</h6>\
				<p>p</p><ul><li>li</li></ul>\
				<pre>pre</pre>\
				<b>b</b> <i>i</i> <s>s</s> <u>u</u>\
				<span>span</span> <strong>strong</strong> <em>em</em> <strike>strike</strike>\
				'
		} ),
		'fill'
	);
