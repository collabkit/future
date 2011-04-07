window.ui.Panel = function( $selection, options ) {
	
	/* Configuration */
	
	var configuration = {
		//
	};
	$.extend( configuration, options || {} );
	
	/* Setup */
	
	if ( $selection.children().size() ) {
		// Isolate existing contents and wrap everything in a panel
		$selection.children()
			.wrapAll( '<div class="ui-panel"><div class="ui-panel-content" /></div>' )
	} else {
		// Add content container for future contents to go into
		$selection.append( '<div class="ui-panel"><div class="ui-panel-content" /></div>' );
	}
	
	/* Private Members */
	
	var
		// Easy access to the real this inside closures
		that = this,
		// Cached measurements for panel, content, trough and handle
		panel = {}, content = {},
		// Panel - area where everything is rendered
		$panel = $selection.find( '.ui-panel:first' ),
		// Content - area being scrolled
		$content = $panel.find( '.ui-panel-content:first' );
	
	/* Methods */
	
	/**
	 * Gets the panel's root element.
	 * 
	 * @return jQuery Selection: Root panel element
	 */
	this.$ = function() {
		return $selection;
	};
	
	/**
	 * Gets the content element.
	 * 
	 * @return jQuery Selection: Content element
	 */
	this.$content = function() {
		return $content;
	};
	
	/**
	 * Move the content to a specific position.
	 * 
	 * @param position Number: Position to scroll to, in range of 0 .. this.scrollHeight()
	 * @return Number: New current scroll position, which may differ from position due to clamping
	 */
	this.scrollTo = function( position ) {
		//
	};
	
	/**
	 * Get the current scroll position.
	 * 
	 * @return Number: Current scroll position in range of 0 .. this.scrollHeight()
	 */
	this.scrollPosition = function() {
		//
	};
	
	/**
	 * Get the maximum scroll position
	 * 
	 * @return Number: Maximum scroll position
	 */
	this.scrollHeight = function() {
		//
	};
};
