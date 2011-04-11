var ui = {};

Class( ui, 'Panel', {
	'has': {
		'$': '<div class="ui-panel"></div>',
		'$content': '<div class="ui-panel-content"></div>',
		'_options': {
			'html': null,
			'classes': []
		}
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this._options, options || {} );
			this.$ = $( this.$ ).append( this.$content = $( this.$content ) )
				.addClass( this._options.classes.join( ' ' ) );
			if ( typeOf( this._options.html ) === 'string' ) {
				this.$content.html( this._options.html );
			}
		}
	}
} );

Class( ui, 'Group', {
	'has': {
		'$': null,
		'_options': {
			'element': 'div',
			'classes': [],
			'items': null,
			'sizes': null,
			'orientation': 'vertical'
		},
		'_items': {},
		'_sizes': {},
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
		'_orientation': null,
		'_autoId': 0
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this._options, options || {} );
			this.$ = $( '<' + this._options.element + '></' + this._options.element + '>' )
				.addClass( this._options.classes.concat( ['ui-group'] ).join( ' ' ) );
			if ( typeOf( this._options.items ) === 'object' ) {
				for ( key in this._options.items ) {
					this.add( key, this._options.items[key],
						typeOf( this._options.sizes ) === 'object' && key in this._options.sizes
							? this._options.sizes[key] : undefined );
				}
			}
			this.orient( this._options.orientation );
			this.reflow();
		},
		/**
		 * Adds an item to the group.
		 * 
		 * @param key String: Name to access item by later on (optional, one will be generated if
		 * a key is not specified)
		 * @param item Object: Item to add
		 * @param size String: Size to apply, either a CSS compatible size or 'fill' (optional)
		 * @return String: Key, useful when one has been generated for you
		 */
		'add': function( key, item, size ) {
			if ( typeOf( key ) === 'object' ) {
				size = item;
				item = key;
				// Auto-assign key, avoiding duplicates
				do {
					key = '__item-' + this._autoId++;
				} while ( key in this._items );
			}
			this._items[key] = item;
			if ( typeOf( size ) !== 'undefined' ) {
				this.size( key, size );
			}
			this.$.append( $( '<div class="ui-group-item"></div>' ).append( item.$ ) );
			this.reflow();
			return key;
		},
		/**
		 * Removes an item from the group.
		 * 
		 * @param key String: Name to item to remove
		 */
		'remove': function( key ) {
			if ( key in this._items ) {
				this._items[key].$.parent().remove();
				delete this._items[key];
				delete this.size[key];
				this.reflow();
			}
		},
		/**
		 * Gets an item by name.
		 * 
		 * @param key String: Name of item to get
		 * @return Object: Item object or null if no item exists by that name
		 */
		'item': function( key ) {
			return key in this._items ? this._items[key] : null;
		},
		/**
		 * Sets sizes for an item.
		 * 
		 * @param key String: Name of item to set sizes for
		 * @param size Mixed: Size to apply, may end in in "px", "em", "%" or be 'fill' if string,
		 * "px" is assumed if number
		 * @return Mixed: Size of named item
		 */
		'size': function( key, size ) {
			if ( typeOf( size ) === 'number' ) {
				size = String( size + 'px' );
			}
			if ( typeOf( size ) === 'string' ) {
				var wasDynamic = this._dynamic;
				if ( key in this._sizes && this._sizes[key] === 'fill' ) {
					this._dynamic--;
				}
				this._sizes[key] = size;
				if ( size === 'fill' ) {
					this._dynamic++;
				}
				this.reflow();
				if ( wasDynamic && !this._dynamic ) {
					$( window ).unbind( 'resize', this.reflow );
				} else if ( !wasDynamic && this._dynamic ) {
					$( window ).bind( 'resize', this.reflow );
				}
			}
			return key in this._sizes ? this._sizes[key] : null;
		},
		/**
		 * Switches the orientation between vertical and horizontal.
		 * 
		 * @param orientation String: Orientation, can either be "vertical" or "horizontal"
		 * (optional, defaults to "vertical")
		 */
		'orient': function( orientation ) {
			if ( typeOf( this._orientation ) === 'object' ) {
				this.$.removeClass( this._orientation.classes );
			}
			this._orientation =
				this._orientations[orientation === 'horizontal' ? 'horizontal' : 'vertical'];
			this.$.addClass( this._orientation.classes );
		},
		/**
		 * Applies sizes to each member of the group, if defined.
		 */
		'reflow': function() {
			if ( this._dynamic ) {
				var total = this.$[this._orientation.query]();
				var $parent, filled = 0, $fills = $();
				for ( var key in this._items ) {
					$parent = this._items[key].$.parent();
					if ( key in this._sizes ) {
						if ( this._sizes[key] === 'fill' ) {
							$fills = $fills.add( $parent );
						} else {
							$parent.css( this._orientation.metric, this._sizes[key] )
							filled += $parent[this._orientation.query]();
						}
					}
				}
				$fills.css( this._orientation.metric, ( total - filled ) / $fills.length );
			} else {
				for ( var key in this._items ) {
					if ( key in this._sizes ) {
						this._items[key].$.parent()
							.css( this._orientation.metric, this._sizes[key] )
					}
				}
			}
		}
	}
} );

Class( ui, 'Button', {
	'has': {
		'$': '<button class="ui-button"></button>',
		'_options': {
			'text': null,
			'html': null,
			'classes': []
		}
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this._options, options || {} );
			this.$ = $( this.$ ).addClass( this._options.classes.join( ' ' ) );
			if ( typeOf( this._options.text ) === 'string' ) {
				this.$.text( this._options.text );
			} else if ( typeOf( this._options.html ) === 'string' ) {
				this.$.html( this._options.html );
			}
		}
	}
} );

Class( ui, 'List', {
	'has': {
		'$': '<ui class="ui-list"></ul>',
		'_options': {
			'items': null,
			'classes': []
		},
		'_items': {},
		'_autoId': 0
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this._options, options || {} );
			this.$ = $( this.$ ).addClass( this._options.classes.join( ' ' ) );
			if ( typeOf( this._options.items ) === 'object' ) {
				for ( key in this._options.items ) {
					this.add( key, this._options.items[key] );
				}
			}
		},
		/**
		 * Adds an item to the group.
		 * 
		 * @param key String: Name to access item by later on (optional, one will be generated if
		 * a key is not specified)
		 * @param item Object: Item to add
		 * @return String: Key, useful when one has been generated for you
		 */
		'add': function( key, item ) {
			if ( arguments.length === 1 && typeOf( key ) === 'object' ) {
				item = key;
				// Auto-assign key, avoiding duplicates
				do {
					key = '__item-' + this._autoId++;
				} while ( !( key in this._items ) );
			}
			this._items[key] = item;
			this.$.append( $( '<li class="ui-list-item"></li>' ).append( item.$ ) );
			return key;
		},
		/**
		 * Removes an item from the group.
		 * 
		 * @param key String: Name to item to remove
		 */
		'remove': function( key ) {
			if ( key in this._items ) {
				this._items[key].$.parent().remove();
				delete this._items[key];
			}
		},
		/**
		 * Gets an item by name.
		 * 
		 * @param key String: Name of item to get
		 * @return Object: Item object or null if no item exists by that name
		 */
		'item': function( key ) {
			return key in this._items ? this._items[key] : null;
		},
	}
} );

Class( ui, 'DropDown', {
	'is': ui.Button,
	'has': {
		'list': null,
		'_options': {
			'list': null,
			'overlays': null
		},
		'_overlay': null
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this._options, options || {} );
			this.__use( ui.Button, 'initialize' )();
			this.$.addClass( 'ui-dropdown' );
			if ( this._options.list instanceof ui.List ) {
				this.list = this._options.list;
			} else {
				this.list = new ui.List();
			}
			this.list.$.addClass( 'ui-dropdown-list' );
			if ( !( this._options.overlays instanceof ui.Group ) ) {
				throw 'Missing overlays option error.';
			}
			this._overlay = this._options.overlays.add( this.list );
			this.$.click( this._showMenu );
		},
		'_showMenu': function() {
			var offset = this.$.offset();
			this.list.$.parent()
				.css( {
					'top': offset.top + this.$.outerHeight(),
					'left': offset.left,
					'min-width': this.$.outerWidth(),
					'display': 'block'
				} );
			this.$.addClass( 'ui-dropdown-open' );
			$( document ).one( 'click', this._hideMenu )
			return false;
		},
		'_hideMenu': function() {
			this.$.removeClass( 'ui-dropdown-open' );
			this.list.$.parent().hide();
		}
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
