'use strict';

window.bootstrap = {
  fixtures: window.__fixtures__,
  scope: function() {
    var scope;
    inject(function($rootScope) {
      scope = $rootScope.$new();
    });

    // Scope mocks
    scope.resetLayoutFeatures = function() {};

    return scope;
  }
};
