/*
function App() {
	//
};

exports.App = App;
exports.create = function() {
	return new App();
};
*/

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
							ui.empty();
							$('<div class="thumb"><a><img width="128" height="128" /></a></div>')
								.find('a').attr('href', viewUrl).end()
								.find('img').attr('src', viewUrl).end()
								.appendTo(ui);
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
