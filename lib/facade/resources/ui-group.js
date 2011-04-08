ui.Group = function( options ) {
	
	/* Configuration */
	
	var configuration = {
		// default configuration
	};
	$.extend( configuration, options || {} )
	
	/* Private Members */
	
	var
		// Easy access to the real this inside closures
		that = this,
		// Group widgets
		group = {},
		// Group elements
		$group = $( '<div class="ui-group"></div>' );
	
	/* Methods */
	
	/**
	 * Gets the screen's root element.
	 * 
	 * @return jQuery Selection: Root screen element
	 */
	this.$ = function() {
		return $group;
	};
	
	/**
	 * Adds a widget to the group.
	 * 
	 * @param key String: Name to access widget by later on
	 * @param widget Object: Widget to add
	 */
	this.add = function( key, widget ) {
		group[key] = widget;
		$group.append( widget.$() );
	};
	
	/**
	 * Removes a widget from the group.
	 * 
	 * @param key String: Name to widget to remove.
	 */
	this.remove = function( key ) {
		if ( key in group ) {
			group[key].$().remove();
			delete group[key];
			return true;
		}
		return false;
	};
	
	/**
	 * Gets a widget by name.
	 * 
	 * @param key String: Name to widget to get.
	 * @return Object: Widget object or null if no widget exists by that name
	 */
	this.get = function( key ) {
		return key in group ? group[key] : null;
	};
	
	/* Initialization */
	
	// Append widgets
	if ( 'widgets' in configuration ) {
		for ( key in configuration.widgets ) {
			that.add( key, configuration.widgets[key] );
		}
	}
};
