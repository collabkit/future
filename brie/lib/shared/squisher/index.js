var util = require('util'),
	fs = require('fs'),
	events = require( 'events' ),
	gd = require('gd/gd');


/**
 * @param {object} options map which can contain:
 *         - data: (a buffer to read original file from)
 *         - stream: (a stream to read original file from)
 *         - type: string with MIME type eg 'image/png' (required)
 *
 * @returns {Squisher}
 */
function Squisher( options ) {
	events.EventEmitter.call( this );

	options = options || {};
	if ('sizes' in options) {
		this.sizes = options.sizes;
	} else {
		this.sizes = {
			thumb: [128, 128],
			medium: [640, 480],
			large: [1280, 960]
		}
	}
}

util.inherits( Squisher, events.EventEmitter );

var readerForType = function(type) {
	var formats = {
		'image/png': {
			open: function(buffer) {
				return gd.createFromPngPtr(buffer.toString('binary'));
			},
			toBuffer: function(image) {
				return new Buffer(image.pngPtr(9), 'binary');
			},
			ext: 'png'
		},
		'image/jpeg': {
			open: function(buffer) {
				return gd.createFromJpegPtr(buffer.toString('binary'));
			},
			toBuffer: function(image) {
				return new Buffer(image.jpegPtr(), 'binary');
			},
			ext: 'jpeg'
		},
		'image/gif': {
			open: function(buffer) {
				return gd.createFromGifPtr(buffer.toString('binary'));
			},
			toBuffer: function(image) {
				return new Buffer(image.gifPtr(), 'binary');
			},
			ext: 'gif'
		}
	};
	return function (type) {
		if (type in formats) {
			return formats[type];
		} else {
			throw new Error('Unrecognized type ' + type + ' passed to Squisher');
		}
	}
}();

/**
 * @return {number[]} width, height
 */
var fitToBox = function(boxWidth, boxHeight, origWidth, origHeight) {
	/**
	 * Simple scaler function assuming width is the limiting side
	 */
	var scale = function(boxWidth, boxHeight, origWidth, origHeight) {
		var width = boxWidth;
		var height = Math.round(origHeight * boxWidth / origWidth);
		if (height < 1) {
			height = 1;
		}
		return [width, height];
	}

	return function(boxWidth, boxHeight, origWidth, origHeight) {
		var aspect = origWidth / origHeight,
			boxAspect = boxWidth / boxHeight;
		if (aspect >= boxAspect) {
			// Original is wider than or same as the bounding box.
			return scale(boxWidth, boxHeight, origWidth, origHeight);
		} else {
			// Original is taller than the bounding box.
			// Swap the order of parameters and run through the same logic.
			var bits = scale(boxHeight, boxWidth, origHeight, origWidth);
			return [bits[1], bits[0]];
		}
	};
}();

/**
 * @param {Buffer} buffer
 * @param {String} contentType
 *
 * @throws Error on unrecognized type
 * @todo conversion is not currently async
 */
Squisher.prototype.read = function(buffer, contentType) {
	try {
		var reader = readerForType(contentType);
	} catch (e) {
		this.emit('error', e);
		return;
	}

	var image = reader.open(buffer);
	if (!image) {
		this.emit('error', new Error('Failed to read image data.'));
		return;
	}

	var meta = {
		width: image.width,
		height: image.height,
		ext: reader.ext,
		contentType: contentType
	}
	this.emit('metadata', meta);

	for (var name in this.sizes) {
		if (this.sizes.hasOwnProperty(name)) {
			var size = this.sizes[name];

			var boxWidth = size[0],
				boxHeight = size[1];
			var dest = fitToBox(boxWidth, boxHeight, meta.width, meta.height);
			var destWidth = dest[0],
				destHeight = dest[1];

			if (destWidth < meta.width || destHeight < meta.height) {
				// New size is smaller -- resample!
				var destImage = gd.createTrueColor(destWidth, destHeight);
				image.copyResampled(
					destImage, // dest
					0, 0, // dest X/Y
					0, 0, // src X/Y
					destWidth, destHeight,
					meta.width, meta.height);
				var resizedData = reader.toBuffer(destImage);
				this.emit('resized', {
					size: name,
					width: destWidth,
					height: destHeight,
					ext: reader.ext,
					contentType: contentType,
					data: resizedData
				});
			} else {
				// Would have to scale up; just pass through a reference.
				this.emit('resized', {
					size: name,
					width: meta.width,
					height: meta.height,
					ext: reader.ext,
					contentType: contentType,
					data: null
				});
			}
		}
	}
	this.emit('complete', {});
};

/**
 * @param {Stream} stream
 * @param {String} contentType
 *
 * @todo handle huge files in a saner way
 */
Squisher.prototype.readStream = function(stream, contentType) {
	// Just to validate first...
	var reader = readerForType(contentType);

	// Read the buffer in... consider writing to a temporary file.
	var buffer = new Buffer(0);
	stream.on('data', function(data) {
		var next = new Buffer(buffer.length + data.length);
		buffer.copy(next);
		data.copy(next, buffer.length);
		buffer = next;
	});

	// Pass the buffer on to the buffer-based thingy.
	stream.on('end', function() {
		self.read(buffer, contentType);
	});
};

exports.Squisher = Squisher;
exports.create = function( options ) {
	return new Squisher( options );
};

// Command-line testing interface
if (module.parent === null) {
	var args = process.argv.slice(2);
	if (args.length == 0) {
		args = ['--help'];
	}

	if (args[0] != '--help') {
		var arg = args[0];

		var squisher = new Squisher();
		squisher.on('metadata', function(info) {
			console.log(info);
		});
		squisher.on('resized', function(thumb) {
			if (thumb.data) {
				console.log(thumb.size + ' is ' +
					thumb.width + 'x' + thumb.height + 'px, ' +
					thumb.data.length + ' bytes');
				fs.createWriteStream(thumb.size + '.' + thumb.ext).end(thumb.data);
			} else {
				console.log(thumb.size + ' unneeded; use orig at ' +
					thumb.width + 'x' + thumb.height + 'px');
			}
		});
		squisher.on('error', function(error) {
			console.log('Error', error);
			process.exit(1);
		});
		squisher.on('complete', function() {
			console.log('Complete!');
			//process.exit(0);
		});

		console.log('Opening file', arg);
		var data = fs.readFileSync(arg);
		squisher.read(data, 'image/png');
	} else {
		console.log('Usage: node squisher somefile.png');
		process.exit(1);
	}
}
