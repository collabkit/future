// Basic application structure
var header = new ui.Group( {
	'element': 'header',
	'classes': ['app-header']
} );
var sections = new ui.Group( {
	'element': 'section',
	'classes': ['app-sections']
} );
$( 'body' ).append( sections.$, header.$, overlays.$ );

// Group with buttons in the header
header.add(
	'logo',
	new ui.Html( '<img src="graphics/collabkit-logo.svg" class="app-logo" />' )
);

// Panel with test content as one of the sections
sections.add(
	'toolbar',
	new ui.Group( {
		'classes': ['app-toolbar'],
		'orientation': 'horizontal',
		'items': {
			'one': new ui.Button( { 'text': 'One' } ),
			'two': new ui.Button( { 'text': 'Two' } ),
			'three': new ui.DropDown( {
				'text': 'Three',
				'list': new ui.List( {
					'items': {
						'one': new ui.Button( { 'text': 'One' } ),
						'two': new ui.Button( { 'text': 'Two - this is a longer menu item' } ),
						'three': new ui.Button( { 'text': 'Three' } ),
						'four': new ui.Button( { 'text': 'Four' } ),
						'five': new ui.Button( { 'text': 'Five' } ),
					}
				} )
			} )
		}
	} ),
	'5em'
);
sections.add(
	'content',
	new ui.Panel( {
		'classes': ['app-content'],
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