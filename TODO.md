== Approximate Route ==

* Convert l10n.js to nodejs module format.
* Test it as simply as possible.
* Split off the platform-independent code, and keep it here.
* Move the browser code to the browser adapter module (node-l10n-browser.)
* Find a way to integrate the two halves. This module should just handle reading locale files from a string, and translating tokens to their correct form. The browser module should have a similar API to webL10n, but with the ability to separate the locale loading stage from the translation stage. (I.e. generate two events, and make the second stage optional)
* Write some simple test code for the browser.
* Then write the dynamictemplate browser (dt-dom) plugin, and test this with the twelve days app.
* Clean things up a bit.
* Should then be ready to do the buddycloud webclient.
