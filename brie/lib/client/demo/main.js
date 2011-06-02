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
				xhr.setRequestHeader('Content-Length', blob.length);
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

Class( 'Gallery', {
	'has': {
		'library': {},
		'lib': {},
		'store': null,
		'selection': [],
		'$toolbar': '.toolbar:first'
	},
	'can': {
		'initialize': function() {
			var that = this;
			this.store = new Store();
			this.$toolbar = $( this.$toolbar )
				.find('.toolbar-tool-slideshow').click(function() {
					var photos = that.lib.library.items.slice();
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
				})
				.end()
			.find('.toolbar-tool-delete')
				.click(function() {
					that.deleteSelected();
				})
				.end()
			.find('.toolbar-tool-moveup')
				.click(function() {
					that.doMovePhotos(-1);
				})
				.end()
			.find('.toolbar-tool-movedown')
				.click(function() {
					that.doMovePhotos(1);
				})
				.end();

			/**
			 * Set up file chooser upload
			 */
			$('#media-chooser').change(function(event) {
				// This version requires FileAPI: Firefox 3.5+ and Chrome ok
				if (this.files && this.files.length > 0) {
					that.uploadFiles(this.files, function() {
						// Clear it out...
						$('#media-chooser').val('');
					});
				}
			});

			/**
			 * Set up drag-n-drop upload
			 */
			$('#mediatest').bind('dragenter', function(event) {
				event.preventDefault();
				return false; // for IE
			}).bind('dragover', function(event) {
				$('#mediatest').addClass('dragover');
				event.preventDefault();
				return false; // for IE
			}).bind('drop', function(event) {
				$('#mediatest').removeClass('dragover');
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
				$('#mediatest').removeClass('dragover');
			});

			/**
			 * Set up selection interface
			 */
			$('#mediatest')
				.sortable({
					'containment': '#mediatest',
					'tolerance': 'intersect',
					'distance': 0,
					'delay': 0,
					'update': function(event, ui) {
						// 'change' triggers during UI operations; 'update' only at end.
						// Figure out which photo(s) were moved and update the server
						var items = []
						$('#mediatest > .photo-entry').each(function() {
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
						that.updateToolbar();
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
			$('#mediatest').mousedown(function() {
				// Need to set focus to get key events
				$(this).focus();
			});
			$('#mediatest').bind('keydown', function(event) {
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
			$('#mediatest > .ui-selected').each(function(i, node) {
				that.selection.push( $(node).data('collabkit-id') );
			});
		},
		'restoreSelection': function() {
			var that = this;
			$('#mediatest > .photo-entry').each(function(i, node) {
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
			var $operators = this.$toolbar.find('.toolbar-tool-delete, .toolbar-tool-moveup, .toolbar-tool-movedown');
			var $selected = $('#mediatest > .ui-selected');
			if ($selected.length > 0) {
				$operators.removeAttr('disabled');
			} else {
				$operators.attr('disabled', 'disabled');
			}
			var first = $('#mediatest > div:first'),
			    last = $('#mediatest > div:last');
			if (first.hasClass('ui-selected')) {
				this.$toolbar.find('.toolbar-tool-moveup').attr('disabled', 'disabled');
			}
			if (last.hasClass('ui-selected')) {
				this.$toolbar.find('.toolbar-tool-movedown').attr('disabled', 'disabled');
			}
		},
		'doMovePhotos': function(incr) {
			var $selected = $('#mediatest > .ui-selected');
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

				var ui = $('<div class="photo-entry">Reading...</div>');
				$('#mediatest').append(ui);

				ui.text('Uploading...');
				that.store.createPhoto(file, function(result, err) {
					if (result) {
						var photoId = result.id;
						ui.text('Updating library...');
						that.lib.library.items.push(photoId);
						that.store.updateObjectRef('collabkit-library', that.lib, function(result, err) {
							if (result) {
								ui.empty()
								that.showThumb(ui, photoId);
							} else {
								ui.text('Failed to update library.');
							}
							uploadNextFile();
						});
					} else {
						ui.text('Failed to upload.');
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
			var $selected = $('#mediatest > .ui-selected');
			if ($selected.length) {
				$selected.each(function(i, node) {
					var id = $(node).data('collabkit-id');
					var index = that.lib.library.items.indexOf(id);
					if (index == -1) {
						throw new Error("Trying to remove photo that doesn't exist: " + id);
					}
					that.lib.library.items.splice(index, 1);
					$(node).text('Removing...');
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

			var that = this;
			$('#mediatest').empty();
			$.each(this.lib.library.items, function(i, id) {
				var $thumb = $('<div class="photo-entry"></div>').appendTo('#mediatest');
				that.showThumb($thumb, id);
			});
			this.restoreSelection();
			this.updateToolbar();
		},
		'showMeta': function() {
			$('#mediastate').text('Version: ' + this.library.id + ' (parents: ' + this.library.parents.join('') + ')');
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