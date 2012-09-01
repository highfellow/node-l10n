node-l10n
=========

A localisation module for nodejs based on <https://github.com/fabi1cazenave/webL10n>. This is the core translation engine only, ported to nodejs in a way that is platform-neutral. The platform-dependent code is in separate adapter modules - <https://github.com/highfellow/node-l10n-file> for the filesystem under nodejs, and <https://github.com/highfellow/node-l10n-file> for the browser.

To use this module, you need to choose an adapter that is suitable for your application. The adapter handles loading localisation resource files; everything else is in this module.

API
===

Initialisation
--------------

The module exports a function object, L10n, which takes an adapter object as its parameter.

```
// load the modules.
var L10n = require('l10n');
var L10n_File = require('../l10n-file.js');

// initialise a new l10n object.
var l10n = new L10n(new L10n_File());
```

Methods
-------

An L10n object has the following methods, for loading resource files, and translating strings.

  * loadResource: function(path, language, successCallback, failureCallback) - Load a language resource - e.g. a properties file. The meaning of 'path' depends on the adapter you are using, and is usually relative to your current path (e.g. an URL).
  * get: function(key, args, fallback) - Return the translation for 'key'. Args contains a dictionary of tokens to replce in the translated string. Fallback is used as the string if no translation is found. This works the same as in webL10n.
  * getDirection: function() - utility function to get the direction of the current language.

Usage
-----

For more information on using 'get', and on the format of the resource files, see: <https://github.com/fabi1cazenave/webL10n>.

For some example code, see the file adapter module <https://github.com/highfellow/node-l10n-file>.

LICENSE
=======

BSD/MIT/WTFPL license. Use at your own risk.
