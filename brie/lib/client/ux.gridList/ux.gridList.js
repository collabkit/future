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
	this.flowed = false;
	this.useCssTransform = true;
	this.items = {};
	this.sequence = [];
	this.grid = {
		'rows': [],
		'width': 0
	};
	this.drag = {
		'active': false,
		'position': null,
		'width': 0,
		'height': 0,
		'offsetX': 0,
		'offsetY': 0,
		'endOffsetX': 0,
		'endOffsetY': 0
	};
	this.marquee = {
		'active': false,
		'top': 0,
		'left': 0,
		'$': $('<div class="ux-gridList-marquee"></div>').appendTo(this.$grid)
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
		'touchend': function(e) {
			return gridList.onTouchEnd(e);
		},
		'touchcancel': function(e) {
			return gridList.onTouchCancel(e);
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

$.ux.models.gridList.$itemTemplate = $('<div draggable="true" class="ux-gridList-item ux-gridList-item-animated">'
		+ '<div class="ux-gridList-item-frame"><img></div></div>');
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
	if (!items.length) {
		return;
	}
	var cssTranform = true;
	var gridList = this;
	$.each(items, function(i, item) {
		var $item = $.ux.models.gridList.$itemTemplate.clone().attr('ux-object-id', item.id);
		$item.find('img')
			.attr({
				'src': item.src,
				'width': item.width || null,
				'height': item.height || null
			})
			.bind({
				'load': function() {
					gridList.items[item.id].width = $item.outerWidth();
					gridList.items[item.id].height = $item.outerHeight();
					gridList.flow(true);
				},
				'mousedown': function(e) {
					if (!gridList.keys.shift) {
						gridList.$
							.find('.ux-gridList-selected')
								.removeClass('ux-gridList-selected');
					}
					$item.addClass('ux-gridList-selected');
					e.stopPropagation();
				},
				'dragstart': function(e) {
					$item
						.addClass( 'ux-gridList-dragging' )
						.prepend($('<div class="ux-gridList-mask"></div>').fadeTo(0.75));
					var dt = e.originalEvent.dataTransfer;
					dt.dropEffect = 'move';
					dt.effectAllowed = 'move';
					gridList.$placeholder = $item;
					gridList.drag.active = true;
					gridList.drag.width = gridList.$placeholder.width();
					gridList.drag.height = gridList.$placeholder.height();
					gridList.positionItem(gridList.items[item.id], false, true, function() {
						var offset = gridList.$placeholder.offset();
						gridList.drag.offsetX = e.pageX - offset.left;
						gridList.drag.offsetY = e.pageY - offset.top;
					});
					return true;
				},
				'dragend': function(e) {
					$item
						.removeClass( 'ux-gridList-dragging' )
						.find('.ux-gridList-mask')
							.remove();
					// Choose drop target and move item to be adjacent to it
					$right = gridList.$.find('.ux-gridList-rightOfDrag.ux-gridList-dropTarget');
					if ($right.length) {
						var target = $right.attr('ux-object-id');
						gridList.moveItemsBefore([item.id], target, 'user');
					} else {
						$left = gridList.$.find('.ux-gridList-leftOfDrag.ux-gridList-dropTarget');
						if ($left.length) {
							var target = $left.attr('ux-object-id');
							gridList.moveItemsAfter([item.id], target, 'user');
						}
					}
					gridList.drag.active = false;
					gridList.drag.width = 0;
					gridList.$.find('.ux-gridList-rightOfDrag,.ux-gridList-leftOfDrag').removeClass(
						'ux-gridList-rightOfDrag ux-gridList-leftOfDrag ux-gridList-dropTarget'
					);
					
					// Apply drop position so the drop feels more natural
					var offset = gridList.$grid.offset();
					gridList.items[item.id].left = gridList.drag.offsetX - offset.left;
					gridList.items[item.id].top = gridList.drag.offsetY - offset.top;
					gridList.items[item.id].$.css('margin-left', 0);
					gridList.positionItem(gridList.items[item.id], true, true, function() {
						gridList.flow();
					});
					return false;
				}
			});
		gridList.$grid.append($item);
		gridList.items[item.id] = {
			'$': $item,
			'width': $item.outerWidth(),
			'height': $item.outerHeight(),
			'left': 0,
			'top': 0
		};
		gridList.sequence.push(item.id);
	});
	this.$.trigger('ux-gridList-addItems', [items, origin]);
};

$.ux.models.gridList.prototype.removeItems = function(ids, origin) {
	if (!ids.length) {
		return;
	}
	var gridList = this;
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
		gridList.flow();
		this.$.trigger('ux-gridList-removeItems', [ids, origin]);
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
		item.$.removeClass('ux-gridList-item-animated');
	}
	if (this.useCssTransform) {
		var translate,
			top,
			left;
		if (transform) {
			translate = 'translate(' + item.left + 'px,' + item.top + 'px)';
			left = 0;
			top = 0;
		} else {
			translate = 'translate(0,0)';
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
			item.$.addClass('ux-gridList-item-animated');
			callback();
		}, 0);
	}
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
	//
};

$.ux.models.gridList.prototype.onTouchMove = function(e) {
	//
};

$.ux.models.gridList.prototype.onTouchEnd = function(e) {
	//
};

$.ux.models.gridList.prototype.onTouchCancel = function(e) {
	//
};

$.ux.models.gridList.prototype.onDragOver = function(e) {
	if (!this.drag.active) {
		this.$.addClass('ux-gridList-draggingOver');
	}
	// This fires over and over, like mousemove
	var offset = this.$.offset();
	var left = e.pageX - offset.left,
		top = e.pageY - offset.top + this.$.scrollTop();
	
	this.handleAutoScroll(top);
	
	// Only continue when the mouse moves
	if ( this.drag.position && left === this.drag.position.left
			&& top === this.drag.position.top ) {
		return false;
	}
	
	this.drag.position = {'left': left, 'top': top};
	var rows = this.grid.rows,
		row,
		item,
		leftElement,
		rightElement,
		bottom,
		$left = $([]),
		$right = $([]),
		$outside = $([]);
	
	for (var r = 0; r < rows.length; r++) {
		row = rows[r];
		if (top > row.top && top < row.top + row.height) {
			for (var i = 0; i < row.items.length; i++) {
				item = row.items[i];
				if (left < item.left + (item.width / 2)) {
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
		$outside.add($right).add($left).removeClass('ux-gridList-dropTarget');
		if (leftElement) {
			$(leftElement).addClass('ux-gridList-dropTarget');
		} else if (rightElement) {
			$(rightElement).addClass('ux-gridList-dropTarget');
		}
		$right.filter(':not(.ux-gridList-rightOfDrag)')
			.removeClass('ux-gridList-leftOfDrag')
			.addClass('ux-gridList-rightOfDrag')
			.css('margin-left', this.drag.width / 2);
		$left.filter(':not(.ux-gridList-leftOfDrag)')
			.removeClass('ux-gridList-rightOfDrag')
			.addClass('ux-gridList-leftOfDrag')
			.css('margin-left', -this.drag.width / 2);
	}
	$outside.filter('.ux-gridList-rightOfDrag')
		.removeClass('ux-gridList-rightOfDrag')
		.css('margin-left', 0);
	$outside.filter('.ux-gridList-leftOfDrag')
		.removeClass('ux-gridList-leftOfDrag')
		.css('margin-left', 0);
	return false;
};

$.ux.models.gridList.prototype.onDragLeave = function(e) {
	if (!this.drag.active) {
		this.$.removeClass('ux-gridList-draggingOver');
	}
	return false;
};

$.ux.models.gridList.prototype.onDrop = function(e) {
	if (!this.drag.active) {
		this.$.removeClass('ux-gridList-draggingOver');
		var dt = e.originalEvent.dataTransfer;
		if (dt && typeof dt.files == 'object' && dt.files.length) {
			this.$.trigger('ux-gridList-dropFile', [dt]);
		}
	}
	this.drag.offsetX = e.pageX - this.drag.offsetX;
	this.drag.offsetY = e.pageY - this.drag.offsetY;
	console.log(e.pageX, e.pageY);
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
	if (e.button === 0 && e.layerX < this.$grid.innerWidth()) {
		this.$grid.find('.ux-gridList-selected').removeClass('ux-gridList-selected');
		this.$.trigger('ux-gridList-select', [[]]);
		var offset = this.$grid.offset();
		this.marquee.active = true;
		this.marquee.left = e.pageX - offset.left;
		this.marquee.top = e.pageY - offset.top;
		e.stopPropagation();
		return false;
	}
};

$.ux.models.gridList.prototype.getSelection = function(e) {
	var selection = [];
	this.$grid.find('.ux-gridList-selected').each(function() {
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
		var $last = this.$grid.find('> .ux-gridList-item:last'),
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
		for (var row = 0; row < this.grid.rows.length; row++) {
			for (var col = 0; col < this.grid.rows[row].items.length; col++) {
				if (this.grid.rows[row].items[col].left <= style.left + style.width
						&& this.grid.rows[row].items[col].left
							+ this.grid.rows[row].items[col].item.width >= style.left
						&& this.grid.rows[row].top <= style.top + style.height
						&& this.grid.rows[row].top
							+ this.grid.rows[row].height >= style.top) {
					this.grid.rows[row].items[col].item.$
						.addClass('ux-gridList-selected');
				} else {
					this.grid.rows[row].items[col].item.$
						.removeClass('ux-gridList-selected');
				}
			}
		}
	}
};
