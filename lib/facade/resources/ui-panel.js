window.ui.Panel = function( $selection, options ) {
	
	/* Configuration */
	
	var configuration = {
		// Multiplier for mouse wheel event delta values
		'speed': 15,
		// Minimum pixel height for handle
		'minHandleHeight': 20
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
	// Insert bar, trough and handle for manual scrolling
	$selection.find( '.ui-panel' )
		.append( '<div class="ui-panel-bar"><div class="ui-panel-trough">' +
			'<div class="ui-panel-handle" /></div></div>' );
	
	/* Private Members */
	
	var
		// Easy access to the real this inside closures
		that = this,
		// Cached measurements for panel, content, trough and handle
		panel = {}, content = {}, trough = {}, handle = {},
		// Drag state
		drag = {},
		/*
		 * Mouse wheel "momentum" is achieved in the browser by sending a long tail of gradually
		 * decreasing wheel events, thus emulating a smooth deceleration of scrolling in a given
		 * direction. Because these events are sent whether further scrolling is possible or not,
		 * once a panel has been scrolled to one of it's extents, the remaining events can be
		 * ignored. However, if during this long tail of events, the user scrolls away from the
		 * extent using the page or arrow keys or by dragging the handle, during the resulting
		 * scroll animation or manual drag the queued wheel events, in the opposite direction, will
		 * be processed because the panel is no longer at one of it's extents, effectively opposing
		 * the user's most recent action with their previous one. The result is a jitter effect.
		 * Additionally, if the queued wheel events continue beyond the scroll animation or manual
		 * drag, they will cause unexpected scroll movements. It's important to note that browsers
		 * themselves appear to not solve the latter of these two problems for native scroll bars.
		 * 
		 * Scroll jitter is resolved by ignoring the mouse wheel events that are received during a
		 * scroll animation or manual drag.
		 */
		ignoreWheel = 0,
		// Panel - area where everything is rendered
		$panel = $selection.find( '.ui-panel:first' ),
		// Content - area being scrolled
		$content = $panel.find( '.ui-panel-content:first' ),
		// Bar - the are where the trough is rendered
		$bar = $panel.find( '.ui-panel-bar:first' ),
		// Trough - the area where the handle is rendered
		$trough = $bar.find( '.ui-panel-trough:first' ),
		// Handle - indicator and control of document size and position
		$handle = $trough.find( '.ui-panel-handle:first' ),
		// Cache document and window selections
		$document = $( document ), $window = $( window );
	
	/* Private Methods */
	
	/**
	 * Measure UI elements and cache the results.
	 */
	function measure() {
		panel.height = $panel.outerHeight();
		content.height = $content.outerHeight();
		content.top = $content.position().top;
		trough.height = $trough.innerHeight();
	}
	
	/**
	 * Update UI elements to reflect measurements.
	 */
	function update() {
		if ( panel.height < content.height ) {
			// Show the handle when scrolling is available
			$handle.show();
			// Calculate and cache handle measurements
			handle.height = Math.max(
				Math.min( trough.height * panel.height / content.height, trough.height ),
				configuration.minHandleHeight
			);
			// Resize the handle to represent the ratio between content and panel size
			$handle.height( handle.height );
			handle.top = ( 1 / ( content.height - panel.height ) * -content.top )
				* -( handle.height - trough.height );
			// Move the handle to represent the position of the document in relation to the panel
			$handle.css( 'top', handle.top );
			// If the content is for some reason not reaching to the bottom, move it upwards
			if ( content.top + content.height < panel.height ) {
				;
				$content.css( 'top', content.top = panel.height - content.height );
			}
		} else {
			// Hide the handle when there's no scrolling available
			$handle.hide();
			// If the content is entirely visible, but it's at all obscured, move it into view
			if ( content.top < 0 ) {
				$content.css( 'top', content.top = 0 );
			}
		}
	};
	
	/**
	 * Moves content any number of pages forward or backward.
	 * 
	 * @param diff Number: Positive or negative number of pages to scroll
	 */
	function page( diff ) {
		var
			// Calculate and cache new content position, scrolling one page down
			ctop = Math.max(
				Math.min( content.top - ( panel.height * diff ), 0 ),
				-( content.height - panel.height )
			),
			// Adjust handle position 
			htop = Math.min(
				Math.max( handle.top + ( handle.height * diff ), 0 ),
				trough.height - handle.height
			);
		// Animate the content and handle moving to the new position
		if ( ctop !== content.top ) {
			ignoreWheel++;
			$content.animate( { 'top': ctop }, 'fast', function() {
				content.top = ctop; ignoreWheel--;
			} );
		}
		if ( htop !== handle.top ) {
			ignoreWheel++;
			$handle.animate( { 'top': htop }, 'fast', function() {
				handle.top = htop; ignoreWheel--;
			} );
		}
	}
	
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
		// Calculate and cache new content position
		content.top = Math.min( Math.max( -position, -( content.height - panel.height ) ), 0 );
		// Move content to new position
		$content.css( 'top', content.top );
		// Update the handle according to the new content position
		update();
		// Return the actual position used
		return -content.top;
	};
	
	/**
	 * Get the current scroll position.
	 * 
	 * @return Number: Current scroll position in range of 0 .. this.scrollHeight()
	 */
	this.scrollPosition = function() {
		return -content.top;
	};
	
	/**
	 * Get the maximum scroll position
	 * 
	 * @return Number: Maximum scroll position
	 */
	this.scrollHeight = function() {
		return content.height - panel.height;
	};
	
	/* Initialization */
	
	// Mouse wheel navigation
	$panel.mousewheel( function( event, delta, deltaX, deltaY ) {
		if (
			// Scroll animation or manual dragging is taking place
			ignoreWheel > 0
			// Panel is already at the top-most extent
			|| ( deltaY > 0 && content.top >= 0 )
			// Panel is already at the bottom-most extent
			|| ( deltaY < 0 && content.top <= -( content.height - panel.height ) )
		) {
			event.preventDefault();
			return false;
		}
		// Calculate and cache the new content position
		content.top = Math.max(
			Math.min( content.top + ( deltaY * configuration.speed ), 0 ),
			-( content.height - panel.height )
		);
		// Move content to the new position
		$content.css( 'top', content.top );
		update();
	} );
	
	// Drag start
	$handle.mousedown( function( event ) {
		if ( event.which === 1 ) {
			drag.active = true;
			drag.mouse = event.pageY;
			drag.handle = $handle.position().top;
			ignoreWheel++;
		}
		event.preventDefault();
		return false;
	} );
	
	// Drag end
	$document.mouseup( function() {
		drag.active = false;
		ignoreWheel--;
	} )
	
	// Drag movement
	$document.mousemove( function( event ) {
		if ( drag.active ) {
			// Calculate and cache new handle position
			handle.top = Math.min(
				Math.max( drag.handle + event.pageY - drag.mouse, 0 ),
				-( handle.height - trough.height )
			);
			// Move handle to new position
			$handle.css( 'top', handle.top );
			// Calculate and cache new content position from handle position
			content.top = ( ( 1 / ( handle.height - trough.height ) ) * handle.top )
				* ( content.height - panel.height );
			// Update content position
			$content.css( 'top', content.top );
			event.preventDefault();
			return false;
		}
	} );
	
	// Auto-resizing
	$window.resize( function() {
		measure();
		update();
	} );
	
	$document.keydown( function( event ) {
		switch ( event.which ) {
			case 33: // Page up
				page( -1 );
				break;
			case 34: // Page down
				page( 1 );
				break;
			case 38: // Arrow up
				page( -0.3 );
				break;
			case 40: // Arrow down
				page( 0.3 );
				break;
			default:
				return true;
		}
		event.preventDefault();
		return false;
	} );
	
	// Trough clicking
	$trough.mousedown( function( event ) {
		if ( event.which === 1 ) {
			// Page up or down depending on the click's relation to the handle
			page( event.pageY <= $handle.offset().top ? -1 : 1 );
		}
		event.preventDefault();
		return false;
	} );
	
	// Bar clicking
	$bar.mousedown( function( event ) {
		if ( event.which === 1 ) {
			// Page partially up or down depending on the click's relation to the handle
			page( event.pageY <= $handle.offset().top ? -0.3 : 0.3 );
		}
		event.preventDefault();
		return false;
	} );
	
	// Disabled context menus in scrollbar elements
	$bar.bind( 'contextmenu', function( event ) {
		event.preventDefault();
        return false;
    } );
	
	measure();
	update();
};
