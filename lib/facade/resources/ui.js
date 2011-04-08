window.ui = {};

ui.Widget = Class( {
	'has': {
		'options': {}
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this.options, options || {} );
		}
	}
} );

ui.Screen = Class( {
	'is': ui.Widget,
	'has': {
		'options': {},
		'$': $( 'body' ),
		'$header': '<header class="ui-screen-header"></header>',
		'$sections': '<section class="ui-screen-sections"></section>',
		'$footer': '<footer class="ui-screen-footer"></footer>'
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this.options, options || {} );
			this.$
				.addClass( 'ui-screen' )
				.append(
					this.$header = $( this.$header ),
					this.$sections = $( this.$sections ),
					this.$footer = $( this.$footer )
				);
		}
	}
} );

ui.Panel = Class( {
	'is': ui.Widget,
	'has': {
		'options': {},
		'$': '<div class="ui-panel"></div>',
		'$content': '<div class="ui-panel-content"></div>'
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this.options, options || {} );
			this.$ = $( this.$ ).append( this.$content = $( this.$content ) );
		}
	}
} );

ui.Group = Class( {
	'is': ui.Widget,
	'has': {
		'options': {},
		'widgets': {},
		'$': '<div class="ui-group"></div>'
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this.options, options || {} );
			this.$ = $( this.$ );
			if ( 'widgets' in options ) {
				for ( key in options.widgets ) {
					this.add( key, options.widgets[key] );
				}
			}
		},
		/**
		 * Adds a widget to the group.
		 * 
		 * @param key String: Name to access widget by later on
		 * @param widget Object: Widget to add
		 * @return Object: This
		 */
		'add': function( key, widget ) {
			this.widgets[key] = widget;
			this.$.append( widget.$ );
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
				this.widgets[key].$.remove();
				delete this.widgets[key];
			}
			return this;
		},
		/**
		 * Gets a widget by name.
		 * 
		 * @param key String: Name to widget to get.
		 * @return Object: Widget object or null if no widget exists by that name
		 */
		'get': function( key ) {
			return key in this.widgets ? this.widgets[key] : null;
		}
	}
} );

ui.Button = Class( {
	'is': ui.Widget,
	'has': {
		'options': { 'text': '' },
		'$': '<button class="ui-button"></button>'
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this.options, options || {} );
			this.$ = $( this.$ ).text( options.text );
		},
		/**
		 * Gets/sets the text of the button
		 * 
		 * @param value String: Text to display inside button (optional)
		 * @return String: Text displayed inside button
		 */
		'text': function( text ) {
			if ( typeof text !== 'undefined' ) {
				this.$.text( text );
			}
			return this.$.text();
		}
	}
} );
