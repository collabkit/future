/**
 * Grout - the in-between bits we all need
 * 
 * @author Trevor Parscal <trevorparscal@gmail.com>
 * @license Apache v2
 */

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
	if ( typeof item === 'function' && typeof item.__model === 'object' ) {
		return 'class';
	}
	return typeof item;
}

/**
 * Call a function on each member of an object.
 * 
 * @param over Object: Object to call function on
 * @param call Function: Function to call on each member; takes 3 arguments, value, index, and data
 * @param data Mixed: Additional data to pass to the function (optional)
 */
function apply( over, call, data ) {
	for ( var i in over ) {
		if ( over.hasOwnProperty( i ) ) {
			call.call( over, over[i], i, data ) ;
		}
	}
}

/**
 * Mixes one or more objects together to create a new object.
 * 
 * @param into Object: First object to mix, which will be modified!
 * @param objects Object: One or more objects to copy members from (variadic)
 * @return Object: Mixed object, a reference to the into parameter
 */
function mix( into ) {
	for ( var i = 1; i < arguments.length; i++ ) {
		var from = arguments[i];
		if ( typeOf( from ) === 'object' ) {
			for ( var prop in from ) {
				if ( from.hasOwnProperty( prop ) ) {
					if ( typeOf( from[prop] ) === 'object' ) {
						into[prop] = mix( into[prop] || {}, from[prop] );
					} else {
						into[prop] = from[prop];
					}
				}
			}
		}
	}
	return into;
}

/**
 * Creates a class constructor from a model definition.
 * 
 * Model objects contain one or more of the following members:
 * 
 * Inheritance:
 *     'is': [ list of classes to inherit ]
 * Properties:
 *     'has': {
 *         // List of property names and their default values
 *         'property name': 'initial property value',
 *         ...
 *     }
 * Methods:
 *     'can': {
 *         // List of method names and their functions; functions are wrapped so that "this" is
 *         // always a reference to the object
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
 *     // Implicit target (class is created in global scope)
 *     Class( 'Plant', {
 *         'has': {
 *             'height': 0,
 *         },
 *         'can': {
 *             'initialize': function( height ) {
 *                 if ( typeof( height ) === 'number' ) {
 *                     this.height = height;
 *                 }
 *             },
 *             'grow': function( height ) {
 *                 this.height += height;
 *             }
 *         }
 *     } );
 *     var plant = new Plant( 1 );
 *     plant.grow( 1 );
 *     // plant.height is now 2
 *     
 *     // Explicit target (class is created in a specific scope)
 *     Class( plant, 'Tree', {
 *         'is': Plant, // this can be an array if there's more than one parent, last one wins!
 *         'can' {
 *             'fallOver': function() {
 *                 this.height /= 100;
 *             }
 *         }
 *     } );
 *     var tree = new plant.Tree( 100 );
 *     tree.fallOver();
 *     // tree.height is now 1
 * 
 * @param target Object: Object to export class to (optional, defaults to global scope)
 * @param name String: Name to use when exporting class
 * @param model Object: Model to create class from
 */
function Class( target, name, model ) {
	if ( typeOf( target ) === 'string' && typeOf( name ) === 'object' ) {
		// Shift model and name arguments up and use window as target
		model = name;
		name = target;
		target = window;
	}
	if ( 'is' in model ) {
		if ( typeOf( model.is ) !== 'array' ) {
			model.is = [model.is];
		}
		for ( var i = 0; i < model.is.length; i++ ) {
			if ( '__model' in model.is[i] ) {
				var parent = model.is[i].__model;
				if ( 'has' in parent ) {
					model.has = mix( {}, parent.has, model.has || {} );
				}
				if ( 'can' in parent ) {
					model.can = mix( {}, parent.can, model.can || {} );
				}
			}
		}
	}
	target[name] = function () {
		if ( 'has' in model ) {
			apply( model.has, function ( val, key, that ) {
				switch ( typeOf( val ) ) {
					case 'function':
						that[key] = val();
						break;
					case 'object':
						that[key] = mix( {}, val );
						break;
					default:
						that[key] = val
				}
			}, this );
		}
		if ( 'can' in model ) {
			apply( mix( {}, Class.generic, model.can ), function ( fn, key, that ) {
				if ( key !== 'initialize' ) {
					that[key] = function () {
						return fn.apply( that, Array.prototype.slice.call( arguments ) );
					};
				}
			}, this );
			if ( 'initialize' in model.can ) {
				model.can.initialize.apply( this, Array.prototype.slice.call( arguments ) );
			}
		}
	};
	target[name].__model = model;
	target[name].__className = name;
}
/**
 * List of generic methods to be attached to all instantiated objects.
 */
Class.generic = {
	/**
	 * Gets a method from another class for use within this object's context.
	 * 
	 * Example:
	 *     Class( 'Berry', {
	 *         'has': {
	 *             'weight': 0
	 *         },
	 *         'can': {
	 *             'initialize': function( weight ) {
	 *                 this.weight = weight;
	 *             }
	 *         }
	 *     } );
	 *     Class( 'Avacado', {
	 *         'is': Berry,
	 *         'can': {
	 *             'initialize': function( weight ) {
	 *                 this.__use( Berry, 'initialize' )( weight );
	 *             }
	 *         }
	 *     } );
	 * 
	 * @param parent Object: Class to use method from
	 * @param method String: Name of method to use
	 * @return args Array: List of arguments to pass to the method
	 */
	'__use': function( parent, method ) {
		if ( typeOf( parent ) !== 'class' ) {
			throw 'Invalid class error.';
		}
		if ( !( method in parent.__model.can ) ) {
			throw 'Missing method error.';
		}
		var that = this;
		return function() {
			parent.__model.can[method].apply( that, Array.prototype.slice.call( arguments ) );
		};
	}
};
