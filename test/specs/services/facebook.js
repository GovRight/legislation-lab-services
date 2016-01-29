/* global expect */
'use strict';

describe('llFacebook service', function() {
  var Facebook;

  beforeEach(module('govright.llServices'));

  beforeEach(inject(function(_llFacebook__) {
    Facebook = _llFacebook__;
  }));
});
