# Squisher

Helper library for getting basic image metadata and creating thumbnails.

Uses the gd library wrapper module:

  npm install gd

Note that this requires having gd & gd devel libraries available.
On Mac OS X this has been tested with node & gd installed via homebrew.

Examples

	var squisher = require('./shared/squisher').create({
		sizes: {
			thumb: [128, 128],
			medium: [640, 480],
			large: [1280, 960]
		}
	});

	squisher.on('metadata', function(info) {
		console.log("Source file is " + squisher.width + 'x' + squisher.height);
	});

	squisher.on('resized', function(event) {
		console.log(event.size + ' is ' +
			event.width + 'x' + event.height + 'px, ' +
			event.data.length + ' bytes');
		fs.createWriteStream(event.size + '.' + event.ext).end(event.data);
	});

	squisher.on('complete', function() {
		process.exit(0);
	});

	squisher.on('error', function(error) {
		console.log(error);
		process.exit(1);
	});

	squisher.read(buffer, 'image/png');
	// or...
	// squisher.readStream(req, req.headers['content-type']);
