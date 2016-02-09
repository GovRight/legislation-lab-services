# GovRight Legislation Lab Services

The `govright.llServices` module provides services that encapsulate
common techniques of interacting with the GovRight Corpus API.
Check the [documentation](http://govright.github.io/platform-services/docs/#/api/govright.platformServices)
for detailed API reference.

## Usage

Add `govright.llServices` module as a dependency to your main application module. Example:

```html
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
```

This will add the following services to your app:

* `llAuth`
* `llFacebook`
* `llLocale`
* `llMessage`

## Further reading

* Check the [documentation](http://govright.github.io/legislation-lab-services/docs/#/api/govright.llServices)
for examples and more detailed description of each service.
* Check this [AngularJS boilerplate](https://github.com/GovRight/angular-bootstrap) by GovRight as an example 

## Development

First install your local project's npm tools:

```bash
# This will install all the npm & bower packages:
npm install
```

Then run the gulp tasks:

```bash
# To build packaged js files from sources
gulp

# To build html documentation from source ngdocs
# Changes must be commited on `gh-pages` branch
gulp docs

# To run local documentation server
gulp serve
```

Finally, test the package:

```bash
# To run tests from `/test/specs` with npm
npm test
```
