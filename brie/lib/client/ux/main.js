/**
 * jQuery initialization and configuration interface
 */
$.fn.ux = function() {
	var args = $.makeArray(arguments),
		result = $(this);
	$(this).each( function() {
		var $this = $(this),
			model,
			type = $this.attr('ux-type');
		if (!type && args.length) {
			type = args[0];
			model = $.ux.elements[type];
			if (!(type in $.ux.elements)) {
				throw "Unkonwn UX element type error. " + type + " is not a valid element type.";
			}
			// Auto-initialize
			if (args.length >= 2) {
				model.initialize($this, args[1]);
			} else {
				model.initialize($this);
			}
			$this.attr('ux-type', type);
			args.shift();
		} else {
			model = $.ux.elements[type];
		}
		if (args.length) {
			// Configure
			var config = args[0];
			if ($.isPlainObject(config)) {
				for (var key in config) {
					if (key in model.setters) {
						model.setters[key]($this, config[key]);
					}
				}
			} else if ($.type(config) === 'string') {
				if (args.length >= 2) {
					if (config in model.setters) {
						model.setters[config]($this, args[1]);
					}
				} else {
					if (config in model.getters) {
						result = model.getters[config]($this);
						return false;
					}
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
	'create': function(type, id, options) {
		var $element = $('<div />');
		if ($.type(id) === 'string') {
			$element.attr('id', id);
		} else {
			options = id;
		}
		$element.ux(type, options);
		return $element;
	}
};

$.ux.elements.toolbar = {
	'initialize': function($this) {
		$this
			.addClass('ux-toolbar')
			.append('<div class="ux-toolbar-contents"></div>');
	},
	'getters': {
		'contents': function($this) {
			return $this.find('.ux-toolbar-contents');
		}
	},
	'setters': {
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
	'initialize': function($this) {
		$this
			.addClass('ux-toolbarGroup')
			.append('<div class="ux-toolbarGroup-label"></div>'
					+ '<div class="ux-toolbarGroup-contents"></div>');
	},
	'getters': {
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
	'setters': {
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
	'initialize': function($this) {
		$this
			.addClass('ux-toolbarButton')
			.append('<div class="ux-toolbarButton-label"></div>')
			.click(function() {
				if ($this.is(':not([ux-disabled])')) {
					$this.triggerHandler('ux.execute');
				}
			});
	},
	'getters': {
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
	'setters': {
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
			});
	},
	'getters': {
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
	'setters': {
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
