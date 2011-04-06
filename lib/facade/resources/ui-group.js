ui.Group = function( $selection, options ) {
	
	/* Configuration */
	
	var configuration = {
		// default configuration
	};
	$.extend( configuration, options || {} )
	
	/* Private Members */
	
	var
		// Easy access to the real this inside closures
		that = this,
		// List of widgets
		widgets = {},
		// Cache document and window selections
		$document = $( document ), $window = $( window );
	
	/* Methods */

	/**
	 * Gets the screen's root element.
	 * 
	 * @return jQuery Selection: Root screen element
	 */
	this.$ = function() {
		return $selection;
	};
	
	/**
	 * Adds a widget to the group.
	 * 
	 * @param key String: Name to access widget by later on
	 * @param widget Object: Widget to add
	 */
	this.add = function( key, widget ) {
		widgets[key] = widget;
		$selection.append( widget.$selection );
	};
	
	/**
	 * Removes a widget from the group.
	 * 
	 * @param key String: Name to widget to remove.
	 */
	this.remove = function( key ) {
		delete widgets[key];
	};

	/**
	 * Gets a widget by name.
	 * 
	 * @param key String: Name to widget to get.
	 * @return Object: Widget object or null if no widget exists by that name
	 */
	this.get = function( key ) {
		return key in widgets ? widgets[key] : null;
	};
	
	/* Initialization */
	
	// Append widgets
	if ( 'widgets' in configuration ) {
		for ( key in configuration.widgets ) {
			that.add( key, configuration.widgets[key] );
		}
	}
};
