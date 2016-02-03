'use strict';

/**
 * @ngdoc overview
 * @name govright.llServices
 * @module govright.llServices
 *
 * @description
 *
 * The `govright.llServices` module provides services that encapsulate
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
     <!-- Include the ll services script -->
     <script src="dist/govright-ll-services.js"></script>
     <script>
       // ...and add 'govright.llServices' as a dependency
       var myApp = angular.module('myApp', ['govright.llServices']);
     </script>
   </head>
   <body></body>
 </html>
 * </pre>
 */
(function() {
  angular
    .module('govright.llServices', ['govright.corpusServices', 'ui.router', 'gettext', 'ngMaterial']);
}());
