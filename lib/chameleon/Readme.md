# Chameleon

Chameleon is an HTML processor that can render finished HTML content from a specially annotated full or partial HTML page, a JavaScript "context" object and a message callback. It's designed to be portable to the client, currently relying on JSDom, but potentially using any web browser's DOM implementation. Rendered HTML can be "cleaned", removing all non-functional whitespace and comments while still preserving HTML elements that are whitespace sensitive, like `textarea` and `pre`, as well as conditional comments used by Internet Explorer.

## Rendering pages

Either strings of HTML data or HTML files can be rendered. When rendering files, synchronous rendering is optional.

    var chameleon = require( './lib/chameleon' );
    // From string
    res.send( chameleon.render( '<h1><var:text from="foo"/></h1>', { /* options */ } ) );
    // From file, synchronous
    res.send( chameleon.renderFileSync( 'page.html', { /* options */ } ) );
    // From file, asynchronous
    chameleon.renderFile( 'page.html', { /* options */ }, function( html ) {
        res.send( html );
    } );

### Rendering options 

The options passed to a render call may contain:

* `context` A JavaScript object from which var:* elements will query
* `msg` A callback function which will be called when rendering for msg:* elements, taking a message key string and arguments array
* `clean` Boolean value for cleaning non-functional whitespace and comments.

### Context objects

A context object is a simple JavaScript object containing strings, numbers, arrays and other objects. These members are selected using queries which look just like JavaScripts regular object notation, with a couple of special cases.

### Message callbacks

Any i18n/L10n system can be used by providing a wrapper function as a callback for message rendering. The function will be given two parameters, a string containing the message key and an array of arguments and should return the rendered message.

    function msgCallback( key, args ) {
        return myLocalizationSystem.get( key, args );
    }

## Creating pages

Full or partial HTML pages can be rendered. Rendering is a process of replacing special XML elements within an HTML page with text and HTML based on the data input, called the context, and message rendering provided by the message callback.

### Templates

The first pass during processing is template definition and application.

    <!-- Defines the "hello" template -->
    <tpl:define template="hello">
    	<p>Hello <var:text from="name" /></p>
    </tpl:define>
    
    <!-- Applies the "hello" template -->
    <tpl:apply template="hello" />

#### Definition

* `<tpl:define template="[name]"></tpl:define>` Child elements will be stored, unevaluated, for later application.

#### Application

* `<tpl:apply template="[name]" />` Stored elements for this template will be injected.

### Variables

    <!-- Changes the scope to .library -->
    <var:go to="library">
        <!-- Outputs .library.name as a heading -->
        <h1><var:text from="name" /></h1>
        <ul>
            <!-- Iterates over each book in .library.books -->
	        <var:go through="books">
                <!-- Outputs .library.books[].title as a list item -->
	            <li><var:text from="title" /></li>
	        </var:go>
        <ul>
    </var:go>

The second pass during processing is variable scoping, iteration and output. Variables are identified by queries, which are similar to accessing objects in JavaScript with the addition of two special cases. If a query is prefixed with `.` then it is always run against the root data object. If a query is only `@` than it selects the current object.

#### Scope

Object structures can be scoped, similar to how the with() statement works in JavaScript.

* `<var:go to="[query]"></var:go>` Queries made by child elements will be based on the results of this query

#### Iteration

* `<var:go through="[query]"></var:go>` Child elements will be rendered once for each element in the array selected by this query, and queries made by child elements will be based on the value of the current iteration.

#### Output

Output can be either escaped, raw or set as the value of an attribute on the parent element. In the case of attribute output, if the parent element already has an attribute of the same name, the existing value will be replaced unless the `append` flag is set, in which case it will be appended using a single space delimiter.

* `<var:text from="[query]" />` Escaped variable text will be output
* `<var:html from="[query]" />` Raw variable HTML will be output
* `<var:attr set="[attr]" from="[query]" />` Variable text will be set as parent element attribute
* `<var:attr set="[attr]" from="[query]" append />` Parent attributes will be appended if existent

### Messages

The final pass during processing is message output. Messages are identified by keys, which depending on your message system may be a canonical text or a generic key to identify the message.

    <!-- Outputs the "greeting" message, passing "John" as a parameter -->
    <msg:text from="greeting">
        <msg:arg>John</msg:arg>
    </msg:text>

#### Output

See variable documentation for more information about the different kinds of output, as they work identically.

* `<msg:text from="[key]" />` Escaped message text will be output
* `<msg:html from="[key]" />` Raw message HTML will be output output
* `<msg:attr set="[attr]" from="[key]" />` Message text will be set as parent element attribute
* `<msg:attr set="[attr]" from="[key]" append />` Parent attributes will be appended if existent

#### Arguments

Any of the message output elements may contain one or more child `<msg:arg />` elements. The HTML contents of these elements will be passed as arguments into the message when rendering it.

* `<msg:arg>[value]</msg:arg>` The HTML content of each argument will be passed, in the order they appear, to the message as parameters.
