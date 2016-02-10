(function(){'use strict';

/**
 * @ngdoc overview
 * @name govright.platformServices
 * @module govright.platformServices
 *
 * @description
 *
 * The `govright.platformServices` module provides services that encapsulate
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
     <!-- Include the platform services script -->
     <script src="dist/govright-platform-services.js"></script>
     <script>
       // ...and add 'govright.platformServices' as a dependency
       var myApp = angular.module('myApp', ['govright.platformServices']);
     </script>
   </head>
   <body></body>
 </html>
 * </pre>
 */
(function() {
  angular
    .module('govright.platformServices', ['govright.corpusServices', 'ui.router', 'gettext', 'ngMaterial']);
}());


/**
 * @ngdoc object
 * @name govright.platformServices.grAuth
 * @header govright.platformServices.grAuth
 *
 * @requires $window
 * @requires $q
 * @requires $rootScope
 * @requires LoopBackAuth
 * @requires User
 * @requires govright.platformServices.grFacebook
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
 * var authUrl = 'http://corpus.govright.org/auth/facebook/login/' + $location.host();
 *
 * grAuth.socialLogin(authUrl).then(function() {
 *   // do stuff with grAuth.currentUser
 *   console.log( grAuth.currentUser );
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
 * grAuth.login(username, password).then(function() {
 *   // do stuff with grAuth.currentUser
 *   console.log( grAuth.currentUser );
 * }).catch(function(err) {
 *   // show login error message
 * });
 * </pre>
 *
 * - Top level controller snippet:
 *
 * <pre>
 * $scope.$on('auth:login', function() {
 *   $scope.currentUser = grAuth.currentUser;
 * });
 *
 * $scope.logout = function() {
 *   grAuth.logout().then(function() {
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
 *   .run(['grAuth', function(grAuth) {
 *     grAuth.checkLogin().then(function() {
 *       // do stuff with grAuth.currentUser
 *       console.log( grAuth.currentUser );
 *     }).catch(function() {
 *       console.warn('Your login expired or something.');
 *     });
 *   }]);
 * </pre>
 */
(function() {
  angular
    .module('govright.platformServices')
    .factory('grAuth', Auth);

  Auth.$inject = [
    '$window',
    '$q',
    '$rootScope',
    'LoopBackAuth',
    'User',
    'grFacebook'
  ];

  function Auth($window, $q, $rootScope, LoopBackAuth, User, Facebook) {

    var isSocialHandlerInitialised = false;

    var loginDeferred;
    var loginPopup;

    var grAuth = {
      /**
       * @ngdoc property
       * @name govright.platformServices.grAuth#currentUser
       * @propertyOf govright.platformServices.grAuth
       *
       * @description
       *
       * Current user instance. Is `undefined` by default, populated on successful login.
       */
      currentUser: undefined,

      /**
       * @ngdoc method
       * @name govright.platformServices.grAuth#initSocialHandler
       * @methodOf govright.platformServices.grAuth
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
            grAuth.clearState();
            if (loginDeferred) {
              loginDeferred.reject('invalid-payload');
            }
            return;
          }

          if (!payload.corpusAccessToken.id) {
            console.error('LL Auth: missing access token.');
            grAuth.clearState();
            if (loginDeferred) {
              loginDeferred.reject('malformed-access-token');
            }
            return;
          }

          if (!payload.facebookAccessData || !payload.facebookAccessData.appId) {
            console.error('LL Auth: malformed facebook data.');
            grAuth.clearState();
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

          grAuth.setCurrentUser(payload);

          /**
           * @ngdoc event
           * @eventName auth:login
           * @eventOf govright.platformServices.grAuth
           * @eventType broadcast
           *
           * @description
           *
           * **`auth:login`** is broadcasted on successful login.
           *
           * Example subscription:
           *
           * <pre>
           * $scope.$on('auth:login', function() {
           *   // do stuff on login
           *   // like set current user on ctrl scope
           * });`
           * </pre>
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
       * @name govright.platformServices.grAuth#setCurrentUser
       * @methodOf govright.platformServices.grAuth
       *
       * @description
       *
       * Builds a user object from the auth payload and populates it on `grAuth.currentUser`.
       *
       * @param {Object} data Corpus payload object or `User.login()` result
       *
       * @returns {Object} User object.
       */
      setCurrentUser: function(data) {
        // Check if it's a `User.login()` result
        if(data.ttl && data.user && data.userId) {
          grAuth.currentUser = {
            id: data.userId,
            facebookAccessData: {},
            profile: data.user.profile,
            settings: data.user.settings,
            email: data.user.email
          };

        // Else expect it to be a Corpus payload
        } else {
          grAuth.currentUser = {
            id: data.corpusAccessToken.userId,
            facebookAccessData: data.facebookAccessData,
            profile: data.userProfile,
            settings: data.settings,
            email: data.email
          };
        }
        return grAuth.currentUser;
      },

      /**
       * @ngdoc method
       * @name govright.platformServices.grAuth#login
       * @methodOf govright.platformServices.grAuth
       *
       * @description
       *
       * Login user using LoopBack user credentials.
       * Current user object becomes available on `grAuth.currentUser` in case of successful login.
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
          grAuth.setCurrentUser(data);
          $rootScope.$broadcast('auth:login');
        }, function(err) {
          grAuth.clearState();
          console.error('LL Auth: LB user login failed.', err);
        }).$promise;
      },

      /**
       * @ngdoc method
       * @name govright.platformServices.grAuth#socialLogin
       * @methodOf govright.platformServices.grAuth
       *
       * @description
       *
       * Login user via Facebook. Creates the login popup and starts the login process.
       * Current user object becomes available
       * on `grAuth.currentUser` in case of successful login.
       *
       * `auth:login` event is broadcasted in case of successful login.
       *
       * @param {String} authUrl Login popup url.
       *
       * @returns {Object} Login promise which is resolved with login data in case
       * of successful login.
       */
      socialLogin: function(authUrl) {
        grAuth.initSocialHandler();

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
       * @name govright.platformServices.grAuth#checkLogin
       * @methodOf govright.platformServices.grAuth
       * @broadcasts auth:login
       *
       * @description
       *
       * Restore user session using cached LB/Facebook auth data.
       *
       * This is something that is typically called in the `run` block of the app
       * to check if users have been logged in previous sessions and automatically log them in.
       * Current user data becomes available in `grAuth.currentUser` in case of successful login.
       *
       * `auth:login` event is broadcasted in case of successful login.
       *
       * @returns {Object} Login promise which is resolved with current user instance in case
       * of successful login.
       */
      checkLogin: function() {
        if(User.isAuthenticated()) {
          return User.getCurrent(function (userData) {
            grAuth.currentUser = {
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
            grAuth.clearState();
          }).$promise;
        } else {
          return $q(function(resolve, reject) {
            grAuth.clearState();
            reject(new Error('Session data is missing or expired.'));
          });
        }
      },

      clearState: function () {
          LoopBackAuth.clearUser();
          LoopBackAuth.clearStorage();
          Facebook.clearStorage();
          grAuth.currentUser = null;
      },

      /**
       * @ngdoc method
       * @name govright.platformServices.grAuth#logout
       * @methodOf govright.platformServices.grAuth
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
          grAuth.clearState();
          /**
           * @ngdoc event
           * @eventName auth:logout
           * @eventOf govright.platformServices.grAuth
           * @eventType broadcast
           *
           * @description
           *
           * **`auth:logout`** is broadcasted when logout is done.
           *
           * Example subscription:
           *
           * <pre>
           * $scope.$on('auth:logout', function() {
           *   // do stuff on logout
           *   // like remove current user data from scope
           * });
           * </pre>
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

    return grAuth;
  }
}());


/**
 * @ngdoc object
 * @name govright.platformServices.grEmbeddingParamsProvider
 * @header govright.platformServices.grEmbeddingParamsProvider
 *
 * @requires $rootElementProvider
 *
 * @description
 *
 * Enables setting a custom app root on the app startup and detecting whether app is in
 * embedded mode on the config stage.
 *
 * # Embedded application concept
 * Any GovRight AngularJS application can be delivered **either as** a stand-alone SPA under
 * it's own domain **or as** a widget embedded into another site. The `grEmbeddingParams`
 * service and it's provider are aimed to provide an easy way to detect if the current app is
 * embedded. Application is considered to be **not** embedded if it's root element is `html`.
 *
 * Example value of embedding params:
 * <pre>
 * {
    isEmbeddedMode: true, // This property is always present
    // Others are populated from the root element data attributes
    otherDataParam: 'value',
    ...
  }
 * </pre>
 */

/**
 * @ngdoc object
 * @name govright.platformServices.grEmbeddingParams
 * @header govright.platformServices.grEmbeddingParams
 *
 * @description
 * Is a plain object of embedding parameters which are passed from the outside of the app
 * through root element data attributes (`data-*`).
 *
 * # Embedded application concept
 * Any GovRight AngularJS application can be delivered **either as** a stand-alone SPA under
 * it's own domain **or as** a widget embedded into another site. The `grEmbeddingParams`
 * service and it's provider are aimed to provide an easy way to detect if the current app is
 * embedded. Application is considered to be **not** embedded if it's root element is `html`.
 *
 * # Important notes
 *
 * * Returned value always has the `isEmbeddedMode` property which is either true or false
 * and indicates if app is in embedded mode now.
 * * The `query` (`data-query=""`) param is treated in a special way and can be specified either
 * as query or as json object and is parsed into a plain object.
 *
 * For example, following embedded app:
 *
 * <pre>
 * <div ng-app="myApp" data-app-port="9000" data-locale="en" data-query="test=me&lets=go"></div>
 * </pre>
 *
 * Will produce the following embedded params:
 *
 * <pre>
 * angular
 *   .module('myApp')
 *   .controller('MyController', ['grEmbeddingParams', function(EmbeddingParams) {
 *     console.log(EmbeddingParams);
 *
 *     // Outputs the following:
 *     {
 *        isEmbeddedMode: true,
 *        appPort: '9000',
 *        locale: 'en',
 *        // `query` param is parsed into a plain object
 *        query: {
 *          test: 'me',
 *          lets: 'go'
 *        }
 *      }
 *
 *   }]);
 * </pre>
 *
 * If application is **not** embedded, i.e. bootstrapped on the `html` element:
 *
 * <pre>
 * <html ng-app="myApp">
 *   <head>...</head>
 *   <body>...</body>
 * </html>
 * </pre>
 *
 * The `grEmbeddingParams` value will be:
 *
 * <pre>
 * {
 *   isEmbeddedMode: false
 * }
 * </pre>
 */

/**
 * @ngdoc property
 * @name govright.platformServices.grEmbeddingParams#isEmbeddedMode
 * @propertyOf govright.platformServices.grEmbeddingParams
 * @type {Boolean}
 *
 * @description
 *
 * Is either `true` or `false` and indicates if app is in embedded mode now.
 */

(function() {
  angular
    .module('govright.platformServices')
    .provider('grEmbeddingParams', ['$injector', function($injector) {
      var embeddingParams, appRoot;
      var $rootElement = $injector.get('$rootElementProvider');

      /**
       * @ngdoc method
       * @name govright.platformServices.grEmbeddingParamsProvider#setAppRoot
       * @methodOf govright.platformServices.grEmbeddingParamsProvider
       *
       * @description
       *
       * Set an app root element. Root element defaults to angular `$rootElement`
       * if this method was not called on the app config stage. Example:
       *
       * <pre>
       * angular
       *   .module('myApp')
       *   .config(['$rootElementProvider', 'grEmbeddingParamsProvider',
       *     function($rootElementProvider, EmbeddingProvider) {
       *       EmbeddingProvider.setAppRoot($rootElementProvider);
       *   });
       * </pre>
       *
       * @param {Object} rootElement Root element, can be DOM element, angular element or `$rootElementProvider`
       */
      this.setAppRoot = function(rootElement) {
        if(rootElement.$get) {
          appRoot = rootElement.$get();
        } else {
          appRoot = rootElement;
        }
      };

      /**
       * @ngdoc method
       * @name govright.platformServices.grEmbeddingParamsProvider#getParams
       * @methodOf govright.platformServices.grEmbeddingParamsProvider
       *
       * @description
       *
       * Same as provider's **`$get()`**.
       *
       * Returns application embedding parameters which are passed from the outside of the app
       * through root element data attributes (`data-*`).
       *
       * **Important notes:**
       *
       * * Returned value always has the `isEmbeddedMode` property which is either true or false
       * and indicates if app is in embedded mode now.
       * * The `query` (`data-query=""`) param is treated in a special way and can be specified either
       * as query or as json object and is parsed into a plain object.
       *
       * <br>
       * For example, following embedded app:
       *
       * <pre>
       * <div ng-app="myApp" data-app-port="9000" data-locale="en" data-query="test=me&lets=go"></div>
       * </pre>
       *
       * Will produce the following embedded params:
       *
       * <pre>
       * {
       *   isEmbeddedMode: true,
       *   appPort: '9000',
       *   locale: 'en',
       *   query: {
       *     test: 'me',
       *     lets: 'go'
       *   }
       * }
       * </pre>
       *
       * Example of usage in app config block:
       * <pre>
       * angular
       *   .module('myApp')
       *   .config(['$rootElementProvider', 'grEmbeddingParamsProvider',
       *     function($rootElementProvider, EmbeddingProvider) {
       *
       *       if(EmbeddingProvider.getParams().isEmbeddedMode) {
       *         // do things specific for embedded mode
       *       }
       *
       *   });
       * </pre>
       *
       * @returns {Object} Plain object of application embedding parameters.
       */
      this.getParams = function() {
        if(!appRoot) {
          this.setAppRoot($rootElement);
        }
        appRoot = angular.element(appRoot)[0];
        if(!embeddingParams) {
          embeddingParams = {
            isEmbeddedMode: appRoot.tagName !== 'HTML'
          };
          if(embeddingParams.isEmbeddedMode) {
            [].forEach.call(appRoot.attributes, function(attr) {
              if(/^data-/.test(attr.name)) {
                var key = attr.name.replace('data-', '')
                  .replace(/-[a-z]/g, function(m) { return m[1].toUpperCase(); });
                embeddingParams[key] = attr.value;
              }
            });
          }
          if(embeddingParams.query) {
            if(embeddingParams.query.indexOf('{') === 0 || embeddingParams.query.indexOf('[') === 0) {
              embeddingParams.query = JSON.parse(embeddingParams.query);
            } else {
              var params = embeddingParams.query.split('&');
              embeddingParams.query = {};
              params.forEach(function(p) {
                var param = p.split('=');
                embeddingParams.query[param[0]] = param[1];
              });
            }
          }
        }
        return embeddingParams;
      };
      this.$get = this.getParams;
    }]);
}());


/**
 * @ngdoc object
 * @name govright.platformServices.grFacebook
 * @header govright.platformServices.grFacebook
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
    .module('govright.platformServices')
    .factory('grFacebook', Facebook);

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
     * @name govright.platformServices.grFacebook#init
     * @methodOf govright.platformServices.grFacebook
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
     * @name govright.platformServices.grFacebook#postAction
     * @methodOf govright.platformServices.grFacebook
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
     * @name govright.platformServices.grFacebook#getAppId
     * @methodOf govright.platformServices.grFacebook
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
     * @name govright.platformServices.grFacebook#getNamespace
     * @methodOf govright.platformServices.grFacebook
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
     * @name govright.platformServices.grFacebook#getAccessToken
     * @methodOf govright.platformServices.grFacebook
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
     * @name govright.platformServices.grFacebook#saveAccessData
     * @methodOf govright.platformServices.grFacebook
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
     * @name govright.platformServices.grFacebook#loadAccessData
     * @methodOf govright.platformServices.grFacebook
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
     * @name govright.platformServices.grFacebook#clearStorage
     * @methodOf govright.platformServices.grFacebook
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


/**
 * @ngdoc object
 * @name govright.platformServices.grMessage
 * @header govright.platformServices.grMessage
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
    .module('govright.platformServices')
    .factory('grMessage', ['$mdToast', '$mdDialog', '$state', Message]);

  function Message($mdToast, $mdDialog, $state) {
    return {

      /**
       * @ngdoc method
       * @name govright.platformServices.grMessage#error404
       * @methodOf govright.platformServices.grMessage
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
       * @name govright.platformServices.grMessage#transition
       * @methodOf govright.platformServices.grMessage
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
       * @name govright.platformServices.grMessage#success
       * @methodOf govright.platformServices.grMessage
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
       * @name govright.platformServices.grMessage#error
       * @methodOf govright.platformServices.grMessage
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
       * @name govright.platformServices.grMessage#confirm
       * @methodOf govright.platformServices.grMessage
       *
       * @description
       *
       * Display a confirm/action request.
       *
       * Example:
       *
       * <pre>
       * grMessage.confirm().then(function() {
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