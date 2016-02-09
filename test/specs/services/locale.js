/* global expect */
'use strict';

describe('grLocale', function() {
  var Locale;

  beforeEach(module('govright.platformServices'));

  beforeEach(inject(function(_grLocale_) {
    Locale = _grLocale_;
  }));

  describe('#isValid()', function() {
    it('should consider random string as an invalid locale', function() {
      expect(Locale.isValid('eng')).to.be.false;
    });
  });
});
