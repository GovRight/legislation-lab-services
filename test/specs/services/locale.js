/* global expect */
'use strict';

describe('llLocale service', function() {
  var Locale;

  beforeEach(module('govright.llServices'));

  beforeEach(inject(function(_llLocale_) {
    Locale = _llLocale_;
  }));

  it('should consider random string as an invalid locale', function() {
    expect(Locale.isValid('eng')).to.be.false;
  });
});
