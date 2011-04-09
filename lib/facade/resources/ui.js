var ui = {};

ui.Panel = Class( {
	'has': {
		'options': {
			'html': null,
			'classes': []
		},
		'$': '<div class="ui-panel"></div>',
		'$content': '<div class="ui-panel-content"></div>'
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this.options, options || {} );
			this.$ = $( this.$ ).append( this.$content = $( this.$content ) )
				.addClass( this.options.classes.join( ' ' ) );
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
			'classes': [],
			'widgets': null,
			'sizes': null,
			'orientation': 'vertical'
		},
		'widgets': {},
		'sizes': {},
		'$': null,
		'_dynamic': 0,
		'_orientations': {
			'horizontal': {
				'classes': 'ui-group-horizontal',
				'metric': 'width',
				'query': 'innerWidth'
			},
			'vertical': {
				'classes': 'ui-group-vertical',
				'metric': 'height',
				'query': 'innerHeight'
			}
		},
		'_orientation': null
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this.options, options || {} );
			this.$ = $( '<' + this.options.element + '></' + this.options.element + '>' )
				.addClass( this.options.classes.concat( ['ui-group'] ).join( ' ' ) );
			if ( typeOf( this.options.widgets ) === 'object' ) {
				for ( key in this.options.widgets ) {
					this.add( key, this.options.widgets[key],
						typeOf( this.options.sizes ) === 'object' && key in this.options.sizes
							? this.options.sizes[key] : undefined );
				}
			}
			this.orient( this.options.orientation ).reflow();
		},
		/**
		 * Adds a widget to the group.
		 * 
		 * @param key String: Name to access widget by later on
		 * @param widget Object: Widget to add
		 * @param size Object: Size to apply, either a CSS compatible size or 'fill'
		 * @return Object: This
		 */
		'add': function( key, widget, size ) {
			this.widgets[key] = widget;
			if ( arguments.length === 3 ) {
				this.size( key, size );
			}
			this.$.append( $( '<div class="ui-group-member"></div>' ).append( widget.$ ) );
			this.reflow();
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
				this.reflow();
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
		 * Sets sizes for a widget.
		 * 
		 * @param key String: Name to widget to set sizes for
		 * @param size Mixed: Size to apply, may end in in "px", "em", "%" or be 'fill' if string,
		 * "px" is assumed if number
		 * @return Mixed: Size if no size argument was given, reference to this object otherwise
		 */
		'size': function( key, size ) {
			if ( typeOf( size ) === 'number' ) {
				size = String( size + 'px' );
			}
			if ( typeOf( size ) === 'string' ) {
				var wasDynamic = this._dynamic;
				if ( key in this.sizes && this.sizes[key] === 'fill' ) {
					this._dynamic--;
				}
				this.sizes[key] = size;
				if ( size === 'fill' ) {
					this._dynamic++;
				}
				this.reflow();
				if ( wasDynamic && !this._dynamic ) {
					$( window ).unbind( 'resize', this.reflow );
				} else if ( !wasDynamic && this._dynamic ) {
					$( window ).bind( 'resize', this.reflow );
				}
				return this;
			}
			return key in this.sizes ? this.sizes[key] : null;
		},
		/**
		 * Switches the orientation between vertical and horizontal.
		 * 
		 * @param orientation String: Orientation, can either be "vertical" or "horizontal"
		 * (optional, defaults to "vertical")
		 * @return Object: This
		 */
		'orient': function( orientation ) {
			if ( typeOf( this._orientation ) === 'object' ) {
				this.$.removeClass( this._orientation.classes );
			}
			this._orientation =
				this._orientations[orientation === 'horizontal' ? 'horizontal' : 'vertical'];
			this.$.addClass( this._orientation.classes );
			return this;
		},
		/**
		 * Applies sizes to each member of the group, if defined.
		 * 
		 * @return Object: This
		 */
		'reflow': function() {
			if ( this._dynamic ) {
				var total = this.$[this._orientation.query]();
				var $parent, filled = 0, $fills = $();
				for ( var key in this.widgets ) {
					$parent = this.widgets[key].$.parent();
					if ( key in this.sizes ) {
						if ( this.sizes[key] === 'fill' ) {
							$fills = $fills.add( $parent );
						} else {
							$parent.css( this._orientation.metric, this.sizes[key] )
							filled += $parent[this._orientation.query]();
						}
					}
				}
				$fills.css( this._orientation.metric, ( total - filled ) / $fills.length );
			} else {
				for ( var key in this.widgets ) {
					if ( key in this.sizes ) {
						this.widgets[key].$.parent()
							.css( this._orientation.metric, this.sizes[key] )
					}
				}
			}
			return this;
		}
	}
} );

ui.Button = Class( {
	'has': {
		'options': {
			'text': null,
			'html': null,
			'classes': []
		},
		'$': '<button class="ui-button"></button>'
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this.options, options || {} );
			this.$ = $( this.$ ).addClass( this.options.classes.join( ' ' ) );
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
