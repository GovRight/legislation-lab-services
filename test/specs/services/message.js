/* global expect */
'use strict';

describe('llMessage service', function() {
  var Message;

  beforeEach(module('govright.platformServices'));

  beforeEach(inject(function(_grMessage__) {
    Message = _grMessage__;
  }));
});
