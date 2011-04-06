window.app = new ( function() {
	
	var window = new ui.Window();
	var screen = new ui.Screen();
	
	screen.$header().append( '<button class="ui-button">Click me</button>' );
	
	var panel = new ui.Panel( $( '<section />' ) );
	screen.$sections().append( panel.$ );
	panel.$content().append( '<h1>hello content!</h1><p>1</p><p>2</p><p>3</p><p>4</p>' );
	
} )();
