window.app = new ( function() {

	var screen = new ui.Screen();
	
	screen.$header().append( '<button class="ui-button">Click me</button>' );
	
	var panel = new ui.Panel( $( '<section />' ) );
	screen.$sections().append( panel.$ );
	panel.$content()
		.append( '<h1>h1</h1><h2>h2</h2><h3>h3</h3><h4>h4</h4><h5>h5</h5><h6>h6</h6>' )
		.append( '<p>p</p><ul><li>li</li></ul>' )
		.append( '<pre>pre</pre>' )
		.append( '<b>b</b> <i>i</i> <s>s</s> <u>u</u> ' )
		.append( '<span>span</span> <strong>strong</strong> <em>em</em> <strike>strike</strike>' );

} )();
