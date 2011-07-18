/**
 * 
 * @param id {String}
 * @param options {Object}
 * @param options.src {String}
 * @param options.width {Integer}
 * @param options.height {Integer}
 * @returns
 */
$.ux.models.gridListItem = function(gridList, options) {
	this.gridList = gridList;
	this.id = options.id || '';
	this.src = options.src || null;
	this.top = 0;
	this.left = 0;
	this.$ = $.ux.models.gridListItem.$template.clone().attr('ux-object-id', this.id);
	this.width = options.width || this.$.outerWidth();
	this.height = options.height || this.$.outerHeight();
	var gridListItem = this;
	this.$img = this.$.find('img')
		.attr({
			'src': this.src,
			'width': this.width,
			'height': this.height
		})
		.bind({
			'load': function(e) {
				return gridListItem.onLoad(e);
			},
			'dragstart': function(e) {
				return gridListItem.onDragStart(e);
			},
			'dragend': function(e) {
				return gridListItem.onDragEnd(e);
			}
		});
}

/* Static Members */

$.ux.models.gridListItem.$template = $(
	'<div draggable="true" class="ux-gridListItem ux-gridListItem-animated">'
		+ '<div class="ux-gridListItem-frame"><img class="ux-gridListItem-loading"></div></div>');

/* Methods */

$.ux.models.gridListItem.prototype.onLoad = function(e) {
	this.$img.removeClass('ux-gridListItem-loading');
	this.width = this.$img.outerWidth();
	this.height = this.$img.outerHeight();
	this.gridList.flow(true);
};

$.ux.models.gridListItem.prototype.onDragStart = function(e) {
	// Change item and GridList state
	var gl = this.gridList;
	gl.$placeholder = this.$
		.addClass( 'ux-gridListItem-dragging' )
		.prepend(
			$('<div class="ux-gridListItem-mask"></div>').fadeTo(0.75)
		);
	gl.mouse.drag.active = true;
	gl.mouse.drag.width = this.$.width();
	gl.positionItem(this, false, true, function() {
		var offset = this.$.offset();
		gl.mouse.drag.offsetX = e.pageX - offset.left;
		gl.mouse.drag.offsetY = e.pageY - offset.top;
	});
	// Configure DataTransfer
	var dt = e.originalEvent.dataTransfer
	dt.dropEffect = 'move';
	dt.effectAllowed = 'move';
	return true;
};

$.ux.models.gridListItem.prototype.onDragEnd = function(e) {
	// Change item and GridList state
	var gl = this.gridList;
	gl.mouse.drag.active = false;
	gl.mouse.drag.width = 0;
	var offset = gl.$grid.offset();
	this.left = gl.mouse.drag.offsetX - offset.left;
	this.top = gl.mouse.drag.offsetY - offset.top;
	gl.handleDragEnd(this);
	return false;
};

/**
 * Events
 *     ux-gridList-load
 *     ux-gridList-reflow
 *     ux-gridList-changeItemId [from, to, origin]
 *     ux-gridList-addItems [items, origin]
 *     ux-gridList-removeItems [ids, origin]
 *     ux-gridList-sequenceItems [sequence, origin]
 *     ux-gridList-dropFile [dataTransfer]
 *     ux-gridList-select [selection]
 */
$.ux.models.gridList = function($this) {
	this.$ = $this.addClass('ux-gridList');
	this.$grid = $('<div class="ux-gridList-grid"></div>').appendTo(this.$);
	this.options = {
		'reflowDelay': 150,
		'autoScrollStep': 180
	};
	this.autoScrollWait = false;
	this.flowed = false;
	this.items = {};
	this.sequence = [];
	this.grid = {
		'rows': [],
		'width': 0
	};
	this.marquee = {
		'active': false,
		'top': 0,
		'left': 0,
		'$': $('<div class="ux-gridList-marquee"></div>').appendTo(this.$grid)
	};
	this.touch = {
		'active': false,
		'identifier': null,
		'target': null,
		'timeout': null,
		'moved': false,
		'drag': {
			'left': 0,
			'top': 0,
			'width': 0,
			'offsetX': 0,
			'offsetY': 0,
		}
	};
	this.mouse = {
		'drag': {
			'active': false,
			'left': 0,
			'top': 0,
			'width': 0,
			'offsetX': 0,
			'offsetY': 0,
			'endOffsetX': 0,
			'endOffsetY': 0
		}
	};
	this.keys = {
		'shift': false
	};
	this.autoScroll = {
		'active': false,
	};
	
	// Closure-safe reference to this
	var gridList = this;
	
	// Setup load and resize handers
	var reflowTimeout;
	$(window).bind({
		'load': function() {
			gridList.grid.width = gridList.measure();
			if (gridList.sequence.length) {
				gridList.flow();
			}
			gridList.$.trigger('ux-gridList-load');
		},
		'resize': function() {
			var newWidth = gridList.measure();
			if ( newWidth !== gridList.grid.width ) {
				gridList.grid.width = newWidth;
				clearTimeout(reflowTimeout);
				reflowTimeout = setTimeout(function() {
					if (gridList.sequence.length) {
						gridList.flow();
					}
				}, gridList.options.reflowDelay);
				gridList.$.trigger('ux-gridList-reflow');
			}
		}
	});
	
	// Setup keyboard and mouse interactions
	$(document).bind({
		'mouseup': function(e) {
			return gridList.onMouseUp(e);
		},
		'mousemove': function(e) {
			return gridList.onMouseMove(e);
		}
	});
	
	// Setup drag and drop interactions
	this.$.bind({
		'mousedown': function(e) {
			return gridList.onMouseDown(e);
		},
		'keydown': function(e) {
			return gridList.onKeyDown(e);
		},
		'keyup': function(e) {
			return gridList.onKeyUp(e);
		},
		'dragover': function(e) {
			return gridList.onDragOver(e);
		},
		'dragleave': function(e) {
			return gridList.onDragLeave(e);
		},
		'drop': function(e) {
			return gridList.onDrop(e);
		}
	});
	
	this.$grid.bind({
		'touchstart': function(e) {
			return gridList.onTouchStart(e);
		},
		'touchmove': function(e) {
			return gridList.onTouchMove(e);
		},
		'touchend touchcancel': function(e) {
			return gridList.onTouchEnd(e);
		}
	});
};

/* Static Members */

$.ux.models.gridList.config = {
	'get': {
		//
	},
	'set': {
		//
	}
}

$.ux.models.gridList.$itemTemplate = $('<div draggable="true" class="ux-gridListItem ux-gridListItem-animated">'
		+ '<div class="ux-gridListItem-frame"><img></div></div>');
$.ux.models.gridList.$ruler = $('<div></div>');

/* Methods */

$.ux.models.gridList.prototype.changeItemId = function(from, to, origin) {
	this.items[from].$.attr('ux-object-id', to);
	this.items[to] = this.items[from];
	delete this.items[from]
	this.sequence.splice(this.sequence.indexOf(from), 1, to);
	this.$.trigger('ux-gridList-changeItemId', [from, to, origin]);
};

$.ux.models.gridList.prototype.addItems = function(items, origin) {
	if (items.length) {
		var newIds = [];
		for (var i = 0; i < items.length; i++) {
			var item = new $.ux.models.gridListItem(this, items[i]);
			this.items[item.id] = item;
			newIds.push(item.id);
			this.sequence.push(item.id);
			this.$grid.append(item.$);
		}
		this.$.trigger('ux-gridList-addItems', [newIds, origin]);
	}
};

$.ux.models.gridList.prototype.removeItems = function(ids, origin) {
	if (ids.length) {
		var gl = this;
		var $sel = $([]);
		for (var i = 0; i < ids.length; i++) {
			$sel = $sel.add(this.items[ids[i]].$);
			delete this.items[ids[i]];
			this.sequence.splice(this.sequence.indexOf(ids[i]), 1);
		}
		if ($sel.length) {
			$sel.fadeOut(
				this.options.animationSpeed,
				this.options.animationEasing,
				function() {
					$(this).remove();
				}
			);
			gl.flow();
			this.$.trigger('ux-gridList-removeItems', [ids, origin]);
		}
	}
};

$.ux.models.gridList.prototype.moveItemsBefore = function(ids, target, origin) {
	if (typeof target === 'undefined') {
		target = this.sequence[0];
	}
	if (ids.indexOf(target) >= 0) {
		ids.splice(ids.indexOf(target), 1);
		this.moveItemsAfter(ids, target);
		return;
	}
	for (var i = 0; i < ids.length; i++) {
		this.sequence.splice(this.sequence.indexOf(ids[i]), 1);
		this.sequence.splice(this.sequence.indexOf(target), 0, ids[i]);
	}
	if (ids.length) {
		this.$.trigger('ux-gridList-sequenceItems', [this.sequence, origin]);
	}
};

$.ux.models.gridList.prototype.moveItemsAfter = function(ids, target, origin) {
	if (typeof target === 'undefined') {
		target = this.sequence[this.sequence.length - 1];
	}
	if (ids.indexOf(target) >= 0) {
		ids.splice(ids.indexOf(target), 1);
		this.moveItemsBefore(ids, target);
		return;
	}
	for (var i = ids.length - 1; i >= 0; i--) {
		this.sequence.splice(this.sequence.indexOf(ids[i]), 1);
		this.sequence.splice(this.sequence.indexOf(target) + 1, 0, ids[i]);
	}
	if (ids.length) {
		this.$.trigger('ux-gridList-sequenceItems', [this.sequence, origin]);
	}
};

$.ux.models.gridList.prototype.sequenceItems = function(sequence, origin) {
	if (this.sequence.length !== sequence.length) {
		throw 'Invalid sequence error. The new sequence contains the wrong number of items.';
	}
	for (var i = 0; i < sequence.length; i++) {
		if (this.sequence.indexOf(sequence[i]) === -1) {
			throw 'Invalid sequence error. The new sequence does not contain the same items.';
		}
	}
	this.sequence = sequence;
	this.$.trigger('ux-gridList-sequenceItems', [sequence, origin]);
};

$.ux.models.gridList.prototype.measure = function() {
	var $ruler = $.ux.models.gridList.$ruler.appendTo(this.$grid);
	var width = $ruler.innerWidth();
	$ruler.detach();
	return width;
};

$.ux.models.gridList.prototype.flow = function(now) {
	var pad = 10,
		left = pad,
		top = pad,
		height = 0,
		row;
	this.grid.rows = [row = {'items': [], 'top': top, 'height': 0}];
	for (var i = 0; i < this.sequence.length; i++) {
		var item = this.items[this.sequence[i]];
		if (left + item.width + pad > this.grid.width) {
			left = pad;
			top += row.height;
			this.grid.rows.push(row = {'items': [], 'top': top, 'height': 0});
		}
		item.left = left;
		item.top = top;
		this.positionItem(item, true);
		item.$.css('margin-left', 0);
		row.height = height = Math.max(row.height, item.height);
		row.items.push(item);
		left += item.width;
	}
	if (row.items.length) {
		this.grid.rows.push(row);
	}
	
	this.$grid.css('height', Math.max(top + height + pad, this.$.height()));
	this.flowed = true;
};

$.ux.models.gridList.prototype.positionItem = function(item, transform, direct, callback) {
	if (direct) {
		item.$.removeClass('ux-gridListItem-animated');
	}
	if (Modernizr.csstransforms) {
		var translate,
			top,
			left;
		if (transform) {
			if (Modernizr.csstransforms3d) {
				translate = 'translate3d(' + item.left + 'px,' + item.top + 'px,0)';
			} else {
				translate = 'translate(' + item.left + 'px,' + item.top + 'px)';
			}
			left = 0;
			top = 0;
		} else {
			if (Modernizr.csstransforms3d) {
				translate = 'translate3d(0,0,0)';
			} else {
				translate = 'translate(0,0)';
			}
			left = item.left;
			top = item.top;
		}
		item.$.css({
			'left': left,
			'top': top,
			'-webkit-transform': translate,
			'-moz-transform': translate,
			'-o-transform': translate,
			'transform': translate
		});
	} else {
		item.$.css({
			'left': item.left,
			'top': item.top
		});
	}
	if (callback) {
		setTimeout(function() {
			item.$.addClass('ux-gridListItem-animated');
			callback.call(item);
		}, 0);
	}
};

$.ux.models.gridList.prototype.handleDragOver = function(drag) {
	var rows = this.grid.rows,
		row,
		item,
		leftElement,
		rightElement,
		$left = $([]),
		$right = $([]),
		$outside = $([]);
	for (var r = 0; r < rows.length; r++) {
		row = rows[r];
		if (drag.top > row.top && drag.top < row.top + row.height) {
			for (var i = 0; i < row.items.length; i++) {
				item = row.items[i];
				if (drag.left < item.left + (item.width / 2)) {
					$right = $right.add(item.$);
					if (!rightElement) {
						rightElement = item.$[0];
					}
				} else {
					$left = $left.add(item.$);
					leftElement = item.$[0];
				}
			}
		} else {
			for (var i = 0; i < row.items.length; i++) {
				$outside = $outside.add(row.items[i].$);
			}
		}
	}
	if (this.$placeholder && (leftElement === this.$placeholder[0]
			|| rightElement === this.$placeholder[0])) {
		$outside = $outside.add($right).add($left);
	} else {
		$outside.add($right).add($left).removeClass('ux-gridListItem-dropTarget');
		if (leftElement) {
			$(leftElement).addClass('ux-gridListItem-dropTarget');
		} else if (rightElement) {
			$(rightElement).addClass('ux-gridListItem-dropTarget');
		}
		$right.filter(':not(.ux-gridListItem-rightOfDrag)')
			.removeClass('ux-gridListItem-leftOfDrag')
			.addClass('ux-gridListItem-rightOfDrag')
			.css('margin-left', drag.width / 2);
		$left.filter(':not(.ux-gridListItem-leftOfDrag)')
			.removeClass('ux-gridListItem-rightOfDrag')
			.addClass('ux-gridListItem-leftOfDrag')
			.css('margin-left', -drag.width / 2);
	}
	$outside.filter('.ux-gridListItem-rightOfDrag')
		.removeClass('ux-gridListItem-rightOfDrag')
		.css('margin-left', 0);
	$outside.filter('.ux-gridListItem-leftOfDrag')
		.removeClass('ux-gridListItem-leftOfDrag')
		.css('margin-left', 0);
};

$.ux.models.gridList.prototype.handleDragEnd = function(item) {
	// Change item and GridList state
	this.$
		.removeClass( 'ux-gridListItem-dragging' )
		.find('.ux-gridListItem-mask')
			.remove();
	// Choose drop target and move item to be adjacent to it
	var $target = this.$.find('.ux-gridListItem-rightOfDrag.ux-gridListItem-dropTarget')
	if ($target.length) {
		this.moveItemsBefore([item.id], $target.attr('ux-object-id'), 'user');
	} else {
		$target = this.$.find('.ux-gridListItem-leftOfDrag.ux-gridListItem-dropTarget');
		if ($target.length) {
			this.moveItemsAfter([item.id], $target.attr('ux-object-id'), 'user');
		}
	}
	this.$.find('.ux-gridListItem-rightOfDrag,.ux-gridListItem-leftOfDrag').removeClass(
		'ux-gridListItem-rightOfDrag ux-gridListItem-leftOfDrag ux-gridListItem-dropTarget'
	);
	item.$.css('margin-left', 0).removeClass('ux-gridListItem-dragging');
	var gl = this;
	this.positionItem(item, true, true, function() {
		gl.flow();
	});
};

$.ux.models.gridList.prototype.handleAutoScroll = function(top) {
	if ( this.autoScroll.active ) {
		return;
	}
	var scrollTop = this.$.scrollTop();
	var height = this.$grid.outerHeight();
	var view = this.$.outerHeight();
	var autoScrollBorder = view * 0.1;
	if (view < height) {
		var gridList = this;
		if (top < scrollTop + autoScrollBorder) {
			// Scroll up
			this.autoScroll.active = true;
			this.$.scrollTo('-=' + this.options.autoScrollStep + 'px', {
				'duration': 'fast',
				'axis': 'y',
				'onAfter': function() {
					gridList.autoScroll.active = false;
				}
			});
		} else if (top > ( scrollTop + view ) - autoScrollBorder) {
			// Scroll down
			this.autoScroll.active = true;
			this.$.scrollTo( '+=' + this.options.autoScrollStep + 'px', {
				'duration': 'fast',
				'axis': 'y',
				'onAfter': function() {
					gridList.autoScroll.active = false;
				}
			});
		}
	}
};

$.ux.models.gridList.prototype.onTouchStart = function(e) {
	var touch = e.originalEvent.targetTouches[0];
	if (touch && !this.touch.active) {
		clearTimeout(this.touch.timeout);
		var $target = $(touch.target);
		if ($target.is('.ux-gridListItem img')) {
			var id = $target.closest('.ux-gridListItem').attr('ux-object-id'),
				item = this.items[id];
			this.$grid.find('.ux-gridListItem-selected').removeClass('ux-gridListItem-selected');
			this.selection = [id];
			item.$.addClass('ux-gridListItem-selected');
			this.touch.active = true;
			item.$.addClass('ux-gridListItem-dragging');
			this.touch.target = item;
			var gridOffset = this.$.offset(),
				itemOffset = item.$.offset();
			this.touch.drag.left = itemOffset.left - gridOffset.left;
			this.touch.drag.top = itemOffset.top - gridOffset.top;
			this.touch.drag.width = item.$.outerWidth();
			this.touch.drag.offsetX = touch.pageX - itemOffset.left;
			this.touch.drag.offsetY = touch.pageY - itemOffset.top;
			this.$placeholder = item.$;
			e.preventDefault();
			this.touch.moved = false;
			return false;
		} else {
			this.touch.target = null;
		}
	}
};

$.ux.models.gridList.prototype.onTouchMove = function(e) {
	var touch = e.originalEvent.changedTouches[0];
	if (touch && this.touch.active && this.touch.target) {
		var gl = this,
			gridOffset = this.$.offset(),
			left = touch.pageX - gridOffset.left - this.touch.drag.offsetX,
			top = touch.pageY - gridOffset.top - this.touch.drag.offsetY + this.$.scrollTop(),
			scrollTop = touch.pageY - gridOffset.top + this.$.scrollTop();
		// Autoscroll once every 100ms max
		if (!this.autoScrollWait) {
			this.autoScrollWait = true;
			setTimeout(function() {
				gl.handleAutoScroll(scrollTop);
				gl.autoScrollWait = false;
			}, 100);
		}
		// Only continue when the mouse moves
		if ( left === this.touch.drag.left && top === this.touch.drag.top ) {
			return false;
		}
		if (!this.touch.moved) {
			this.touch.drag.$icon = this.touch.target.$.find('img').clone()
				.appendTo(this.$grid)
				.addClass('ux-gridListItem-icon');
			this.touch.moved = true;
		}
		this.touch.drag.left = touch.pageX - gridOffset.left;
		this.touch.drag.top = touch.pageY - gridOffset.top + this.$.scrollTop();
		this.touch.drag.$icon.css(
			'-webkit-transform', 'translate3d(' + left + 'px,' + top + 'px,0)'
		);
		this.handleDragOver(this.touch.drag);
		return false;
	}
};

$.ux.models.gridList.prototype.onTouchEnd = function(e) {
	var touch = e.originalEvent.changedTouches[0];
	if (touch && this.touch.active && this.touch.target) {
		clearTimeout(this.touch.timeout);
		this.touch.active = false;
		this.mouse.drag.width = 0;
		this.touch.identifier = null;
		this.touch.target.$.removeClass('ux-gridListItem-dragging');
		this.touch.drag.$icon.remove();
		if (this.touch.moved) {
			this.touch.target.left = this.touch.drag.left - this.touch.drag.offsetX;
			this.touch.target.top = this.touch.drag.top - this.touch.drag.offsetY;
			this.handleDragEnd(this.touch.target);
		}
		this.touch.target = null;
		return false;
	}
};

$.ux.models.gridList.prototype.onDragOver = function(e) {
	if (!this.mouse.drag.active) {
		this.$.addClass('ux-gridList-dragingOver');
	}
	// This fires over and over, like mousemove
	var gl = this,
		offset = this.$.offset(),
		left = e.pageX - offset.left,
		top = e.pageY - offset.top + this.$.scrollTop();
	// Autoscroll once every 100ms max
	if (!this.autoScrollWait) {
		this.autoScrollWait = true;
		setTimeout(function() {
			gl.handleAutoScroll(top);
			gl.autoScrollWait = false;
		}, 100);
	}
	// Only continue when the mouse moves
	if ( left === this.mouse.drag.left && top === this.mouse.drag.top ) {
		return false;
	}
	
	this.mouse.drag.left = left;
	this.mouse.drag.top = top;
	
	this.handleDragOver(this.mouse.drag);
	
	return false;
};

$.ux.models.gridList.prototype.onDragLeave = function(e) {
	if (!this.mouse.drag.active) {
		this.$.removeClass('ux-gridList-draggingOver');
	}
	return false;
};

$.ux.models.gridList.prototype.onDrop = function(e) {
	if (!this.mouse.drag.active) {
		this.$.removeClass('ux-gridList-draggingOver');
		var dt = e.originalEvent.dataTransfer;
		if (dt && typeof dt.files == 'object' && dt.files.length) {
			this.$.trigger('ux-gridList-dropFile', [dt]);
		}
	}
	this.mouse.drag.offsetX = e.pageX - this.mouse.drag.offsetX;
	this.mouse.drag.offsetY = e.pageY - this.mouse.drag.offsetY;
	e.preventDefault();
	return false;
};

$.ux.models.gridList.prototype.onKeyDown = function(e) {
	this.keys.shift = e.shiftKey;
	// Handle selection deletions
	if (e.keyCode == 8 || e.keyCode == 46) {
		this.removeItems(this.getSelection(), 'user');
		e.preventDefault();
		return false;
	}
};

$.ux.models.gridList.prototype.onKeyUp = function(e) {
	this.keys.shift = e.shiftKey;
};

$.ux.models.gridList.prototype.onMouseDown = function(e) {
	if (e.button === 0) {
		var $target = $(e.target);
		if ($target.is('.ux-gridListItem img')) {
			if (!this.keys.shift) {
				this.$.find('.ux-gridListItem-selected').removeClass('ux-gridListItem-selected');
			}
			$target.closest('.ux-gridListItem').addClass('ux-gridListItem-selected');
			e.stopPropagation();
		} else if ( e.layerX < this.$grid.innerWidth()) {
			this.$grid.find('.ux-gridListItem-selected').removeClass('ux-gridListItem-selected');
			this.$.trigger('ux-gridList-select', [[]]);
			var offset = this.$grid.offset();
			this.marquee.active = true;
			this.marquee.left = e.pageX - offset.left;
			this.marquee.top = e.pageY - offset.top;
			e.stopPropagation();
			return false;
		}
	}
};

$.ux.models.gridList.prototype.getSelection = function(e) {
	var selection = [];
	this.$grid.find('.ux-gridListItem-selected').each(function() {
		selection.push($(this).attr('ux-object-id'));
	});
	return selection;
};

$.ux.models.gridList.prototype.onMouseUp = function(e) {
	this.$.trigger('ux-gridList-select', [this.getSelection()]);
	if (this.marquee.active) {
		this.marquee.active = false;
		this.marquee.$.hide();
	}
};

$.ux.models.gridList.prototype.onMouseMove = function(e) {
	if (this.marquee.active) {
		var offset = this.$.offset();
		offset.top -= this.$.scrollTop();
		var $last = this.$grid.find('> .ux-gridListItem:last'),
			style,
			x = Math.min(Math.max(e.pageX - offset.left, 0), this.$grid.width()),
			y = Math.min(Math.max(e.pageY - offset.top, 0), this.$grid.height());
		this.handleAutoScroll(y);
		if (x < this.marquee.left) {
			if (y < this.marquee.top) {
				// Up and left
				style = {
					'left': x,
					'top': y,
					'width': this.marquee.left - x,
					'height': this.marquee.top - y
				};
			} else {
				// Down and left
				style = {
					'left': x,
					'top': this.marquee.top,
					'width': this.marquee.left - x,
					'height': y - this.marquee.top
				};
			}
		} else {
			if (y < this.marquee.top) {
				// Up and right
				style = {
					'left': this.marquee.left,
					'top': y,
					'width': x - this.marquee.left,
					'height': this.marquee.top - y
				};
			} else {
				// Down and right
				style = {
					'left': this.marquee.left,
					'top': this.marquee.top,
					'width': x - this.marquee.left,
					'height': y - this.marquee.top
				};
			}
		}
		this.marquee.$.show().css(style);
		var rows = this.grid.rows;
		for (var r = 0; r < rows.length; r++) {
			var row = rows[r];
			for (var i = 0; i < row.items.length; i++) {
				var item = row.items[i];
				if (item.left <= style.left + style.width
						&& item.left + item.width >= style.left
						&& item.top <= style.top + style.height
						&& item.top + item.height >= style.top) {
					item.$.addClass('ux-gridListItem-selected');
				} else {
					item.$.removeClass('ux-gridListItem-selected');
				}
			}
		}
	}
};
