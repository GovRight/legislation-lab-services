'use strict';

/**
 * @ngdoc object
 * @name govright.llServices.llAuth
 * @header govright.llServices.llAuth
 * @object
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
 * ```
 * // SiteConfig.authUrl comes from json config
 * var authUrl = SiteConfig.authUrl + '/' + $location.host();
 *
 * llAuth.socialLogin(authUrl).then(function() {
 *   // do stuff with llAuth.currentUser
 *   console.log( llAuth.currentUser );
 * }).catch(function(err) {
 *   // show login error message
 * });
 * ```
 *
 * - Login via loopback user credentials:
 *
 * ```
 * var username = 'test'; // Can be user email
 * var password = 'test';
 *
 * llAuth.login(username, password).then(function() {
 *   // do stuff with llAuth.currentUser
 *   console.log( llAuth.currentUser );
 * }).catch(function(err) {
 *   // show login error message
 * });
 * ```
 *
 * - Top level controller snippet:
 *
 * ```
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
 * ```
 *
 * - Restore user session
 *
 * ```
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
 * ```
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
