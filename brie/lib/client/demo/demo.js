function GalleryApp() {
	var app = this;
	var isInitialDataLoaded = false;
	function loadInitialData() {
		// Load the initial library data
		$.get('/:data/collabkit-library', function(data, xhr) {
			app.updateLibrary(data);
		}, 'json');
	}
	this.library = null;
	this.store = new ObjectStore();
	this.captureDialog = $('#app-captureDialog').initialize('dialog').ux();
	$('#app-captureDialog-doneButton')
		.click(function() {
			app.captureDialog.hide();
		});
	$('#app-captureDialog-video')
		.each(function() {
			app.captureWebcam = $(this).webcam({
				'width': 320,
				'height': 240,
				'mode': "callback",
				'swffile': "/:resource/jquery.webcam/jscam_canvas_only.swf",
				'onTick': function() {},
				'onSave': function() {},
				'onCapture': function() {
					
				},
				'debug': function() {},
				'onLoad': function() {}
			});
		});
	this.gridList = $('#app-gallery').initialize('gridList').ux();
	this.gridList.$.bind({
		'ux-gridList-dropFile': function(e, dataTransfer) {
			app.updateToolbar();
			app.uploadFiles(dataTransfer.files, function(err) {
				if (err) {
					alert(err);
				}
			});
		},
		'ux-gridList-removeItems': function(e, items, origin) {
			app.updateToolbar();
			if (origin === 'user') {
				app.library.data.library.items = app.gridList.sequence;
				app.store.updateObjectRef(
					'collabkit-library',
					app.library.data,
					function(result, err) {
						if (err) {
							alert(err);
						} else {
							app.updateLibrary(result);
						}
					}
				);
			}
		},
		'ux-gridList-sequenceItems': function(e, sequence, origin) {
			app.updateToolbar();
			if (origin === 'user') {
				if (app.library.data.library.items.length != sequence.length) {
					throw 'Sorting resulted in mismatched item list';
				}
				app.library.data.library.items = sequence;
				app.store.updateObjectRef(
					'collabkit-library',
					app.library.data,
					function(result, err) {
						if (err) {
							alert(err);
						} else {
							app.updateLibrary(result);
						}
					}
				);
			}
		},
		'ux-gridList-select': function() {
			app.updateToolbar();
		},
		'mousedown': function() {
			$(this).focus();
		}
	});
	$('#app-talk-icon')
		.click(function() {
			if (app.talkVisible()) {
				app.hideTalk();
			} else {
				app.showTalk();
			}
		});
	$('#app-talk-sidebar form').submit(function() {
		var $input = $('#app-talk-input'),
			msg = $input.val();
		$input.val('');
		if (msg != '') {
			app.chatSendText(msg);
		}
	});
	this.toolbar = $('#app-toolbar').initialize('toolbar').ux();
	this.toolbar.$.config({
		'contents': [
  			$('<div></div>')
  				.initialize('toolbarGroup')
  				.config({
	  				'id': 'app-toolbar-gallery',
	  				'label': 'Gallery',
	  				'icon': 'gallery',
	  				'contents': [
	  					$('<div></div>')
	  						.initialize('toolbarUploadButton')
	  						.config({
		  						'id':'app-toolbar-import',
		  						'label': 'Import',
		  						'icon': 'folder',
		  						'multiple': true
		 					})
		 					.bind({
		 						'ux-toolbarUploadButton-execute': function(e, input) {
		 	 						app.uploadFiles(input.files, function(err) {
		 	 							if (err) {
		 	 								alert(err);
		 	 							}
		 	 						});
		 	 					}
		 					}),
	  					$('<div></div>')
		  					.initialize('toolbarButton')
		  					.config({
		  						'id': 'app-toolbar-capture',
		  						'label': 'Capture',
		  						'icon': 'webcam',
		  					})
		  					.bind({
		  						'ux-toolbarButton-execute': function() {
		  							app.captureDialog.show();
		 	 					}
		  					}),
	  					$('<div></div>')
		  					.initialize('toolbarButton')
		  					.config({
		  						'id': 'app-toolbar-slideshow',
		  						'label': 'Slideshow',
		  						'icon': 'slideshow',
		  					})
		  					.bind({
		  						'ux-toolbarButton-execute': function() {
		 	 						app.runSlideshow(app.gridList.sequence);
		 	 					}
		  					})
	  				]
  				}),
  			$('<div></div>')
  				.initialize('toolbarGroup')
  				.config({
 	 				'id': 'app-toolbar-picture',
 	 				'label': 'Picture',
 	 				'icon': 'block',
 	 				'contents': [
 	 					$('<div></div>')
 	 						.initialize('toolbarButton')
 	 						.config({
 		 						'id': 'app-toolbar-moveup',
 		 						'label': 'Move up',
 		 						'icon': 'up',
 	 						})
 	 						.bind({
 		 						'ux-toolbarButton-execute': function() {
 		 							var sel = app.gridList.getSelection();
 		 							if (sel.length) {
 			 							var seq = app.gridList.sequence,
 			 							targetIndex = app.gridList.sequence.indexOf(sel[0]) - 1;
 			 							if (targetIndex > -1) {
 				 							app.gridList.moveItemsBefore(
 				 								sel, seq[targetIndex], 'user'
 				 							);
 			 							} else {
 				 							app.gridList.moveItemsBefore(
 				 								sel, undefined, 'user'
 				 							);
 			 							}
 			 							app.gridList.flow();
 		 							}
 			 					}
 		 					}),
 	 					$('<div></div>')
 	 						.initialize('toolbarButton')
 	 						.config({
 		 						'id': 'app-toolbar-movedown',
 		 						'label': 'Move down',
 		 						'icon': 'down'
 	 						})
 	 						.bind({
 	 							'ux-toolbarButton-execute': function() {
 		 							var sel = app.gridList.getSelection();
 		 							if (sel.length) {
 			 							var seq = app.gridList.sequence,
 			 								targetIndex = app.gridList.sequence.indexOf(
 			 									sel[sel.length - 1]
 			 								) + 1;
 			 							if (targetIndex < seq.length - 1) {
 				 							app.gridList.moveItemsAfter(
 				 								sel, seq[targetIndex], 'user'
 				 							);
 			 							} else {
 				 							app.gridList.moveItemsAfter(
 				 								sel, undefined, 'user'
 				 							);
 			 							}
 			 							app.gridList.flow();
 		 							}
 			 					}
 	 						}),
 	 					$('<div></div>')
 	 						.initialize('toolbarButton')
 	 						.config({
	 	 						'id': 'app-toolbar-remove',
	 	 						'label': 'Remove',
	 	 						'icon': 'remove',
	 	 					})
	 	 					.bind({
	 	 						'ux-toolbarButton-execute': function() {
	 	 							app.gridList.removeItems(
	 	 								app.gridList.getSelection(), 'user'
	 	 							);
	 	 						}
	 	 					})
 	 				]
	  			})
  		]
	});
	this.updateToolbar();
	this.userDialog = $('#app-userDialog').initialize('dialog').ux();
	$('#app-userDialog-nameInput')
		.bind('keyup cut past click', function() {
			$('#app-userDialog-doneButton')
				.attr('disabled', $(this).val().length === 0 ? 'true' : 'false');
		})
		.keypress(function(e) {
			if(e.keyCode==13) {
				$('#app-userDialog-doneButton').click();
	        }
		});
	$('#app-userDialog-colors div,#app-userDialog-avatars  div')
		.click(function() {
			$(this)
				.addClass('app-userDialog-selected')
				.siblings()
					.removeClass('app-userDialog-selected');
		});
	$('#app-userDialog-doneButton')
		.click(function() {
			if ($(this).attr('disabled') === 'true') {
				return false;
			}
			var user = app.user;
			user.name = $('#app-userDialog-nameInput').val();
			user.color = $('#app-userDialog-colors .app-userDialog-selected').attr('rel');
			user.avatar = $('#app-userDialog-avatars .app-userDialog-selected').attr('rel');
			var cookieOptions = {'expires': 7, 'path': '/'};
			$.cookie('collabKit-user-name', user.name, cookieOptions);
			$.cookie('collabKit-user-color', user.color, cookieOptions);
			$.cookie('collabKit-user-avatar', user.avatar, cookieOptions);
			$('#app-user-avatar').css(
				'background-image',
				'url(' + app.avatar(user.avatar, 32) + ')'
			);
			$('#app-user-name').text(user.name);
			$('body').attr(
				'class', $('body').attr('class').replace(/ux\-theme\-[a-z]+/, 'ux-theme-' + user.color)
			);
			if (!isInitialDataLoaded) {
				loadInitialData();
			}
			app.userDialog.hide();
		});
	
	var user = this.user = {
		name: $.cookie('collabKit-user-name'),
		color: $.cookie('collabKit-user-color'),
		avatar: $.cookie('collabKit-user-avatar')
	};
	if (user.color) {
		$('#app-userDialog-colors div[rel="' + user.color + '"]')
			.addClass('app-userDialog-selected');
	} else {
		$('#app-userDialog-colors div:first')
			.addClass('app-userDialog-selected');
	}
	if (user.avatar) {
		$('#app-userDialog-avatars div[rel="' + user.avatar + '"]')
			.addClass('app-userDialog-selected');
	} else {
		$('#app-userDialog-avatars div:first')
			.addClass('app-userDialog-selected');
	}
	if (user.name) {
		$('#app-userDialog-nameInput').val(user.name);
		$('#app-userDialog-doneButton').attr('disabled', 'false');
		$('#app-userDialog-doneButton').click();
	} else {
		app.userDialog.show();
	}
	
	$('#app-user').click(function() {
		app.userDialog.show();
	});
	
	// Use jquery.plugin to detect flash support
	if (!$.browser.flash) {
		// Capture requires flash support, so let's hide it
		this.toolbar.$.find('#app-toolbar-capture').remove();
	}
	
	// Hacky way to detect file input support; at least works on iOS
	if (this.toolbar.$.find('#app-toolbar-import input:file:disabled').length) {
		// Import requires file input support, so let's hide it
		this.toolbar.$.find('#app-toolbar-import').remove();
	}
}

/**
 * Fetch URL for a predefined avatar with given name/size
 *
 * @param {string} avatar
 * @param {int} size defaults to 32
 * @return string
 */
GalleryApp.prototype.avatar = function(avatar, size) {
	if (!/^[a-z0-9]+\/[a-z0-9]+$/.exec(avatar)) {
		throw new Error('Invalid avatar name ' + avatar);
	}
	if (size === undefined) {
		size = 32;
	}
	var sizes = [32, 48, 64, 128];
	if ($.inArray(size, sizes) == -1) {
		throw new Error('Invalid avatar size ' + size);
	}
	return '/:resource/demo/graphics/avatars/' + size + '/' + avatar + '.jpg';
}

GalleryApp.prototype.updateToolbar = function() {
	var sel = this.gridList.getSelection();
	var seq = this.gridList.sequence;
	var disable = {
			'moveup': (!sel.length || sel[0] === seq[0]),
			'movedown': (!sel.length || sel[sel.length - 1] === seq[seq.length - 1]),
			'remove': !sel.length
		}
	if (sel.length > 1) {
		if (disable.moveup) {
			for (var i = 1; i < sel.length; i++) {
				if (sel[i] !== seq[i]) {
					disable.moveup = false;
					disable.movedown = false;
					break;
				}
			}
		} else if (disable.movedown) {
			for (var i = 2; i <= sel.length; i++) {
				if (sel[sel.length - i] !== seq[seq.length - i]) {
					disable.moveup = false;
					disable.movedown = false;
					break;
				}
			}
		}
	}
	for (var tool in disable) {
		this.toolbar.$.find('#app-toolbar-' + tool).config('disabled', disable[tool]);
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
	var app = this,
		fetch = true;
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
			var currentSequenceHash = this.gridList.sequence.join('|');
			// Nothing new, just a meta update
			if (oldSequenceHash !== newSequenceHash && newSequenceHash !== currentSequenceHash) {
				// Same items, different order, and display is out of date
				this.gridList.sequenceItems(newSequenceHash.split('|'));
				// Update display
				this.gridList.flow();
				// Keep toolbar in sync
				app.updateToolbar();
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
		// Use new commit
		this.library = commit;
		// Update the gridList
		$.ajax({
			'url': '/:media/' + this.library.id + '/list/thumb',
			'dataType': 'json',
			'type': 'GET',
			'cache': false,
			'success': function(data) {
				var currentSequence = app.gridList.sequence;
				if (!currentSequence.length) {
					app.gridList.addItems(data);
				} else {
					var newSequence = [],
						newItems = [],
						deletedItems = [];
					for (var i = 0; i < data.length; i++) {
						newSequence.push(data[i].id);
						// Collect a list of new items
						if (currentSequence.indexOf(data[i].id) === -1) {
							newItems.push(data[i]);
						}
					}
					if (newSequence.join('|') !== currentSequence.join('|')) {
						for (var i = 0; i < currentSequence.length; i++) {
							// Collect a list of deleted items
							if (newSequence.indexOf(currentSequence[i]) === -1) {
								deletedItems.push(currentSequence[i]);
							}
						}
						// Remove deleted items
						app.gridList.removeItems(deletedItems);
						// Add new items
						app.gridList.addItems(newItems);
						// Apply new sequence
						app.gridList.sequenceItems(newSequence);
						// Update display
						app.gridList.flow();
						// Keep toolbar in sync
						app.updateToolbar();
					}
				}
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

	// Style hack; max-width: 100%; max-height: 100% should do
	// but in practice is unreliable so far
	var hackPhotoResize = function() {
		var $photos = $('.slideshow-photo');
		$photos
			.css('max-width', $slideshow.width())
			.css('max-height', $slideshow.height())
	};
	$(window).bind('resize', hackPhotoResize);

	/**
	 * Load up the photo into an <img> and call us back when done.
	 */
	var buildPhoto = function(id, callback) {
		var $photo = $('<img class="slideshow-photo"/>')
			.attr('src', '/:media/' + id + '/photo/large');
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
			hackPhotoResize(); // ping the size fixes
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
		$(window).unbind('resize', hackPhotoResize);
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

GalleryApp.prototype.talkVisible = function() {
	return $('#app-body').hasClass('chat');
};

GalleryApp.prototype.showTalk = function() {
	$('#app-body').addClass('chat');
	$(window).resize(); // Trigger reflow of the body area
	$('#app-talk-log').scrollTop(9999999);
	$('#app-talk-input').focus();
};

GalleryApp.prototype.hideTalk = function() {
	$('#app-body').removeClass('chat');
	$(window).resize(); // Trigger reflow of the body area
};

GalleryApp.prototype.onChat = function(message) {
	$('#app-body').toggleClass('chat');
	$(window).resize(); // Trigger reflow of the body area
};

GalleryApp.prototype.appendChatLog = function(text, user) {
	var app = this;
	var $line = $('<p>');
	var $user = $('<span>')
		.attr('class', 'chat-name')
		.text(user.name + '\u00a0')
		.appendTo($line);
	var $avatar = $('<img>')
		.attr('class', 'chat-avatar')
		.attr('src', this.avatar(user.avatar))
		.prependTo($user);
	$('<span>')
		.attr('class', 'chat-text')
		.text(text)
		.appendTo($line);
	var $log = $('#app-talk-log');
	$log
		.append($line)
		.scrollTop(9999999);

	// If the chat window is closed, show it in the notification area too
	if (!app.talkVisible()) {
		this.showNotification($line.clone(), function() {
			app.showTalk();
		});
	}
}

GalleryApp.prototype.onChat = function(message) {
	this.appendChatLog(message.text, message.user);
};

GalleryApp.prototype.onChatPresence = function(message) {
	// @fixme proper disambig :)
	if (message.user.name !== this.user.name) {
		this.appendChatLog('is present', message.user);
	}
};

GalleryApp.prototype.onChatJoin = function(message) {
	// @fixme proper disambig :)
	if (message.user.name !== this.user.name) {
		this.appendChatLog('joined the session', message.user);
		// Also go ahead and make sure the new guy knows who we are!
		this.chatPresence();
	}
};

GalleryApp.prototype.chatUserInfo = function() {
	return {
		id: this.user.name, // @fixme use a session hash or something
		name: this.user.name,
		avatar: this.user.avatar,
		color: this.user.color
	};
}
/**
 * Announce we've joined and ask other connected clients for presence info
 */
GalleryApp.prototype.chatJoin = function() {
	this.session.publish('/chat', {
		event: 'join',
		user: this.chatUserInfo()
	});
};

/**
 * Ask other connected clients for presence info
 */
GalleryApp.prototype.chatPresence = function() {
	this.session.publish('/chat', {
		event: 'presence',
		user: this.chatUserInfo()
	});
};

/**
 * Send a basic chat message to the other clients.
 */
GalleryApp.prototype.chatSendText = function(text) {
	this.session.publish('/chat', {
		event: 'chat',
		text: text,
		user: this.chatUserInfo()
	});
};

GalleryApp.prototype.connect = function(session) {
	var app = this;
	this.session = session;
	session.subscribe('/commits', function(message) {
		app.updateLibrary(message);
	});
	session.subscribe('/chat', function(message) {
		if (message.event == 'join') {
			app.onChatJoin(message);
		} else if (message.event == 'presence') {
			app.onChatPresence(message);
		} else if (message.event == 'chat') {
			app.onChat(message);
		}
	});
	app.chatJoin();
};

/**
 * @param {jQuery} $content
 * @param {function} callback to call if the notification gets clicked
 */
GalleryApp.prototype.showNotification = function($content, callback) {
	var $notifyArea = $('#app-notify');
	var $notify = $('<div>')
		.attr('class', 'app-notification')
		.css('display', 'none')
		.append($content)
		.appendTo($notifyArea)
		.fadeIn(500, function() {
			var close = function() {
				$notify.fadeTo(500, 0, function() {
					$notify.slideUp(500, function() {
						$notify.remove();
					});
				});
			}
			var timeout = setTimeout(function() {
				$notify.unbind('click', onclick);
				close();
			}, 5000);
			var onclick = function() {
				clearTimeout(timeout);
				close();
				if (callback) {
					callback();
				}
			};
			$notify.click(onclick);
		});
};

// Create user interfaces
var galleryApp = new GalleryApp();

// Connect a session so we can get updates on inter-client state...
var session = new Faye.Client('/:session/');
galleryApp.connect(session);
