'use strict';

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
           * @name auth:login
           * @eventOf govright.platformServices.grAuth
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
           * @name auth:logout
           * @eventOf govright.platformServices.grAuth
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

    return grAuth;
  }
}());
