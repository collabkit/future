# Localizr

Message system for i18n/L10n.

    var lang = require( './lib/localizr' ).createLanguage( 'en' );
    
    lang.setMessages( {
    	'greeting': 'Hello $1.',
    } );
    
    var greetingText = lang.getMessage( 'greeting', ['John'] );