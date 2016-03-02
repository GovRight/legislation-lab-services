/* global expect */
'use strict';

describe('grNodeTree', function() {
  var tree, doc = JSON.parse(JSON.stringify(window.__fixtures__.discussionPackage));
  var Locale;

  beforeEach(module('govright.platformServices'));

  describe('#create()', function() {
    beforeEach(function() {
      inject(function(grNodeTree, grLocale) {
        tree = grNodeTree.create(doc);
        Locale = grLocale;
      });
    });

    it('should keep node tree structure', function() {
      expect(doc.nodes.length).to.equal(window.__fixtures__.discussionPackage.nodes.length);
    });

    it('should decorate nodes with href', function() {
      walkNodes(doc.nodes, function(n) {
        // By default, sets node href to it's corpus api link
        expect(n.href.indexOf('http://corpus.govright.org/api/Nodes/')).to.equal(0);
      });
    });

    it('should decorate nodes with parent', function() {
      walkNodes(doc.nodes, function(n, parent) {
        if(parent) {
          expect(n.parent).to.be.an('object');
          expect(n.parent).to.eql(parent);
        }
      });
    });

    it('should decorate nodes with localised title', function() {
      walkNodes(doc.nodes, function(n) {
        expect(n.title).to.equal(getTitle(n));
      });
    });

    it('should decorate nodes with localised text', function() {
      walkNodes(doc.nodes, function(n) {
        expect(n.text).to.equal(getText(n));
      });
    });

    it('should repopulate title and text on locale change', function() {
      Locale.setCurrent('ar');
      walkNodes(doc.nodes, function(n) {
        expect(n.title).to.equal(getTitle(n, 'ar'));
        expect(n.text).to.equal(getText(n, 'ar'));
      });
    });

    it('should search node tree by node id', function() {
      walkNodes(doc.nodes, function(n) {
        var res = tree.findById(n.id);
        expect(res).to.eql(n);
      });
    })
  });


  describe('#create()', function() {
    var maxLength = 10;
    beforeEach(inject(function(grNodeTree) {
      tree = grNodeTree.create(doc, {
        maxTitleLength: maxLength
      });
    }));

    it('should allow to change title length limit', function() {
      walkNodes(doc.nodes, function(n) {
        var title = getTitle(n);
        if(title.length > maxLength) {
          title = title.substring(0, maxLength - 1) + '\u2026';
        }
        expect(n.title).to.equal(title);
      });
    });
  });

  describe('#create()', function() {
    var tmpText = 'TEST 123 # ';
    beforeEach(inject(function(grNodeTree) {
      tree = grNodeTree.create(doc, {
        nodeTitleResolver: function (node) {
          return tmpText + getTitle(node);
        }
      });
    }));

    it('should allow to set custom node title resolver', function () {
      walkNodes(doc.nodes, function(n) {
        expect(n.title.indexOf(tmpText)).to.equal(0);
      });
    });
  });

  describe('#create()', function() {
    beforeEach(inject(function(grNodeTree) {
      tree = grNodeTree.create(doc, {
        nodeHrefResolver: function(node) {
          return 'http://example.com/node/' + node.id;
        }
      });
    }));

    it('should allow to set custom node href resolver', function () {
      walkNodes(doc.nodes, function(n) {
        expect(n.href).to.equal('http://example.com/node/' + n.id);
      });
    });
  });

  describe('#create()', function() {
    beforeEach(inject(function(grNodeTree) {
      doc = JSON.parse(JSON.stringify(window.__fixtures__.discussionPackage));
      tree = grNodeTree.create(doc, {
        populateNodeText: false
      });
    }));

    it('should allow to disable node text extraction', function () {
      walkNodes(doc.nodes, function(n) {
        expect(n.text).to.be.undefined;
      });
    });
  });

  function getTitle(node, locale) {
    locale = locale || Object.keys(node.original.locales)[0];
    return node.original.locales[locale].title;
  }

  function getText(node, locale) {
    locale = locale || Object.keys(node.original.locales)[0];
    return node.original.locales[locale].text || '';
  }

  function walkNodes(nodes, cb, parent) {
    nodes.forEach(function(n) {
      cb(n, parent);
      if(n.nodes) {
        walkNodes(n.nodes, cb, n);
      }
    });
  }
});
