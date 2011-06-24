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
		'ux-gridlist-removeItem': function(e, id) {
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
		'ux-gridlist-moveItem': function() {
			// 'change' triggers during UI operations; 'update' only at end.
			// Figure out which photo(s) were moved and update the server
			var items = app.gridList.sequence;
			if (app.library.data.library.items.length != items.length) {
				throw new Error('Sorting resulted in mismatched item list');
			}
			
			// Store them new sorted items!
			app.library.data.library.items = items;
			app.store.updateObjectRef('collabkit-library', app.library.data, function(result, err) {
				if (err) {
					alert(err);
				} else {
					app.updateLibrary(result);
				}
			});
		},
		'mousedown': function() {
			$(this).focus();
		}
	});
	this.$toolbar = $('#app-toolbar').ux('toolbar', { 'config': {
		'contents': [
 			$.ux.create( 'toolbarGroup', {'id': 'app-toolbar-gallery', 'config': {
 				'label': 'Gallery',
 				'icon': 'gallery',
 				'contents': [
 					$.ux.create( 'toolbarUploadButton', {'id':'app-toolbar-import', 'config':{
 						'label': 'Import',
 						'icon': 'folder',
 						'multiple': true
 					}})
 					.bind('ux.execute', function(event, data) {
 						// This version requires FileAPI: Firefox 3.5+ and Chrome ok
 						if (data.input.files && data.input.files.length > 0) {
 							app.uploadFiles(data.input.files, function() {
 								// Clear it out...
 								$(data.input).val('');
 							});
 						}
 					}),
 					$.ux.create('toolbarButton', {'id': 'app-toolbar-slideshow', 'config': {
 						'label': 'Slideshow',
 						'icon': 'slideshow',
 					}})
 					.bind('ux.execute', function() {
 						app.runSlideshow(app.gridList.sequence);
 					})
 				]
 			}}),
 			$.ux.create('toolbarGroup', {'id': 'app-toolbar-picture', 'config': {
 				'label': 'Picture',
 				'icon': 'block',
 				'contents': [
 					$.ux.create('toolbarButton', {'id': 'app-toolbar-moveup', 'config': {
 						'label': 'Move up',
 						'icon': 'up',
 					}})
 					.bind('ux.execute', function() {
 						// Move selection up
 						//app.doMovePhotos(-1);
 					}),
 					$.ux.create('toolbarButton', {'id': 'app-toolbar-movedown', 'config': {
 						'label': 'Move down',
 						'icon': 'down',
 					}})
 					.bind('ux.execute', function() {
 						// Move selection down
 						//app.doMovePhotos(1);
 					}),
 					$.ux.create('toolbarButton', {'id': 'app-toolbar-delete', 'config': {
 						'label': 'Delete',
 						'icon': 'delete',
 					}})
 					.bind('ux.execute', function() {
 						// Delete selection
 						//app.deleteSelected();
 					})
 				]
 			}})
 		]
 	}});
	
	// Load the initial library data
	$.get('/:data/collabkit-library', function(data, xhr) {
		app.updateLibrary(data);
	}, 'json');
}

GalleryApp.prototype.updateToolbar = function() {
	// These buttons need something selected to operate on.
	/*
	var $operators = $('#app-toolbar-delete, #app-toolbar-moveup, #app-toolbar-movedown');
	var $selected = $('#app-gallery > .ui-selected');
	if ($selected.length > 0) {
		$operators.ux('disabled', false);
	} else {
		$operators.ux('disabled', true);
	}
	if ($('#app-gallery > div:not(.ui-sortable-placeholder):first').hasClass('ui-selected')) {
		$('#app-toolbar-moveup').ux('disabled', true);
	}
	if ($('#app-gallery > div:not(.ui-sortable-placeholder):last').hasClass('ui-selected')) {
		$('#app-toolbar-movedown').ux('disabled', true);
	}
	*/
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
	var i = 0;
	var uploadNextFile = function() {
		if (i >= files.length) {
			callback();
			return;
		}
		var file = files[i];
		i++;
		app.store.createObject(file, function(result, err) {
			if (result) {
				var photoId = result.id;
				app.gridList.addItem({
					'id': photoId,
					'src': '/:media/' + photoId + '/photo/thumb',
					'width': result.data.photo.thumbs.thumb.width,
					'height': result.data.photo.thumbs.thumb.height
				});
				app.gridList.flow(true);
				if ( i === files.length - 1 ) {
					app.store.updateObjectRef(
						'collabkit-library',
						app.library.data,
						function(result, err) {}
					);
				}
			}
			uploadNextFile();
		});
	};
	uploadNextFile();
};

GalleryApp.prototype.updateLibrary = function(commit) {
	if (commit.data.type != 'application/x-collabkit-library') {
		alert('Invalid collabkit library data');
		return;
	}
	
	// Check the current library state and make sure it's consistent with what we've got; if not
	// we'll refresh the view.
	if (!this.library) {
		this.library = commit;
	} else if (this.library.id !== commit.id) {
		var oldItems = this.library.data
			&& this.library.data.library.items
			&& this.library.data.library.items.join(',');
		var newItems = commit.data.library.items.join(',');
		if (oldItems === newItems) {
			// Same content - update metadata
			this.library = commit;
			// Skip updating content
			return;
		}
	}
	// XXX: Update status bar
	$('#app-version').text(
		'Version: ' + this.library.id + ' (parents: ' + this.library.parents.join(',') + ')'
	);
	// Update the gridlist
	var app = this;
	var oldSequence = this.gridList.sequence;
	$.ajax({
		'url': '/:media/' + this.library.id + '/list/thumb',
		'dataType': 'json',
		'type': 'GET',
		'cache': false,
		'success': function(data) {
			var newSequence = [];
			if ( !oldSequence.length ) {
				// Fill gridlist with new items
				for (var i = 0; i < data.length; i++) {
					newSequence.push(data[i].id);
					app.gridList.addItem(data[i]);
				}
			} else {
				for (var i = 0; i < data.length; i++) {
					newSequence.push(data[i].id);
					if (oldSequence.indexOf(data[i].id) === -1) {
						// Add new item
						app.gridList.addItem(data[i]);
					}
				}
			}
			app.library.data.library.items = newSequence;
			app.gridList.sequenceItems(newSequence);
			app.gridList.flow();
		}
	});
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
