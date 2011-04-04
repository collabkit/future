( function( $ ) {

function Panel( $selection, options ) {
	
	/* cfguration */
	
	var cfg = {
		'sensitivity': 15,
		'minHandleHeight': 20
	};
	$.extend( cfg, options )
	
	/* Private Members */
	
	var that = this;
	// Cached measurements for panel, content, trough and handle
	var p = {}, c = {}, t = {}, h = {};
	// Drag state
	var d = {};
	
	// Wrap content
	$selection.children()
		.wrapAll( '<div class="ui-panel" />' )
		.wrapAll( '<div class="ui-panel-content" />' );
	// Bar - the are where the trough is rendered
	var $b = $( '<div class="ui-panel-bar" />' );
	// Trough - the area where the handle is rendered
	var $t = $( '<div class="ui-panel-trough" />' );
	// Handle - indicator and control of document size and position
	var $h = $( '<div class="ui-panel-handle" />' );
	// Content - area being scrolled
	var $c = $selection.find( '.ui-panel-content' );
	// Panel - area where everything is rendered
	var $p = $selection.find( '.ui-panel' ).append( $b.append( $t.append( $h ) ) );
	// Cache document and window selections
	var $d = $( document );
	var $w = $( window );
	
	/* Private Methods */
	
	/**
	 * Update cached measurements
	 */
	function measure() {
		p.height = $p.outerHeight();
		c.height = $c.outerHeight();
		c.top = $c.position().top;
		t.height = $t.innerHeight();
	}
	
	function update() {
		if ( p.height < c.height ) {
			// Show the handle when scrolling is available
			$h.show();
			// Calculate and cache handle measurements
			h.height = Math.max(
				Math.min( t.height * p.height / c.height, t.height ), cfg.minHandleHeight
			);
			h.top = ( 1 / ( c.height - p.height ) * -c.top ) * -( h.height - t.height );
			// Resize the handle to represent the ratio between content and panel size
			$h.height( h.height );
			// Move the handle to represent the position of the document in relation to the panel
			$h.css( 'top', h.top );
			// If the content is for some reason not reaching to the bottom, move it upwards
			if ( c.top + c.height < p.height ) {
				$c.css( 'top', p.height - c.height );
			}
		} else {
			// Hide the handle when there's no scrolling available
			$h.hide();
			// If the content is entirely visible, but it's at all obscured, move it into view
			if ( c.top < 0 ) {
				$c.css( 'top', 0 );
			}
		}
	};
	
	/* Initialization */
	
	// Mouse wheel navigation
	$p.mousewheel( function( e, d, x, y ) {
		// Calculate and cache the new content position
		c.top = Math.max(
			Math.min( c.top + ( y * cfg.sensitivity ), 0 ), -Math.abs( c.height - p.height )
		);
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
		}
		e.preventDefault();
		return false;
	} );

	// Drag end
	$d.mouseup( function( e ) {
		d.active = false;
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
			// Update content position according to new handle position
			$c.css(
				'top',
				( ( 1 / ( h.height - t.height ) ) * h.top ) * ( c.height - p.height )
			);
			e.preventDefault();
			return false;
		}
	} );
	
	// Trough clicking
	$b.mousedown( function( e ) {
		// Calculate direction to scroll based on whether the click was above or below the handle
		var dir = e.pageY <= h.top ? -1 : 1;
		// Calculate and cache new content position
		c.top = Math.max(
			Math.min( c.top - ( p.height * dir ), c.height - p.height ), 0
		);
		// Adjust handle position 
		h.top = Math.max( Math.min( h.top - ( t.height * dir ), h.top - t.height ), 0 );
		$c.animate( { 'top': c.top }, 'fast' );
		$h.animate( { 'top': h.top }, 'fast' );
		e.preventDefault();
		return false;
	} );
	
	// Auto-resizing
	$w.resize( function() {
		measure();
		update();
	} );
	
	/* Methods */
	
	this.scrollTo = function( top ) {
		// Calculate and cache new content position
		c.top = Math.max( Math.min( top, c.height - p.height ), 0 );
		// Move content to new position
		$c.css( 'top', c.top );
		update();
		return top;
	};
	this.scrollPosition = function() {
		return -c.top;
	};
	this.maxScroll = function() {
		return c.height - p.height;
	};
	
	/* Initialization */
	
	measure();
	update();
}

$.fn.widget = function( options ) {
	switch ( options.type ) {
		case 'panel':
			var panel = new Panel( $(this), {} );
			$(this).data( 'widget', panel );
			break;
	}
	return $(this);
};

} )( jQuery );
