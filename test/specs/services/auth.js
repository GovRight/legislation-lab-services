/* global expect */
'use strict';

describe('llAuth service', function() {
  var Auth;

  beforeEach(module('govright.platformServices'));

  beforeEach(inject(function(_grAuth_) {
    Auth = _grAuth_;
  }));

  it('should register `processAuthMessage` handler on the window object', function() {
    Auth.initSocialHandler();
    expect(window.processAuthMessage).to.be.a('function');
    expect(window.processAuthMessage.length).to.equal(1);
  });
});
