'use strict';

/**
 * @ngdoc object
 * @name govright.platformServices.grNodeTree
 * @header govright.platformServices.grNodeTree
 *
 * @description
 *
 * This service loops through node tree and decorates nodes with
 * commonly used data like url or localised title.
 */
(function() {
  angular
    .module('govright.platformServices')
    .factory('grNodeTree', NodeTree);

  NodeTree.$inject = ['$rootScope', 'grLocale'];

  function NodeTree($rootScope, Locale) {
    var defaultSettings = {
      maxTitleLength: 0,
      populateNodeText: true,
      repopulateOnLocaleChange: true,
      nodeTitleResolver: function(node) {
        return Locale.property(node.original, 'title');
      },
      nodeHrefResolver: function(node) {
        // By default, sets node href to it's corpus api link
        // Must be set individually for each project
        return 'http://corpus.govright.org/api/Nodes/' + node.id + '?filter[include][original]';
      }
    };

    function NodeTreeController(document, customSettings) {
      var settings = angular.extend({}, defaultSettings, customSettings);
      var nodeIdMap = {};
      var flattenedNodes = [];
      var self = this;

      function walkNodes(parent, depth) {
        parent.nodes.forEach(function (node) {
          flattenedNodes.push(node);
          nodeIdMap[node.id] = node;
          node.parent = parent;
          node.depth = depth;

          node.title = self.nodeTitle(node);
          node.href = self.nodeHref(node);
          if (settings.populateNodeText) {
            node.text = Locale.property(node.original, 'text', true) || '';
          }

          walkNodes(node, depth + 1);
        });
      }

      this.findById = function(id) {
        return nodeIdMap[id];
      };

      this.nodeTitle = function(n) {
        var title = settings.nodeTitleResolver(n, document);
        if (title && settings.maxTitleLength && title.length > settings.maxTitleLength) {
          title = title.substring(0, settings.maxTitleLength - 1) + '\u2026';
        }
        return title;
      };

      this.nodeHref = function(n) {
        return settings.nodeHrefResolver(n, document);
      };

      this.openNodeParents = function (n) {
        if(n && n.parent && n.parent.original) {
          if(!n.parent.open) {
            n.parent.open = true;
          }
          this.openNodeParents(n.parent);
        }
      };

      walkNodes(document, 0);
      // It's difficult to build up the links in the above recursive walk
      // because of abstract nodes which must be skipped.
      var prev = null;
      flattenedNodes.forEach(function (node) {
        if (!node.abstract) {
          node.prev = prev;
          node.next = null;
          if (prev) { prev.next = node; }
          prev = node;
        }
      });

      // Repopulate title, text and link on locale change
      if(settings.repopulateOnLocaleChange) {
        $rootScope.$on('locale:changed', function () {
          flattenedNodes.forEach(function (node) {
            node.title = self.nodeTitle(node);
            node.href = self.nodeHref(node);
            if (settings.populateNodeText) {
              node.text = Locale.property(node.original, 'text', true) || '';
            }
          });
        });
      }
    }

    return {
      /**
       * @ngdoc method
       * @name govright.platformServices.grNodeTree#create
       * @methodOf govright.platformServices.grNodeTree
       *
       * @description
       *
       * Precessing node tree of provided document (law or discussion).
       * Modifies nodes by reference. The following fields are populated on each node:
       *
       * <table>
       *   <tr>
       *     <td>`parent`</td>
       *     <td><a href="" class="label type-hint type-hint-object">Object</a></td>
       *     <td>Parent node reference</td>
       *   <tr>
       *   <tr>
       *     <td>`depth`</td>
       *     <td><a href="" class="label type-hint type-hint-number">Number</a></td>
       *     <td>Node depth, starts with 0 for root nodes</td>
       *   <tr>
       *   <tr>
       *     <td>`title`</td>
       *     <td><a href="" class="label type-hint type-hint-string">String</a></td>
       *     <td>Localised node title extracted from original version locales</td>
       *   <tr>
       *   <tr>
       *     <td>`text`</td>
       *     <td><a href="" class="label type-hint type-hint-string">String</a></td>
       *     <td>Localised node text extracted from original version locales</td>
       *   <tr>
       *   <tr>
       *     <td>`href`</td>
       *     <td><a href="" class="label type-hint type-hint-string">String</a></td>
       *     <td>Node url</td>
       *   <tr>
       * </table>
       *
       * Example controller:
       *
       * <pre>
       * angular
       *   .module('myApp')
       *   .controller(['$scope', 'Law', 'grNodeTree', function($scope, Law, NodeTree) {
       *     Law.package(function(law) {
       *       var tree = NodeTree.create(law, {});
       *       $scope.law = law;
       *     });
       * }]);
       * </pre>
       *
       * Corresponding template:
       *
       * <pre>
       * <ul>
       *   <li ng-repeat="n in ::law.nodes"
       *       ng-init="depth = 0"
       *       ng-include="'template:node-index-item'"></li>
       * </ul>
       *
       * <!-- Nested node template -->
       * <script type="text/ng-template" id="template:node-index-item">
       *   <a ng-href="{{::n.href}}">
       *     {{::n.title}}
       *   </a>
       *   <ul ng-if="n.nodes.length">
       *     <li ng-repeat="n in ::n.nodes"
       *         ng-init="depth = depth + 1"
       *         ng-include="'template:node-index-item'"></li>
       *   </ul>
       * </script>
       * </pre>
       *
       * @param {Object} document Law or discussion package
       *
       * @param {Object} settings Custom settings object that can have the next fields:
       * <table>
       *   <tr>
       *     <td>maxTitleLength</td>
       *     <td><a href="" class="label type-hint type-hint-number">Number</a></td>
       *     <td>Max length of node title in the tree.
       *     Default is `0` which means no length limit.</td>
       *   <tr>
       *      <tr>
       *     <td>populateNodeText</td>
       *     <td><a href="" class="label type-hint type-hint-boolean">Boolean</a></td>
       *     <td>
       *         Enable/disable node text extraction, default is `true`.
       *     </td>
       *   <tr>
       *   <tr>
       *     <td>repopulateOnLocaleChange</td>
       *     <td><a href="" class="label type-hint type-hint-boolean">Boolean</a></td>
       *     <td>
       *         Enable/disable node text & title extraction on every locale change,
       *         default is `true`.
       *     </td>
       *   <tr>
       *   <tr>
       *     <td>nodeTitleResolver</td>
       *     <td><a href="" class="label type-hint type-hint-object">Function</a></td>
       *     <td>Function that resolves node title. Each node in the tree is yielded to
       *       this function. Parameters:<br><br>
       *       <ol>
       *           <li>`node` - current node
       *           <li>`document` - current document (law or discussion)
       *           <li>`depth` - node depth
       *       </ol><br>
       *       Default resolver returns localised title of node original.
       *     </td>
       *   <tr>
       *   <tr>
       *     <td>nodeHrefResolver</td>
       *     <td><a href="" class="label type-hint type-hint-object">Function</a></td>
       *     <td>Function that resolves node title. Each node in the tree is yielded to
       *       this function. Parameters:<br><br>
       *       <ol>
       *           <li>`node` - current node
       *           <li>`document` - current document (law or discussion)
       *       </ol><br>
       *       Default resolver returns corpus link of node.
       *     </td>
       *   <tr>
       * </table>
       * Example:
       * <pre>
       * angular
       *   .module('myApp')
       *   .controller(['$scope', '$state', 'Law', 'grNodeTree', 'grLocale'
       *     function($scope, $state, Law, NodeTree, Locale) {
       *
       *       Law.package(function(law) {
       *
       *         var tree = NodeTree.create(law, {
       *
       *           // Define maximum title length, default is 0 (no limit)
       *           maxTitleLength: 25,
       *
       *           // Custom logic to resolve each node title
       *           nodeTitleResolver: function(node) {
       *             return Locale.property(node.original, title, true);
       *           },
       *
       *           // Custom logic to build each node url
       *           nodeHrefResolver: function(node) {
       *             return $state.href('site.law.node', { nodeId: node.id });
       *           }
       *         });
       *
       *         $scope.law = law;
       *       });
       * }]);
       * </pre>
       *
       * @return {Object} Node tree instance, can be used to search in the node tree
       * by node id. Example:
       *
       * <pre>
       * // Consider `tree` from the example above
       * var node = tree.findById('node-id');
       * </pre>
       */
      create: function(document, settings) {
        return new NodeTreeController(document, settings);
      }
    };
  }
}());
