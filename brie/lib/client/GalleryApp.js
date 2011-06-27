function GalleryApp() {
	var app = this;
	this.library = null;
	this.store = new ObjectStore();
	this.$gridList = $('#app-gallery');
	this.gridList = new GridList(this.$gridList);
	this.$gridList.bind({
		'ux-gridlist-dropFile': function(e, dataTransfer) {
			app.uploadFiles(dataTransfer.files, function(err) {
				if (err) {
					alert(err);
				}
			});
		},
		'ux-gridlist-removeItems': function(e, ids) {
			app.library.data.library.items = app.gridList.sequence;
			app.store.updateObjectRef(
				'collabkit-library',
				app.library.data,
				function(result, err) {
					if (err) {
						alert(err);
					}
				}
			);
		},
		'ux-gridlist-moveItems': function() {
			var items = app.gridList.sequence;
			if (app.library.data.library.items.length != items.length) {
				throw new Error('Sorting resulted in mismatched item list');
			}
			app.library.data.library.items = items;
			app.store.updateObjectRef('collabkit-library', app.library.data, function(result, err) {
				if (err) {
					alert(err);
				} else {
					app.updateLibrary(result);
				}
			});
		},
		'ux-gridlist-select': function() {
			app.updateToolbar();
		},
		'mousedown': function() {
			$(this).focus();
		}
	});
	
	this.$toolbar = $('#app-toolbar').ux('toolbar', {
		'set': {
			'contents': [
	 			$('<div></div>').ux('toolbarGroup', {
	 				'set': {
		 				'id': 'app-toolbar-gallery',
		 				'label': 'Gallery',
		 				'icon': 'gallery',
		 				'contents': [
		 					$('<div></div>').ux( 'toolbarUploadButton', {
			 					'set':{
			 						'id':'app-toolbar-import',
			 						'label': 'Import',
			 						'icon': 'folder',
			 						'multiple': true
			 					},
			 					'bind': {
			 						'ux-toolbarUploadButton-execute': function(event, data) {
				 						app.uploadFiles(data.input.files, function(err) {
				 							if (err) {
				 								alert(err);
				 							}
				 						});
				 					}
			 					}
		 					}),
		 					$('<div></div>').ux('toolbarButton', {
			 					'set': {
			 						'id': 'app-toolbar-slideshow',
			 						'label': 'Slideshow',
			 						'icon': 'slideshow',
			 					},
			 					'bind': {
			 						'ux-toolbarButton-execute': function() {
				 						app.runSlideshow(app.gridList.sequence);
				 					}
			 					}
		 					})
		 				]
	 				}
	 			}),
	 			$('<div></div>').ux('toolbarGroup', {
	 				'set': {
		 				'id': 'app-toolbar-picture',
		 				'label': 'Picture',
		 				'icon': 'block',
		 				'contents': [
		 					$('<div></div>').ux('toolbarButton', {
		 						'set': {
			 						'id': 'app-toolbar-moveup',
			 						'label': 'Move up',
			 						'icon': 'up',
			 					},
			 					'bind': {
			 						'ux-toolbarButton-execute': function() {
			 							var sel = app.gridList.getSelection();
			 							if (sel.length) {
				 							var seq = app.gridList.sequence,
				 							targetIndex = app.gridList.sequence.indexOf(sel[0]) - 1;
				 							if (targetIndex > -1) {
					 							app.gridList.moveItemsBefore(sel, seq[targetIndex]);
				 							} else {
					 							app.gridList.moveItemsBefore(sel);
				 							}
				 							app.gridList.flow();
			 							}
				 					}
			 					}
		 					}),
		 					$('<div></div>').ux('toolbarButton', {
			 					'set': {
			 						'id': 'app-toolbar-movedown',
			 						'label': 'Move down',
			 						'icon': 'down',
			 					},
			 					'bind': {
			 						'ux-toolbarButton-execute': function() {
			 							var sel = app.gridList.getSelection();
			 							if (sel.length) {
				 							var seq = app.gridList.sequence,
				 								targetIndex = app.gridList.sequence.indexOf(
				 									sel[sel.length - 1]
				 								) + 1;
				 							if (targetIndex < seq.length - 1) {
					 							app.gridList.moveItemsAfter(sel, seq[targetIndex]);
				 							} else {
					 							app.gridList.moveItemsAfter(sel);
				 							}
				 							app.gridList.flow();
			 							}
				 					}
			 					}
		 					}),
		 					$('<div></div>').ux('toolbarButton', {
		 						'set': {
			 						'id': 'app-toolbar-remove',
			 						'label': 'Remove',
			 						'icon': 'remove',
			 					},
			 					'bind': {
			 						'ux-toolbarButton-execute': function() {
			 							app.gridList.removeItems(app.gridList.getSelection());
			 						}
			 					}
		 					})
		 				]
		 			}
	 			})
	 		]
		}
	});
	
	// Load the initial library data
	$.get('/:data/collabkit-library', function(data, xhr) {
		app.updateLibrary(data);
	}, 'json');
}

GalleryApp.prototype.updateToolbar = function() {
	var sel = this.gridList.getSelection();
	var seq = this.gridList.sequence;
	var tools = {
			'moveup': !(sel.length && sel[0] === seq[0]),
			'movedown': !(sel.length && sel[sel.length - 1] === seq[seq.length - 1]),
			'remove': !!sel.length
		}
	if (sel.length > 1) {
		if (!tools.moveup) {
			for (var i = 1; i < sel.length; i++) {
				if (sel[i] !== seq[i]) {
					tools.moveup = true;
					tools.movedown = true;
					break;
				}
			}
		} else if (!tools.movedown) {
			for (var i = 2; i <= sel.length; i++) {
				if (sel[sel.length - i] !== seq[seq.length - i]) {
					tools.moveup = true;
					tools.movedown = true;
					break;
				}
			}
		}
	}
	for (var tool in tools) {
		this.$toolbar.find('#app-toolbar-' + tool).ux('set', 'disabled', !tools[tool]);
	}
};

/**
 * Start asynchronously uploading files and adding them to the library.
 *
 * @param {File[]} files
 * @param {function} callback on completion
 */
GalleryApp.prototype.uploadFiles = function(files, callback) {
	var app = this;
	files = $.makeArray(files);
	if (files.length == 0) {
		callback('No files to upload');
		return;
	}
	var uploadFile = function(i) {
		if (i >= files.length) {
			callback();
			return;
		}
		app.store.createObject(files[i], function(result, err) {
			if (result) {
				app.gridList.addItems([{
					'id': result.id,
					'src': '/:media/' + result.id + '/photo/thumb',
					'width': result.data.photo.thumbs.thumb.width,
					'height': result.data.photo.thumbs.thumb.height
				}]);
				app.gridList.flow(true);
				if ( i === files.length - 1 ) {
					app.library.data.library.items = app.gridList.sequence;
					app.store.updateObjectRef(
						'collabkit-library',
						app.library.data,
						function(result, err) {}
					);
				}
			}
			uploadFile(++i);
		});
	};
	uploadFile(0);
};

GalleryApp.prototype.updateLibrary = function(commit) {
	if (commit.data.type != 'application/x-collabkit-library') {
		alert('Invalid collabkit library data');
		return;
	}
	var fetch = true;
	// Check the current library state and make sure it's consistent with what we've got; if not
	// we'll refresh the view.
	if (!this.library || !this.library.data || !this.library.data.library
			|| !this.library.data.library.items) {
		this.library = commit;
	} else if (this.library.id !== commit.id) {
		// Build hashes for old items
		var oldSequenceHash = this.library.data.library.items.join('|');
		var oldSequenceCopy = oldSequenceHash.split('|');
		oldSequenceCopy.sort();
		var oldSequenceSortedHash = oldSequenceCopy.join('|');
		// Build hashes for new items
		var newSequenceHash = commit.data.library.items.join('|');
		var newSequenceCopy = newSequenceHash.split('|');
		newSequenceCopy.sort();
		var newSequenceSortedHash = newSequenceCopy.join('|');
		// Compare hashes
		if (oldSequenceSortedHash === newSequenceSortedHash) {
			// Nothing new, just a meta update
			if (oldSequenceHash !== newSequenceHash) {
				// Same items, different order
				this.gridList.sequenceItems(newSequenceHash.split('|'));
				this.gridList.flow();
			}
			this.library = commit;
			fetch = false;
		}
	}
	
	// XXX: Update status bar
	$('#app-version').text(
		'Version: ' + this.library.id + ' (parents: ' + this.library.parents.join(',') + ')'
	);
	
	if (fetch) {
		// Update the gridlist
		var app = this;
		var oldSequence = this.gridList.sequence;
		$.ajax({
			'url': '/:media/' + this.library.id + '/list/thumb',
			'dataType': 'json',
			'type': 'GET',
			'cache': false,
			'success': function(data) {
				if ( !oldSequence.length ) {
					app.gridList.addItems(data);
				} else {
					var newSequence = [],
						newItems = [];
					for (var i = 0; i < data.length; i++) {
						newSequence.push(data[i].id);
						// Collect a list of missing items
						if (oldSequence.indexOf(data[i].id) === -1) {
							newItems.push(data[i]);
						}
					}
					// Add missing items
					app.gridList.addItems(newItems);
					// Apply new sequence
					app.library.data.library.items = newSequence;
					app.gridList.sequenceItems(newSequence);
				}
				app.gridList.flow();
			}
		});
	}
};

GalleryApp.prototype.runSlideshow = function(items) {
	var photos = items.slice();
	var $slideshow = $('<div id="slideshow">' +
						'<div class="area"></div>' +
						'<div class="controls">' +
							'<button class="close">Close</button>' +
							'</div>' + 
						'</div>');
	/**
	 * Load up the photo into an <img> and call us back when done.
	 */
	var buildPhoto = function(id, callback) {
		var $photo = $('<img class="slideshow-photo"/>').attr('src', '/:media/' + id + '/photo/large');
		if (callback) {
			$photo.bind('load', function() {
				callback(this);
			});
		}
		return $photo[0];
	};

	var interval = 10;
	var index = 0;

	var update = function() {
		buildPhoto(photos[index], function(img) {
			$slideshow.find('.area').empty().append(img);
		});
	};
	var advance = function(n) {
		index = (index + n);
		if (index < 0) {
			index += photos.length;
		}
		if (index >= photos.length) {
			index = index % photos.length;
		}
		update();
	};

	var timer = window.setInterval(advance, interval * 1000);
	var manualAdvance = function(n) {
		// Reset the timer...
		window.clearInterval(timer);
		timer = window.setInterval(advance, interval * 1000);

		advance(n || 1);
	};
	var manualRewind = function() {
		manualAdvance(-1);
	}

	$slideshow.click(function() {
		manualAdvance();
	});

	var escapeCheck, closeOut;
	escapeCheck = function(event) {
		var map = {
			27: closeOut, // esc

			13: manualAdvance, // enter
			32: manualAdvance, // space
			34: manualAdvance, // pgdn
			39: manualAdvance, // right
			40: manualAdvance, // down

			8: manualRewind,  // backspace
			33: manualRewind, // pgup
			37: manualRewind, // left
			38: manualRewind  // up
		}
		if (event.keyCode in map) {
			map[event.keyCode]();
			event.preventDefault();
		}
	};
	closeOut = function() {
		// Clean up & close the slideshow.
		window.clearInterval(timer);
		$(document).unbind('keydown', escapeCheck);
		$slideshow.remove();
	};
	$slideshow.find('.close').click(function() {
		closeOut();
	})
	// Bind global key checkers for simplicity :D
	$(document).bind('keydown', escapeCheck);
	$slideshow.appendTo('body');
	update();
};
