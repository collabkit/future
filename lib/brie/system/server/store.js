
/**
 * Store
 *
 * Stub object store interface.
 *
 * @returns {Store}
 */
function Store( options ) {
	/* Members */
	this.objects = {};
}

/**
 * Fetch a stored media file object from the temporary space.
 *
 * @param {string} id: object ID key
 * @param {function} callback receiving object info: function({contentType, data}). You'll get a call with null in case of failure.
 *
 * @throws exception if object is not found
 */
Store.prototype.getBlob = function(id, callback) {
	var obj = null;
	if ( id in this.objects ) {
		obj = this.objects[id];
	}
	if (callback) {
		callback(obj);
	}
};

/**
 * @param {string} contentType
 * @param {object} data (JSON-serializable)
 * @param {function(id)} callback receiving new object ID
 */
Store.prototype.putObject = function(contentType, data, callback) {
	this.putBlob(contentType, new Buffer(JSON.stringify(data)), callback);
};

/**
 * @param {string} contentType
 * @param {Buffer} data
 * @param {function(id)} callback receiving new object ID
 */
Store.prototype.putBlob = function(contentType, data, callback) {
	var hash = require('crypto').createHash('sha1');
	var id = hash.update('objType').update(data).digest('hex');
	this.objects[id] = {
		contentType: contentType,
		data: data
	};
	if (callback) {
		callback(id);
	}
};

exports.Store = Store;
exports.create = function( options ) {
	return new Store( options );
};
