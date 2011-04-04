( function( $ ) {

function Panel( $selection, options ) {
	
	/* Configuration */
	
	var cfg = {
		// Multiplier for mouse wheel event delta values
		'speed': 15,
		// Minimum pixel height for handle
		'minHandleHeight': 20
	};
	$.extend( cfg, options )
	
	/* Setup */
	
	$selection
		.children()
			// Isolate contents and wrap everything in a panel
			.wrapAll( '<div class="ui-panel"><div class="ui-panel-content" /></div>' )
			.end()
		.find( '.ui-panel' )
			// Insert bar, trough and handle for manual scrolling
			.append( '<div class="ui-panel-bar"><div class="ui-panel-trough">' +
				'<div class="ui-panel-handle" /></div></div>' );
	
	/* Private Members */
	
	var
		// Easy access to the real this inside closures
		that = this,
		// Cached measurements for panel, content, trough and handle
		p = {}, c = {}, t = {}, h = {},
		// Drag state
		d = {},
		// Mouse wheel locking state - when mouse wheel "momentum" is give to the browser as a long
		// series of wheel events each with a smaller delta the the prior, the events can still be
		// getting fired even if the content is at the top or bottom, making any other method of
		// scrolling fight with the incoming scroll events. Locking the wheel events during these
		// other methods of input helps, but if the tail is very long it's still possible to see
		// some strange artifacts. It's important to note that browser's native scroll bars have the
		// same issues as this does, so this may not be a very critical problem.
		wheelLock = 0,
		// Panel - area where everything is rendered
		$p = $selection.find( '.ui-panel' )
		// Content - area being scrolled
		$c = $p.find( '.ui-panel-content' ),
		// Bar - the are where the trough is rendered
		$b = $p.find( '.ui-panel-bar' ),
		// Trough - the area where the handle is rendered
		$t = $b.find( '.ui-panel-trough' ),
		// Handle - indicator and control of document size and position
		$h = $t.find( '.ui-panel-handle' ),
		// Cache document and window selections
		$d = $( document ), $w = $( window );
	
	/* Private Methods */
	
	/**
	 * Measure UI elements and cache the results.
	 */
	function measure() {
		p.height = $p.outerHeight();
		c.height = $c.outerHeight();
		c.top = $c.position().top;
		t.height = $t.innerHeight();
	}
	
	/**
	 * Update UI elements to reflect measurements.
	 */
	function update() {
		if ( p.height < c.height ) {
			// Show the handle when scrolling is available
			$h.show();
			// Calculate and cache handle measurements
			h.height = Math.max(
				Math.min( t.height * p.height / c.height, t.height ), cfg.minHandleHeight
			);
			// Resize the handle to represent the ratio between content and panel size
			$h.height( h.height );
			h.top = ( 1 / ( c.height - p.height ) * -c.top ) * -( h.height - t.height );
			// Move the handle to represent the position of the document in relation to the panel
			$h.css( 'top', h.top );
			// If the content is for some reason not reaching to the bottom, move it upwards
			if ( c.top + c.height < p.height ) {
				;
				$c.css( 'top', c.top = p.height - c.height );
			}
		} else {
			// Hide the handle when there's no scrolling available
			$h.hide();
			// If the content is entirely visible, but it's at all obscured, move it into view
			if ( c.top < 0 ) {
				$c.css( 'top', c.top = 0 );
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
			ctop = Math.max( Math.min( c.top - ( p.height * diff ), 0 ), -( c.height - p.height ) ),
			// Adjust handle position 
			htop = Math.max( Math.min( h.top + ( h.height * diff ), t.height - h.height ), 0 );
		// Animate the content and handle moving to the new position
		if ( ctop !== c.top ) {
			wheelLock++;
			$c.animate( { 'top': ctop }, 'fast', function() { c.top = ctop; wheelLock--; } );
		}
		if ( htop !== h.top ) {
			wheelLock++;
			$h.animate( { 'top': htop }, 'fast', function() { h.top = htop; wheelLock--; } );
		}
	}
	
	/* Initialization */
	
	// Mouse wheel navigation
	$p.mousewheel( function( e, d, x, y ) {
		if ( wheelLock || ( y > 0 && c.top >= 0 ) || ( y < 0 && c.top <= -( c.height - p.height ) ) ) {
			e.preventDefault();
			return false;
		}
		// Calculate and cache the new content position
		c.top = Math.max( Math.min( c.top + ( y * cfg.speed ), 0 ), -( c.height - p.height ) );
		// Move content to the new position
		$c.css( 'top', c.top );
		update();
	} );
	
	// Drag start
	$h.mousedown( function( e ) {
		if ( e.which === 1 ) {
			d = {
				'active': true,
				'mouse': e.pageY,
				'handle': $h.position().top
			};
			wheelLock++;
		}
		e.preventDefault();
		return false;
	} );
	
	// Drag end
	$d.mouseup( function( e ) {
		d.active = false;
		wheelLock--;
	} )
	
	// Drag movement
	$d.mousemove( function( e ) {
		if ( d.active ) {
			// Calculate and cache new handle position
			h.top = Math.min(
				Math.max( d.handle + e.pageY - d.mouse, 0 ), -( h.height - t.height )
			);
			// Move handle to new position
			$h.css( 'top', h.top );
			// Calculate and cache new content position from handle position
			c.top = ( ( 1 / ( h.height - t.height ) ) * h.top ) * ( c.height - p.height );
			// Update content position
			$c.css( 'top', c.top );
			e.preventDefault();
			return false;
		}
	} );
	
	// Auto-resizing
	$w.resize( function() {
		measure();
		update();
	} );
	
	$d.keydown( function( e ) {
		switch ( e.which ) {
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
		e.preventDefault();
		return false;
	} );
	
	// Trough clicking
	$b.mousedown( function( e ) {
		// Calculate direction to scroll based on whether the click was above or below the handle
		page( e.pageY <= $h.offset().top ? -1 : 1 );
		e.preventDefault();
		return false;
	} );
	
	/* Methods */
	
	/**
	 * Move the content to a specific position.
	 * 
	 * @param position Number: Position to scroll to, in range of 0 .. this.scrollHeight()
	 * @return Number: New current scroll position, which may differ from position due to clamping
	 */
	this.scrollTo = function( position ) {
		// Calculate and cache new content position
		c.top = Math.min( Math.max( -position, -( c.height - p.height ) ), 0 );
		// Move content to new position
		$c.css( 'top', c.top );
		// Update the handle according to the new content position
		update();
		// Return the actual position used
		return -c.top;
	};

	/**
	 * Get the current scroll position.
	 * 
	 * @return Number: Current scroll position in range of 0 .. this.scrollHeight()
	 */
	this.scrollPosition = function() {
		return -c.top;
	};
	
	/**
	 * Get the maximum scroll position
	 * 
	 * @return Number: Maximum scroll position
	 */
	this.scrollHeight = function() {
		return c.height - p.height;
	};
	
	/* Initialization */
	
	measure();
	update();
}

$.fn.ui = function( type, options ) {
	var widgets = [];
	$(this).each( function() {
		var widget = $(this).data( 'widget' );
		if ( !widget ) {
			switch ( type ) {
				case 'panel':
					widget = new Panel( $(this), options );
					break;
			}
		}
		$(this).data( 'widget', widget );
		widgets.push( widget );
	} );
	return widgets.length === 1 ? widgets[0] : widgets;
};

} )( jQuery );
