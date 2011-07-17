/**
 * jQuery initialization and configuration interface
 * 
 */

/**
 * Initialization
 * 
 * @param type {String} Name of element-type to initialize selection as
 */
$.fn.initialize = function(type) {
	return $(this).each(function() {
		var $this = $(this);
		// Check for prior initialization
		if ($this.attr('ux-type')) {
			throw "Initialization error: already initialized as " + $this.attr('ux-type') + ".";
		}
		// Validate type
		if (!(type in $.ux.models)) {
			throw "Invalid control model error: " + type + " is not a valid control model.";
		}
		// Store type in attribute
		$this.attr('ux-type', type);
		// Initialize element and store it's control object as element data
		$this.data('ux', new ($.ux.models[type])($this));
	});
};

/**
 * Configuration
 */
$.fn.config = function(key, value) {
	var result = $(this);
	$(this).each(function() {
		var $this = $(this),
			type = $this.attr('ux-type');
		if (!type) {
			throw 'Uninitialized control error.';
		}
		var config = $.ux.models[type].config,
			control = $this.data('ux');
		if ($.isPlainObject(key) && typeof value === 'undefined') {
			for (var k in key) {
				if (!(k in config.set)) {
					throw "Invalid configuration error: " + type + " have no " + k + "parameter.";
				}
				config.set[k].call(control, key[k]);
			}
		} else if (typeof key === 'string') {
			if (typeof value !== 'undefined') {
				if (!(key in config.set)) {
					throw "Invalid configuration error: " + type + " have no " + key + "parameter.";
				}
				config.set[key].call(control, value);
			} else {
				if (!(key in config.get)) {
					throw "Invalid configuration error: " + type + " have no " + key + "parameter.";
				}
				result = config.get[key].call(control);
				return false;
			}
		} else {
			throw 'Invalid configuration arguments. Object or parameter name expected.';
		}
	});
	return result;
};

/**
 * Direct object access
 */
$.fn.ux = function() {
	return $(this).data('ux');
};

/**
 * Models
 */
$.ux = {
	'models': {}
};

$.ux.models.toolbar = function($this) {
	this.$ = $this
		.addClass('ux-toolbar')
		.append('<div class="ux-toolbar-contents"></div>');
};

$.ux.models.toolbar.config = {
	'get': {
		'id': function() {
			return this.$.attr('id');
		},
		'contents': function() {
			return this.$.find('.ux-toolbar-contents');
		}
	},
	'set': {
		'id': function(val) {
			this.$.attr('id', val);
		},
		'contents': function(val) {
			var $contents = this.$.find('.ux-toolbar-contents');
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

$.ux.models.toolbarGroup = function($this) {
	this.$ = $this
		.addClass('ux-toolbarGroup')
		.append('<div class="ux-toolbarGroup-label"></div>'
				+ '<div class="ux-toolbarGroup-contents"></div>');
};

$.ux.models.toolbarGroup.config = {
	'get': {
		'id': function() {
			return this.$.attr('id');
		},
		'label': function() {
			return this.$.find('.ux-toolbarGroup-label').text();
		},
		'icon': function() {
			return this.$.attr('ux-icon') === 'disabled';
		},
		'contents': function() {
			return this.$.find('.ux-toolbarGroup-contents');
		}
	},
	'set': {
		'id': function(val) {
			this.$.attr('id', val);
		},
		'label': function(val) {
			this.$.find('.ux-toolbarGroup-label').text(val);
		},
		'icon': function(val) {
			if (val) {
				this.$.attr('ux-icon', val);
			} else {
				this.$.removeAttr('ux-icon');
			}
		},
		'contents': function(val) {
			var $contents = this.$.find('.ux-toolbarGroup-contents');
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

$.ux.models.toolbarButton = function($this) {
	this.$ = $this
		.addClass('ux-toolbarButton')
		.append('<div class="ux-toolbarButton-label"></div>')
		.click(function() {
			if ($this.is(':not([ux-disabled])')) {
				$this.triggerHandler('ux-toolbarButton-execute');
			}
		});
};

$.ux.models.toolbarButton.config = {
	'get': {
		'id': function() {
			return this.$.attr('id');
		},
		'label': function() {
			return this.$.find('.ux-toolbarButton-label').text();
		},
		'icon': function() {
			return this.$.attr('ux-icon') === 'disabled';
		},
		'disabled': function() {
			return this.$.attr('ux-disabled') === 'disabled';
		}
	},
	'set': {
		'id': function(val) {
			this.$.attr('id', val);
		},
		'label': function(val) {
			this.$.find('.ux-toolbarButton-label').text(val);
		},
		'icon': function(val) {
			if (val) {
				this.$.attr('ux-icon', val);
			} else {
				this.$.removeAttr('ux-icon');
			}
		},
		'disabled': function(val) {
			if (val) {
				this.$.attr('ux-disabled', 'disabled');
			} else {
				this.$.removeAttr('ux-disabled');
			}
		}
	}
};

$.ux.models.toolbarUploadButton = function($this) {
	var id = 'ux-toolbarUploadButton-' + $('.ux-toolbarButton input:file').length;
	var $label;
	this.$ = $this
		.addClass('ux-toolbarButton')
		.append($label = $('<label class="ux-toolbarButton-label"></label>').attr('for', id))
		.append($('<input type="file">').attr('id', id))
		.change(function() {
			if ($this.is(':not([ux-disabled])')) {
				$this.triggerHandler(
					'ux-toolbarUploadButton-execute', [$this.find('input:file').get(0)]
				);
			}
		});
	$label.click(function(event) {
		// In Firefox 4/5, clicking on the label doesn't trigger the input,
		// but we can still trigger it explicitly from here.
		$('#' + id).click();
		
		// Chrome 12 will still trigger the input if we don't cancel!
		event.preventDefault();
	})
};

$.ux.models.toolbarUploadButton.config = {
	'get': {
		'id': function() {
			return this.$.attr('id');
		},
		'label': function() {
			return this.$.find('.ux-toolbarButton-label').text();
		},
		'icon': function() {
			return this.$.attr('ux-icon') === 'disabled';
		},
		'disabled': function() {
			return this.$.attr('ux-disabled') === 'disabled';
		},
		'multiple': function() {
			return !!this.$.find('input:file').attr('multiple');
		}
	},
	'set': {
		'id': function(val) {
			this.$.attr('id', val);
		},
		'label': function(val) {
			this.$.find('.ux-toolbarButton-label').text(val);
		},
		'icon': function(val) {
			if (val) {
				this.$.attr('ux-icon', val);
			} else {
				this.$.removeAttr('ux-icon');
			}
		},
		'disabled': function(val) {
			if (val) {
				this.$.attr('ux-disabled', 'disabled');
			} else {
				this.$.removeAttr('ux-disabled');
			}
		},
		'multiple': function(val) { 
			if (val) {
				this.$.find('input:file').attr('multiple', 'multiple');
			} else {
				this.$.removeAttr('multiple');
			}
		}
	}
};

$.ux.models.dialog = function($this) {
	this.$mask = $('<div class="ux-dialog-mask"></div>');
	this.$ = $this
		.addClass('ux-dialog')
		.children()
			.wrapAll('<div class="ux-dialog-contents"></div>')
			.end()
		.before(this.$mask);
};

$.ux.models.dialog.prototype.show = function() {
	this.$.fadeIn('fast');
	this.$mask.fadeIn('fast');
};

$.ux.models.dialog.prototype.hide = function() {
	this.$.fadeOut('fast');
	this.$mask.fadeOut('fast');
};

$.ux.models.dialog.config = {
	'get': {
		'id': function() {
			return this.$.attr('id');
		},
		'title': function() {
			return this.$.find('.ux-dialog-title').text();
		},
		'contents': function() {
			return this.$.find('.ux-dialog-contents');
		}
	},
	'set': {
		'id': function(val) {
			this.$.attr('id', val);
		},
		'label': function(val) {
			this.$.find('.ux-dialog-title').text(val);
		},
		'contents': function(val) {
			var $contents = this.$.find('.ux-dialog-contents');
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
