/**
 *  Test code for node-l10n.
 **/

l10n = require('../l10n.js');
fs = require('fs');

// run through plurals using a given adjective.
function repeat(adjKey) {
  adj=l10n.get(adjKey,{},'colour');
  for (var n = 0; n < 4; n++) {
    console.log("  ",l10n.get('phrase',{'n':n, 'adj':adj}, 'brown fox phrase'));
  }
}

// test in a given language.
function testLanguage(lang, callback) {
  console.log();
  console.log('Testing in language:', lang);
  console.log('=======================');
  console.log();
  l10n.loadResource('data.properties', lang, function() {
    console.log('Standard version:');
    repeat('brown');
    console.log();
    console.log('Testing parameter substitution:');
    repeat('pink');
    callback && callback();
  });
}

// set up the loader function l10n will use for loading resource files.
l10n.init(function(path,success,failure,async) {
  path = './' + path;
  if (async) {
    // load the resource asynchronously.
    fs.readFile(path, 'utf-8', function(err, data) {
      if (err) {
        failure && failure();
      } else {
        success && success(data);
      }
    });
  } else {
    // load synchronously (used for includes).
    data = fs.readFileSync(path, 'utf-8');
    if (data && (data != '')) {
      success(data);
    }
  }
});

// do the tests.
testLanguage('en', function() {
  testLanguage('de');
});
