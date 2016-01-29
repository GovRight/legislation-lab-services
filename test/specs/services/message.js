/* global expect */
'use strict';

describe('llMessage service', function() {
  var Message;

  beforeEach(module('govright.llServices'));

  beforeEach(inject(function(_llMessage__) {
    Message = _llMessage__;
  }));
});
