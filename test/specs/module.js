/* global expect */
'use strict';

describe('MODULES', function() {
  [
    'govright.llServices',
    'govright.corpusServices',
    'ngMaterial',
    'ui.router',
    'gettext'
  ].forEach(function(module) {
    it(module + ' module should be registered', function() {
      expect(angular.module(module)).to.be.ok;
    });
  });
});
