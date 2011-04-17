var util = require('util'),
	grout = require( '../shared/grout' );
	Store = require('./store.js').Store;

/**
 * High-level versioned object store, wrapping CollabKitObject access around
 * the low-level Store implementation.
 *
 * @returns {Store}
 */
function CollabKitStore( options ) {
	/* Members */
	this.options = options;
}

util.inherits( CollabKitStore, Store );

/**
 * Asynchronously fetch a CollabKitObject by commit/version id.
 *
 * @param {string} id
 * @param {function(obj, err)} callback
 */
CollabKitStore.prototype.getObject = function(id, callback) {
	var store = this;
	store.getCommit( id, function(commit, err) {
		if ( err ) {
			callback( null, err);
			return;
		}
		store.getTree( commit.tree, function( tree, err ) {
			if ( err ) {
				callback( null, err);
				return;
			}
			// @fixme cache that tree, we'll probably need it later?
			tree.getBlob('data.json', function(data, err) {
				if ( err ) {
					callback( null, err );
					return;
				}
				var cko = new CollabKitObject(store, commit.id, data, commit.parents);
				callback(cko);
			}, 'json');
		});
	});
};

/**
 * Create an uncommitted CollabKitObject with no history. If data and files are
 * provided, the JSON data and queued files additions will be thrown in.
 *
 * Files should be an array of object maps with 'path', 'data' and optionally
 * 'format' members matching the addFile() method's parameters.
 *
 * Caller's responsibility to commit if needed.
 *
 * @return {CollabKitObject}
 */
CollabKitStore.prototype.create = function(data, files) {
	var cko = new CollabKitObject(this, data);
	if ( data ) {
		grout.mix( cko.data, data );
	}
	if ( files ) {
		files.forEach( function( i, entry ) {
			cko.addFile( entry.path, entry.data, entry.format );
		} );
	}
	return cko;
};

/**
 * A CollabKitObject is a JSON data structure with an associated directory tree
 * of supporting files, which is bundled and versioned together as a unit.
 * This is conceptually similar to XML-based file formats like ODF which are
 * bundled into ZIP files, but we get access to git's versioning system as well.
 *
 * The CollabKitObject interface provides a basic layer over that, with direct
 * access to the JSON data and some helper functions to read out files and make
 * common types of updates.
 *
 * @access private
 */
function CollabKitObject( store, version, data, parents ) {
	this.store = store;
	this.version = version || null;
	this.data = grout.mix( {}, data || {} );
	this.parents = parents || [];

	// queued files & commit data
	this._files = [];
	this._origData = JSON.stringify( this.data );
	this._dirty = (version != null);
}


/**
 * @return CollabKitObject
 * @todo support multiple parents
 */
CollabKitObject.prototype.fork = function() {
	if ( this.isDirty() ) {
		throw "Can't fork a dirty object; needs committed history.";
	}
	var cko = this.store.create(this.version, this.data, [this.version]); // clone the data...
	return cko;
};

/**
 * @return boolean if this object has been modified from commit state
 *                 or has never been committed.
 */
CollabKitObject.prototype.isDirty = function() {
	return this._dirty || JSON.stringify( this.data ) != this._origData;
};

/**
 * Read a file!
 * @param {String} path
 * @param {function(data, err)} callback
 * @param {String} format: one of 'auto' (default), 'buffer', 'string', 'json', 'xml', 'id'
 *
 * @fixme include support for uncommitted files?
 * @fixme subpaths requires fixes on store's Tree class
 */
CollabKitObject.prototype.getFile = function(path, callback, format) {
	var cko = this, store = this.store;
	store.getTree( this.version, function( tree, err ) {
		if ( err ) {
			callback( null, err );
			return;
		}
		tree.getBlob( path, callback, format );
	})
};

/**
 * Queue a file to be saved into the data store with the next commit on this object.
 * Be careful with streams; they'll stay blocked until commit time, and some could
 * fail anyway.
 *
 * @param {String} path
 * @param {mixed} data: string, buffer, or object
 * @param {String} format: one of 'auto' (default), 'buffer', 'string', 'json', 'xml', 'stream', 'id'
 */
CollabKitObject.prototype.addFile = function(path, data, format) {
	this._dirty = true;
	this._files.push({path: path, data: data, format: format});
};

/**
 * Queue a file to be removed from the data store on the next commit on this object.
 *
 * @param {String} path
 */
CollabKitObject.prototype.removeFile = function(path) {
	this._files.push({path: path, remove: true});
};

/**
 * Save the commit asynchronously, returning an updated CollabKitObj to the
 * callback on success
 *
 * @param {object} params
 * @param {function(obj, err)} callback
 *
 * @todo support for subdirectories
 * @todo support for removals
 */
CollabKitObject.prototype.commit = function(params, callback) {
	var store = this.store;
	var data = JSON.stringify( this.data );
	if (data != this._origData ) {
		this.addFile( 'data.json', data, 'string' );
	}

	var saveNewTree = function( tree ) {
		var entries = grout.mix( {}, tree.children );
		var i = 0;
		var nextEntry = function() {
			if ( i >= this.files.length ) {
				// We've finished all the file updates.
				// Save this version of the file tree!
				store.createTree( entries, function( treeId, err ) {
					if ( err ) {
						callback( null, err );
						return;
					}
					// We have updated the tree! woooo
					store.createCommit(grout.mix({
						tree: treeId,
						parents: this.parents,
						desc: 'commit via object'
					}, params), function(commitId, err) {
						if ( err ) {
							callback( null, err );
							return;
						}
						// Commit is saved. Yay!
						// Build a fresh, non-dirty object and pass that to the callback.
						var cko = CollabKitObject.create( commitId, this.data, this.parents );
						callback( cko, null );
					});
				});
			} else {
				// Still pumping updated blobs into the store...
				var file = this.files[i];
				store.createBlob( file.data, function( id, err ) {
					if ( err ) {
						callback( null, err );
						return;
					}
					var entry = tree.findFile( file.path );
					if ( entry ) {
						entry.id = id;
					} else {
						entry = {
							mode: '100644',
							type: 'blob',
							id: id,
							name: file.path
						}
					}
					i++;
					nextEntry(); // tail recursion ftw
				}, file.format );
			}
		};
		nextEntry(0);
	}
	if ( this.version ) {
		this.getTree( function( tree, err ) {
			saveNewTree( tree );
		});
	} else {
		saveNewTree( [] );
	}
};

CollabKitObject.prototype.toString = function() {
	return '[object CollabKitObject ' + this.version + ' ' + JSON.stringify(this.data) + ']';
};

exports.CollabKitStore = CollabKitStore;
exports.CollabKitObject = CollabKitObject;
exports.create = function( options ) {
	return new CollabKitStore( options );
};

if (module.parent === null) {
	var store = new CollabKitStore();

	console.log("collabkitstore.js testing interface!");

	var args = process.argv.slice(2);
	if (args.length == 0) {
		args = ['--help'];
	}

	if (args[0] == 'get') {
		if (args.length < 2) {
			console.log('Usage: get <id>');
			process.exit(1);
		}
		store.getObject(args[1], function(obj, err) {
			if (err) {
				console.log('Error: ' + err);
				process.exit(1);
			} else {
				console.log('Success!');
				console.log(obj.toString());
				process.exit(0);
			}
		});
	} else {
		console.log('Actions: get');
		process.exit(1);
	}
}
