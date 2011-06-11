/**
 * jQuery initialization and configuration interface
 */
$.fn.ux = function() {
	var args = $.makeArray(arguments),
		result = $(this);
	$(this).each( function() {
		var $this = $(this),
			type = $this.attr('ux-type');
		if (!type && args.length) {
			type = args[0];
			if (!(type in $.ux.elements)) {
				throw "Unkonwn UX element type error. " + type + " is not a valid element type.";
			}
			// Auto-initialize
			if ( args.length >= 2 ) {
				$.ux.elements[type].initialize($this, args[1]);
			} else {
				$.ux.elements[type].initialize($this);
			}
			$this.attr('ux-type', type);
			args.shift();
		}
		if (args.length) {
			// Configure
			var config = args[0];
			if ($.isPlainObject(config)) {
				for (var key in config) {
					$.ux.elements[type].configure($this, key, config[key]);
				}
			} else if ($.type(config) === 'string') {
				if (args.length >= 2) {
					$.ux.elements[type].configure($this, config, args[1]);
				} else {
					result = $.ux.elements[type].configure($this, config);
					return false;
				}
			}
		}
	} );
	return result;
};

/**
 * Global methods
 * 
 * By sharing these static functions globally we can greatly reduce memory overhead.
 */
$.ux = {
	'elements': {},
	'create': function( type, id, options ) {
		var $element = $('<div />');
		if ( $.type( id ) === 'string' ) {
			$element.attr( 'id', id );
		} else {
			options = id;
		}
		$element.ux( type, options );
		return $element;
	}
};

$.ux.elements.toolbar = {
	'initialize': function($this) {
		$this
			.addClass( 'ux-toolbar' )
			.append( '<div class="ux-toolbar-contents"></div>' );
	},
	'configure': function($this, key, val) {
		if (val === undefined) {
			// Getters
			switch (key) {
				case 'contents':
					return $this.find('.ux-toolbar-contents');
			}
		} else {
			// Setters
			switch (key) {
				case 'contents':
					var $contents = $this.find('.ux-toolbar-contents');
					$contents.empty();
					if ( $.isArray( val ) ) {
						for ( var i = 0; i < val.length; i++ ) {
							$contents.append( val[i] );
						}
					} else {
						$contents.append( val );
					}
					break;
			}
		}
	}
};

$.ux.elements.toolbarGroup = {
	'initialize': function($this) {
		$this
			.addClass('ux-toolbarGroup')
			.append('<div class="ux-toolbarGroup-label"></div>'
					+ '<div class="ux-toolbarGroup-contents"></div>');
	},
	'configure': function($this, key, val) {
		if (val === undefined) {
			// Getters
			switch (key) {
				case 'label':
					return $this.find('.ux-toolbarGroup-label').text();
				case 'icon':
					return $this.attr('ux-' + key);
				case 'contents':
					return $this.find('.ux-toolbarGroup-contents');
			}
		} else {
			// Setters
			switch (key) {
				case 'label':
					$this.find('.ux-toolbarGroup-label').text(val);
					break;
				case 'icon':
					$this.attr('ux-' + key, val);
					break;
				case 'contents':
					var $contents = $this.find('.ux-toolbarGroup-contents');
					$contents.empty();
					if ( $.isArray( val ) ) {
						for ( var i = 0; i < val.length; i++ ) {
							$contents.append( val[i] );
						}
					} else {
						$contents.append( val );
					}
					break;
			}
		}
	}
};

$.ux.elements.toolbarButton = {
	'initialize': function($this) {
		$this
			.addClass( 'ux-toolbarButton' )
			.append( '<div class="ux-toolbarButton-label"></div>' )
			.click( function() {
				if ( $this.is( ':not([ux-disabled])' ) ) {
					$this.triggerHandler( 'ux.execute' );
				}
			} );
	},
	'configure': function($this, key, val) {
		if (val === undefined) {
			// Getters
			switch (key) {
				case 'label':
					return $this.find('.ux-toolbarButton-label').text();
				case 'icon':
				case 'disabled':
					return $this.attr('ux-' + key) === 'disabled';
			}
		} else {
			// Setters
			switch (key) {
				case 'label':
					$this.find('.ux-toolbarButton-label').text(val);
					break;
				case 'icon':
					$this.attr('ux-' + key, val);
					break;
				case 'disabled':
					if ( val ) {
						$this.attr('ux-' + key, 'disabled');
					} else {
						$this.removeAttr('ux-' + key);
					}
					break;
			}
		}
	}
};

$.ux.elements.toolbarUploadButton = {
	'initialize': function($this) {
		var id = 'ux-toolbarUploadButton-' + $('input:file').length;
		$this
			.addClass('ux-toolbarButton')
			.append('<label class="ux-toolbarButton-label"></label>'
					+ '<input type="file" id="">')
			.find('label')
				.attr('for', id)
				.end()
			.find('input')
				.attr('id', id)
				.end()
			.change(function() {
				if ($this.is(':not([ux-disabled])')) {
					$this.triggerHandler('ux.execute', {'input': $this.find('input:file').get(0)});
				}
			} );
	},
	'configure': function($this, key, val) {
		if (val === undefined) {
			// Getters
			switch (key) {
				case 'label':
					return $this.find('.ux-toolbarButton-label').text();
				case 'icon':
				case 'disabled':
					return $this.attr('ux-' + key) === 'disabled';
				case 'multiple':
					return !!$this.find('input:file').attr('multiple');
			}
		} else {
			// Setters
			switch (key) {
				case 'label':
					$this.find('.ux-toolbarButton-label').text(val);
					break;
				case 'icon':
					$this.attr('ux-' + key, val);
					break;
				case 'disabled':
					if ( val ) {
						$this.attr('ux-' + key, 'disabled');
					} else {
						$this.removeAttr('ux-' + key);
					}
					break;
				case 'multiple':
					if ( val ) {
						$this.find('input:file').attr('multiple', 'multiple');
					} else {
						$this.removeAttr('multiple');
					}
					break;
			}
		}
	}
};
