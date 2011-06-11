/*
 * Only Firefox implements XMLHttpRequest.sendAsBinary
 * 
 * @see http://code.google.com/p/chromium/issues/detail?id=35705
 * FIXME: Move this to a shim we load on non-firefox clients
 */
if ( !XMLHttpRequest.prototype.sendAsBinary ) {
	XMLHttpRequest.prototype.sendAsBinary = function( datastr ) {
	    function byteValue( x ) {
	        return x.charCodeAt( 0 ) & 0xff;
	    }
	    var ords = Array.prototype.map.call( datastr, byteValue );
	    var ui8a = new Uint8Array( ords );
	    this.send( ui8a.buffer );
	};
}

Class( 'Store', {
	'can': {
		/**
		 * Create a new CollabKit photo object on the server from the
		 * given image file. Will return the saved object id & data
		 * on success.
		 *
		 * No permanent branch is created by default, caller's responsibility
		 * to save pointers.
		 *
		 * @param {Blob} blob: file or blob to upload
		 * @param {function({id, data}, err)} callback
		 */
		createPhoto: function(blob, callback) {
			// Start an upload!
			var url = '/:media/new';
			var reader = new FileReader();
			reader.onload = function(e) {
				var xhr = new XMLHttpRequest();
				xhr.open('PUT', url);
				xhr.setRequestHeader('Content-Type', blob.type);
				// Chrome seems to think this is "unsafe"
				//xhr.setRequestHeader('Content-Length', blob.length);
				xhr.onreadystatechange = function(e) {
					if (xhr.readyState == 4) {
						var err;
						try {
							var result = JSON.parse(xhr.responseText);
						} catch (e) {
							err = e;
						} finally {
							callback(result, err);
						}
					}
				};
				xhr.sendAsBinary(reader.result);
			};
			reader.readAsBinaryString(blob);
		},
	
		/**
		 * Update the data in a named-branch CollabKit object, and update the
		 * branch reference to match.
		 *
		 * @fixme keep prior version for safety etc
		 *
		 * @param {string} ref branch name, currently must be 'collabkit-library'
		 * @param {object} data updated JSON-able data to save
		 * @param {function({id, data}, err)} callback
		 */
		updateObjectRef: function(ref, data, callback) {
			if (ref != 'collabkit-library') {
				callback(null, 'hardcoded branch still');
				return;
			}
			$.ajax({
				url: '/:data/collabkit-library',
				type: 'PUT',
				data: JSON.stringify(data),
				success: function(result) {
					// Really this should be triggered from the server?
					$.extend(result, {branch: ref});
					session.publish('/commits', result);
					callback(result, null);
				},
				error: function(err) {
					callback(null, err);
				}
			});
		}
	}
} );

function runSlideshow( items ) {
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
}


Class( 'Gallery', {
	'has': {
		'library': {},
		'lib': {},
		'store': null,
		'selection': [],
		'$toolbar': '#app-toolbar'
	},
	'can': {
		'initialize': function() {
			var that = this;
			this.store = new Store();
			
			this.$toolbar = $(this.$toolbar).ux('toolbar', {
				'contents': [
					$.ux.create( 'toolbarGroup', 'app-toolbar-gallery', {
						'label': 'Gallery',
						'icon': 'gallery',
						'contents': [
							$.ux.create( 'toolbarUploadButton', 'app-toolbar-import', {
								'label': 'Import',
								'icon': 'folder',
								'multiple': true
							})
							.bind('ux.execute', function( event, data ) {
								// This version requires FileAPI: Firefox 3.5+ and Chrome ok
								if (data.input.files && data.input.files.length > 0) {
									that.uploadFiles(data.input.files, function() {
										// Clear it out...
										$(data.input).val('');
									});
								}
							}),
							$.ux.create('toolbarButton', 'app-toolbar-slideshow', {
								'label': 'Slideshow',
								'icon': 'slideshow',
							})
							.bind('ux.execute', function() {
								runSlideshow( that.lib.library.items );
							})
						]
					} ),
					$.ux.create('toolbarGroup', 'app-toolbar-picture', {
						'label': 'Picture',
						'icon': 'block',
						'contents': [
							$.ux.create('toolbarButton', 'app-toolbar-moveup', {
								'label': 'Move up',
								'icon': 'up',
							})
							.bind('ux.execute', function() {
								// Move selection up
								that.doMovePhotos(-1);
							}),
							$.ux.create('toolbarButton', 'app-toolbar-movedown', {
								'label': 'Move down',
								'icon': 'down',
							})
							.bind('ux.execute', function() {
								// Move selection down
								that.doMovePhotos(1);
							}),
							$.ux.create('toolbarButton', 'app-toolbar-delete', {
								'label': 'Delete',
								'icon': 'delete',
							})
							.bind('ux.execute', function() {
								// Delete selection
								that.deleteSelected();
							})
						]
					})
				]
			});
			/**
			 * Set up drag-n-drop upload
			 */
			$('#app-gallery').bind('dragenter', function(event) {
				event.preventDefault();
				return false; // for IE
			}).bind('dragover', function(event) {
				$('#app-gallery').addClass('dragover');
				event.preventDefault();
				return false; // for IE
			}).bind('drop', function(event) {
				$('#app-gallery').removeClass('dragover');
			    var dataTransfer = event.originalEvent.dataTransfer;
				if (dataTransfer && typeof dataTransfer.files == 'object') {
					if (dataTransfer.files.length) {
						that.uploadFiles(dataTransfer.files, function() {
							//
						});
					} else {
						alert('No files to drop.');
					}
				} else {
					alert('Nothing to drop.');
				}
				event.preventDefault();
				return false;
			}).bind('dragleave', function(event) {
				$('#app-gallery').removeClass('dragover');
			});

			/**
			 * Set up selection interface
			 */
			$('#app-gallery')
				.sortable({
					'containment': '#app-gallery',
					'tolerance': 'intersect',
					'distance': 0,
					'delay': 0,
					'update': function(event, ui) {
						// 'change' triggers during UI operations; 'update' only at end.
						// Figure out which photo(s) were moved and update the server
						var items = []
						$('#app-gallery > .photo-entry').each(function() {
							items.push($(this).data('collabkit-id'));
						});

						var data = that.library.data;
						if (data.library.items.length != items.length) {
							// oh nooooooooo
							console.log('old items', data.library.items);
							console.log('new items', items);
							throw new Error('Sorting resulted in mismatched item list');
						}
						
						// Store them new sorted items!
						data.library.items = items;
						that.saveSelection();
						that.store.updateObjectRef('collabkit-library', data, function(result, err) {
							if (err) {
								alert(err);
							} else {
								that.updateLibrary(result);
							}
						});
					},
					'start': function( event, ui ) {
						$(ui.item)
							.addClass( 'ui-selected' )
							.siblings()
								.removeClass( 'ui-selected' );
					},
					'stop': that.updateToolbar
				})
				.selectable({
					'stop': that.updateToolbar
				});
			this.updateToolbar();

			/**
			 * Keyboard
			 */
			$('#app-gallery').mousedown(function() {
				// Need to set focus to get key events
				$(this).focus();
			});
			$('#app-gallery').bind('keydown', function(event) {
				if (event.keyCode == 8 || event.keyCode == 46) {
					// backspace/delete
					that.deleteSelected();
					event.preventDefault();
				}
			});
		},
		'saveSelection': function() {
			this.selection = [];
			var that = this;
			$('#app-gallery > .ui-selected').each(function(i, node) {
				that.selection.push( $(node).data('collabkit-id') );
			});
		},
		'restoreSelection': function() {
			var that = this;
			$('#app-gallery > .photo-entry').each(function(i, node) {
				var id = $(node).data('collabkit-id');
				if ( $.inArray( id, that.selection ) >= 0 ) {
					$(node).addClass( 'ui-selected' );
				}
			});
		},
		/**
		 * @param {jQuery} target
		 * @param {String} viewUrl
		 */
		'showThumb': function(target, id) {
		   target.data('collabkit-id', id);
		   target.load('/:media/' + id + '/embed/thumb');
		},
		'updateToolbar': function() {
			// These buttons need something selected to operate on.
			var $operators = $('#app-toolbar-delete, #app-toolbar-moveup, #app-toolbar-movedown');
			var $selected = $('#app-gallery > .ui-selected');
			if ($selected.length > 0) {
				$operators.ux('disabled', false);
			} else {
				$operators.ux('disabled', true);
			}
			if ($('#app-gallery > div:first').hasClass('ui-selected')) {
				$('#app-toolbar-moveup').ux('disabled', true);
			}
			if ($('#app-gallery > div:last').hasClass('ui-selected')) {
				$('#app-toolbar-movedown').ux('disabled', true);
			}
		},
		'doMovePhotos': function(incr) {
			var $selected = $('#app-gallery > .ui-selected');
			var items = this.lib.library.items;
			var targetIndices = [];
			$selected.each(function(i, node) {
				var id = $(node).data('collabkit-id');
				var index = items.indexOf(id);
				if (index == -1) {
					throw new Error("Trying to move photo that doesn't exist: " + id);
				}
				targetIndices.push(index);
			});
			var i, index, tmp;
			if (incr < 0) {
				for (i = 0; i < targetIndices.length; i++) {
					index = targetIndices[i];
					tmp = items[index];
					items[index] = items[index + incr];
					items[index + incr] = tmp;
				}
			} else {
				for (i = targetIndices.length - 1; i >= 0; i--) {
					index = targetIndices[i];
					tmp = items[index];
					items[index] = items[index + incr];
					items[index + incr] = tmp;
				}
			}
			this.saveSelection();
			var that = this;
			this.store.updateObjectRef('collabkit-library', this.lib, function(result, err) {
				if (err) {
					alert(err);
				} else {
					that.showLibrary(result);
				}
			});
		},

		/**
		 * Start asynchronously uploading files and adding them to the library.
		 *
		 * @param {File[]} files
		 * @param {function} callback on completion
		 */
		'uploadFiles': function(files, callback) {
			var that = this;
			files = $.makeArray(files);
			if (files.length == 0) {
				callback();
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

				var $entry = $('<div class="photo-entry"></div>');
				var $msg = $('<div class="collabkit-photo-loading"></div>');
				$('#app-gallery').append($entry.append($msg));

				//$msg.text('Uploading...');
				that.store.createPhoto(file, function(result, err) {
					if (result) {
						var photoId = result.id;
						//$msg.text('Updating library...');
						that.lib.library.items.push(photoId);
						that.store.updateObjectRef('collabkit-library', that.lib, function(result, err) {
							if (result) {
								$entry.empty()
								that.showThumb($entry, photoId);
							} else {
								$msg.text('Failed to update library.');
								setTimeout( function() {
									$entry.fadeOut( function() {
										$entry.remove();
									} );
								}, 3000 );
							}
							uploadNextFile();
						});
					} else {
						$msg.text('Failed to upload.');
						setTimeout( function() {
							$entry.fadeOut( function() {
								$entry.remove();
							} );
						}, 3000 );
						uploadNextFile();
					}
				});
			};
			uploadNextFile();
		},

		/**
		 * Remove the currently selected items from the library
		 */
		'deleteSelected': function() {
			var that = this;
			var $selected = $('#app-gallery > .ui-selected');
			if ($selected.length) {
				$selected.each(function(i, node) {
					var id = $(node).data('collabkit-id');
					var index = that.lib.library.items.indexOf(id);
					if (index == -1) {
						throw new Error("Trying to remove photo that doesn't exist: " + id);
					}
					that.lib.library.items.splice(index, 1);
					// Hide smoothly
					$(node).animate( { 'opacity': 0, 'width': 0 }, 'fast' );
				});
				this.store.updateObjectRef('collabkit-library', this.lib, function(result, err) {
					if (err) {
						alert(err);
					} else {
						$selected.remove();
					}
				});
			}
		},

		// Check the current library state and make sure it's consistent with
		// what we've got; if not we'll refresh the view.
		'updateLibrary': function(commitInfo) {
			if (this.library && this.library.id == commitInfo.id) {
				// We're good!
			} else {
				var oldItems = this.library.data && this.library.data.library.items && this.library.data.library.items.join(',');
				var newItems = commitInfo.data.library.items.join(',');
				if (oldItems == newItems) {
					// We've already updated to this data; update metadata only.
					this.library = commitInfo;
					this.lib = this.library.data;
					this.showMeta();
				} else {
					// Someone else changed us or we didn't touch the display;
					// refresh it.
					this.showLibrary(commitInfo);
				}
			}
		},
		'showLibrary': function(commitInfo) {
			var data = commitInfo.data;
			if (data.type != 'application/x-collabkit-library') {
				alert('invalid collabkit library data');
				return;
			}
			this.library = commitInfo;
			this.lib = this.library.data;
	
			this.showMeta();

			// Rearrange without having to re-created already existing thumbs
			var $mediatest = $('#app-gallery');
			var $newThumbs = $('<div></div>');
			for ( var i = 0; i < this.lib.library.items.length; i++ ) {
				var id = this.lib.library.items[i];
				var $existingThumb = $mediatest.find( '.photo-entry > .collabkit-object-' + id );
				if ( $existingThumb.length ) {
					$newThumbs.append( $existingThumb.parent().detach() );
				} else {
					var $newThumb = $('<div class="photo-entry"></div>').appendTo( $newThumbs );
					this.showThumb( $newThumb, id );
				}
			}
			$mediatest.empty().append( $newThumbs.children() );
			this.restoreSelection();
			this.updateToolbar();
		},
		'showMeta': function() {
			$('#app-version').text('Version: ' + this.library.id + ' (parents: ' + this.library.parents.join('') + ')');
		}
	}
} );

var gallery = new Gallery();

/**
 * Connect a session so we can get updates on inter-client state...
 */
var session = new Faye.Client('/:session/');
session.subscribe('/commits', function(message) {
	gallery.updateLibrary(message);
});

$.get('/:data/collabkit-library', function(data, xhr) {
	gallery.showLibrary(data);
}, 'json');
