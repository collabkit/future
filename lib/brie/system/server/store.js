
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
 * @return object {contentType, data}
 *
 * @throws exception if object is not found
 */
Store.prototype.getObject = function(id) {
	if ( id in this.objects ) {
		return this.objects[id];
	} else {
		throw "No such object " + id;
	}
};

/**
 * @param {string} contentType
 * @param {Buffer} data
 * @return {string} new object ID
 */
Store.prototype.putObject = function(contentType, data) {
	var id = Math.random();
	this.objects[id] = {
		contentType: contentType,
		data: data
	};
	return id;
};

exports.Store = Store;
exports.create = function( options ) {
	return new Store( options );
};
