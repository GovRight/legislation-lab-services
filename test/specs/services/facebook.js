/* global expect */
'use strict';

describe('grFacebook', function() {
  var Facebook;
  var props = ['accessToken', 'appId', 'namespace'];
  var propsPrefix = '$Facebook$';

  beforeEach(module('govright.platformServices'));

  beforeEach(inject(function(_grFacebook_) {
    Facebook = _grFacebook_;
  }));

  describe('#saveAccessData()', function() {
    it('should put access data to session storage if `remember` param is empty', function() {
      var data = getRandomAccessData();
      Facebook.saveAccessData(data);
      props.forEach(function(prop) {
        expect(window.sessionStorage[propsPrefix + prop]).to.equal(data[prop]);
      });
    });

    it('should put access data to local storage if `remember` is true', function() {
      var data = getRandomAccessData();
      Facebook.saveAccessData(data, true);
      props.forEach(function(prop) {
        expect(window.localStorage[propsPrefix + prop]).to.equal(data[prop]);
      });
    });
  });

  function getRandomAccessData() {
    return {
      accessToken: Math.random().toString(36),
      appId: Math.random().toString(36),
      namespace: Math.random().toString(36)
    };
  }
});
