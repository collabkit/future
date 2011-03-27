/**
 * Grout - the in-between bits we all need
 * 
 * @author Trevor Parscal <trevorparscal@gmail.com>
 * @license Apache v2
 */

/* Functions */

/**
 * Gets the type of something as a string.
 * 
 * 'function'   Function       Constructed function
 *              function() {}  Declared function
 * 'arguments'  arguments      Arguments within function
 * 'object'     Object         Constructed object
 *              {}             Declared object
 * 'array'      Array          Constructed array
 *              []             Declared array
 * 'null'       null           Null object
 * 'number'     Number         Constructed number
 *              0              Declared integer
 *              0.0            Declared float
 * 'string'     String         Constructed string
 *              ''             Declared string
 * 'boolean'    Boolean        Constructed boolean
 *              true           Declared boolean
 *              false          Declared boolean
 * 'undefined'  undefined      Undefined value
 * 
 * @param item Mixed: Item to get the type name of
 * @returns String: Name of type of item
 */
function typeOf( item ) {
	if ( typeof item === 'object' ) {
		if ( item === null ) {
			return 'null';
		}
		if ( item.constructor.toString().indexOf( 'Array' ) >= 0 ) {
			return 'array';
		}
		if ( item.constructor.toString().indexOf( 'String' ) >= 0 ) {
			return 'string';
		}
		if ( item.constructor.toString().indexOf( 'Boolean' ) >= 0 ) {
			return 'boolean';
		}
		if ( item.constructor.toString().indexOf( 'Number' ) >= 0 ) {
			return 'number';
		}
		if ( typeof item.length == 'number' && 'callee' in item ) {
			return 'arguments';
		}
		return 'object';
	}
	return typeof item;
}

exports.typeOf = typeOf;

/**
 * Call a function on each member of an object.
 * 
 * @param over Object: Object to call function on
 * @param call Function: Function to call on each member; takes 3 arguments, value, index, and data
 * @param data Mixed: Additional data to pass to the function (optional)
 */
function iterate( over, call, data ) {
	for ( var i in over ) {
		if ( over.hasOwnProperty( i ) ) {
			call.call( over, over[i], i, data ) ;
		}
	}
}

exports.iterate = iterate;

/**
 * Merge members from one object into another.
 * 
 * @param from Object: Object to copy members from
 * @param into Object: Object to copy member into
 */
function merge( from, into ) {
	for ( var i in from ) {
		if ( from.hasOwnProperty( i ) ) {
			if ( typeof from[i] === 'object' ) {
				into[i] = clone( from[i] );
			} else {
				into[i] = from[i];
			}
		}
	}
}

exports.merge = merge;

/**
 * Creates a deep copy of an object.
 * 
 * @param from Object: Object to clone
 * @returns Object: Cloned object
 */
function clone( from ) {
	var to = typeOf( from ) === 'array' ? [] : {};
	merge( from, to );
	return to;
}

exports.clone = clone;

/**
 * Creates a class constructor from a model definition.
 * 
 * Model objects contain one or more of the following members:
 * 
 * Inheritance:
 *     'is': [ list of classes to inherit ]
 * Properties:
 *     'has': {
 *         // Property becomes a getter/setter function
 *         'property name': 'initial property value',
 *         ...
 *     }
 * Methods:
 *     'can': {
 *         // Method is wrapped so that "this" is always a reference to the object
 * 	       'method name': function() { ... },
 *         ...
 *     }
 * 
 * The resulting class constructor has a member named __model containing a reference to the model
 * object provided upon creating the class. This is used internally for inheritance and should not
 * be depended on externally.
 * 
 * An initialized object using a class created using this function will have properties implemented
 * as getter/setter functions in addition to methods. Getter/setter function are used for simple
 * information storage of values and are read by passing no arguments or written by passing a value.
 * A special function called initialize can be defined, and will be executed during construction.
 * 
 *     var Plant = createClass( {
 *         'has': {
 *             'height': 0,
 *         },
 *         'can': {
 *             'initialize': function( height ) {
 *                 this.height( height );
 *             },
 *             'grow': function( height ) {
 *                 this.height( this.height() + height );
 *             }
 *         }
 *     } );
 *     var plant = new Plant( 1 );
 *     plant.grow( 1 );
 *     // plant.height() is now 2
 * 
 * @param model Object: Model to create class from
 * @returns Function: Class constructor
 */
function createClass( model ) {
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
}

exports.createClass = createClass;
