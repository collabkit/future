/*
 * Only Firefox implements XMLHttpRequest.sendAsBinary
 * 
 * @see http://code.google.com/p/chromium/issues/detail?id=35705
 * FIXME: Move this to a shim we load on non-firefox clients
 */
if (!XMLHttpRequest.prototype.sendAsBinary) {
	XMLHttpRequest.prototype.sendAsBinary = function(datastr) {
	    function byteValue(x) {
		   return x.charCodeAt(0) & 0xff;
	    }
	    var ords = Array.prototype.map.call(datastr, byteValue);
	    var ui8a = new Uint8Array(ords);
	    this.send(ui8a.buffer);
	};
}

function ObjectStore() {
	//
}

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
ObjectStore.prototype.createObject = function(blob, callback) {
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
};

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
ObjectStore.prototype.updateObjectRef = function(ref, data, callback) {
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
