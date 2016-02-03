'use strict';

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
