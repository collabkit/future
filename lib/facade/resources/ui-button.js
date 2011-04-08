ui.Button = function( options ) {
	
	/* Configuration */
	
	var configuration = {
		'text': '',
	};
	$.extend( configuration, options || {} )
	
	/* Private Members */
	
	var
		// Easy access to the real this inside closures
		that = this,
		// Button element
		$button = $( '<button class="ui-button"></button>' ).text( configuration.text );
	
	/* Methods */
	
	/**
	 * Gets the button's root element.
	 * 
	 * @return jQuery Selection: Root button element
	 */
	this.$ = function() {
		return $button;
	};
	
	/**
	 * Gets/sets the text of the button
	 * 
	 * @param value String: Text to display inside button (optional)
	 * @return String: Text displayed inside button
	 */
	this.text = function( value ) {
		if ( typeof value !== 'undefined' ) {
			$button.text( value );
		}
		return $button.text();
	};
};
