/* global expect */
'use strict';

describe('grEmbeddingParams', function() {
  var embeddingParams;
  var sampleParams = {
    appPort: parseInt(Math.random() * 1000),
    query: 'test1=a&test2=b'
  };

  var div = document.createElement('div');
  Object.keys(sampleParams).forEach(function(k) {
    div.dataset[k] = sampleParams[k];
  });
  document.body.appendChild(div);

  beforeEach(module('govright.platformServices'));

  describe('when root element is <html>', function() {
    beforeEach(function() {
      module(function(_grEmbeddingParamsProvider_) {
        _grEmbeddingParamsProvider_.setAppRoot(document.getElementsByTagName('html')[0]);
      });
      inject(function(_grEmbeddingParams_) {
        embeddingParams = _grEmbeddingParams_;
      })
    });
    it('isEmbeddedMode should be `false`', function() {
      expect(embeddingParams.isEmbeddedMode).to.be.false;
    });
  });

  describe('when root element is not <html>', function() {
    beforeEach(function() {
      module(function(_grEmbeddingParamsProvider_) {
        _grEmbeddingParamsProvider_.setAppRoot(document.getElementsByTagName('div')[0]);
      });
      inject(function(_grEmbeddingParams_) {
        embeddingParams = _grEmbeddingParams_;
      })
    });
    it('isEmbeddedMode should be `true`', function() {
      expect(embeddingParams.isEmbeddedMode).to.be.true;
    });
    it('element data attributes should be recognised', function() {
      expect(embeddingParams.appPort).to.equal('' + sampleParams.appPort);
      expect(embeddingParams.query).to.be.an('object');
    });
    it('`query` param should be parsed correctly', function() {
      expect(embeddingParams.query.test1).to.equal('a');
      expect(embeddingParams.query.test2).to.equal('b');
    });
  });
});
