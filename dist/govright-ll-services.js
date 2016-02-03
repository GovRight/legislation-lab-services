(function(){'use strict';

/**
 * @ngdoc overview
 * @name govright.llServices
 * @module govright.llServices
 *
 * @description
 *
 * The `govright.llServices` module provides services that encapsulate
 * common techniques of interacting with the GovRight Corpus API
 *
 * ## Module dependencies
 *
 * * [`govright.corpusServices`](https://github.com/GovRight/corpus-services)
 * * [`ui.router`](https://github.com/angular-ui/ui-router)
 * * [`gettext`](https://angular-gettext.rocketeer.be/)
 * * [`ngMaterial`](https://material.angularjs.org/latest/)
 *
 * ## Example
 *
 * <pre>
 <!doctype html>
 <html ng-app="myApp">
   <head>
     <script src="js/angular.js"></script>
     <!-- Include the ll services script -->
     <script src="dist/govright-ll-services.js"></script>
     <script>
       // ...and add 'govright.llServices' as a dependency
       var myApp = angular.module('myApp', ['govright.llServices']);
     </script>
   </head>
   <body></body>
 </html>
 * </pre>
 */
(function() {
  angular
    .module('govright.llServices', ['govright.corpusServices', 'ui.router', 'gettext', 'ngMaterial']);
}());


/**
 * @ngdoc object
 * @name govright.llServices.llAuth
 * @header govright.llServices.llAuth
 *
 * @requires $window
 * @requires $q
 * @requires $rootScope
 * @requires LoopBackAuth
 * @requires User
 * @requires govright.llServices.llFacebook
 *
 * @description
 *
 * Login helper.
 *
 * - Makes a login popup
 * - Handles API response and saves user data
 *
 * Examples:
 *
 * - Login user via Facebook:
 *
 * <pre>
 * // SiteConfig.authUrl comes from json config
 * var authUrl = SiteConfig.authUrl + '/' + $location.host();
 *
 * llAuth.socialLogin(authUrl).then(function() {
 *   // do stuff with llAuth.currentUser
 *   console.log( llAuth.currentUser );
 * }).catch(function(err) {
 *   // show login error message
 * });
 * </pre>
 *
 * - Login via loopback user credentials:
 *
 * <pre>
 * var username = 'test'; // Can be user email
 * var password = 'test';
 *
 * llAuth.login(username, password).then(function() {
 *   // do stuff with llAuth.currentUser
 *   console.log( llAuth.currentUser );
 * }).catch(function(err) {
 *   // show login error message
 * });
 * </pre>
 *
 * - Top level controller snippet:
 *
 * <pre>
 * $scope.$on('auth:login', function() {
 *   $scope.currentUser = llAuth.currentUser;
 * });
 *
 * $scope.logout = function() {
 *   llAuth.logout().then(function() {
 *     $scope.currentUser = null;
 *     $state.go('site.login'); // or something
 *   });
 * }
 * </pre>
 *
 * - Restore user session
 *
 * <pre>
 * angular
 *   .module('app')
 *   .run(['llAuth', function(llAuth) {
 *     llAuth.checkLogin().then(function() {
 *       // do stuff with llAuth.currentUser
 *       console.log( llAuth.currentUser );
 *     }).catch(function() {
 *       console.warn('Your login expired or something.');
 *     });
 *   }]);
 * </pre>
 */
(function() {
  angular
    .module('govright.llServices')
    .factory('llAuth', Auth);

  Auth.$inject = [
    '$window',
    '$q',
    '$rootScope',
    'LoopBackAuth',
    'User',
    'llFacebook'
  ];

  function Auth($window, $q, $rootScope, LoopBackAuth, User, Facebook) {

    var isSocialHandlerInitialised = false;

    var loginDeferred;
    var loginPopup;

    var llAuth = {
      /**
       * @ngdoc property
       * @name govright.llServices.llAuth#currentUser
       * @propertyOf govright.llServices.llAuth
       *
       * @description
       *
       * Current user instance. Is `undefined` by default, populated on successful login.
       */
      currentUser: undefined,

      /**
       * @ngdoc method
       * @name govright.llServices.llAuth#initSocialHandler
       * @methodOf govright.llServices.llAuth
       *
       * @description
       *
       * Creates a `processAuthMessage` function on the `window` object which
       * is called from the popup window to pass auth data to angular app.
       * Is automatically called before social login if hasn't been initialised yet.
       */
      initSocialHandler: function() {
        if(isSocialHandlerInitialised) {
          return;
        }

        $window.processAuthMessage = $window.processAuthMessage || function(payload) {
          payload = JSON.parse(payload);

          if (!payload || !payload.corpusAccessToken) {
            console.error('LL Auth: invalid payload.');
            llAuth.clearState();
            if (loginDeferred) {
              loginDeferred.reject('invalid-payload');
            }
            return;
          }

          if (!payload.corpusAccessToken.id) {
            console.error('LL Auth: missing access token.');
            llAuth.clearState();
            if (loginDeferred) {
              loginDeferred.reject('malformed-access-token');
            }
            return;
          }

          if (!payload.facebookAccessData || !payload.facebookAccessData.appId) {
            console.error('LL Auth: malformed facebook data.');
            llAuth.clearState();
            if (loginDeferred) {
              loginDeferred.reject('malformed-facebook-data');
            }
            return;
          }

          LoopBackAuth.setUser(payload.corpusAccessToken.id, payload.corpusAccessToken.userId);
          LoopBackAuth.rememberMe = true;
          LoopBackAuth.save();

          Facebook.saveAccessData(payload.facebookAccessData, LoopBackAuth.rememberMe);
          Facebook.init();

          llAuth.setCurrentUser(payload);

          /**
           * @ngdoc event
           * @name auth:login
           * @eventOf govright.llServices.llAuth
           * @eventType broadcast
           *
           * @description
           *
           * `auth:login` is broadcasted on successful login. Example subscription:
           *
           * `$scope.$on('auth:login', function() {...});`
           */
          $rootScope.$broadcast('auth:login');

          if (loginDeferred) {
            loginDeferred.resolve(payload);
          }
        };
        isSocialHandlerInitialised = true;
      },

      /**
       * @ngdoc method
       * @name govright.llServices.llAuth#setCurrentUser
       * @methodOf govright.llServices.llAuth
       *
       * @description
       *
       * Builds a user object from the auth payload and populates it on `llAuth.currentUser`.
       *
       * @param {Object} data Corpus payload object or `User.login()` result
       *
       * @returns {Object} User object.
       */
      setCurrentUser: function(data) {
        // Check if it's a `User.login()` result
        if(data.ttl && data.user && data.userId) {
          llAuth.currentUser = {
            id: data.userId,
            facebookAccessData: {},
            profile: data.user.profile,
            settings: data.user.settings,
            email: data.user.email
          };

        // Else expect it to be a Corpus payload
        } else {
          llAuth.currentUser = {
            id: data.corpusAccessToken.userId,
            facebookAccessData: data.facebookAccessData,
            profile: data.userProfile,
            settings: data.settings,
            email: data.email
          };
        }
        return llAuth.currentUser;
      },

      /**
       * @ngdoc method
       * @name govright.llServices.llAuth#login
       * @methodOf govright.llServices.llAuth
       *
       * @description
       *
       * Login user using LoopBack user credentials.
       * Current user object becomes available on `llAuth.currentUser` in case of successful login.
       *
       * `auth:login` event is broadcasted in case of successful login.
       *
       * @param {String|Object} user Username or email or object like `{username: '', password: ''}`
       * or `{email: '', password: ''}`.
       *
       * @param {String=} password User password. Should be omitted if the first arg is object.
       *
       * @returns {Object} Login promise which is resolved with login data in case
       * of successful login.
       */
      login: function(user, password) {
        var username;
        if(typeof user === 'object') {
          username = user.username || user.email;
          password = user.password;
        } else {
          username = user;
        }

        var credentials = {
          password: password
        };

        // Basic email check
        if(user.email || /\S+@\S+\.\S+/.test(username)) {
          credentials.email = username;
        } else {
          credentials.username = username;
        }

        return User.login(credentials, function(data) {
          llAuth.setCurrentUser(data);
          $rootScope.$broadcast('auth:login');
        }, function(err) {
          llAuth.clearState();
          console.error('LL Auth: LB user login failed.', err);
        }).$promise;
      },

      /**
       * @ngdoc method
       * @name govright.llServices.llAuth#socialLogin
       * @methodOf govright.llServices.llAuth
       *
       * @description
       *
       * Login user via Facebook. Creates the login popup and starts the login process.
       * Current user object becomes available
       * on `llAuth.currentUser` in case of successful login.
       *
       * `auth:login` event is broadcasted in case of successful login.
       *
       * @param {String} authUrl Login popup url.
       *
       * @returns {Object} Login promise which is resolved with login data in case
       * of successful login.
       */
      socialLogin: function(authUrl) {
        llAuth.initSocialHandler();

        if (loginDeferred) {
          console.warn('LL Auth: login() called during pending login...');
          if (loginPopup && !loginPopup.closed) {
            loginPopup.focus();
            return loginDeferred.promise;
          }
        }


        /* globals screen: false */
        var left = (screen.width / 2) - 350;
        var top = (screen.height / 2) - 300;

        loginPopup = $window.open(authUrl , '_blank',
                                  'toolbar=no,location=no,directories=no,status=no,menubar=no,'+
                                  'scrollbars=no,resizable=no,copyhistory=no,width=580,height=400,'+
                                  'top=' + top + ',left=' + left);


        loginDeferred = $q.defer();
        loginDeferred.promise.finally(function () {
          loginPopup = loginDeferred = null;
        });

        return loginDeferred.promise;
      },

      /**
       * @ngdoc method
       * @name govright.llServices.llAuth#checkLogin
       * @methodOf govright.llServices.llAuth
       * @broadcasts auth:login
       *
       * @description
       *
       * Restore user session using cached LB/Facebook auth data.
       *
       * This is something that is typically called in the `run` block of the app
       * to check if users have been logged in previous sessions and automatically log them in.
       * Current user data becomes available in `llAuth.currentUser` in case of successful login.
       *
       * `auth:login` event is broadcasted in case of successful login.
       *
       * @returns {Object} Login promise which is resolved with current user instance in case
       * of successful login.
       */
      checkLogin: function() {
        if(User.isAuthenticated()) {
          return User.getCurrent(function (userData) {
            llAuth.currentUser = {
              id: userData.id,
              profile: userData.profile,
              facebookAccessData: Facebook.loadAccessData(),
              settings: userData.settings,
              email: userData.email
            };
            Facebook.init();
            $rootScope.$broadcast('auth:login');
          }, function (err) {
            console.error('LL Auth: session restore failed.', err);
            llAuth.clearState();
          }).$promise;
        } else {
          return $q(function(resolve, reject) {
            llAuth.clearState();
            reject(new Error('Session data is missing or expired.'));
          });
        }
      },

      clearState: function () {
          LoopBackAuth.clearUser();
          LoopBackAuth.clearStorage();
          Facebook.clearStorage();
          llAuth.currentUser = null;
      },

      /**
       * @ngdoc method
       * @name govright.llServices.llAuth#logout
       * @methodOf govright.llServices.llAuth
       *
       * @description
       *
       * Logout user.
       *
       * @event auth:logout
       * @eventType broadcast
       */
      logout: function() {
        var clientLogout = function () {
          llAuth.clearState();
          /**
           * @ngdoc event
           * @name auth:logout
           * @eventOf govright.llServices.llAuth
           * @eventType broadcast
           *
           * @description
           *
           * `auth:logout` is broadcasted when logout is done. Example subscription:
           *
           * `$scope.$on('auth:logout', function() {...});`
           */
          $rootScope.$broadcast('auth:logout');
        };

        return User.logout().$promise
          .then(clientLogout)
          .catch(function(err)  {
            console.error('LL Auth: logout error.', err);
            // Even if server throws an error, clear the client's login state
            clientLogout();
          });
      }
    };

    return llAuth;
  }
}());


/**
 * @ngdoc object
 * @name govright.llServices.llFacebook
 * @header govright.llServices.llFacebook
 * @object
 *
 * @requires $q
 * @requires $window
 *
 * @description
 *
 * Facebook auth/posting helper.
 *
 * - Facebook app initialization
 * - Posting to the Facebook app
 * - Saving/retrieving facebook auth data
 */
(function() {
  angular
    .module('govright.llServices')
    .factory('llFacebook', Facebook);

  Facebook.$inject = ['$q', '$window'];

  function Facebook($q, $window) {

    var props = ['accessToken', 'appId', 'namespace'];
    var propsPrefix = '$Facebook$';
    var accessData = {};

    return {
      init: init,
      postAction: postAction,
      getAppId: getAppId,
      getNamespace: getNamespace,
      getAccessToken: getAccessToken,

      saveAccessData: saveAccessData,
      loadAccessData: loadAccessData,
      clearStorage: clearStorage
    };

    /**
     * @ngdoc method
     * @name govright.llServices.llFacebook#init
     * @methodOf govright.llServices.llFacebook
     *
     * @description
     *
     * Initialise Facebook app with FB.init()
     *
     * @param {Object=} config FB.init() config object
     *
     * @returns {Object} FB.init() result.
     */
    function init(config) {
      if(!$window.FB || !$window.FB.init) {
        console.error('LL Facebook: missing Facebook SDK.');
        return;
      }

      accessData = loadAccessData();
      config = config || {};
      config.appId = config.appId || getAppId();
      config.cookie = false;
      config.xfbml = config.xfbml || true;
      config.version = config.version || 'v2.3';

      return $window.FB.init(config);
    }

    /**
     * @ngdoc method
     * @name govright.llServices.llFacebook#postAction
     * @methodOf govright.llServices.llFacebook
     *
     * @description
     *
     * Post action to Facebook on user's behalf
     *
     * @param {String} action Facebook app action
     *
     * @param {Object} data Data to post
     */
    function postAction(action, data) {
      return $q(function(resolve, reject) {
        var namespace = getNamespace();
        var token = getAccessToken();

        if(!namespace) {
          console.error('LL Facebook: missing app namespace.');
          return reject('missing-app-namespace');
        }
        if(!token) {
          console.error('LL Facebook: missing Facebook access token.');
          return reject('missing-access-token');
        }
        /* jshint ignore:start */
        /* is not in came case */
        data.access_token = token;
        if(data['fb:explicitly_shared'] == null) {
          data['fb:explicitly_shared'] = true;
        }
        /* jshint ignore:end */

        $window.FB.api(
          'me/' + namespace + ':' + action,
          'post',
          data,
          function(res) {
            console.debug(res);
            if(res.error) {
              return reject('LL Facebook: ' + res.error.message);
            } else {
              return resolve(res);
            }
          }
        );
      });
    }

    /**
     * @ngdoc method
     * @name govright.llServices.llFacebook#getAppId
     * @methodOf govright.llServices.llFacebook
     *
     * @description
     *
     * Get current Facebook app id
     *
     * @returns {String} Current app id or null
     */
    function getAppId() {
      return accessData.appId || null;
    }

    /**
     * @ngdoc method
     * @name govright.llServices.llFacebook#getNamespace
     * @methodOf govright.llServices.llFacebook
     *
     * @description
     *
     * Get current Facebook app namespace
     *
     * @returns {String} Current app namespace or null
     */
    function getNamespace() {
      return accessData.namespace || null;
    }

    /**
     * @ngdoc method
     * @name govright.llServices.llFacebook#getAccessToken
     * @methodOf govright.llServices.llFacebook
     *
     * @description
     *
     * Get current user's access token
     *
     * @returns {String} Current user's access token or null
     */
    function getAccessToken() {
      return accessData.accessToken || null;
    }

    /**
     * @ngdoc method
     * @name govright.llServices.llFacebook#saveAccessData
     * @methodOf govright.llServices.llFacebook
     *
     * @description
     *
     * Save Facebook access data to storage to use in the future
     *
     * @param {Object} facebookData Access data to store.
     *
     * @param {Boolean=} remember If `true` - saves data for future sessions.
     *
     */
    function saveAccessData(facebookData, remember) {
      clearStorage();
      var storage = remember ? localStorage : sessionStorage;
      props.forEach(function(name) {
        storage[propsPrefix + name] = facebookData[name];
      });
    }

    /**
     * @ngdoc method
     * @name govright.llServices.llFacebook#loadAccessData
     * @methodOf govright.llServices.llFacebook
     *
     * @description
     *
     * Get current Facebook access data
     *
     * @returns {Object} Object with following props
     *
     * - `appId` - Facebook app id
     * - `namespace` - Facebook app namespace
     * - `accessToken` - user access token
     */
    function loadAccessData() {
      if(!accessData.appId) {
        props.forEach(function (name) {
          var key = propsPrefix + name;
          accessData[name] = localStorage[key] || sessionStorage[key] || null;
        });
      }
      return accessData;
    }

    /**
     * @ngdoc method
     * @name govright.llServices.llFacebook#clearStorage
     * @methodOf govright.llServices.llFacebook
     *
     * @description
     *
     * Delete stored Facebook access data.
     */
    function clearStorage() {
      accessData = {};
      props.forEach(function(name) {
        var key = propsPrefix + name;
        localStorage[key] = null;
        sessionStorage[key] = null;
      });
    }
  }
})();


/**
 * @ngdoc object
 * @name govright.llServices.llLocale
 * @header govright.llServices.llLocale
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
 *   .run(['llLocale', function(Locale) {
 *     Locale.setDefault('en');
 *   }]);
 * </pre>
 *
 * - Get law title in the current locale:
 *
 * <pre>
 * llLocale.property(law, 'title');
 * </pre>
 *
 * - Get law title in any available locale:
 *
 * <pre>
 * llLocale.property(law, 'title', true);
 * </pre>
 *
 */
(function() {
  angular.module('govright.llServices')
    .factory('llLocale', Locale);

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
         * @name locale:changed
         * @eventOf govright.llServices.llLocale
         * @eventType broadcast
         *
         * @description
         *
         * `locale:changed` is broadcasted when current locale is changed. Example subscription:
         *
         * `$scope.$on('locale:changed', function() {...});`
         */
        $rootScope.$broadcast('locale:changed', locale);
      }

      return locale;
    }

    return {
      localeList: [],

      /**
       * @ngdoc property
       * @name govright.llServices.llLocale#current
       * @propertyOf govright.llServices.llLocale
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
       * @name govright.llServices.llLocale#setCurrent
       * @methodOf govright.llServices.llLocale
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
       * @name govright.llServices.llLocale#setDefault
       * @methodOf govright.llServices.llLocale
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
       * @name govright.llServices.llLocale#getString
       * @methodOf govright.llServices.llLocale
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
       * @name govright.llServices.llLocale#lookupString
       * @methodOf govright.llServices.llLocale
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
       * @name govright.llServices.llLocale#locales
       * @methodOf govright.llServices.llLocale
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
       * @name govright.llServices.llLocale#isValid
       * @methodOf govright.llServices.llLocale
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
       * @name govright.llServices.llLocale#extract
       * @methodOf govright.llServices.llLocale
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
       * @name govright.llServices.llLocale#property
       * @methodOf govright.llServices.llLocale
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
       * @name govright.llServices.llLocale#localeDir
       * @methodOf govright.llServices.llLocale
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
       * @name govright.llServices.llLocale#setLocales
       * @methodOf govright.llServices.llLocale
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
         * @name locale:new-list
         * @eventOf govright.llServices.llLocale
         * @eventType broadcast
         *
         * @description
         *
         * `locale:new-list` is broadcasted when locale list is changed. Example subscription:
         *
         * `$scope.$on('locale:new-list', function() {...});`
         */
        $rootScope.$broadcast('locale:new-list');

        return locales;
      },

      /**
       * @ngdoc method
       * @name govright.llServices.llLocale#determineLocaleCode
       * @methodOf govright.llServices.llLocale
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


/**
 * @ngdoc object
 * @name govright.llServices.llMessage
 * @header govright.llServices.llMessage
 * @object
 *
 * @requires ngMaterial.$mdToast
 * @requires ngMaterial.$mdDialog
 * @requires ui.router.$state
 *
 * @description
 *
 * Various site messages, like 404, dialog popups, success toast, etc.
 */

(function () {
  angular
    .module('govright.llServices')
    .factory('llMessage', ['$mdToast', '$mdDialog', '$state', Message]);

  function Message($mdToast, $mdDialog, $state) {
    return {

      /**
       * @ngdoc method
       * @name govright.llServices.llMessage#error404
       * @methodOf govright.llServices.llMessage
       *
       * @description
       *
       * Display the 404 error page.
       *
       * Transitions to the 404 page without changing the url.
       * Requires the `site.404` route to be set up.
       *
       * Example route:
       *
       * <pre>
       * $stateProvider.state('site.404', {
       *   params: { message: undefined },
       *   templateUrl: '/templates/site/404.html',
       *   controller: 'StaticPageController'
       * })
       * </pre>
       *
       * @param {String=} message Custom message to display on the 404 page
       */
      error404: function (message) {
        $state.transitionTo('site.404', {message: message}, {location: false, inherit: true});
      },

      /**
       * @ngdoc method
       * @name govright.llServices.llMessage#transition
       * @methodOf govright.llServices.llMessage
       *
       * @description
       *
       * Display a site message as a separate page.
       *
       * Transitions to the site message page without changing the url.
       * Requires the `site.message` route to be set up.
       *
       * Example route:
       *
       * <pre>
       * $stateProvider.state('site.message', {
       *   params: { title: undefined, message: undefined },
       *   templateUrl: '/templates/site/message.html',
       *   controller: 'StaticPageController'
       * })
       * </pre>
       *
       * @param {String} title Title of the message
       * @param {String=} message Message text
       */
      transition: function (title, message) {
        $state.transitionTo('site.message',
          {
            title: title,
            message: message
          }, {location: false, inherit: true});
      },

      /**
       * @ngdoc method
       * @name govright.llServices.llMessage#success
       * @methodOf govright.llServices.llMessage
       *
       * @description
       *
       * Display a success message in a toast.
       *
       * @param {String=} [content=Action successfully complete] Success message text
       */
      success: function (content) {
        $mdToast.show(
          $mdToast.simple()
            .content(content || 'Action successfully complete')
            .position('bottom right')
            .hideDelay(3000)
        );
      },

      /**
       * @ngdoc method
       * @name govright.llServices.llMessage#error
       * @methodOf govright.llServices.llMessage
       *
       * @description
       *
       * Display an error message in a dialog.
       *
       * @param {String=} [title=An error occurred] Error message title
       * @param {String|Object=} content Error message text or an error object
       * @param {String=} [ok=Close] Close button text
       */
      error: function (title, content, ok) {
        var msg;
        if(typeof content === 'object') {
          if(content.data && content.data.error && content.data.error.message) {
            msg = content.data.error.message;
          } else {
            msg = content.message || '';
          }
        } else {
          msg = content || '';
        }
        $mdDialog.show(
          $mdDialog.alert()
            .clickOutsideToClose(true)
            .title(title)
            .content(msg)
            .ok(ok || 'Close')
        );
      },

      /**
       * @ngdoc method
       * @name govright.llServices.llMessage#confirm
       * @methodOf govright.llServices.llMessage
       *
       * @description
       *
       * Display a confirm/action request.
       *
       * Example:
       *
       * <pre>
       * llMessage.confirm().then(function() {
       *   // User clicked `Ok`
       * }).catch(function() {
       *   // User canceled
       * });
       * </pre>
       *
       * @param {String=} [title=Are you sure?] Confirm message
       * @param {String=} [ok=Ok] `Ok` button text
       * @param {String=} [cancel=Cancel] `Cancel` button text
       */
      confirm: function (title, ok, cancel) {
        var confirm = $mdDialog.confirm()
          .title(title || 'Are you sure?')
          .targetEvent()
          .ok(ok || 'Ok')
          .cancel(cancel || 'Cancel');
        return $mdDialog.show(confirm);
      }
    };
  }
})();
})();