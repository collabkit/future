/* Requirements */

var fs = require( 'fs' ),
	path = require( 'path' ),
	grout = require( '../shared/grout' ),
	logger = require( './logger' ).create( 'ModuleIndex' );

/* Functions */

/**
 * Creates a ModuleIndex object.
 * 
 * @param {Mixed} dirs Array of multiple directories to scan, or String of single directory to scan
 * @type {ModuleIndex} New ModuleIndex object.
 */
function create( dirs ) {
	return new ModuleIndex( dirs );
};

/* Classes */

/**
 * JavaScript module index.
 * 
 * @param {Mixed} dirs Array of multiple directories to scan, or String of single directory to scan
 */
function ModuleIndex( dirs ) {
	this.modules = {};
	if ( grout.typeOf( dirs ) === 'array' ) {
		for ( var i = 0; i < dirs.length; i++ ) {
			this.scan( dirs[i] );
		}
	} else if ( grout.typeOf( dirs ) === 'string' ) {
		this.scan( dirs );
	}
}

/**
 * Looks for valid modules within a directory and adds them to the index.
 * 
 * A valid module is one of the following:
 *     * A JavaScript file
 *     * A folder containing a JavaScript file named index.js
 *     * A folder containing a JSON file named package.json, containing a "main" property when
 *       parsed which specifies where a JavaScript file is
 * 
 * Searching is not performed recursively.
 * 
 * @param {String} dir Directory to scan
 */
ModuleIndex.prototype.scan = function( dir ) {
	var index = this;
	fs.readdir( dir, function( err, files ) {
		grout.apply( files, function( file ) {
			var base = path.join( dir, file );
			var stats = fs.statSync( base );
			if ( stats.isDirectory() ) {
				var pkg = path.join( base, 'package.json' );
				if ( path.existsSync( pkg ) ) {
					var info = JSON.parse( fs.readFileSync( pkg, 'utf8' ) );
					if ( 'main' in info ) {
						var main = path.join( base, info.main );
						if ( path.existsSync( main ) ) {
							index.add( file, { 'path': base, 'main': main } );
						} else {
							logger.warn( 'Missing module main file: ' + main );
						}
					}
				} else {
					var main = path.join( base, 'index.js' );
					if ( path.existsSync( main ) ) {
						index.add( file, { 'path': base, 'main': main } );
					}
				}
			} else if ( stats.isFile() && path.extname( file ) === '.js' ) {
				file = path.basename( file, '.js' );
				index.add( file, {
					'path': path.join( dir, path.dirname( file ), file ),
					'main': base
				} );
			}
		} );
	} );
};

/**
 * Adds module to index.
 * 
 * @param {String} name Name of module
 * @param {Object} module Module information
 */
ModuleIndex.prototype.add = function( name, module ) {
	logger.trace( 'Adding module: ' + name );
	this.modules[name] = module;
};

/**
 * Removes module from index.
 * 
 * @param {String} name Name of module
 */
ModuleIndex.prototype.remove = function( name ) {
	logger.trace( 'Removing module: ' + name );
	delete this.modules[name];
}

/**
 * Checks if module exists in index.
 * 
 * @param {String} name Name of module
 */
ModuleIndex.prototype.exists = function( name ) {
	return name in this.modules;
}

/**
 * Gets module information.
 * 
 * @param {String} name Name of module
 * @type {Mixed} Module information object, or null if module does not exist
 */
ModuleIndex.prototype.get = function( name ) {
	return name in this.modules ? this.modules[name] : null;
}

/* Exports */

exports.ModuleIndex = ModuleIndex;
exports.create = create;
