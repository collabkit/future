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
		'$toolbar': '.library-toolbar:first'
	},
	'can': {
		'initialize': function() {
			var that = this;
			this.store = new Store();
			this.$toolbar = $( this.$toolbar )
				.find('.slideshow').click(function() {
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
			
					var advance = function() {
						buildPhoto(photos[index], function(img) {
							$slideshow.find('.area').empty().append(img);
			
							index = (index + 1) % photos.length;
						});
					};
			
					var timer = window.setInterval(advance, interval * 1000);
			
					$slideshow.click(function() {
						// Reset the timer...
						window.clearInterval(timer);
						timer = window.setInterval(advance, interval * 1000);
			
						advance();
					});
			
					$slideshow.find('.close').click(function() {
						window.clearInterval(timer);
						$slideshow.remove();
					})
					$slideshow.appendTo('body');
					advance();
				})
				.end()
			.find('.delete')
				.click(function() {
					var $selected = $('#mediatest > .ui-selected');
					$selected.each(function(i, node) {
						var id = $(node).data('collabkit-id');
						var index = that.lib.library.items.indexOf(id);
						if (index == -1) {
							throw new Error("Trying to remove photo that doesn't exist: " + id);
						}
						that.lib.library.items.splice(index, 1);
						$(node).text('Removing...');
					});
					that.store.updateObjectRef('collabkit-library', that.lib, function(result, err) {
						if (err) {
							alert(err);
						} else {
							$selected.remove();
						}
					});
				})
				.end()
			.find('.moveup')
				.click(function() {
					that.doMovePhotos(-1);
				})
				.end()
			.find('.movedown')
				.click(function() {
					that.doMovePhotos(1);
				})
				.end();
			$('#media-chooser').change(function(event) {
				// This version requires FileAPI: Firefox 3.5+ and Chrome ok
				var files = this.files;
				if (files.length > 0) {
					$.each(files, function(i, file) {
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
								});
							} else {
								ui.text('Failed to upload.');
							}
						});
					});
				}
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
								that.showLibrary(result);
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
			var $operators = this.$toolbar.find('.delete, .moveup, .movedown');
			var $selected = $('#mediatest > .ui-selected');
			if ($selected.length > 0) {
				$operators.removeAttr('disabled');
			} else {
				$operators.attr('disabled', 'disabled');
			}
			var first = $('#mediatest > div:first'),
			    last = $('#mediatest > div:last');
			if (first.hasClass('ui-selected')) {
				this.$toolbar.find('.moveup').attr('disabled', 'disabled');
			}
			if (last.hasClass('ui-selected')) {
				this.$toolbar.find('.movedown').attr('disabled', 'disabled');
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
		'showLibrary': function(commitInfo) {
			var data = commitInfo.data;
			if (data.type != 'application/x-collabkit-library') {
				alert('invalid collabkit library data');
				return;
			}
			this.library = commitInfo;
			this.lib = this.library.data;
	
			$('#mediatest').empty();
			$('#mediastate').text('Version: ' + this.library.id + ' (parents: ' + this.library.parents.join('') + ')');
			var that = this;
			$.each(this.lib.library.items, function(i, id) {
				var $thumb = $('<div class="photo-entry"></div>').appendTo('#mediatest');
				that.showThumb($thumb, id);
			});
			this.restoreSelection();
			this.updateToolbar();
		}
	}
} );

var gallery = new Gallery();

/**
 * Connect a session so we can get updates on inter-client state...
 */
var session = new Faye.Client('/:session/');
session.subscribe('/commits', function(message) {
	gallery.showLibrary(message);
});

$.get('/:data/collabkit-library', function(data, xhr) {
	gallery.showLibrary(data);
}, 'json');
