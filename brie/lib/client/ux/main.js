/**
 * jQuery initialization and configuration interface
 * 
 * Initialization
 * 
 * $('...').ux('element-type');
 * 
 * $('...').ux('element-type', {
 *     'set': { configuration key/value pairs },
 *     'bind': { event/function pairs }
 * });
 * 
 * Single operation
 * 
 * $('...').ux('get', 'config-key');
 * $('...').ux('set', 'config-key', 'config-value');
 * $('...').ux('bind', 'event-name', function );
 * $('...').ux('unbind', 'event-name', function );
 * 
 * Multiple operations
 * 
 * $('...').ux('set', { key value pairs });
 * $('...').ux('bind', { event/function pairs });
 * $('...').ux('unbind', { event/function pairs });
 * $('...').ux({
 *     'set': { configuration key/value pairs },
 *     'bind': { event/function pairs },
 *     'unbind': { event/function pairs },
 * });
 */
$.fn.ux = function() {
	var args = $.makeArray(arguments),
		result = $(this);
	$(this).each( function() {
		var $this = $(this),
			model,
			type = $this.attr('ux-type'),
			operations;
		if (!type && args.length) {
			// Element is not yet initialized, accept type from first parameter
			type = args[0];
			// Validate type
			if (!(type in $.ux.elements)) {
				throw "Unkonwn UX element type error. " + type + " is not a valid element type.";
			}
			// Store type in attribute
			$this.attr('ux-type', type);
			// Shortcut to model
			model = $.ux.elements[type];
			// Initialize element
			model.init($this);
			// Accept operations from second argument
			if (args.length === 2 && $.isPlainObject(args[1])) {
				operations = args[1];
			}
		} else {
			// Shortcut to model
			model = $.ux.elements[type];
			// Handle $('...').ux('operation type', 'operation key', value); calling method
			if (args.length === 3 && typeof args[0] === 'string' && typeof args[1] === 'string') {
				operations = {};
				operations[args[0]] = {};
				operations[args[0]][args[1]] = args[2];
			}
			// Handle $('...').ux('operation type', operations or value); calling method
			else if (args.length === 2 && typeof args[0] === 'string') {
				operations = {};
				operations[args[0]] = args[1];
			}
			// Handle $('...').ux({ list of operations grouped by type }); calling method
			else if (args.length === 1 && $.isPlainObject(args[0])) {
				operations = args[0];
			}
		}
		if (operations) {
			for (method in operations) {
				var operation = operations[method];
				switch (method) {
					case 'get':
						if (operation in model.get) {
							result = model.get[operation]($this);
							return false;
						}
						break;
					case 'set':
						for (var key in operation) {
							if (key in model.set) {
								model.set[key]($this, operation[key]);
							}
						}
						break;
					case 'bind':
						for (var key in operation) {
							$this.bind(key, operation[key]);
						}
						break;
					case 'unbind':
						for (var key in operation) {
							$this.unbind(key, operation[key]);
						}
						break;
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
	'elements': {}
};

$.ux.elements.toolbar = {
	'init': function($this) {
		$this
			.addClass('ux-toolbar')
			.append('<div class="ux-toolbar-contents"></div>');
	},
	'get': {
		'id': function($this) {
			return $this.attr('id');
		},
		'contents': function($this) {
			return $this.find('.ux-toolbar-contents');
		}
	},
	'set': {
		'id': function($this, val) {
			$this.attr('id', val);
		},
		'contents': function($this, val) {
			var $contents = $this.find('.ux-toolbar-contents');
			$contents.empty();
			if ($.isArray(val)) {
				for (var i = 0; i < val.length; i++) {
					$contents.append(val[i]);
				}
			} else {
				$contents.append(val);
			}
		}
	}
};

$.ux.elements.toolbarGroup = {
	'init': function($this) {
		$this
			.addClass('ux-toolbarGroup')
			.append('<div class="ux-toolbarGroup-label"></div>'
					+ '<div class="ux-toolbarGroup-contents"></div>');
	},
	'get': {
		'id': function($this) {
			return $this.attr('id');
		},
		'label': function($this) {
			return $this.find('.ux-toolbarGroup-label').text();
		},
		'icon': function($this) {
			return $this.attr('ux-icon') === 'disabled';
		},
		'contents': function($this) {
			return $this.find('.ux-toolbarGroup-contents');
		}
	},
	'set': {
		'id': function($this, val) {
			$this.attr('id', val);
		},
		'label': function($this, val) {
			$this.find('.ux-toolbarGroup-label').text(val);
		},
		'icon': function($this, val) {
			if (val) {
				$this.attr('ux-icon', val);
			} else {
				$this.removeAttr('ux-icon');
			}
		},
		'contents': function($this, val) {
			var $contents = $this.find('.ux-toolbarGroup-contents');
			$contents.empty();
			if ($.isArray(val)) {
				for (var i = 0; i < val.length; i++) {
					$contents.append( val[i] );
				}
			} else {
				$contents.append(val);
			}
		}
	}
};

$.ux.elements.toolbarButton = {
	'init': function($this) {
		$this
			.addClass('ux-toolbarButton')
			.append('<div class="ux-toolbarButton-label"></div>')
			.click(function() {
				if ($this.is(':not([ux-disabled])')) {
					$this.triggerHandler('ux-toolbarButton-execute');
				}
			});
	},
	'get': {
		'id': function($this) {
			return $this.attr('id');
		},
		'label': function($this) {
			return $this.find('.ux-toolbarButton-label').text();
		},
		'icon': function($this) {
			return $this.attr('ux-icon') === 'disabled';
		},
		'disabled': function($this) {
			return $this.attr('ux-disabled') === 'disabled';
		}
	},
	'set': {
		'id': function($this, val) {
			$this.attr('id', val);
		},
		'label': function($this, val) {
			$this.find('.ux-toolbarButton-label').text(val);
		},
		'icon': function($this, val) {
			if (val) {
				$this.attr('ux-icon', val);
			} else {
				$this.removeAttr('ux-icon');
			}
		},
		'disabled': function($this, val) {
			if (val) {
				$this.attr('ux-disabled', 'disabled');
			} else {
				$this.removeAttr('ux-disabled');
			}
		}
	}
};

$.ux.elements.toolbarUploadButton = {
	'init': function($this) {
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
					$this.triggerHandler(
						'ux-toolbarUploadButton-execute',
						{'input': $this.find('input:file').get(0)}
					);
				}
			});
	},
	'get': {
		'id': function($this) {
			return $this.attr('id');
		},
		'label': function($this) {
			return $this.find('.ux-toolbarButton-label').text();
		},
		'icon': function($this) {
			return $this.attr('ux-icon') === 'disabled';
		},
		'disabled': function($this) {
			return $this.attr('ux-disabled') === 'disabled';
		},
		'multiple': function($this) {
			return !!$this.find('input:file').attr('multiple');
		}
	},
	'set': {
		'id': function($this, val) {
			$this.attr('id', val);
		},
		'label': function($this, val) {
			$this.find('.ux-toolbarButton-label').text(val);
		},
		'icon': function($this, val) {
			if (val) {
				$this.attr('ux-icon', val);
			} else {
				$this.removeAttr('ux-icon');
			}
		},
		'disabled': function($this, val) {
			if (val) {
				$this.attr('ux-disabled', 'disabled');
			} else {
				$this.removeAttr('ux-disabled');
			}
		},
		'multiple': function($this, val) { 
			if (val) {
				$this.find('input:file').attr('multiple', 'multiple');
			} else {
				$this.removeAttr('multiple');
			}
		}
	}
};
