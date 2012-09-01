Approximate Route
=================

* Convert l10n.js to nodejs module format.
* Split off the platform-independent code, and keep it here.
* Define an API for the base library.
* Do the tricky stuff to make it work.
* Write some test code for the base library.
(DONE)
* Define an API for platform adapters (file and browser).
* Write a browser adapter.
* Write some simple test code for the browser.
* Clean things up, document it, and push to github.

Once this is done, I can start integrating with dynamictemplate and the webclient:
* Write a dynamictemplate browser (dt-dom) localisation plugin, and test this with the twelve days app.
* Should then be ready to do the buddycloud webclient.
* At some point, maybe write a file adapter?

API of the base library
=======================

The current API is like this:
  * get: function(key, args, fallback)
  * getData: function() - debug: return the dictionary
  * getText: function() - debug.
  * ~ getLanguage: function() - get current lang
  * ~ setLanguage: function(lang) - set current lang.
  * getDirection: function() 
  * ~ translate: function(element)
  * getReadyState: function()

Out of these, the ones marked with ~ are browser-dependent. So put the others into the public API for the library, along with two other functions:

  * init: function(resourceLoader) - init the library, and set a resource loader function, which looks like function(path, onSuccess, onFailure, asynchronous).
  * loadResource(path, language) - use the loader function to load a resource file.

Adapter API
===========

The adapter just needs to define a loader function and initialise itself (e.g. for the browser adapter, it should get the base path from the URL by default). l10n should know how to get the loader function from the adapter.

could do it this way:
```
  l10n = require('l10n');
  l10n-browser = require('l10n-browser');

  l10n.init(l10n-browser);
  // i.e. l10n.init expects an adapter object, which it knows has a member 'loader'
```

another way would be more like dynamictemplate:
```
  L10n = require('l10n');
  L10n-browser = require('l10n-browser');

  l10n = new L10n(new L10n-browser());
  // i.e. both modules export a class with a constructor. This would allow you to pass args to the adapter in its constructor.

  function success() {
    console.log("loaded resources");
    console.log(l10n.get('token',{'arg':value},'fallback'));
    }

  l10n.loadResource('data.properties', navigator.language, success, false);
```

Implementing the second method.


Current Structure
=================
The browser-independent code consists of:
* var gL10nData - dictionary of parsed token rules. (For the current language I think. No caching of locale files atm.)
* var gTextData
* var gTextProp
* var gLanguage - the current language.
* var gMacros - dictionary of macros. These are just used to handle plurals atm.
* var gReadyState - state of program?
* var gAsyncResourceLoading - set whether to load resources async.
* var gDebug - in debug mode?
* consoleLog(message) - log to the console if debug on. Can stay the same (but should be in the browser bit as well)
* consoleWarn(message) - warn to the console if debug on. Can stay the same but ditto.
* parseResource(href, lang, successCallback, failureCallback) - this can stay mostly the same, apart from loadResource. There needs to be an API call to set the loader function.
* loadResource(url, onSuccess, onFailure, asynchronous) - included in parseResource atm, but will be passed in by the calling code in some way. Keep the interface the same.
* clear() - clear all l10n data. Can stay the same.
* getPluralRules(lang) - get the plural rules for a language. Can stay the same. Includes some utility functions and the list of rules per locale.
* gMacros.plural = function(str, param, key, prop) - macro for handling plurals. Can stay the same.
* getL10nData(key, args) - get the translated string for a key, having applied the arguments. Can stay the same.
* substIndexes(str, args, key, prop) - substitute macros in a translated string. Can stay the same.
* substArguments(str, args) - substitute included arguments in a translated string. Can stay the same.


Browser-dependent functions:
* loadLocale(lang,callback) - parses the document headers and loads all the included resource links.
* translateElement(element) - translate an html element.
* translateFragment(element) - translate an html subtree.
* There''s a load of browser-dependent stuff at the end, which deals with initialising the library and attaching it to the document object.
