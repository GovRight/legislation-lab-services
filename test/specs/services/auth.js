/* global expect */
'use strict';

describe('SERVICES', function() {

  describe('llAuth service', function() {
    var Auth;

    beforeEach(module('govright.llServices'));

    beforeEach(inject(function(_llAuth_) {
      Auth = _llAuth_;
    }));

    it('should register `processAuthMessage` handler on the window object', function() {
      expect(window.processAuthMessage).to.be.a('function');
      expect(window.processAuthMessage.length).to.equal(1);
    });
  });
});
