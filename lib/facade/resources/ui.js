var ui = {};

Class( ui, 'Panel', {
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

Class( ui, 'Group', {
	'has': {
		'options': {
			'element': 'div',
			'classes': [],
			'items': null,
			'sizes': null,
			'orientation': 'vertical'
		},
		'items': {},
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
			if ( typeOf( this.options.items ) === 'object' ) {
				for ( key in this.options.items ) {
					this.add( key, this.options.items[key],
						typeOf( this.options.sizes ) === 'object' && key in this.options.sizes
							? this.options.sizes[key] : undefined );
				}
			}
			this.orient( this.options.orientation ).reflow();
		},
		/**
		 * Adds an item to the group.
		 * 
		 * @param key String: Name to access item by later on
		 * @param item Object: Item to add
		 * @param size Object: Size to apply, either a CSS compatible size or 'fill'
		 * @return Object: This
		 */
		'add': function( key, item, size ) {
			this.items[key] = item;
			if ( arguments.length === 3 ) {
				this.size( key, size );
			}
			this.$.append( $( '<div class="ui-group-item"></div>' ).append( item.$ ) );
			this.reflow();
			return this;
		},
		/**
		 * Removes an item from the group.
		 * 
		 * @param key String: Name to item to remove
		 * @return Object: This
		 */
		'remove': function( key ) {
			if ( key in this.items ) {
				this.items[key].$.parent().remove();
				delete this.items[key];
				delete this.size[key];
				this.reflow();
			}
			return this;
		},
		/**
		 * Gets an item by name.
		 * 
		 * @param key String: Name of item to get
		 * @return Object: Item object or null if no item exists by that name
		 */
		'item': function( key ) {
			return key in this.items ? this.items[key] : null;
		},
		/**
		 * Sets sizes for an item.
		 * 
		 * @param key String: Name of item to set sizes for
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
				for ( var key in this.items ) {
					$parent = this.items[key].$.parent();
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
				for ( var key in this.items ) {
					if ( key in this.sizes ) {
						this.items[key].$.parent()
							.css( this._orientation.metric, this.sizes[key] )
					}
				}
			}
			return this;
		}
	}
} );

Class( ui, 'Button', {
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

Class( ui, 'List', {
	'has': {
		'options': {
			'items': null,
			'classes': []
		},
		'$': '<ui class="ui-list"></ul>',
		'items': {}
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this.options, options || {} );
			this.$ = $( this.$ ).addClass( this.options.classes.join( ' ' ) );
			if ( typeOf( this.options.items ) === 'object' ) {
				for ( key in this.options.items ) {
					this.add( key, this.options.items[key] );
				}
			}
		},
		/**
		 * Adds an item to the group.
		 * 
		 * @param key String: Name to access item by later on
		 * @param item Object: Item to add
		 * @return Object: This
		 */
		'add': function( key, item ) {
			this.items[key] = item;
			this.$.append( $( '<li class="ui-list-item"></li>' ).append( item.$ ) );
			return this;
		},
		/**
		 * Removes an item from the group.
		 * 
		 * @param key String: Name to item to remove
		 * @return Object: This
		 */
		'remove': function( key ) {
			if ( key in this.items ) {
				this.items[key].$.parent().remove();
				delete this.items[key];
			}
			return this;
		},
		/**
		 * Gets an item by name.
		 * 
		 * @param key String: Name of item to get
		 * @return Object: Item object or null if no item exists by that name
		 */
		'item': function( key ) {
			return key in this.items ? this.items[key] : null;
		},
	}
} );

Class( ui, 'Html', {
	'has': {
		'$': null
	},
	'can': {
		'initialize': function( html ) {
			this.$ = $( html );
		}
	}
} );
