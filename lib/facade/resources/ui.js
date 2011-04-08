var ui = {};

ui.Panel = Class( {
	'has': {
		'options': {
			'html': ''
		},
		'$': '<div class="ui-panel"></div>',
		'$content': '<div class="ui-panel-content"></div>'
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this.options, options || {} );
			this.$ = $( this.$ ).append( this.$content = $( this.$content ).html( this.options.html ) );
		}
	}
} );

ui.Group = Class( {
	'has': {
		'options': {
			'element': 'div',
			'classes': 'ui-group',
			'widgets': {}
		},
		'widgets': {},
		'$': ''
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this.options, options || {} );
			this.$ = $( '<' + this.options.element + '></' + this.options.element + '>' )
				.addClass( typeOf( this.options.classes ) === 'array'
					? this.options.classes.join : this.options.classes );
			for ( key in this.options.widgets ) {
				this.add( key, this.options.widgets[key] );
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
	'has': {
		'options': { 'text': '' },
		'$': '<button class="ui-button"></button>'
	},
	'can': {
		'initialize': function( options ) {
			$.extend( this.options, options || {} );
			this.$ = $( this.$ ).text( this.options.text );
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

ui.header = new ui.Group( {
	'element': 'header',
	'classes': 'ui-header'
} );
ui.sections = new ui.Group( {
	'element': 'section',
	'classes': 'ui-sections'
} );

$( 'body' ).append( ui.header.$, ui.sections.$ );
