window.ui.Screen = function( options ) {
	
	/* Configuration */
	
	var configuration = {
		// default configuration
	};
	$.extend( configuration, options || {} )
	
	/* Private Members */
	
	var
		// Easy access to the real this inside closures
		that = this,
		// Head - where navigation and headings are rendered
		$header = $( '<header class="ui-screen-header" />' ),
		// Body - where content sections are rendered
		$sections = $( '<section class="ui-screen-sections" />' ),
		// Foot - where meta information is rendered
		$footer = $( '<footer class="ui-screen-footer" />' ),
		// Cache body selection
		$body = $( 'body' );
	
	/* Setup */
	
	$body
		.addClass( 'ui-screen' )
		.append( $header, $sections, $footer );
	
	/* Methods */
	
	/**
	 * Gets the screen's root element.
	 * 
	 * @return jQuery Selection: Root screen element
	 */
	this.$ = function() {
		return $body;
	};
	
	/**
	 * Gets the header element.
	 * 
	 * @return jQuery Selection: Header element
	 */
	this.$header = function() {
		return $header;
	};
	
	/**
	 * Gets the sections element.
	 * 
	 * @return jQuery Selection: Sections element
	 */
	this.$sections = function() {
		return $sections;
	};
	
	/**
	 * Gets the footer element.
	 * 
	 * @return jQuery Selection: Footer element
	 */
	this.$footer = function() {
		return $footer;
	};
};
