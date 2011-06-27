/**
 * Events
 *     ux-gridlist-load
 *     ux-gridlist-reflow
 *     ux-gridlist-changeItemId [from, to, origin]
 *     ux-gridlist-addItems [items, origin]
 *     ux-gridlist-removeItems [ids, origin]
 *     ux-gridlist-sequenceItems [sequence, origin]
 *     ux-gridlist-dropFile [dataTransfer]
 *     ux-gridlist-select [selection]
 */
function GridList($container, options) {
	this.$ = $container.addClass('ux-gridlist');
	this.$grid = $('<div class="ux-gridlist-grid"></div>').appendTo(this.$);
	this.options = $.extend({
		'reflowDelay': 150,
		'animationSpeed': 'fast',
		'animationEasing': 'quintEaseInOut',
		'autoScrollStep': 180,
		'items': []
	}, options);
	this.flowed = false;
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
		'offsetY': 0
	};
	this.marquee = {
		'active': false,
		'top': 0,
		'left': 0,
		'$': $('<div class="ux-gridlist-marquee"></div>').appendTo(this.$grid)
	};
	this.keys = {
		'shift': false
	};
	this.autoScroll = {
		'active': false,
	};
	
	// Initialize from options
	this.addItems(this.options.items);
	
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
			gridList.$.trigger('ux-gridlist-load');
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
				gridList.$.trigger('ux-gridlist-reflow');
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
}

/* Static Members */

GridList.$itemTemplate = $('<div draggable="true" class="ux-gridlist-item">'
		+ '<div class="ux-gridlist-item-frame"><img></div></div>');
GridList.$ruler = $('<div></div>');

/* Methods */

GridList.prototype.changeItemId = function(from, to, origin) {
	this.items[from].$.attr('ux-object-id', to);
	this.items[to] = this.items[from];
	delete this.items[from]
	this.sequence.splice(this.sequence.indexOf(from), 1, to);
	this.$.trigger('ux-gridlist-changeItemId', [from, to, origin]);
};

GridList.prototype.addItems = function(items, origin) {
	if (!items.length) {
		return;
	}
	var gridList = this;
	$.each(items, function(i, item) {
		var $item = GridList.$itemTemplate.clone().attr('ux-object-id', item.id);
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
							.find('.ux-gridlist-selected')
								.removeClass('ux-gridlist-selected');
					}
					$item.addClass('ux-gridlist-selected');
					e.stopPropagation();
				},
				'dragstart': function(e) {
					$item.prepend(
						$('<div class="ux-gridlist-mask"></div>')
							.fadeTo(
								gridList.options.animationSpeed,
								0.75,
								gridList.options.animationEasing
							)
					);
					var dt = e.originalEvent.dataTransfer;
					dt.dropEffect = 'move';
					dt.effectAllowed = 'move';
					$item.addClass( 'ux-gridlist-dragging' );
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
					$item.find('.ux-gridlist-mask').remove();
					gridList.$placeholder.removeClass( 'ux-gridlist-dragging' );
					var id = gridList.$placeholder.attr('ux-object-id');
					$left = gridList.$.find('.ux-gridlist-dragging-over-left:first');
					if ($left.length) {
						var target = $left.attr('ux-object-id');
						gridList.moveItemsBefore([id], target, 'user');
					} else {
						$right = gridList.$.find('.ux-gridlist-dragging-over-right:last');
						if ($right.length) {
							var target = $right.attr('ux-object-id');
							gridList.moveItemsAfter([id], target, 'user');
						}
					}
					gridList.drag.active = false;
					gridList.drag.width = 0;
					gridList.$
						.find('.ux-gridlist-dragging-over-left,.ux-gridlist-dragging-over-right')
							.removeClass(
								'ux-gridlist-dragging-over-left ux-gridlist-dragging-over-right'
							);
					gridList.flow();
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
	this.$.trigger('ux-gridlist-addItems', [items, origin]);
};

GridList.prototype.removeItems = function(ids, origin) {
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
		this.$.trigger('ux-gridlist-removeItems', [ids, origin]);
	}
};

GridList.prototype.moveItemsBefore = function(ids, target, origin) {
	if (typeof target === 'undefined') {
		target = this.sequence[0];
	}
	if (ids.indexOf(target) >= 0) {
		ids.splice(ids.indexOf(target), 1);
		this.moveItemsAfter(ids, target);
		return;
	}
	var $sel = $([]);
	for (var i = 0; i < ids.length; i++) {
		$sel = $sel.add(this.items[ids[i]].$);
		this.sequence.splice(this.sequence.indexOf(ids[i]), 1);
		this.sequence.splice(this.sequence.indexOf(target), 0, ids[i]);
	}
	if ($sel.length) {
		$sel.detach().insertBefore(this.items[target].$);
		this.$.trigger('ux-gridlist-sequenceItems', [this.sequence, origin]);
	}
};

GridList.prototype.moveItemsAfter = function(ids, target, origin) {
	if (typeof target === 'undefined') {
		target = this.sequence[this.sequence.length - 1];
	}
	if (ids.indexOf(target) >= 0) {
		ids.splice(ids.indexOf(target), 1);
		this.moveItemsBefore(ids, target);
		return;
	}
	var $sel = $([]);
	for (var i = ids.length - 1; i >= 0; i--) {
		$sel = $sel.add(this.items[ids[i]].$);
		this.sequence.splice(this.sequence.indexOf(ids[i]), 1);
		this.sequence.splice(this.sequence.indexOf(target) + 1, 0, ids[i]);
	}
	if ($sel.length) {
		$sel.detach().insertAfter(this.items[target].$);
		this.$.trigger('ux-gridlist-sequenceItems', [this.sequence, origin]);
	}
};

GridList.prototype.sequenceItems = function(sequence, origin) {
	if (this.sequence.length !== sequence.length) {
		throw 'Invalid sequence error. The new sequence contains the wrong number of items.';
	}
	for (var i = 0; i < sequence.length; i++) {
		if (this.sequence.indexOf(sequence[i]) === -1) {
			throw 'Invalid sequence error. The new sequence does not contain the same items.';
		}
	}
	this.sequence = sequence;
	this.$.trigger('ux-gridlist-sequenceItems', [sequence, origin]);
};

GridList.prototype.measure = function() {
	var $ruler = GridList.$ruler.appendTo(this.$grid);
	var width = $ruler.innerWidth();
	$ruler.detach();
	return width;
};

GridList.prototype.flow = function(now) {
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
	var bottom = top + this.grid.rows[this.grid.rows.length - 1].height + pad;
	if (this.$grid.height() != bottom) {
		this.$grid.animate({'height': bottom}, {
			'duration': this.options.animationSpeed,
			'easing': this.options.animationEasing
		});
	}
	for (var row = 0; row < this.grid.rows.length; row++) {
		for (var col = 0; col < this.grid.rows[row].items.length; col++) {
			var $item = this.grid.rows[row].items[col].item.$;
			var style = {
				'margin-left': 0,
				'left': this.grid.rows[row].items[col].left,
				'top': this.grid.rows[row].top
			};
			if (this.flowed && !now) {
				$item
					.stop(true)
					.animate(style, {
						'duration': this.options.animationSpeed,
						'easing': this.options.animationEasing
					});
			} else {
				$item.css(style);
			}
		}
	}
	this.flowed = true;
};

GridList.prototype.handleAutoScroll = function(top) {
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
			this.$.scrollTo(
				'-=' + this.options.autoScrollStep + 'px',
				{
					'axis': 'y',
					'duration': this.options.animationSpeed,
					'easing': this.options.animationEasing,
					'onAfter': function() {
						gridList.autoScroll.active = false;
					}
				}
			);
		} else if (top > ( scrollTop + view ) - autoScrollBorder) {
			// Scroll down
			this.autoScroll.active = true;
			this.$.scrollTo(
				'+=' + this.options.autoScrollStep + 'px',
				{
					'axis': 'y',
					'duration': this.options.animationSpeed,
					'easing': this.options.animationEasing,
					'onAfter': function() {
						gridList.autoScroll.active = false;
					}
				}
			);
		}
	}
};

GridList.prototype.onDragOver = function(e) {
	if (!this.drag.active) {
		this.$.addClass('ux-gridlist-draggingOver');
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
		$outside = $([]);
	for (var row = 0; row < this.grid.rows.length; row++) {
		if ((row === 0 && top < this.grid.rows[row].top + this.grid.rows[row].height )
				|| (top > this.grid.rows[row].top
						&& (row === this.grid.rows.length - 1
								|| top < this.grid.rows[row].top + this.grid.rows[row].height))) {
			for (var col = 0; col < this.grid.rows[row].items.length; col++) {
				var halfWidth = this.grid.rows[row].items[col].item.width / 2;
				if (left < this.grid.rows[row].items[col].left + halfWidth) {
					$left = $left.add(this.grid.rows[row].items[col].item.$);
				} else {
					$right = $right.add(this.grid.rows[row].items[col].item.$);
				}
			}
		} else {
			for (var col = 0; col < this.grid.rows[row].items.length; col++) {
				$outside = $outside.add(this.grid.rows[row].items[col].item.$);
			}
		}
	}
	if (this.$placeholder && ($left.first()[0] === this.$placeholder[0]
			|| $right.last()[0] === this.$placeholder[0])) {
		$outside = $outside.add($left).add($right);
	} else {
		$left.filter(':not(.ux-gridlist-dragging-over-left)')
			.removeClass('ux-gridlist-dragging-over-right')
			.addClass('ux-gridlist-dragging-over-left')
			.stop(true)
			.animate({'margin-left': this.drag.width / 2}, {
				'duration': this.options.animationSpeed,
				'easing': this.options.animationEasing
			});
		$right.filter(':not(.ux-gridlist-dragging-over-right)')
			.removeClass('ux-gridlist-dragging-over-left')
			.addClass('ux-gridlist-dragging-over-right')
			.stop(true)
			.animate({'margin-left': -(this.drag.width / 2)}, {
				'duration': this.options.animationSpeed,
				'easing': this.options.animationEasing
			});
	}
	$outside.filter('.ux-gridlist-dragging-over-left')
		.removeClass('ux-gridlist-dragging-over-left')
		.stop(true)
		.animate({'margin-left':0}, {
			'duration': this.options.animationSpeed,
			'easing': this.options.animationEasing
		});
	$outside.filter('.ux-gridlist-dragging-over-right')
		.removeClass('ux-gridlist-dragging-over-right')
		.stop(true)
		.animate({'margin-left':0}, {
			'duration': this.options.animationSpeed,
			'easing': this.options.animationEasing
		});
	return false;
};

GridList.prototype.onDragLeave = function(e) {
	if (!this.drag.active) {
		this.$.removeClass('ux-gridlist-draggingOver');
	}
	return false;
};

GridList.prototype.onDrop = function(e) {
	if (!this.drag.active) {
		this.$.removeClass('ux-gridlist-draggingOver');
	}
	var dt = e.originalEvent.dataTransfer;
	if (dt && typeof dt.files == 'object' && dt.files.length) {
		this.$.trigger('ux-gridlist-dropFile', [dt]);
	} else {
		var offset = this.$grid.offset();
		if (this.$grid.find('.ux-gridlist-dragging-over-left:first,'
				+ '.ux-gridlist-dragging-over-right:first').length) {
			this.$placeholder.css({
				'margin-left': 0,
				'left': e.pageX - this.drag.offsetX - offset.left,
				'top': e.pageY - this.drag.offsetY - offset.top
			});
		}
	}
	e.preventDefault();
	return false;
};

GridList.prototype.onKeyDown = function(e) {
	this.keys.shift = e.shiftKey;
	// Handle selection deletions
	if (e.keyCode == 8 || e.keyCode == 46) {
		this.removeItems(this.getSelection(), 'user');
		e.preventDefault();
		return false;
	}
};

GridList.prototype.onKeyUp = function(e) {
	this.keys.shift = e.shiftKey;
};

GridList.prototype.onMouseDown = function(e) {
	if (e.button === 0 && e.layerX < this.$grid.innerWidth()) {
		this.$grid.find('.ux-gridlist-selected').removeClass('ux-gridlist-selected');
		this.$.trigger('ux-gridlist-select', [[]]);
		var offset = this.$grid.offset();
		this.marquee.active = true;
		this.marquee.left = e.pageX - offset.left;
		this.marquee.top = e.pageY - offset.top;
		e.stopPropagation();
		return false;
	}
};

GridList.prototype.getSelection = function(e) {
	var selection = [];
	this.$grid.find('.ux-gridlist-selected').each(function() {
		selection.push($(this).attr('ux-object-id'));
	});
	return selection;
};

GridList.prototype.onMouseUp = function(e) {
	this.$.trigger('ux-gridlist-select', [this.getSelection()]);
	if (this.marquee.active) {
		this.marquee.active = false;
		this.marquee.$.hide();
	}
};

GridList.prototype.onMouseMove = function(e) {
	if (this.marquee.active) {
		var offset = this.$.offset();
		offset.top -= this.$.scrollTop();
		var $last = this.$grid.find('> .ux-gridlist-item:last'),
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
						.addClass('ux-gridlist-selected');
				} else {
					this.grid.rows[row].items[col].item.$
						.removeClass('ux-gridlist-selected');
				}
			}
		}
	}
};
