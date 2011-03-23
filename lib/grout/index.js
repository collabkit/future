/**
 * Gets the type of something as a string
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
