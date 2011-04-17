var util = require('util');

/**
 * Low-level versioned object store, wrapping git or git-style commit trees.
 *
 * @returns {Store}
 */
function Store( options ) {
	/* Members */
	this.options = options;
}

/**
 * Read a blob as an asynchronous stream.
 *
 * @param {String} id
 * @return {Stream}
 */
Store.prototype.streamBlob = function(id) {
	return this.readGitStream(['cat-file', 'blob', id]);
}

var parseBlob = function() {
	var parsers = {
		'buffer': function(data) {
			return data;
		},
		'string': function(data) {
			return data.toString('utf8');
		},
		'json': function(data) {
			return JSON.parse(data.toString('utf8'));
		},
		'xml': function(data) {
			throw 'nyi: xml';
		},
		'auto': function(data) {
			var type = null;
			if (data.length == 0) {
				type = 'buffer';
			} else {
				var firstChar = String.fromCharCode(data[0]);
				if (firstChar == '{' || firstChar == '[') {
					type = 'json';
				} else if (firstChar == '<') {
					type = 'xml';
				} else {
					// @fixme detect UTF-8able strings...?
					type = 'buffer';
				}
			}
			return parsers[type](data);
		}
	};
	return function(data, format) {
		format = format || 'auto';
		if (format in parsers) {
			return parsers[format](data);
		} else {
			throw 'Invalid blob format "' + format + '"';
		}
	};
}();

var makeBlob = function() {
	var makers = {
		'buffer': function(data) {
			return data;
		},
		'string': function(str) {
			return new Buffer(str);
		},
		'json': function(obj) {
			return new Buffer(JSON.stringify(obj));
		},
		'xml': function(data) {
			throw 'nyi: xml';
		},
		'auto': function(data) {
			var type = null;
			if (Buffer.isBuffer(data)) {
				type = 'buffer';
			} else if (typeof data == 'string') {
				type = 'string';
			} else {
				type = 'json';
			}
			// @fixme detect XML DOM
			return makers[type](data);
		}
	};
	return function(data, format) {
		format = format || 'auto';
		if (format in makers) {
			return makers[format](data);
		} else {
			throw 'Invalid blob format "' + format + '"';
		}
	};
}();

/**
 * Asynchronously fetch a file blob via a callback.
 *
 * @param {String} id
 * @param {function(data, err)} callback
 * @param {String} format: optional 'buffer', 'string', 'json', 'xml', or 'auto'
 * @throws exception if no valid blob file entry
 */
Store.prototype.getBlob = function(id, callback, format) {
	var stream = this.streamBlob(id);
	var buffer = new Buffer(0);
	stream.on('data', function(chunk) {
		var next = new Buffer(buffer.length + chunk.length);
		buffer.copy(next, 0);
		chunk.copy(next, buffer.length);
		buffer = next;
	});
	stream.on('end', function() {
		try {
			var data = parseBlob(buffer, format);
			callback(data, null);
			buffer = null;
		} catch (e) {
			callback(null, e);
		}
	});
};

/**
 * Asynchronously fetch a commit object.
 *
 * @param {String} id
 * @param {function(commit, err)} callback
 */
Store.prototype.getCommit = function(id, callback) {
	var store = this;
	this.readGitString(['cat-file', 'commit', id], function(str, err) {
		if (str === null) {
			// error!
			console.log('getTree fail: ' + err);
			callback(null, err);
		} else {
			/*
			Something like this... Can have multiple 'parent' entries, is this the only one?

			tree 84f43c00099681cce788375e002c425f5bc90d64
			parent 894ef352591fe581909c01c46047bf530e59a984
			author Brion Vibber <brion@pobox.com> 1301870259 -0700
			committer Brion Vibber <brion@pobox.com> 1301870259 -0700

			Switch some strings from heredoc to double-quotes so xgettext picks them up.
			*/
			var props = {
				parents: [], // zero or more 'parent' entries
				description: '' // stored as text after the other stuff
			};
			var propsDone = false;
			str.split('\n').forEach(function(line) {
				if (propsDone) {
					props.description += line;
				} else if (line == '') {
					propsDone = true;
				} else {
					var pos = line.indexOf(' ');
					if (pos == -1) {
						throw "Unexpected commit line format: " + line;
					}
					var prop = line.substr(0, pos);
					var val = line.substr(pos + 1);
					if (prop == 'parent') {
						props.parents.push(val);
					} else {
						props[prop] = val;
					}
				}
			});
			var commit = new Commit(store, id, props);
			callback(commit, null);
		}
	});
}

/**
 * Asynchronously fetch a file tree node.
 *
 * @param {String} id
 * @param {function(tree, err)} callback
 */
Store.prototype.getTree = function(id, callback) {
	var store = this;
	this.readGitString(['cat-file', '-p', id], function(str, err) {
		if (str === null) {
			if (!err) {
				err = "got null from read";
			}
			// error!
			console.log('getTree fail: ' + err);
			callback(null, err);
		} else {
			var entries = {};
			str.split('\n').forEach(function(line) {
				var bits = line.split("\t");
				var meta = bits[0].split(' ');
				var name = bits[1];
				entries[name] = {
					mode: meta[1],
					type: meta[1],
					id: meta[2],
					name: name
				};
			});
			var tree = new Tree(store, id, entries);
			callback(tree, null);
		}
	});
}

/**
 * Save a file blob into the object store asynchronously.
 * Git filters are not used; raw data from your stream will go
 * in whee!
 *
 * Callback will receive the object id of the stored blob, or
 * else null and an error message.
 *
 * The blob won't be referenced by anything until you save
 * trees and commits, so don't forget to fill out your stuff.
 *
 * @param {Stream} stream
 * @param {function(id, err)} callback
 */
Store.prototype.createBlobFromStream = function(stream, callback) {
	stream.pipe(this.writeGitStream(['hash-object', '-w', '--stdin'], callback));
};

/**
 * Save a file blob into the object store asynchronously.
 * Git filters are not used; raw data from your stream will go
 * in whee!
 *
 * Callback will receive the object id of the stored blob, or
 * else null and an error message.
 *
 * The blob won't be referenced by anything until you save
 * trees and commits, so don't forget to fill out your stuff.
 *
 * @param {mixed} data
 * @param {function(id, err)} callback
 * @param {string} format one of 'buffer', 'string', 'json', 'xml', 'auto'
 */
Store.prototype.createBlob = function(data, callback, format) {
	this.writeGitStream(['hash-object', '-w', '--stdin'], callback).end(makeBlob(data));
};

/**
 * Save a directory tree snapshot into the object store asynchronously.
 *
 * Callback will receive the object id of the stored blob, or
 * else null and an error message.
 *
 * The tree won't be referenced by anything until you save parent
 * trees and commits, so don't forget to fill out your stuff.
 *
 * @param {object[]} entries: array of {mode, type, id, name} maps
 * @param {function(id, err)} callback
 */
Store.prototype.createTree = function(entries, callback) {
	var lines = [];
	entries.forEach(function(meta) {
		var line = '';
		line += meta.mode;
		line += ' ';
		line += meta.type;
		line += ' ';
		line += meta.id;
		line += '\t';
		line += meta.name;
		lines.push(line);
	});
	var treeData = lines.join('\n');
	var stream = this.writeGitStream(['mktree'], callback);
	stream.end(treeData);
};

/**
 * Save a directory tree snapshot into the object store asynchronously.
 *
 * Callback will receive the object id of the stored blob, or
 * else null and an error message.
 *
 * The tree won't be referenced by anything until you save parent
 * trees and commits, so don't forget to fill out your stuff.
 *
 * @param {object} props: {tree, parents, author, description} maps
 * @param {function(id, err)} callback
 */
Store.prototype.createCommit = function(props, callback) {
	var lines = [];
	var args = ['commit-tree', props.tree];
	props.parents.forEach(function(id) {
		args.push('-p');
		args.push(id);
	});
	// @fixme set the author props and such; currently they'll use environment or user settings
	var stream = this.writeGitStream(args, callback);
	stream.end(props.description);
};

/**
 * Call a git command and return the child process wrapper.
 *
 * If process exits with an error, the stderr output is returned
 * as a string via the 'error' event sent to the stdout, as a
 * usually convenient helper.
 *
 * @param {String[]} args
 * @return {ChildProcess}
 * @access private
 */
Store.prototype.callGit = function(args) {
	var proc = require('child_process').spawn('git', args);
	var err = '';
	proc.stderr.setEncoding('utf8');
	proc.stderr.on('data', function(str) {
		err += str;
	});
	proc.on('error', function(err) {
		proc.stdout.emit('error', err);
	});
	proc.on('exit', function(code) {
		if (code != 0) {
			// Pass error on to the reader.
			console.log('Error code out! ' + err);
			proc.stdout.emit('error', 'Error: ' + err);
		}
	});
	return proc;
}

/**
 * Read something from a git command as a stream.
 *
 * If process exits with an error, the stderr output is returned
 * as a string via the 'error' event.
 *
 * @param {String[]} args
 * @return {Stream}
 * @access private
 */
Store.prototype.readGitStream = function(args) {
	return this.callGit(args).stdout;
}

/**
 * Read something from a git command line as a UTF-8 string,
 * returning the whole lot as a chunk to the callback.
 *
 * @param {String[]} args
 * @param {function(str, err)} callback
 * @access private
 */
Store.prototype.readGitString = function(args, callback) {
	var stream = this.readGitStream(args);
	var str = '';
	stream.setEncoding('utf8');
	stream.on('data', function(chunk) {
		str += chunk;
	});
	stream.on('end', function() {
		// wait... will this get called on failure too?
		callback(str, null);
	});
	stream.on('error', function(err) {
		callback(null, err);
	});
}


/**
 * Call a git command, set it up for an object creation operation,
 * and return the stream for feeding it input.
 *
 * @param {String[]} args
 * @param {function(id, err)} callback
 * @return {Stream}
 * @access private
 */
Store.prototype.writeGitStream = function(args, callback) {
	var proc = this.callGit(args)
	var str = '';

	proc.stdout.setEncoding('utf8');
	proc.stdout.on('data', function(chunk) {
		str += chunk;
	});
	proc.on('exit', function(code) {
		var id = str.replace(/\s/g, '');
		if (code != 0) {
			callback(id, "Non-zero exit: " + code);
		} else if (id) {
			callback(id, null);
		} else {
			callback(id, "No id? Store failed.");
		}
	});
	proc.on('error', function(err) {
		callback(null, err);
	});
	return proc.stdin;
};

/**
 * Base class for git-like versioned data store objects.
 */
function StoreObject(store, id) {
	this.store = store;
	this.id = id;
	this.type = null;
}


/**
 * A git commit or branch represents a versioned object tree.
 * It's linked to a tree state snapshot, and to its previous
 * history, in addition to carrying some of its own metadata.
 *
 * @param {Store} store
 * @param {String} id
 * @param {object} props: map of commit properties
 */
function Commit(store, id, props) {
	this.store = store;
	this.type = 'commit';
	this.id = id;
	for (var prop in props) {
		if (props.hasOwnProperty(prop)) {
			this[prop] = props[prop];
		}
	}
}

/**
 * Asynchronously fetch a subtree node from this directory via a callback.
 *
 * @param {function(tree, err)} callback
 */
Commit.prototype.getTree = function(callback) {
	this.store.getTree(this.tree, callback);
};

util.inherits(Commit, StoreObject);

/**
 * A git tree is a node in a linked file tree structure. Each individual
 * tree object represents a snapshot state of the tree and all files in it.
 *
 * It's not possible to travel up the tree; unchanged sections of a file
 * tree will be preserved exactly as-is even if parent dirs change.
 *
 * Given a Tree object, you can make asynchronous requests back to the data
 * store to retrieve files and folders as Blob and Tree objects.
 *
 * @param {Store} store
 * @param {string} id
 * @param {object} entries: map of directory entries
 */
function Tree(store, id, entries) {
	this.store = store;
	this.type = 'tree';
	this.id = id;
	this.children = entries;
}

util.inherits(Tree, StoreObject);

/**
 * Check if a directory entry by filename exists within this level of the tree.
 *
 * @param {String} filename (case-sensitive)
 * @return {boolean}
 */
Tree.prototype.hasFile = function(filename) {
	return (filename in this.children);
};

/**
 * Look up a directory entry by filename within this level of the tree.
 *
 * @param {String} filename (case-sensitive)
 * @param {String} expectedType (optional)
 *
 * @return {object} map with directory entry on success
 * @throws exception on missing entry or mismatched type
 */
Tree.prototype.findFile = function(filename, expectedType) {
	if (!this.hasFile(filename)) {
		throw "Filename \"" + filename + "\" not found in tree " + this.id;
	}
	var meta = this.children[filename];
	if (expectedType && meta.type != expectedType) {
		throw "File \"" + filename + "\" in tree " + this.id + " is a " + meta.type + ", expected blob.";
	}
	return meta;
};

/**
 * Asynchronously fetch a file blob from this directory via a callback.
 *
 * @param {String} filename
 * @param {function(data, err)} callback
 * @param {String} format: optional 'buffer', 'string', 'json', 'xml', or 'auto'
 * @throws exception if no valid blob file entry
 */
Tree.prototype.getBlob = function(filename, callback, format) {
	var meta = this.findFile(filename, 'blob');
	this.store.getBlob(meta.id, callback, format);
};

/**
 * Start reading a file blob from this directory tree as an async stream.
 *
 * @param {String} filename
 * @return {Stream}
 * @throws exception if no valid blob file entry
 */
Tree.prototype.streamBlob = function(filename) {
	var meta = this.findFile(filename, 'blob');
	return this.store.streamBlob(meta.id)
};

/**
 * Asynchronously fetch a subtree node from this directory via a callback.
 *
 * @param {String} filename
 * @param {function(tree, err)} callback
 * @throws exception if no valid blob file entry
 */
Tree.prototype.getTree = function(filename, callback) {
	var meta = this.findFile(filename, 'tree');
	this.store.getTree(meta.id, callback);
};


/**
 * A git blob object represents a particular static file version's data, as
 * saved into the versioning object store.
 *
 * Metadata such as filenames is stored in Tree objects that reference these
 * blobs.
 *
 * @param {Store} store
 * @param {String} id
 * @param {Buffer} data
 */
function Blob(store, id, data) {
	this.store = store;
	this.type = 'blob';
	this.id = id;
	this.data = data;
}

/**
 * Read blob contents as a UTF-8 string. May fail horribly if not valid.
 */
Blob.prototype.asString = function() {
	return this.data.toString('utf8');
};

/**
 * Decode blob contents as a JSON string. May fail horribly if not valid.
 */
Blob.prototype.asObject = function() {
	return JSON.parse(this.asString());
};

util.inherits(Blob, StoreObject);



exports.Store = Store;
exports.Commit = Commit;
exports.Tree = Tree;
exports.Blob = Blob;
exports.create = function( options ) {
	return new Store( options );
};


if (module.parent === null) {
	var store = new Store();

	console.log("store.js testing interface!");

	var args = process.argv.slice(2);
	if (args.length == 0) {
		args = ['--help'];
	}

	var createCallback = function(id, err) {
		if (err) {
			console.log("Error: " + err);
			process.exit(1);
		} else {
			console.log("Success: " + id);
			process.exit(0);
		}
	};

	if (args[0] == 'create-blob') {
		console.log("Saving blob from stdin...");

		store.createBlobFromStream(process.stdin, createCallback);
		process.stdin.resume();
	} else if (args[0] == 'read-blob') {
		if (args.length < 2) {
			console.log('Usage: read-blob <id>');
			process.exit(1);
		}
		var stream = store.streamBlob(args[1]);
		stream.on('error', function(err) {
			console.log('Error reading: ' + err);
			process.exit(1);
		});
		stream.on('end', function() {
			process.exit(0);
		});
		stream.pipe(process.stdout);
	} else if (args[0] == 'get-blob') {
		if (args.length < 2) {
			console.log('Usage: get-blob <id> [<type>]');
			process.exit(1);
		}
		var id = args[1];
		var type = undefined;
		if (args.length > 2) {
			type = args[2];
		}
		console.log('Fetching ' + id + ' as ' + type);
		store.getBlob(id, function(data, err) {
			if (err) {
				console.log('Error: ' + err);
				process.exit(1);
			} else {
				console.log('Success!');
				console.log(data);
				process.exit(0);
			}
		}, type);
	} else if (args[0] == 'create-tree') {
		if (args.length < 3) {
			console.log('Usage: create-tree <filename> <blob id>');
			process.exit(1);
		}
		store.createTree([
			{mode: '100644', type: 'blob', id: args[2], name: args[1]}
		], createCallback);
	} else if (args[0] == 'commit-tree') {
		if (args.length < 2) {
			console.log('Usage: commit-tree <tree id> [<desc>]');
			process.exit(1);
		}
		store.createCommit({
			tree: args[1],
			parents: [],
			description: (args.length > 2) ? args[2] : 'committed'
		}, createCallback);
	} else {
		console.log('Actions: create-blob, read-blob, get-blob, create-tree, commit-tree');
		process.exit(1);
	}
}
