/**
 * Events
 *     ux-gridlist-load
 *     ux-gridlist-reflow
 *     ux-gridlist-changeItemId [from, to]
 *     ux-gridlist-addItem [id]
 *     ux-gridlist-removeItem [id]
 *     ux-gridlist-moveItem [id]
 *     ux-gridlist-dropFile [dataTransfer]id]
 *     ux-gridlist-select [selection]
 */
function GridList($container, options) {
	this.$ = $container.addClass('ux-gridlist');
	this.options = $.extend({
		'reflowDelay': 150,
		'animationSpeed': 'fast',
		'animationEasing': 'quintEaseInOut',
		'autoScrollStep': 150,
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
		'$': $('<div class="ux-gridlist-marquee"></div>').appendTo(this.$)
	};
	this.keys = {
		'shift': false
	};
	this.autoScroll = {
		'active': false,
	};
	
	// Initialize from options
	for (var i = 0; i < this.options.items.length; i++) {
		this.addItem(this.options.items[i]);
	}
	
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
		'mousedown': function(e) {
			if (e.target === gridList.$.get(0)) {
				return gridList.onMouseDown(e);
			}
		},
		'mouseup': function(e) {
			return gridList.onMouseUp(e);
		},
		'mousemove': function(e) {
			return gridList.onMouseMove(e);
		}
	});
	
	// Setup drag and drop interactions
	this.$.bind({
		'keydown': function(e) {
			return gridList.onKeyDown(e);
		},
		'keyup': function(e) {
			return gridList.onKeyUp(e);
		},
		'dragover': function(e) {
			return gridList.onDragOver(e);
		},
		'drop': function(e) {
			return gridList.onDrop(e);
		},
		'dragleave': function(e) {
			return false;
		}
	});
}

/* Static Members */

GridList.$itemTemplate = $('<div draggable="true" class="ux-gridlist-item">'
		+ '<div class="ux-gridlist-item-frame"><img></div></div>');
GridList.$ruler = $('<div></div>');

/* Methods */

GridList.prototype.changeItemId = function(from, to) {
	this.items[from].$.attr('ux-object-id', to);
	this.items[to] = this.items[from];
	delete this.items[from]
	this.sequence.splice(this.sequence.indexOf(from), 1, to);
	this.$.trigger('ux-gridlist-changeItemId', [from, to]);
};

GridList.prototype.addItem = function(item) {
	var gridList = this;
	var $item = GridList.$itemTemplate.clone().attr('ux-object-id', item.id);
	$item.find('img')
		.attr({
			'src': item.src,
			'width': item.width || 0,
			'height': item.height || 0
		})
		.bind({
			'load': function() {
				gridList.items[item.id].width = $item.outerWidth();
				gridList.items[item.id].height = $item.outerHeight();
				gridList.flow(true);
			},
			'mousedown': function(e) {
				if (!gridList.keys.shift) {
					gridList.$.find('.ux-gridlist-selected').removeClass('ux-gridlist-selected');
				}
				$item.addClass('ux-gridlist-selected');
				e.stopPropagation();
			},
			'dragstart': function(e) {
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
				gridList.$placeholder.removeClass( 'ux-gridlist-dragging' );
				var id = gridList.$placeholder.attr('ux-object-id');
				$left = gridList.$.find('.ux-gridlist-dragging-over-left:first');
				if ($left.length) {
					var target = $left.attr('ux-object-id');
					gridList.moveItemBefore(id, target);
				} else {
					$right = gridList.$.find('.ux-gridlist-dragging-over-right:last');
					if ($right.length) {
						var target = $right.attr('ux-object-id');
						gridList.moveItemAfter(id, target);
					}
				}
				gridList.$placeholder
					.css('opacity', 0.75)
					.animate({'opacity': 1}, {
						'duration': gridList.options.animationSpeed,
						'easing': gridList.options.animationEasing,
						'queue': true
					});
				gridList.drag.active = false;
				gridList.drag.width = 0;
				gridList.$.find('.ux-gridlist-dragging-over-left,.ux-gridlist-dragging-over-right')
					.removeClass(
						'ux-gridlist-dragging-over-left ux-gridlist-dragging-over-right'
					);
				gridList.flow();
				return false;
			}
		});
	this.items[item.id] = {
		'$': $item,
		'width': item.width || $item.outerWidth(),
		'height': item.height || $item.outerHeight()
	};
	this.sequence.push(item.id);
	this.$.append($item);
	this.$.trigger('ux-gridlist-addItem', [item.id]);
};

GridList.prototype.removeItem = function(id) {
	var gridList = this;
	this.items[id].$.fadeOut(this.options.animationSpeed, this.options.animationEasing, function() {
		$(this).remove();
		gridList.flow();
	});
	delete this.items[id];
	this.sequence.splice(this.sequence.indexOf(id), 1);
	this.$.trigger('ux-gridlist-removeItem', [id]);
};

GridList.prototype.moveItemBefore = function(id, target) {
	this.items[id].$.detach().insertBefore(this.items[target].$);
	this.sequence.splice(this.sequence.indexOf(id), 1);
	this.sequence.splice(this.sequence.indexOf(target), 0, id);
	this.$.trigger('ux-gridlist-moveItem', [id]);
};

GridList.prototype.moveItemAfter = function(id, target) {
	this.items[id].$.detach().insertAfter(this.items[target].$);
	this.sequence.splice(this.sequence.indexOf(id), 1);
	this.sequence.splice(this.sequence.indexOf(target) + 1, 0, id);
	this.$.trigger('ux-gridlist-moveItem', [id]);
};

GridList.prototype.sequenceItems = function(sequence) {
	if (this.sequence.length !== sequence.length) {
		throw 'Invalid sequence error. The new sequence contains the wrong number of items.';
	}
	for (var i = 0; i < sequence.length; i++) {
		if (this.sequence.indexOf(sequence[i]) === -1) {
			throw 'Invalid sequence error. The new sequence does not contain the same items.';
		}
	}
	this.sequence = sequence;
};

GridList.prototype.measure = function() {
	var $ruler = GridList.$ruler.appendTo(this.$);
	var width = $ruler.innerWidth();
	$ruler.detach();
	return width;
};

GridList.prototype.flow = function(now) {
	var left = 0,
		top = 0,
		row = 0;
	this.grid.rows = [{
		'items': [],
		'top': 0,
		'height': 0
	}];
	for (var i = 0; i < this.sequence.length; i++) {
		var item = this.items[this.sequence[i]];
		if (left + item.width <= this.grid.width) {
			this.grid.rows[row].height = Math.max(this.grid.rows[row].height, item.height);
			this.grid.rows[row].items.push({
				'item': item,
				'left': left
			});
			left += item.width;
		} else {
			row++;
			left = 0;
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
	var bottom = top + this.grid.rows[this.grid.rows.length - 1].height;
	for (var row = 0; row < this.grid.rows.length; row++) {
		for (var col = 0; col < this.grid.rows[row].items.length; col++) {
			var $item = this.grid.rows[row].items[col].item.$;
			var style = {
				'margin-left': 0,
				'left': this.grid.rows[row].items[col].left,
				'top': this.grid.rows[row].top
			};
			if (this.flowed && !now) {
				if (!this.$placeholder || $item.get(0) !== this.$placeholder.get(0)) {
					$item
						.stop(true)
						.animate(style, {
							'duration': this.options.animationSpeed,
							'easing': this.options.animationEasing
						});
				} else {
					$item
						.animate(style, {
							'duration': this.options.animationSpeed,
							'easing': this.options.animationEasing
						})
						.dequeue();
				}
			} else {
				$item.css(style);
			}
		}
	}
	this.flowed = true;
};

GridList.prototype.onDragOver = function(e) {
	if (e.dataTransfer && typeof e.dataTransfer.files === 'object') {
		e.preventDefault();
		return false;
	}
	// This fires over and over, like mousemove
	var containerOffset = this.$.offset();
	var left = e.pageX - containerOffset.left,
		top = e.pageY - containerOffset.top;
	
	// Auto-scroll
	if ( !this.autoScroll.active ) {
		var scrollTop = this.$.scrollTop();
		var height = this.$.outerHeight();
		var view = $(window).height();
		var autoScrollBorder = view * 0.2;
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
	}
	
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
		if (top > this.grid.rows[row].top
				&& (row === this.grid.rows.length - 1
						|| top < this.grid.rows[row].top
							+ this.grid.rows[row].height)) {
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
	if (this.$placeholder && ($left.first().get(0) === this.$placeholder.get(0)
			|| $right.last().get(0) === this.$placeholder.get(0))) {
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

GridList.prototype.onDrop = function(e) {
	var dt = e.originalEvent.dataTransfer;
	if (dt && typeof dt.files == 'object' && dt.files.length) {
		this.$.trigger('ux-gridlist-dropFile', [dt]);
	} else {
		var containerOffset = this.$.offset();
		if (this.$.find('.ux-gridlist-dragging-over-left:first,'
				+ '.ux-gridlist-dragging-over-right:first').length) {
			this.$placeholder.css({
				'margin-left': 0,
				'left': e.pageX - this.drag.offsetX - containerOffset.left,
				'top': e.pageY - this.drag.offsetY - containerOffset.top
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
		var selection = this.getSelection();
		for ( var i = 0; i < selection.length; i++) {
			this.removeItem(selection[i]);
		}
		e.preventDefault();
		return false;
	}
};

GridList.prototype.onKeyUp = function(e) {
	this.keys.shift = e.shiftKey;
};

GridList.prototype.onMouseDown = function(e) {
	this.$.find('.ux-gridlist-selected').removeClass('ux-gridlist-selected');
	this.$.trigger('ux-gridlist-select', [[]]);
	if (e.button === 0) {
		this.marquee.active = true;
		this.marquee.left = e.layerX;
		this.marquee.top = e.layerY;
	}
};

GridList.prototype.getSelection = function(e) {
	var selection = [];
	this.$.find('.ux-gridlist-selected').each(function() {
		selection.push($(this).attr('ux-object-id'));
	});
	return selection;
};

GridList.prototype.onMouseUp = function(e) {
	this.$.trigger('ux-gridlist-select', [this.getSelection()]);
	this.marquee.active = false;
	this.marquee.$.hide();
};

GridList.prototype.onMouseMove = function(e) {
	if (this.marquee.active) {
		var offset = this.$.offset();
		offset.top -= this.$.scrollTop();
		var $last = this.$.find('> .ux-gridlist-item:last'),
			scrollHeight = Math.max(
				this.$.height(),
				$last.position().top + $last.outerHeight() + this.$.scrollTop()
			),
			style,
			x = Math.min(
				Math.max(e.pageX - offset.left, 5),
				this.$.width() - 5
			),
			y = Math.min(Math.max(e.pageY - offset.top, 5), scrollHeight - 5);
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
