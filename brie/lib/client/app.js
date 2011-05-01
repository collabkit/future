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
	$('<div class="thumb"><a><img height="128" /></a></div>')
		.find('a').attr('href', viewUrl).end()
		.find('img').attr('src', viewUrl).end()
		.appendTo(target);
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

var lib = {};

$.get('/:data/collabkit-library', function(data, xhr) {
	if (data.type != 'application/x-collabkit-library') {
		alert('invalid collabkit library data');
		return;
	}
	lib = data;
	$.each(lib.library.items, function(i, id) {
		var thumb = $('<div class="photo-entry"></div>').appendTo('#mediatest');
		showThumb(thumb, id);
	});
}, 'json');
