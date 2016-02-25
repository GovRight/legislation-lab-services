'use strict';

/**
 * @ngdoc overview
 * @name govright.platformServices
 * @module govright.platformServices
 *
 * @description
 *
 * The `govright.platformServices` module provides services that encapsulate
 * common techniques of interacting with the GovRight Corpus API
 *
 * ## Module dependencies
 *
 * * [`govright.corpusServices`](https://github.com/GovRight/corpus-services)
 * * [`ui.router`](https://github.com/angular-ui/ui-router)
 * * [`gettext`](https://angular-gettext.rocketeer.be/)
 * * [`ngMaterial`](https://material.angularjs.org/latest/)
 *
 * ## Example
 *
 * <pre>
 <!doctype html>
 <html ng-app="myApp">
   <head>
     <script src="js/angular.js"></script>
     <!-- Include the platform services script -->
     <script src="dist/govright-platform-services.js"></script>
     <script>
       // ...and add 'govright.platformServices' as a dependency
       var myApp = angular.module('myApp', ['govright.platformServices']);
     </script>
   </head>
   <body></body>
 </html>
 * </pre>
 */
(function() {
  angular
    .module('govright.platformServices', ['govright.corpusServices', 'ui.router', 'gettext', 'ngMaterial', 'ngLodash']);
}());
