'use strict';

/**
 * @ngdoc object
 * @name govright.platformServices.grLocale
 * @header govright.platformServices.grLocale
 * @object
 *
 * @requires $rootScope
 * @requires gettext.gettextCatalog
 *
 * @description
 *
 * Locale helper.
 *
 * Examples:
 *
 * - On app startup, set application default locale.
 * It will be used in extended lookups.
 *
 * <pre>
 * angular
 *   .module('app')
 *   .run(['grLocale', function(Locale) {
 *     Locale.setDefault('en');
 *   }]);
 * </pre>
 *
 * - Get law title in the current locale:
 *
 * <pre>
 * grLocale.property(law, 'title');
 * </pre>
 *
 * - Get law title in any available locale:
 *
 * <pre>
 * grLocale.property(law, 'title', true);
 * </pre>
 *
 */
(function() {
  angular.module('govright.platformServices')
    .factory('grLocale', Locale);

  Locale.$inject = ['$rootScope', 'gettextCatalog'];

  function Locale($rootScope, gettextCatalog) {
    var DEFAULT_LOCALE_CODE = null;

    function LocaleInstance(code, name, dir) {
      this.code = code;
      this.name = name;
      this.dir = dir;

      return this;
    }

    function syncLocale(locale) {
      var oldCode = locale.code;

      locale.code = gettextCatalog.getCurrentLanguage();
      locale.name = gettextCatalog.getString('locale.name');
      locale.dir = gettextCatalog.getString('locale.direction');

      if (oldCode !== locale.code) {
        /**
         * @ngdoc event
         * @eventName locale:changed
         * @eventOf govright.platformServices.grLocale
         * @eventType broadcast
         *
         * @description
         *
         * **`locale:changed`** is broadcasted when current locale is changed.
         *
         * Example subscription:
         *
         * <pre>
         * $scope.$on('locale:changed', function() {
         *   // do stuff when current locale changes
         * });
         * </pre>
         */
        $rootScope.$broadcast('locale:changed', locale);
      }

      return locale;
    }

    return {
      localeList: [],

      /**
       * @ngdoc property
       * @name govright.platformServices.grLocale#current
       * @propertyOf govright.platformServices.grLocale
       *
       * @description
       *
       * Current locale (object). Example:
       *
       * <pre>
       * {
       *   code: 'en',
       *   name: 'English',
       *   dir: 'ltr'
       * }
       * </pre>
       */
      current: syncLocale(new LocaleInstance()),

      /**
       * @ngdoc method
       * @name govright.platformServices.grLocale#setCurrent
       * @methodOf govright.platformServices.grLocale
       *
       * @description
       *
       * Set current locale.
       *
       * @param {String} locale New locale code.
       *
       * @returns {Object} New locale object (name, dir, etc.).
       */
      setCurrent: function(locale) {
        gettextCatalog.setCurrentLanguage(locale);
        return syncLocale(this.current);
      },

      /**
       * @ngdoc method
       * @name govright.platformServices.grLocale#setDefault
       * @methodOf govright.platformServices.grLocale
       *
       * @description
       *
       * Set default locale. Typically, can be set in discussion
       * controller to the discussion defaulLocale
       *
       * @param {String} code Default locale code.
       */
      setDefault: function(code) {
        DEFAULT_LOCALE_CODE = code;
      },

      /**
       * @ngdoc method
       * @name govright.platformServices.grLocale#getString
       * @methodOf govright.platformServices.grLocale
       *
       * @description
       *
       * Get string translation.
       *
       * @return {*} `gettextCatalog.getString.apply(gettextCatalog, arguments)`
       */
      getString: function() {
        return gettextCatalog.getString.apply(gettextCatalog, arguments);
      },

      /**
       * @ngdoc method
       * @name govright.platformServices.grLocale#lookupString
       * @methodOf govright.platformServices.grLocale
       *
       * @description
       *
       * -
       */
      lookupString: function (locale, string, n, context) {
        // Adapted from gettextCatalog.getStringForm(...)
        var stringTable = gettextCatalog.strings[locale] || {};
        var contexts = stringTable[string] || {};
        var plurals = contexts[context || '$$noContext'] || [];
        return plurals[n || 0];
      },

      /**
       * @ngdoc method
       * @name govright.platformServices.grLocale#locales
       * @methodOf govright.platformServices.grLocale
       *
       * @description
       *
       * Get list of available locales.
       *
       * @returns {Array.<Object>} Array of locales.
       */
      locales: function() {
        return this.localeList.length ? this.localeList : Object.keys(gettextCatalog.strings).sort().map(function (code) {
          var locale = new LocaleInstance(code);
          locale.name = this.lookupString(code, 'locale.name');
          locale.dir = this.lookupString(code, 'locale.direction');

          return locale;
        }, this);
      },

      /**
       * @ngdoc method
       * @name govright.platformServices.grLocale#isValid
       * @methodOf govright.platformServices.grLocale
       *
       * @description
       *
       * Check if locale code is valid (is in the list of available locales).
       *
       * @param {String} locale Locale code to check.
       *
       * @returns {Boolean} Valid/Invalid
       */
      isValid: function (locale) {
        return locale && gettextCatalog.strings.hasOwnProperty(locale);
      },

      /**
       * @ngdoc method
       * @name govright.platformServices.grLocale#extract
       * @methodOf govright.platformServices.grLocale
       *
       * @description
       *
       * Extract locale object from instance.
       *
       * @param {Object} target Instance to extract locale from.
       *
       * @returns {Object} Locale object.
       */
      extract: function(target) {
        if(!target || !target.locales) {
          return {};
        }

        var code = this.current.code;
        if (!target.locales[code]) {
          code = DEFAULT_LOCALE_CODE;
        }

        return target.locales[code];
      },

      /**
       * @ngdoc method
       * @name govright.platformServices.grLocale#property
       * @methodOf govright.platformServices.grLocale
       *
       * @description
       *
       * Get localised property from instance.
       *
       * @param {Object} instance Instance to extract locale from (law, discussion, etc.).
       *
       * @param {String} key Property to get translation of (title, text, etc.).
       *
       * @param {Boolean=} extendedLookup If false - only current locale code is checked. If true,
       * any available locale is returned.
       *
       * @returns {Object} Locale object.
       */
      property: function(instance, key, extendedLookup) {
        var localeCode = this.determineLocaleCode(instance, this.current.code, extendedLookup);
        return localeCode ? instance.locales[localeCode][key] : null;
      },

      /**
       * @ngdoc method
       * @name govright.platformServices.grLocale#localeDir
       * @methodOf govright.platformServices.grLocale
       *
       * @description
       *
       * Get locale direction.
       *
       * @param {Object} instance Instance to detect direction.
       *
       * @param {Boolean=} extendedLookup If false - only current locale code is checked. If true,
       * any available locale is returned.
       *
       * @returns {String} Locale direction.
       */
      localeDir: function(instance, extendedLookup) {
        var localeCode = this.determineLocaleCode(instance, this.current.code, extendedLookup);
        return localeCode ? this.lookupString(localeCode, 'locale.direction') : null;
      },

      /**
       * @ngdoc method
       * @name govright.platformServices.grLocale#setLocales
       * @methodOf govright.platformServices.grLocale
       *
       * @description
       *
       * Set new list of locales.
       *
       * @param {Array.<String>} codes Array of string locale codes.
       *
       * @returns {Array.<Object>} Array of new locales.
       */
      setLocales: function(codes) {
        var locales = [];
        Object.keys(gettextCatalog.strings).sort().map(function (code) {
          if(codes.indexOf(code) > -1) {
            var locale = new LocaleInstance(code);
            locale.name = this.lookupString(code, 'locale.name');
            locale.dir = this.lookupString(code, 'locale.direction');
            locales.push(locale);
          }
        }, this);
        this.localeList = locales;

        /**
         * @ngdoc event
         * @eventName locale:new-list
         * @eventOf govright.platformServices.grLocale
         * @eventType broadcast
         *
         * @description
         *
         * **`locale:new-list`** is broadcasted when locale list is changed.
         *
         * Example subscription:
         *
         * <pre>
         * $scope.$on('locale:new-list', function() {
         *   // do stuff when list's changed
         * });
         * </pre>
         */
        $rootScope.$broadcast('locale:new-list');

        return locales;
      },

      /**
       * @ngdoc method
       * @name govright.platformServices.grLocale#determineLocaleCode
       * @methodOf govright.platformServices.grLocale
       *
       * @description
       *
       * Check if instance has the specified locale, or any other available.
       *
       * @param {Object} instance Instance to check (law, discussion, etc)
       * @param {String=} localeCode Locale code to check
       * @param {Boolean=} extendedLookup If not set, only specified `localeCode` and
       * `defaultLocale` are checked. If `true`, any available locale is returned.
       *
       * @returns {String|Null} Locale code or null if no locale could not be extracted.
       */
      determineLocaleCode: function(instance, localeCode, extendedLookup) {
      if (!instance || !instance.locales) {
        return null;
      }

      if(instance.locales[localeCode]) {
        return localeCode;
      } else {
        if(instance.defaultLocale && instance.locales[instance.defaultLocale]) {
          return instance.defaultLocale;
        }

        var code = DEFAULT_LOCALE_CODE;
        if(extendedLookup && !instance.locales[code]) {
          code = Object.keys(instance.locales).shift();
        }
        if (!instance.locales[code]) {
          return null;
        } else {
          return code;
        }
      }
    }
    };
  }
}());
