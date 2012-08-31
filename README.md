node-l10n
=========

A localisation module for nodejs based on <https://github.com/fabi1cazenave/webL10n>. This is the core translation engine only, ported to nodejs in a way that is platform-neutral. The browser-dependent code will go into node-l10n-browser (TODO).

See test/test.js for the API. (will write this up properly later).

Results from the test:

```
[andy@monkey test]$ node test.js 

Testing in language: en
=======================

Standard version:
   No quick brown foxes jumped over the lazy dog.
   A quick brown fox jumped over the lazy dog.
   2 quick brown foxes jumped over the lazy dog.
   3 quick brown foxes jumped over the lazy dog.

Testing parameter substitution:
   No quick pink foxes jumped over the lazy dog.
   A quick pink fox jumped over the lazy dog.
   2 quick pink foxes jumped over the lazy dog.
   3 quick pink foxes jumped over the lazy dog.

Testing in language: de
=======================

Standard version:
   Keine schnelle braune Fuchsen sprang über den faulen Hund.
   Eine schnelle braune Fuchs sprang über den faulen Hund.
   2 schnelle braune Fuchsen sprang über den faulen Hund.
   3 schnelle braune Fuchsen sprang über den faulen Hund.

Testing parameter substitution:
   Keine schnelle rosa Fuchsen sprang über den faulen Hund.
   Eine schnelle rosa Fuchs sprang über den faulen Hund.
   2 schnelle rosa Fuchsen sprang über den faulen Hund.
   3 schnelle rosa Fuchsen sprang über den faulen Hund.
```
