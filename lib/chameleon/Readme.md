# Chameleon

This is a processor that takes HTML annotated with additional elements, a JavaScript object and a callback function for message rendering and outputs rendered HTML content. it supports templates, variables and messages for i18n/L10n.

## Templates

The first pass during processing is template definition and application.

### Definition

* `<tpl:define template="[name]"></tpl:define>`<br />Child elements will be stored, unevaluated, for later application.

### Application

* `<tpl:apply template="[name]" />`<br />Stored elements for this template will be injected.

## Variables

The second pass during processing is variable scoping, iteration and output. Variables are identified by queries, which are similar to accessing objects in JavaScript with the addition of two special cases. If a query is prefixed with `.` then it is always run against the root data object. If a query is only `@` than it selects the current object.

### Scope

Object structures can be scoped, similar to how the with() statement works in JavaScript.

* `<var:go to="[query]"></var:go>`<br />Queries made by child elements will be based on the results of this query

### Iteration

* `<var:go through="[query]"></var:go>`<br />Child elements will be rendered once for each element in the array selected by this query, and queries made by child elements will be based on the value of the current iteration.

### Output

Output can be either escaped, raw or set as the value of an attribute on the parent element. In the case of attribute output, if the parent element already has an attribute of the same name, the existing value will be replaced unless the `append` flag is set, in which case it will be appended using a single space delimiter.

* `<var:text from="[query]" />`<br />Escaped variable text will be output
* `<var:html from="[query]" />`<br />Raw variable HTML will be output
* `<var:attr set="[attr]" from="[query]" />`<br />Variable text will be set as parent element attribute
* `<var:attr set="[attr]" from="[query]" append />`<br />Parent attributes will be appended if existent

## Messages

The final pass during processing is message output. Messages are identified by keys, which depending on your message system may be a canonical text or a generic key to identify the message.

### Output

See variable documentation for more information about the different kinds of output, as they work identically.

* `<msg:text from="[key]" />`<br />Escaped message text will be output
* `<msg:html from="[key]" />`<br />Raw message HTML will be output output
* `<msg:attr set="[attr]" from="[key]" />`<br />Message text will be set as parent element attribute
* `<msg:attr set="[attr]" from="[key]" append />`<br />Parent attributes will be appended if existent

### Arguments

Any of the message output elements may contain one or more child `<msg:arg />` elements. The HTML contents of these elements will be passed as arguments into the message when rendering it.

* `<msg:arg>[value]</msg:arg>`<br />The HTML content of each argument will be passed, in the order they appear, to the message as parameters.
