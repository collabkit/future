/**
 * Implementation of EventEmitter for the browser, based on NodeJS's events.EventEmitter.
 * 
 * @license Apache v2
 */

Class( exports, 'EventEmitter', {
	'has': {
		'_events': {}
	},
	'can': {
		'emit': function( type ) {
			if ( type === 'error' && !( 'error' in this._events ) ) {
				throw 'Missing error handler error.';
			}
			if ( !( type in this._events ) ) {
				return false;
			}
			var listeners = this._events[type].slice();
			var args = Array.prototype.slice.call( arguments, 1 );
			for ( var i = 0; i < listeners.length; i++ ) {
				listeners[i].apply( this, args );
			}
			return true;
		},
		'addListener': function( type, listener ) {
			if ( typeOf( listener ) !== 'function' ) {
				throw 'Invalid listener error. Function expected.';
			}
			this.emit( 'newListener', type, listener );
			if ( type in this._events ) {
				this._events[type].push( listener );
			} else {
				this._events[type] = [listener];
			}
			return this;
		},
		'on': function( type, listener ) {
			this.addListener( type, listener );
		},
		'once': function( type, listener ) {
			var that = this;
			this.addListener( type, function g() {
				that.removeListener( type, g );
				listener.apply( that, arguments );
			} );
		},
		'removeListener': function( type, listener ) {
			if ( typeOf( listener ) !== 'function' ) {
				throw 'Invalid listener error. Function expected.';
			}
			if ( !( type in this._events ) || !this._events[type].length ) {
				return this;
			}
			var handlers = this._events[type];
			if ( handlers.length == 1 && handlers[0] === listener ) {
				delete this._events[type];
			} else {
				var i = handlers.indexOf( listener );
				if ( i < 0 ) {
					return this;
				}
				handlers.splice( i, 1 );
				if ( handlers.length == 0 ) {
					delete this._events[type];
				}
			}
			return this;
		},
		'removeAllListeners': function( type ) {
			if ( type in this._events ) {
				delete this._events[type];
			}
			return this;
		},
		'listeners': function( type ) {
			return type in this._events ? this._events[type] : [];
		}
	}
} );
