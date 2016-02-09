/* global expect */
'use strict';

describe('grMessage', function() {
  var Message, state;

  beforeEach(function() {
    module('govright.platformServices');
    module('stateMock');
  });

  beforeEach(inject(function(_grMessage_, $state) {
    Message = _grMessage_;
    state = $state;
  }));

  describe('#error404()', function() {
    it('should transition to site.404 state', function() {
      state.expectTransitionTo('site.404');
      Message.error404();
      state.ensureAllTransitionsHappened();
    });
  });

  describe('#transition()', function() {
    it('should transition to site.message state', function() {
      state.expectTransitionTo('site.message');
      Message.transition();
      state.ensureAllTransitionsHappened();
    });
  });
});
