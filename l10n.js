/** Copyright (c) 2011-2012 Fabien Cazenave, Mozilla.
  *
  * Permission is hereby granted, free of charge, to any person obtaining a copy
  * of this software and associated documentation files (the "Software"), to
  * deal in the Software without restriction, including without limitation the
  * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
  * sell copies of the Software, and to permit persons to whom the Software is
  * furnished to do so, subject to the following conditions:
  *
  * The above copyright notice and this permission notice shall be included in
  * all copies or substantial portions of the Software.
  *
  * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
  * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
  * IN THE SOFTWARE.
  */

/**
 * Modified for nodejs by Andrew Baxter <andy@highfellow.org>, Aug 2012
 **/

/*jshint browser: true, devel: true, es5: true, globalstrict: true */
'use strict';

var gL10nData = {};
var gTextData = '';
var gTextProp = 'textContent';
var gLanguage = '';
var gLoader = null; // resource loader function.
var gMacros = {};
var gReadyState = 'loading';

// read-only setting -- we recommend to load l10n resources synchronously
var gAsyncResourceLoading = true;

// debug helpers
var gDEBUG = false;
function consoleLog(message) {
  if (gDEBUG)
    console.log('[l10n] ' + message);
};
function consoleWarn(message) {
  if (gDEBUG)
    console.warn('[l10n] ' + message);
};

/**
 * l10n resource parser:
 *  - reads (async XHR) the l10n resource matching `lang';
 *  - imports linked resources (synchronously) when specified;
 *  - parses the text data (fills `gL10nData' and `gTextData');
 *  - triggers success/failure callbacks when done.
 *
 * @param {string} href
 *    URL of the l10n resource to parse.
 *
 * @param {string} lang
 *    locale (language) to parse.
 *
 * @param {Function} successCallback
 *    triggered when the l10n resource has been successully parsed.
 *
 * @param {Function} failureCallback
 *    triggered when the an error has occured.
 *
 * @return {void}
 *    uses the following global variables: gL10nData, gTextData, gTextProp.
 */

function parseResource(href, lang, successCallback, failureCallback) {
  var errors=false;

  // handle escaped characters (backslashes) in a string
  function evalString(text) {
    if (text.lastIndexOf('\\') < 0)
      return text;
    return text.replace(/\\\\/g, '\\')
               .replace(/\\n/g, '\n')
               .replace(/\\r/g, '\r')
               .replace(/\\t/g, '\t')
               .replace(/\\b/g, '\b')
               .replace(/\\f/g, '\f')
               .replace(/\\{/g, '{')
               .replace(/\\}/g, '}')
               .replace(/\\"/g, '"')
               .replace(/\\'/g, "'");
  }

  // parse *.properties text data into an l10n dictionary
  function parseProperties(text) {
    var dictionary = [];

    // token expressions
    var reBlank = /^\s*|\s*$/;
    var reComment = /^\s*#|^\s*$/;
    var reSection = /^\s*\[(.*)\]\s*$/;
    var reImport = /^\s*@import\s+url\((.*)\)\s*$/i;
    var reSplit = /^([^=\s]*)\s*=\s*(.+)$/; // TODO: escape EOLs with '\'

    // parse the *.properties file into an associative array
    function parseRawLines(rawText, extendedSyntax) {
      var entries = rawText.replace(reBlank, '').split(/[\r\n]+/);
      var currentLang = '*';
      var genericLang = lang.replace(/-[a-z]+$/i, '');
      var skipLang = false;
      var match = '';

      for (var i = 0; i < entries.length; i++) {
        var line = entries[i];

        // comment or blank line?
        if (reComment.test(line))
          continue;

        // the extended syntax supports [lang] sections and @import rules
        if (extendedSyntax) {
          if (reSection.test(line)) { // section start?
            match = reSection.exec(line);
            currentLang = match[1];
            skipLang = (currentLang !== '*') &&
                (currentLang !== lang) && (currentLang !== genericLang);
            continue;
          } else if (skipLang) {
            continue;
          }
          if (reImport.test(line)) { // @import rule?
            match = reImport.exec(line);
            loadImport(match[1]); // load the resource synchronously
          }
        }

        // key-value pair
        var tmp = line.match(reSplit);
        if (tmp && tmp.length == 3)
          dictionary[tmp[1]] = evalString(tmp[2]);
      }
    }

    // import another *.properties file
    function loadImport(url) {
      gLoader(url, function(content) {
        parseRawLines(content, false); // don't allow recursive imports
      }, function(err) {
        errors = true;
      }, false); // load synchronously
    }

    // fill the dictionary
    parseRawLines(text, true);
    return dictionary;
  }

  // load and parse l10n data (warning: global variables are used here)
  // uses the loader function gLoader which was defined in init(loader)
  gLoader(href, function(response) {
    gTextData += response; // mostly for debug

    // parse *.properties text data into an l10n dictionary
    var data = parseProperties(response);

    // find attribute descriptions, if any
    for (var key in data) {
      var id, prop, index = key.lastIndexOf('.');
      if (index > 0) { // an attribute has been specified
        id = key.substring(0, index);
        prop = key.substr(index + 1);
      } else { // no attribute: assuming text content by default
        id = key;
        prop = gTextProp;
      }
      if (!gL10nData[id]) {
        gL10nData[id] = {};
      }
      gL10nData[id][prop] = data[key];
    }
    
    if (!errors) {
      // trigger callback
      if (successCallback)
        successCallback();
    } else {
      if (failureCallback)
        failureCallback();
    }
  }, failureCallback, gAsyncResourceLoading);
};

// clear all l10n data
function clear() {
  gL10nData = {};
  gTextData = '';
  gLanguage = '';
  // TODO: clear all non predefined macros.
  // There's no such macro /yet/ but we're planning to have some...
}


/**
 * Get rules for plural forms (shared with JetPack), see:
 * http://unicode.org/repos/cldr-tmp/trunk/diff/supplemental/language_plural_rules.html
 * https://github.com/mozilla/addon-sdk/blob/master/python-lib/plural-rules-generator.p
 *
 * @param {string} lang
 *    locale (language) used.
 *
 * @return {Function}
 *    returns a function that gives the plural form name for a given integer:
 *       var fun = getPluralRules('en');
 *       fun(1)    -> 'one'
 *       fun(0)    -> 'other'
 *       fun(1000) -> 'other'.
 */

function getPluralRules(lang) {
  var locales2rules = {
    'af': 3,
    'ak': 4,
    'am': 4,
    'ar': 1,
    'asa': 3,
    'az': 0,
    'be': 11,
    'bem': 3,
    'bez': 3,
    'bg': 3,
    'bh': 4,
    'bm': 0,
    'bn': 3,
    'bo': 0,
    'br': 20,
    'brx': 3,
    'bs': 11,
    'ca': 3,
    'cgg': 3,
    'chr': 3,
    'cs': 12,
    'cy': 17,
    'da': 3,
    'de': 3,
    'dv': 3,
    'dz': 0,
    'ee': 3,
    'el': 3,
    'en': 3,
    'eo': 3,
    'es': 3,
    'et': 3,
    'eu': 3,
    'fa': 0,
    'ff': 5,
    'fi': 3,
    'fil': 4,
    'fo': 3,
    'fr': 5,
    'fur': 3,
    'fy': 3,
    'ga': 8,
    'gd': 24,
    'gl': 3,
    'gsw': 3,
    'gu': 3,
    'guw': 4,
    'gv': 23,
    'ha': 3,
    'haw': 3,
    'he': 2,
    'hi': 4,
    'hr': 11,
    'hu': 0,
    'id': 0,
    'ig': 0,
    'ii': 0,
    'is': 3,
    'it': 3,
    'iu': 7,
    'ja': 0,
    'jmc': 3,
    'jv': 0,
    'ka': 0,
    'kab': 5,
    'kaj': 3,
    'kcg': 3,
    'kde': 0,
    'kea': 0,
    'kk': 3,
    'kl': 3,
    'km': 0,
    'kn': 0,
    'ko': 0,
    'ksb': 3,
    'ksh': 21,
    'ku': 3,
    'kw': 7,
    'lag': 18,
    'lb': 3,
    'lg': 3,
    'ln': 4,
    'lo': 0,
    'lt': 10,
    'lv': 6,
    'mas': 3,
    'mg': 4,
    'mk': 16,
    'ml': 3,
    'mn': 3,
    'mo': 9,
    'mr': 3,
    'ms': 0,
    'mt': 15,
    'my': 0,
    'nah': 3,
    'naq': 7,
    'nb': 3,
    'nd': 3,
    'ne': 3,
    'nl': 3,
    'nn': 3,
    'no': 3,
    'nr': 3,
    'nso': 4,
    'ny': 3,
    'nyn': 3,
    'om': 3,
    'or': 3,
    'pa': 3,
    'pap': 3,
    'pl': 13,
    'ps': 3,
    'pt': 3,
    'rm': 3,
    'ro': 9,
    'rof': 3,
    'ru': 11,
    'rwk': 3,
    'sah': 0,
    'saq': 3,
    'se': 7,
    'seh': 3,
    'ses': 0,
    'sg': 0,
    'sh': 11,
    'shi': 19,
    'sk': 12,
    'sl': 14,
    'sma': 7,
    'smi': 7,
    'smj': 7,
    'smn': 7,
    'sms': 7,
    'sn': 3,
    'so': 3,
    'sq': 3,
    'sr': 11,
    'ss': 3,
    'ssy': 3,
    'st': 3,
    'sv': 3,
    'sw': 3,
    'syr': 3,
    'ta': 3,
    'te': 3,
    'teo': 3,
    'th': 0,
    'ti': 4,
    'tig': 3,
    'tk': 3,
    'tl': 4,
    'tn': 3,
    'to': 0,
    'tr': 0,
    'ts': 3,
    'tzm': 22,
    'uk': 11,
    'ur': 3,
    've': 3,
    'vi': 0,
    'vun': 3,
    'wa': 4,
    'wae': 3,
    'wo': 0,
    'xh': 3,
    'xog': 3,
    'yo': 0,
    'zh': 0,
    'zu': 3
  };

  // utility functions for plural rules methods
  function isIn(n, list) {
    return list.indexOf(n) !== -1;
  }
  function isBetween(n, start, end) {
    return start <= n && n <= end;
  }

  // list of all plural rules methods:
  // map an integer to the plural form name to use
  var pluralRules = {
    '0': function(n) {
      return 'other';
    },
    '1': function(n) {
      if ((isBetween((n % 100), 3, 10)))
        return 'few';
      if (n === 0)
        return 'zero';
      if ((isBetween((n % 100), 11, 99)))
        return 'many';
      if (n == 2)
        return 'two';
      if (n == 1)
        return 'one';
      return 'other';
    },
    '2': function(n) {
      if (n !== 0 && (n % 10) === 0)
        return 'many';
      if (n == 2)
        return 'two';
      if (n == 1)
        return 'one';
      return 'other';
    },
    '3': function(n) {
      if (n == 1)
        return 'one';
      return 'other';
    },
    '4': function(n) {
      if ((isBetween(n, 0, 1)))
        return 'one';
      return 'other';
    },
    '5': function(n) {
      if ((isBetween(n, 0, 2)) && n != 2)
        return 'one';
      return 'other';
    },
    '6': function(n) {
      if (n === 0)
        return 'zero';
      if ((n % 10) == 1 && (n % 100) != 11)
        return 'one';
      return 'other';
    },
    '7': function(n) {
      if (n == 2)
        return 'two';
      if (n == 1)
        return 'one';
      return 'other';
    },
    '8': function(n) {
      if ((isBetween(n, 3, 6)))
        return 'few';
      if ((isBetween(n, 7, 10)))
        return 'many';
      if (n == 2)
        return 'two';
      if (n == 1)
        return 'one';
      return 'other';
    },
    '9': function(n) {
      if (n === 0 || n != 1 && (isBetween((n % 100), 1, 19)))
        return 'few';
      if (n == 1)
        return 'one';
      return 'other';
    },
    '10': function(n) {
      if ((isBetween((n % 10), 2, 9)) && !(isBetween((n % 100), 11, 19)))
        return 'few';
      if ((n % 10) == 1 && !(isBetween((n % 100), 11, 19)))
        return 'one';
      return 'other';
    },
    '11': function(n) {
      if ((isBetween((n % 10), 2, 4)) && !(isBetween((n % 100), 12, 14)))
        return 'few';
      if ((n % 10) === 0 ||
          (isBetween((n % 10), 5, 9)) ||
          (isBetween((n % 100), 11, 14)))
        return 'many';
      if ((n % 10) == 1 && (n % 100) != 11)
        return 'one';
      return 'other';
    },
    '12': function(n) {
      if ((isBetween(n, 2, 4)))
        return 'few';
      if (n == 1)
        return 'one';
      return 'other';
    },
    '13': function(n) {
      if ((isBetween((n % 10), 2, 4)) && !(isBetween((n % 100), 12, 14)))
        return 'few';
      if (n != 1 && (isBetween((n % 10), 0, 1)) ||
          (isBetween((n % 10), 5, 9)) ||
          (isBetween((n % 100), 12, 14)))
        return 'many';
      if (n == 1)
        return 'one';
      return 'other';
    },
    '14': function(n) {
      if ((isBetween((n % 100), 3, 4)))
        return 'few';
      if ((n % 100) == 2)
        return 'two';
      if ((n % 100) == 1)
        return 'one';
      return 'other';
    },
    '15': function(n) {
      if (n === 0 || (isBetween((n % 100), 2, 10)))
        return 'few';
      if ((isBetween((n % 100), 11, 19)))
        return 'many';
      if (n == 1)
        return 'one';
      return 'other';
    },
    '16': function(n) {
      if ((n % 10) == 1 && n != 11)
        return 'one';
      return 'other';
    },
    '17': function(n) {
      if (n == 3)
        return 'few';
      if (n === 0)
        return 'zero';
      if (n == 6)
        return 'many';
      if (n == 2)
        return 'two';
      if (n == 1)
        return 'one';
      return 'other';
    },
    '18': function(n) {
      if (n === 0)
        return 'zero';
      if ((isBetween(n, 0, 2)) && n !== 0 && n != 2)
        return 'one';
      return 'other';
    },
    '19': function(n) {
      if ((isBetween(n, 2, 10)))
        return 'few';
      if ((isBetween(n, 0, 1)))
        return 'one';
      return 'other';
    },
    '20': function(n) {
      if ((isBetween((n % 10), 3, 4) || ((n % 10) == 9)) && !(
          isBetween((n % 100), 10, 19) ||
          isBetween((n % 100), 70, 79) ||
          isBetween((n % 100), 90, 99)
          ))
        return 'few';
      if ((n % 1000000) === 0 && n !== 0)
        return 'many';
      if ((n % 10) == 2 && !isIn((n % 100), [12, 72, 92]))
        return 'two';
      if ((n % 10) == 1 && !isIn((n % 100), [11, 71, 91]))
        return 'one';
      return 'other';
    },
    '21': function(n) {
      if (n === 0)
        return 'zero';
      if (n == 1)
        return 'one';
      return 'other';
    },
    '22': function(n) {
      if ((isBetween(n, 0, 1)) || (isBetween(n, 11, 99)))
        return 'one';
      return 'other';
    },
    '23': function(n) {
      if ((isBetween((n % 10), 1, 2)) || (n % 20) === 0)
        return 'one';
      return 'other';
    },
    '24': function(n) {
      if ((isBetween(n, 3, 10) || isBetween(n, 13, 19)))
        return 'few';
      if (isIn(n, [2, 12]))
        return 'two';
      if (isIn(n, [1, 11]))
        return 'one';
      return 'other';
    }
  };

  // return a function that gives the plural form name for a given integer
  var index = locales2rules[lang.replace(/-.*$/, '')];
  if (!(index in pluralRules)) {
    consoleWarn('plural form unknown for [' + lang + ']');
    return function() { return 'other'; };
  }
  return pluralRules[index];
}

// pre-defined 'plural' macro
gMacros.plural = function(str, param, key, prop) {
  var n = parseFloat(param);
  if (isNaN(n))
    return str;

  // TODO: support other properties (l20n still doesn't...)
  if (prop != gTextProp)
    return str;

  // initialize _pluralRules
  if (!gMacros._pluralRules)
    gMacros._pluralRules = getPluralRules(gLanguage);
  var index = '[' + gMacros._pluralRules(n) + ']';

  // try to find a [zero|one|two] key if it's defined
  if (n === 0 && (key + '[zero]') in gL10nData) {
    str = gL10nData[key + '[zero]'][prop];
  } else if (n == 1 && (key + '[one]') in gL10nData) {
    str = gL10nData[key + '[one]'][prop];
  } else if (n == 2 && (key + '[two]') in gL10nData) {
    str = gL10nData[key + '[two]'][prop];
  } else if ((key + index) in gL10nData) {
    str = gL10nData[key + index][prop];
  }

  return str;
};


/**
 * l10n dictionary functions
 */

// fetch an l10n object, warn if not found, apply `args' if possible
function getL10nData(key, args) {
  var data = gL10nData[key];
  if (!data) {
    consoleWarn('#' + key + ' missing for [' + gLanguage + ']');
  }

  /** This is where l10n expressions should be processed.
    * The plan is to support C-style expressions from the l20n project;
    * until then, only two kinds of simple expressions are supported:
    *   {[ index ]} and {{ arguments }}.
    */
  var rv = {};
  for (var prop in data) {
    var str = data[prop];
    str = substIndexes(str, args, key, prop);
    str = substArguments(str, args);
    rv[prop] = str;
  }
  return rv;
}

// replace {[macros]} with their values
function substIndexes(str, args, key, prop) {
  var reIndex = /\{\[\s*([a-zA-Z]+)\(([a-zA-Z]+)\)\s*\]\}/;
  var reMatch = reIndex.exec(str);
  if (!reMatch || !reMatch.length)
    return str;

  // an index/macro has been found
  // Note: at the moment, only one parameter is supported
  var macroName = reMatch[1];
  var paramName = reMatch[2];
  var param;
  if (args && paramName in args) {
    param = args[paramName];
  } else if (paramName in gL10nData) {
    param = gL10nData[paramName];
  }

  // there's no macro parser yet: it has to be defined in gMacros
  if (macroName in gMacros) {
    var macro = gMacros[macroName];
    str = macro(str, param, key, prop);
  }
  return str;
}

// replace {{arguments}} with their values
function substArguments(str, args) {
  var reArgs = /\{\{\s*([a-zA-Z\.]+)\s*\}\}/;
  var match = reArgs.exec(str);
  while (match) {
    if (!match || match.length < 2)
      return str; // argument key not found

    var arg = match[1];
    var sub = '';
    if (arg in args) {
      sub = args[arg];
    } else if (arg in gL10nData) {
      sub = gL10nData[arg][gTextProp];
    } else {
      consoleWarn('could not find argument {{' + arg + '}}');
      return str;
    }

    str = str.substring(0, match.index) + sub +
          str.substr(match.index + match[0].length);
    match = reArgs.exec(str);
  }
  return str;
}

function L10n(adapter) {
  // Function object for handling translation API.
  // TODO - could move the global variables into this object.

  // load a resource for a given language from a relative path the loader understands.
  // arguments: 
  // path - a relative path.
  // lang - language to load from the resource.
  // successCallback - called once a language has been loaded.
  // failureCallback - called if loading fails.
  this.loadResource = parseResource;
  this.get = function(key,args,fallback) {
    var data = getL10nData(key, args) || fallback;
    if (data) { // XXX double-check this
      return 'textContent' in data ? data.textContent : '';
    }
    return '{{' + key + '}}';
  };
  this.getData = function() { return gL10nData;};
  this.getText = function() { return gTextData;};
  // get the direction (ltr|rtl) of the current language
  this.getDirection = function() {
    // http://www.w3.org/International/questions/qa-scripts
    // Arabic, Hebrew, Farsi, Pashto, Urdu
    var rtlList = ['ar', 'he', 'fa', 'ps', 'ur'];
    return (rtlList.indexOf(gLanguage) >= 0) ? 'rtl' : 'ltr';
  };
  // TODO - is getReadyState needed without the browser code?
  this.getReadyState = function() { return gReadyState; };
  gLoader = adapter.getLoader();
}

// export the L10n function object as the API.
module.exports = L10n;
