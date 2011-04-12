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
			'classes': [],
			'press': null
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
			if ( typeOf( this._options.press ) === 'function' ) {
				this.$.click( this._options.press );
			}
		}
	}
} );

Class( ui, 'Menu', {
	'has': {
		'$': '<ui class="ui-menu"></ul>',
		'_options': {
			'items': null,
			'classes': []
		}
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this._options, options || {} );
			this.$ = $( this.$ ).addClass( this._options.classes.join( ' ' ) );
			if ( typeOf( this._options.items ) === 'array' ) {
				for ( var i = 0; i < this._options.items.length; i++ ) {
					if ( typeOf( this._options.items[i] ) === 'object' ) {
						this.$.append( this._create( this._options.items[i] ) );
					}
				}
			}
		},
		'append': function( item ) {
			this.$.append( this._create( item ) );
		},
		'prepend': function( item ) {
			this.$.prepend( this._create( item ) );
		},
		'_create': function( item ) {
			var $item = $( '<li class="ui-menu-item"></li>' );
			if ( typeOf( item.text ) === 'string' ) {
				$item.text( item.text );
			}
			if ( typeOf( item.classes ) === 'array' ) {
				$item.addClass( item.classes.join( ' ' ) );
			}
			if ( typeOf( item.select ) === 'function' ) {
				$item.click( function( event ) {
					$item.addClass( 'ui-menu-item-flash' );
					setTimeout( function() {
						$item.removeClass( 'ui-menu-item-flash' );
					}, 75 );
					return item.select( event );
				} );
			}
			return $item;
		}
	}
} );

Class( ui, 'DropDown', {
	'has': {
		'$': '<button class="ui-dropdown"></button>',
		'$overlay': '<div class="ui-dropdown-menu"></div>',
		'text': null,
		'html': null,
		'classes': [],
		'menu': null,
		'_options': {
			'menu': null
		}
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this._options, options || {} );
			this.$ = $( this.$ );
			// Text or HTML
			if ( typeOf( this._options.text ) === 'string' ) {
				this.$.text( this._options.text );
			} else if ( typeOf( this._options.html ) === 'string' ) {
				this.$.html( this._options.html );
			}
			// Classes
			if ( typeOf( this._options.classes ) === 'array' ) {
				this.$.addClass( item.classes.join( ' ' ) );
			}
			// Menu
			if ( this._options.menu instanceof ui.Menu ) {
				this.menu = this._options.menu;
			} else {
				this.menu = new ui.Menu();
			}
			$( 'body' ).append( this.$overlay = $( this.$overlay ).append( this.menu.$ ) );
			this.$.click( this._toggleMenu );
		},
		'_toggleMenu': function() {
			if ( this.$.hasClass( 'ui-dropdown-open' ) ) {
				this._hideMenu();
			} else {
				this._showMenu();
			}
			return false;
		},
		'_showMenu': function() {
			this.$.addClass( 'ui-dropdown-open' );
			$( document ).one( 'click', this._hideMenu );
			var offset = this.$.offset();
			this.$overlay.css( {
				'top': offset.top + this.$.outerHeight(),
				'left': offset.left,
				'min-width': this.$.outerWidth(),
				'display': 'block'
			} );
			return false;
		},
		'_hideMenu': function() {
			var that = this;
			setTimeout( function() {
				that.$.removeClass( 'ui-dropdown-open' );
				that.$overlay.fadeOut( 100 );
			}, 75 );
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
