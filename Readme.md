# The Future (of CollabKit)

This repository contains a collection of experimental prototypes.

## Chameleon

Template processor for full/partial HTML pages.

* Define and apply templates within a file
* Render HTML using an plain object as a context
    * Scoping, like JavaScript's with statement but less evil
    * Iteration, somewhat like XSL's <xsl:for-each>...</xsl:for-each>
    * Output, escaped or raw, sort of like XSL's <xsl:value-of />
    * Attributes, set/append, like XSL's <xsl:attribute /> only sweeter
* Use a callback for localization lookups
    * Arguments, pass data from the template into messages
* Minify HTML
    * Cleaning, whitespace and comments go bye bye
    * Protection, sensitive elements and IE conditional comments are treated nicely

## Localizr

Message system for i18n/L10n.

* Set/get messages per-language
* Apply arguments to messages with $1, $2, etc.