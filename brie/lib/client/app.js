/*
function App() {
	//
};

exports.App = App;
exports.create = function() {
	return new App();
};
*/

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

var store = {
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
};


/**
 * @param {jQuery} target
 * @param {String} viewUrl
 */
function showThumb(target, id) {
	var viewUrl = '/:media/' + id;
	var $thumb = $('<div class="thumb"><a><img height="128" /></a></div>')
	    .data('collabkit-id', id)
		.find('a').attr('href', viewUrl).end()
		.find('img').attr('src', viewUrl).end()
		.appendTo(target);
	$thumb.find('a').click(function(event) {
		event.preventDefault();
	});
}

$('#media-chooser').change(function(event) {
	// This version requires FileAPI: Firefox 3.5+ and Chrome ok
	var files = this.files;
	if (files.length > 0) {
		$.each(files, function(i, file) {
			var ui = $('<div class="photo-entry">Reading...</div>');
			$('#mediatest').append(ui);

			ui.text('Uploading...');
			store.createPhoto(file, function(result, err) {
				if (result) {
					var photoId = result.id;
					ui.text('Updating library...');
					lib.library.items.push(photoId);
					store.updateObjectRef('collabkit-library', lib, function(result, err) {
						if (result) {
							ui.empty()
							showThumb(ui, photoId);
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

var library = {};
var lib = {};

var $toolbar = $('.library-toolbar:first');

function updateToolbar() {
	// These buttons need something selected to operate on.
	var $operators = $toolbar.find('.delete, .moveup, .movedown');
	var $selected = $('#mediatest > .ui-selected');
	if ($selected.length > 0) {
		$operators.removeAttr('disabled');
	} else {
		$operators.attr('disabled', 'disabled');
	}
	var first = $('#mediatest > div:first'),
	    last = $('#mediatest > div:last');
	if (first.hasClass('ui-selected')) {
		$toolbar.find('.moveup').attr('disabled', 'disabled');
	}
	if (last.hasClass('ui-selected')) {
		$toolbar.find('.movedown').attr('disabled', 'disabled');
	}
}

$toolbar.find('.slideshow').click(function() {
	var photos = lib.library.items.slice();
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
		var $photo = $('<img class="slideshow-photo"/>').attr('src', '/:media/' + id);
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
});

$toolbar.find('.delete').click(function() {
	var $selected = $('#mediatest > .ui-selected');
	$selected.each(function(i, node) {
		var id = $(node).find('.thumb').data('collabkit-id');
		var index = lib.library.items.indexOf(id);
		if (index == -1) {
			throw new Error("Trying to remove photo that doesn't exist: " + id);
		}
		lib.library.items.splice(index, 1);
		$(node).text('Removing...');
	});
	store.updateObjectRef('collabkit-library', lib, function(result, err) {
		if (err) {
			alert(err);
		} else {
			$selected.remove();
		}
	});
});

function doMovePhotos(incr) {
	var $selected = $('#mediatest > .ui-selected');
	var items = lib.library.items;
	var targetIndices = [];
	$selected.each(function(i, node) {
		var id = $(node).find('.thumb').data('collabkit-id');
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
	store.updateObjectRef('collabkit-library', lib, function(result, err) {
		if (err) {
			alert(err);
		} else {
			showLibrary(result);
		}
	});
}
$toolbar.find('.moveup').click(function() {
	doMovePhotos(-1);
});
$toolbar.find('.movedown').click(function() {
	doMovePhotos(1);
});

function showLibrary(commitInfo) {
	var data = commitInfo.data;
	if (data.type != 'application/x-collabkit-library') {
		alert('invalid collabkit library data');
		return;
	}
	library = commitInfo;
	lib = library.data;

	$('#mediatest').empty();
	$('#mediastate').text('Version: ' + library.id + ' (parents: ' + library.parents.join('') + ')');
	$.each(lib.library.items, function(i, id) {
		var thumb = $('<div class="photo-entry"></div>').appendTo('#mediatest');
		showThumb(thumb, id);
	});
}

/**
 * Set up selection interface
 */
$('#mediatest')
	.selectable()
	.bind('selectablestop', function() {
		updateToolbar();
	});
updateToolbar();


/**
 * Connect a session so we can get updates on inter-client state...
 */
var session = new Faye.Client('/:session/');
session.subscribe('/commits', function(message) {
	showLibrary(message);
});

$.get('/:data/collabkit-library', function(data, xhr) {
	showLibrary(data);
}, 'json');
