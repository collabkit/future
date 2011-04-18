var ui = {};

Class( ui, 'Panel', {
	'has': {
		'$': '<div class="ui-panel"></div>',
		'$content': '<div class="ui-panel-content"></div>'
	},
	'can': {
		'initialize': function( options ) {
			options = $.extend( {
				'html': null,
				'classes': []
			}, options || {} );
			this.$ = $( this.$ ).append( this.$content = $( this.$content ) )
				.addClass( options.classes.join( ' ' ) );
			if ( typeOf( options.html ) === 'string' ) {
				this.$content.html( options.html );
			}
		}
	}
} );

Class( ui, 'Group', {
	'has': {
		'$': null,
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
			options = $.extend( {
				'element': 'div',
				'classes': [],
				'items': null,
				'sizes': null,
				'orientation': 'vertical'
			}, options || {} );
			this.$ = $( '<' + options.element + '></' + options.element + '>' )
				.addClass( options.classes.concat( ['ui-group'] ).join( ' ' ) );
			if ( typeOf( options.items ) === 'object' ) {
				for ( key in options.items ) {
					this.add( key, options.items[key],
						typeOf( options.sizes ) === 'object' && key in options.sizes
							? options.sizes[key] : undefined );
				}
			}
			this.orient( options.orientation );
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
							continue;
						} else {
							$parent.css( this._orientation.metric, this._sizes[key] )
						}
					}
					filled += $parent[this._orientation.query]();
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
		'$': '<div class="ui-button"></div>',
		'$label': '<span class="ui-button-label"></span>'
	},
	'can': {
		'initialize': function( options ) {
			options = $.extend( {
				'text': null,
				'html': null,
				'classes': [],
				'press': null
			}, options || {} );
			this.$ = $( this.$ ).append( this.$label = $( this.$label ) );
			// Text and HTML
			if ( typeOf( options.text ) === 'string' ) {
				this.$label.text( options.text );
			} else if ( typeOf( options.html ) === 'string' ) {
				this.$label.html( options.html );
			}
			// Classes
			if ( typeOf( options.classes ) === 'array' ) {
				this.$.addClass( options.classes.join( ' ' ) );
			}
			// Press
			if ( typeOf( options.press ) === 'function' ) {
				var that = this;
				this.$.click( function( event ) {
					options.press.call( that, event );
				} );
			}
		}
	}
} );

Class( ui, 'Menu', {
	'has': {
		'$': '<ui class="ui-menu"></ul>'
	},
	'can': {
		'initialize': function( options ) {
			options = $.extend( {
				'items': null,
				'classes': []
			}, options || {} );
			this.$ = $( this.$ ).addClass( options.classes.join( ' ' ) );
			if ( typeOf( options.items ) === 'array' ) {
				for ( var i = 0; i < options.items.length; i++ ) {
					this.append( options.items[i] );
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
			if ( typeOf( item ) !== 'object' ) {
				throw 'Invalid menu item. Object expected.';
			}
			var $item = $( '<li></li>' );
			if ( '$' in item ) {
				$item.append( item.$ ).addClass( 'ui-menu-widget' );
			} else {
				$item.addClass( 'ui-menu-command' );
				if ( typeOf( item.text ) === 'string' ) {
					$item.text( item.text );
				} else if ( typeOf( item.html ) === 'string' ) {
					$item.html( item.html );
				}
				if ( typeOf( item.classes ) === 'array' ) {
					$item.addClass( item.classes.join( ' ' ) );
				}
				if ( typeOf( item.select ) === 'function' ) {
					var that = this;
					$item.click( function( event ) {
						$item.addClass( 'ui-menu-command-flash' );
						setTimeout( function() {
							$item.removeClass( 'ui-menu-command-flash' );
						}, 75 );
						return item.select.call( that, event );
					} );
				}
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
		'menu': null
	},
	'can': {
		'initialize': function( options ) {
			options = $.extend( {
				'menu': null,
				'align': 'left'
			}, options || {} );
			this.$ = $( this.$ );
			// Text or HTML
			if ( typeOf( options.text ) === 'string' ) {
				this.$.text( options.text );
			} else if ( typeOf( options.html ) === 'string' ) {
				this.$.html( options.html );
			}
			// Classes
			if ( typeOf( options.classes ) === 'array' ) {
				this.$.addClass( options.classes.join( ' ' ) );
			}
			// Menu
			if ( options.menu instanceof ui.Menu ) {
				this.menu = options.menu;
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
			var that = this;
			var autoHide = function( event ) {
				if ( $( event.target ).closest( '.ui-dropdown-menu' ).length === 0 ) {
					that._hideMenu();
					$( document ).unbind( 'click', autoHide );
				}
			}
			$( document ).bind( 'click', autoHide );
			var offset = this.$.offset();
			this.$overlay.css( {
				'top': offset.top + this.$.outerHeight(),
				'min-width': this.$.outerWidth(),
				'display': 'block'
			} );
			if ( options.align === 'right' ) {
				this.$overlay.css( 'left', offset.left + this.$.outerWidth() - this.menu.$.outerWidth() );
			} else {
				this.$overlay.css( 'left', offset.left );
			}
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

Class( ui, 'Search', {
	'has': {
		'$': '<div class="ui-search"></div>',
		'$input': '<input type="text" />',
	},
	'can': {
		'initialize': function( options ) {
			options = $.extend( {
				'placeholder': null,
				'classes': []
			}, options || {} );
			this.$ = $( this.$ ).append( this.$input = $( this.$input ) );
			// Placeholder text
			if ( typeOf( options.placeholder ) === 'string' ) {
				this.$input.attr( 'placeholder', options.placeholder );
			}
			// Classes
			if ( typeOf( options.classes ) === 'array' ) {
				this.$.addClass( options.classes.join( ' ' ) );
			}
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
