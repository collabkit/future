ui.Window = function( options ) {
	
	/* Configuration */
	
	var configuration = {
		// default configuration
	};
	$.extend( configuration, options || {} )
	
	/* Private Members */
	
	var
		// Easy access to the real this inside closures
		that = this,
		// Cache document and window selections
		$document = $( document ), $window = $( window );
	
	/* Methods */
	
	/**
	 * Gets the window's root element.
	 * 
	 * @return jQuery Selection: Root window element
	 */
	this.$ = function() {
		return $window;
	};
};
