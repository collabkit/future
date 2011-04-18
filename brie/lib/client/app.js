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

/**
 * @param {jQuery} target
 * @param {String} viewUrl
 */
function showThumb(target, viewUrl) {
	$('<div class="thumb"><a><img width="128" height="128" /></a></div>')
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

			// Start an upload!
			var url = '/:media/new';
			var reader = new FileReader();
			reader.onload = function(e) {
				ui.text('Uploading...');
				var xhr = new XMLHttpRequest();
				xhr.open('PUT', url);
				xhr.setRequestHeader('Content-Type', file.type);
				xhr.setRequestHeader('Content-Length', file.length);
				xhr.onreadystatechange = function(e) {
					if (xhr.readyState == 4) {
						var viewUrl = xhr.getResponseHeader('Location')
						if (viewUrl) {
							ui.empty()
							showThumb(ui, viewUrl);
						} else {
							ui.text('failllll');
						}
					}
				};
				xhr.sendAsBinary(reader.result);
			};
			reader.readAsBinaryString(file);
		});
	}
});

$.get('/:media/library', function(data, xhr) {
	$.each(data, function(i, id) {
		var thumb = $('<div class="photo-entry"></div>').appendTo('#mediatest');
		showThumb(thumb, '/:media/' + id);
	});
}, 'json');
