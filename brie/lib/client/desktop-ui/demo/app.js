// Basic application structure
var header = new ui.Group( {
	'element': 'header',
	'orientation': 'horizontal',
	'classes': ['app-header']
} );
var sections = new ui.Group( {
	'element': 'section',
	'classes': ['app-sections']
} );
$( 'body' ).append( sections.$, header.$ );

// Group with buttons in the header
header.add( 'logo', new ui.Html( '<img src="graphics/collabkit-logo.svg" class="app-logo" />' ) );
header.add( 'search', new ui.Search( { 'placeholder': 'Search', 'classes': ['app-search'] } ) );
header.add( 'user-menu', new ui.Group( {
	'classes': ['app-user-menu'],
	'items': {
		'user': new ui.DropDown( {
			'text': 'Chuck Norris',
			'align': 'right',
			'menu': new ui.Menu( {
				'items': [
					new ui.Button( { 'text': 'Zero', 'press': function() {
						console.log( 'menu item 0' );
					} } ),
					{ 'text': 'One', 'select': function() {
						console.log( 'menu item 1' );
					} },
					{ 'text': 'Two - this is a longer menu item', 'select': function() {
						console.log( 'menu item 2' );
					} },
				    { 'classes': ['ui-menu-divider'] },
					{ 'text': 'Three', 'select': function() {
						console.log( 'menu item 3' );
					} },
					{ 'text': 'Four', 'select': function() {
						console.log( 'menu item 4' );
					} },
					{ 'text': 'Five', 'select': function() {
						console.log( 'menu item 5' );
					} },
					new ui.Search( {
						'placeholder': 'Search'
					} )
				]
			} )
		} )
	}
} ), 'fill' );

// Panel with test content as one of the sections
sections.add(
	'toolbar',
	new ui.Group( {
		'classes': ['app-toolbar'],
		'orientation': 'horizontal',
		'items': {
			'one': new ui.Button( { 'text': 'One', 'press': function() {
				console.log( 'button 1' );
			} } ),
			'two': new ui.Button( { 'text': 'Two', 'press': function() {
				console.log( 'button 2' );
			} } )
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
