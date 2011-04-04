( function( $ ) {

function Panel( $target, options ) {
	
	/* Configuration */
	
	var sensitivity = 15;
	
	var that = this;
	$target.children()
		.wrapAll( '<div class="ui-panel" />' )
		.wrapAll( '<div class="ui-panel-content" />' );
	var $bar = $( '<div class="ui-panel-bar" />' );
	var $trough = $( '<div class="ui-panel-trough" />' );
	var $handle = $( '<div class="ui-panel-handle" />' );
	var $content = $target.find( '.ui-panel-content' );
	var $panel = $target.find( '.ui-panel' ).append( $bar.append( $trough.append( $handle ) ) );
	
	/* Methods */
	
	this.update = function() {
		var panelHeight = $panel.outerHeight();
		var contentHeight = $content.outerHeight();
		var contentTop = $content.position().top;
		if ( panelHeight < contentHeight ) {
			$handle.show();
			var contentRange = contentHeight - panelHeight;
			var troughHeight = $trough.innerHeight();
			var handleRange = $handle.outerHeight() - troughHeight;
			$handle.css( 'top', ( 1 / contentRange * -contentTop ) * -handleRange );
			$handle.height( Math.max( 20, troughHeight * panelHeight / contentHeight ) );
			if ( contentTop + contentHeight < panelHeight ) {
				$content.css( 'top', panelHeight - contentHeight );
			}
		} else {
			if ( contentTop < 0 ) {
				$content.css( 'top', 0 );
			}
			$handle.hide();
		}
	};
	
	/* Initialization */
	
	$panel.mousewheel( function( e, d, x, y ) {
		var contentTop = $content.position().top;
		var contentRange = $content.outerHeight() - $panel.outerHeight();
		$content.css( 'top', Math.min( Math.max( contentTop + ( y * sensitivity ), -contentRange ), 0 ) );
		that.update();
	} );
	
	var dragging = false;
	var mouseOffset;
	var handleOffset;
	$handle
		.mousedown( function( e ) {
			if ( e.which === 1 ) {
				dragging = true;
				mouseOffset = e.pageY;
				handleOffset = $handle.position().top;
			}
			e.preventDefault();
			return false;
		} );
	$bar
		.mousedown( function( e ) {
			if ( e.pageY < $handle.offset().top ) {
				$content.animate( { 'top': 0 }, 'fast' );
				$handle.animate( { 'top': 0 }, 'fast' );
			} else if ( e.pageY > $handle.offset().top + $handle.outerHeight() ) {
				$content.animate( { 'top': -( $content.outerHeight() - $panel.outerHeight() ) }, 'fast' );
				$handle.animate( { 'top': -( $handle.outerHeight() - $trough.outerHeight() ) }, 'fast' );
			}
			e.preventDefault();
			return false;
		} );
	$( window )
		.resize( function( e ) {
			that.update();
		} );
	$( document )
		.mouseup( function( e ) {
			dragging = false;
		} )
		.mousemove( function( e ) {
			if ( dragging ) {
				var handleRange = $handle.outerHeight() - $trough.innerHeight();
				var handleTop = Math.min( Math.max( handleOffset + e.pageY - mouseOffset, 0 ), -handleRange );
				$handle.css( 'top', handleTop );
				var contentRange = $content.outerHeight() - $panel.outerHeight();
				$content.css( 'top', ( ( 1 / handleRange ) * handleTop ) * contentRange );
				e.preventDefault();
				return false;
			}
		} );
	
	this.update();
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
