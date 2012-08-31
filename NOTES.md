Approximate Route
=================

* Convert l10n.js to nodejs module format.
* Test it as simply as possible.
* Split off the platform-independent code, and keep it here.
* Move the browser code to the browser adapter module (node-l10n-browser.)
* Find a way to integrate the two halves. This module should just handle reading locale files, and translating tokens to their correct form. The browser module should have a similar API to webL10n, but with the ability to separate the locale loading stage from the translation stage. (I.e. generate two events, and make the second stage optional)
* The interface between the two halves is up to me - it''s the browser adapter that I want to behave like the original. In order to handle includes, I''ll probably need to pass a resource loader function from the browser adapter to the core module?
* Write some simple test code for the browser.
* Then write the dynamictemplate browser (dt-dom) plugin, and test this with the twelve days app.
* Clean things up, and document it.
* Should then be ready to do the buddycloud webclient.
* At some point, maybe write a file adapter?

API
===
The browser-independent code consists of:
* var gL10nData - dictionary of parsed token rules. (For the current language I think. No caching of locale files atm.)
* var gTextData
* var gTextProp
* var gLanguage - the current language.
* var gMacros - dictionary of macros. These are just used to handle plurals atm.
* var gReadyState - state of program?
* var gAsyncResourceLoading - set whether to load resources async.
* var gDebug - in debug mode?
* consoleLog(message) - log to the console if debug on.
* consoleWarn(message) - warn to the console if debug on.
* parseResource(href, lang, successCallback, failureCallback) - this can stay mostly the same, apart from loadResource. There needs to be an API call to set the loader function.
* loadResource(url, onSuccess, onFailure, asynchronous) - included in parseResource atm, but will be passed in by the calling code in some way.
* clear() - clear all l10n data. Can stay the same.
* getPluralRules(lang) - get the plural rules for a language. Can stay the same. Includes some utility functions and the list of rules per locale.
* gMacros.plural = function(str, param, key, prop) - macro for handling plurals. 
* getL10nData(key, args) - get the translated string for a key, having applied the arguments.
* substIndexes(str, args, key, prop) - substitute macros in a translated string.
* substArguments(str, args) - substitute included arguments in a translated string.


Browser-dependent functions:
* loadLocale(lang,callback) - parses the document headers and loads all the included resource links.
* translateElement(element) - translate an html element.
* translateFragment(element) - translate an html subtree.
* There''s a load of browser-dependent stuff at the end, which deals with initialising the library and attaching it to the document object.
