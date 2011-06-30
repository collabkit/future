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
					$item.prepend(
						$('<div class="ux-gridList-mask"></div>')
							.fadeTo(
								gridList.options.animationSpeed,
								0.75,
								gridList.options.animationEasing
							)
					);
					var dt = e.originalEvent.dataTransfer;
					dt.dropEffect = 'move';
					dt.effectAllowed = 'move';
					dt.setDragImage($item.find('img')[0], e.layerX, e.layerY);
					$item.addClass( 'ux-gridList-dragging' );
					gridList.$placeholder = $item;
					gridList.drag.active = true;
					gridList.drag.width = gridList.$placeholder.width();
					gridList.drag.height = gridList.$placeholder.height();
					var offset = gridList.$placeholder.offset();
					gridList.drag.offsetX = e.pageX - offset.left;
					gridList.drag.offsetY = e.pageY - offset.top;
					return true;
				},
				'dragend': function(e) {
					$item.find('.ux-gridList-mask').remove();
					gridList.$placeholder.removeClass( 'ux-gridList-dragging' );
					var id = gridList.$placeholder.attr('ux-object-id');
					$right = gridList.$.find('.ux-gridList-rightOfDrag.ux-gridList-dropTarget');
					if ($right.length) {
						var target = $right.attr('ux-object-id');
						gridList.moveItemsBefore([id], target, 'user');
					} else {
						$left = gridList.$.find('.ux-gridList-leftOfDrag.ux-gridList-dropTarget');
						if ($left.length) {
							var target = $left.attr('ux-object-id');
							gridList.moveItemsAfter([id], target, 'user');
						}
					}
					gridList.drag.active = false;
					gridList.drag.width = 0;
					gridList.$.find('.ux-gridList-rightOfDrag,.ux-gridList-leftOfDrag').removeClass(
						'ux-gridList-rightOfDrag ux-gridList-leftOfDrag ux-gridList-dropTarget'
					);
					
					// Apply drop position so the drop feels more natural
					var offset = gridList.$grid.offset();
					// Prevent animation
					$item.removeClass('ux-gridList-item-animated')
					// Move to drop position
					if (gridList.useCssTransform) {
						var transform = 'translate('
							+ (gridList.drag.offsetX - offset.left) + 'px,'
							+ (gridList.drag.offsetY - offset.top) + 'px)';
						$item.css({
							'margin-left': 0,
							'-webkit-transform': transform,
							'-moz-transform': transform,
							'-o-transform': transform,
							'transform': transform
						});
					} else {
						$item.css({
							'margin-left': 0,
							'left': gridList.drag.offsetX - offset.left,
							'top': gridList.drag.offsetY - offset.top
						});
					}
					// Give the browser a chance to apply the CSS before turning animation back on
					// and flowing, not using a timeout causes the drop positioning to be ignored
					setTimeout(function() {
						$item.addClass('ux-gridList-item-animated');
						gridList.flow();
					}, 0);
					
					return false;
				}
			});
		gridList.$grid.append($item);
		gridList.items[item.id] = {
			'$': $item,
			'width': $item.outerWidth(),
			'height': $item.outerHeight()
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
		row = 0;
	this.grid.rows = [{
		'items': [],
		'top': top,
		'height': 0
	}];
	for (var i = 0; i < this.sequence.length; i++) {
		var item = this.items[this.sequence[i]];
		if (left + item.width + pad <= this.grid.width) {
			this.grid.rows[row].height = Math.max(this.grid.rows[row].height, item.height);
			this.grid.rows[row].items.push({
				'item': item,
				'left': left
			});
			left += item.width;
		} else {
			row++;
			left = pad;
			top += item.height;
			this.grid.rows[row] = {
				'items':[{
					'item': item,
					'left': left
				}],
				'top': top,
				'height': item.height,
			};
			left += item.width;
		}
	}
	this.$grid.css('height', Math.max(
		top + this.grid.rows[this.grid.rows.length - 1].height + pad, this.$.height()
	));
	for (var row = 0; row < this.grid.rows.length; row++) {
		for (var col = 0; col < this.grid.rows[row].items.length; col++) {
			if (this.useCssTransform) {
				var transform = 'translate('
					+ this.grid.rows[row].items[col].left + 'px,'
					+ this.grid.rows[row].top + 'px)';
				this.grid.rows[row].items[col].item.$.css({
					'margin-left': 0,
					'-webkit-transform': transform,
					'-moz-transform': transform,
					'-o-transform': transform,
					'transform': transform
				});
			} else {
				this.grid.rows[row].items[col].item.$.css({
					'margin-left': 0,
					'left': this.grid.rows[row].items[col].left,
					'top': this.grid.rows[row].top
				});
			}
		}
	}
	this.flowed = true;
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
	var $left = $([]),
		$right = $([]),
		$outside = $([]),
		leftEdge,
		rightEdge;
	for (var row = 0; row < this.grid.rows.length; row++) {
		if ((row === 0 && top < this.grid.rows[row].top + this.grid.rows[row].height )
				|| (top > this.grid.rows[row].top
						&& (row === this.grid.rows.length - 1
								|| top < this.grid.rows[row].top + this.grid.rows[row].height))) {
			for (var col = 0; col < this.grid.rows[row].items.length; col++) {
				var halfWidth = this.grid.rows[row].items[col].item.width / 2;
				if (left < this.grid.rows[row].items[col].left + halfWidth) {
					$right = $right.add(this.grid.rows[row].items[col].item.$);
					if (!rightEdge) {
						rightEdge = this.grid.rows[row].items[col].item.$[0];
					}
				} else {
					$left = $left.add(this.grid.rows[row].items[col].item.$);
					leftEdge = this.grid.rows[row].items[col].item.$[0];
				}
			}
		} else {
			for (var col = 0; col < this.grid.rows[row].items.length; col++) {
				$outside = $outside.add(this.grid.rows[row].items[col].item.$);
			}
		}
	}
	if (this.$placeholder && (leftEdge === this.$placeholder[0]
			|| rightEdge === this.$placeholder[0])) {
		$outside = $outside.add($right).add($left);
	} else {
		$outside.add($right).add($left).removeClass('ux-gridList-dropTarget');
		if (leftEdge) {
			$(leftEdge).addClass('ux-gridList-dropTarget');
		} else if (rightEdge) {
			$(rightEdge).addClass('ux-gridList-dropTarget');
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
