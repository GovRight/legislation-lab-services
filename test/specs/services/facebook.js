/* global expect */
'use strict';

describe('llFacebook service', function() {
  var Facebook;

  beforeEach(module('govright.platformServices'));

  beforeEach(inject(function(_grFacebook__) {
    Facebook = _grFacebook__;
  }));
});
