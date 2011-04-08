var ui = {};

ui.Panel = Class( {
	'has': {
		'options': {
			'html': null
		},
		'$': '<div class="ui-panel"></div>',
		'$content': '<div class="ui-panel-content"></div>'
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this.options, options || {} );
			this.$ = $( this.$ ).append( this.$content = $( this.$content ) );
			if ( typeOf( this.options.html ) === 'string' ) {
				this.$content.html( this.options.html );
			}
		}
	}
} );

ui.Group = Class( {
	'has': {
		'options': {
			'element': 'div',
			'classes': 'ui-group',
			'widgets': null,
			'sizes': null,
			'orientation': 'vertical'
		},
		'widgets': {},
		'sizes': {},
		'$': null
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this.options, options || {} );
			this.$ = $( '<' + this.options.element + '></' + this.options.element + '>' )
				.addClass( typeOf( this.options.classes ) === 'array'
					? this.options.classes.join : this.options.classes )
				.addClass( this.options.orientation === 'horizontal'
					? 'ui-group-horizontal' : 'ui-group-vertical' );
			if ( typeOf( this.options.widgets ) === 'object' ) {
				for ( key in this.options.widgets ) {
					this.add( key, this.options.widgets[key],
						typeOf( this.options.sizes ) === 'object' && key in this.options.sizes
							? this.options.sizes[key] : undefined );
				}
			}
			// Layout now, and when the window changes size
			$( window ).resize( { 'that': this }, function( event ) {
				event.data.that.layout();
			} );
			this.layout();
		},
		/**
		 * Adds a widget to the group.
		 * 
		 * @param key String: Name to access widget by later on
		 * @param widget Object: Widget to add
		 * @param layout Object: Sizes to apply
		 * @return Object: This
		 */
		'add': function( key, widget, size ) {
			this.widgets[key] = widget;
			if ( arguments.length === 3 ) {
				this.size( key, size );
			}
			this.$.append( $( '<div class="ui-group-member"></div>' ).append( widget.$ ) );
			this.layout();
			return this;
		},
		/**
		 * Removes a widget from the group.
		 * 
		 * @param key String: Name to widget to remove
		 * @return Object: This
		 */
		'remove': function( key ) {
			if ( key in this.widgets ) {
				this.widgets[key].$.parent().remove();
				delete this.widgets[key];
				delete this.size[key];
				this.layout();
			}
			return this;
		},
		/**
		 * Gets a widget by name.
		 * 
		 * @param key String: Name to widget to get
		 * @return Object: Widget object or null if no widget exists by that name
		 */
		'widget': function( key ) {
			return key in this.widgets ? this.widgets[key] : null;
		},
		/**
		 * Sets layout sizes for a widget.
		 * 
		 * @param key String: Name to widget to set sizes for
		 * @param size Mixed: Size to apply, may end in in "px", "em", "%" or be 'fill' if string,
		 * "px" is assumed if number
		 */
		'size': function( key, size ) {
			if ( typeOf( size ) === 'number' ) {
				size = String( size + 'px' );
			}
			if ( typeOf( size ) === 'string' ) {
				this.sizes[key] = size;
				this.layout();
			}
			return key in this.sizes ? this.sizes[key] : null;
		},
		'layout': function() {
			var axis = this.options.orientation === 'horizontal' ? 'width' : 'height';
			var total = axis === 'width' ? this.$.innerWidth() : this.$.innerHeight();
			var size, fills = [], filled = 0;
			for ( var key in this.sizes ) {
				size = this.sizes[key];
				if ( size === 'fill' ) {
					fills.push( key );
				} else {
					$parent = this.widgets[key].$.parent();
					$parent.css( axis, size )
					filled += axis === 'width' ? $parent.innerWidth() : $parent.innerHeight();
				}
			}
			var split = ( total - filled ) / fills.length;
			for ( var i = 0; i < fills.length; i++ ) {
				this.widgets[fills[i]].$.parent().css( axis, split );
			}
		}
	}
} );

ui.Button = Class( {
	'has': {
		'options': {
			'text': null,
			'html': null,
		},
		'$': '<button class="ui-button"></button>'
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this.options, options || {} );
			this.$ = $( this.$ );
			if ( typeOf( this.options.text ) === 'string' ) {
				this.$.text( this.options.text );
			} else if ( typeOf( this.options.html ) === 'string' ) {
				this.$.html( this.options.html );
			}
		}
	}
} );

ui.Html = Class( {
	'has': {
		'$': null
	},
	'can': {
		'initialize': function( html ) {
			this.$ = $( html );
		}
	}
} );

ui.header = new ui.Group( {
	'element': 'header',
	'classes': 'ui-header'
} );
ui.sections = new ui.Group( {
	'element': 'section',
	'classes': 'ui-sections'
} );

$( 'body' ).append( ui.sections.$, ui.header.$ );
