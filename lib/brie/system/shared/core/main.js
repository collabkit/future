/**
 * CollabKit Core Module
 * 
 * Collection of basic building blocks.
 */

function iterate( object, fn ) {
	for ( var i in object ) {
		if ( object.hasOwnProperty( i ) ) {
			fn.call( object, object[i], i ) ;
		}
	}
};

function merge( from, into ) {
	for ( var i in from ) {
		if ( from.hasOwnProperty( i ) ) {
			into[i] = from[i];
		}
	}
};

exports.createClass = function ( model ) {
	if ( 'is' in model ) {
		for ( var i = 0; i < model.is.length; i++ ) {
			if ( '__model' in model.is[i] ) {
				var parent = model.is[i].__model;
				if ( 'has' in parent ) {
					merge( parent.has, model.has );
				}
				if ( 'can' in parent ) {
					merge( parent.can, model.can );
				}
			}
		}
	}
	var result = function () {
		var that = this,
			has = {},
			can = {};
		if ( 'has' in model ) {
			iterate( model.has, function ( v, i ) {
				has[i] = v;
				that[i] = function( value ) {
					return typeof value !== 'undefined' ? has[i] = value : has[i];
				};
			} );
		}
		if ( 'can' in model ) {
			iterate( model.can, function ( f, i ) {
				can[i] = f;
				that[i] = function () {
					return can[i].apply( that, Array.prototype.slice.call( arguments ) );
				};
			} );
		}
		if ( 'can' in model && 'initialize' in model.can ) {
			model.can.initialize.apply( this, Array.prototype.slice.call( arguments ) );
		}
	}
	result.__model = model;
	return result;
};
