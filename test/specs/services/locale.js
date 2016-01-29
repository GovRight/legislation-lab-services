/* global expect */
'use strict';

describe('SERVICES', function() {
  describe('llLocale service', function() {
    var Locale;

    beforeEach(module('govright.llServices'));

    beforeEach(inject(function(_llLocale_) {
      Locale = _llLocale_;
    }));

    it('should return array of locales', function() {
      var locales = Locale.locales();
      expect(locales).to.be.an('array');
      expect(locales.length).to.be.ok;
    });

    it('should consider `en` as a valid locale', function() {
      expect(Locale.isValid('en')).to.be.true;
    });

    it('should consider random string as an invalid locale', function() {
      expect(Locale.isValid('eng')).to.be.false;
    });
  });
});
