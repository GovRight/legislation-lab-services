# GovRight Platform Services

The `govright.platformServices` module provides services that encapsulate
common techniques of interacting with the GovRight Corpus API.
Check the [documentation](http://govright.github.io/platform-services/docs/#/api/govright.platformServices)
for detailed API reference.

## Usage

Add `govright.platformServices` module as a dependency to your main application module. Example:

```html
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
```

This will add the following services to your app:

* [`grAuth`](http://govright.github.io/platform-services/docs/#/api/govright.platformServices.grAuth)
* [`grEmbeddingParams`](http://govright.github.io/platform-services/docs/#/api/govright.platformServices.grEmbeddingParams) 
(and [provider](http://govright.github.io/platform-services/docs/#/api/govright.platformServices.grEmbeddingParamsProvider))
* [`grFacebook`](http://govright.github.io/platform-services/docs/#/api/govright.platformServices.grFacebook)
* [`grLocale`](http://govright.github.io/platform-services/docs/#/api/govright.platformServices.grLocale)
* [`grMessage`](http://govright.github.io/platform-services/docs/#/api/govright.platformServices.grMessage)
* [`grNodeTree`](http://govright.github.io/platform-services/docs/#/api/govright.platformServices.grNodeTree)

## Further reading

* Check the [documentation](http://govright.github.io/legislation-lab-services/docs/#/api/govright.platformServices)
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
gulp js

# To build html documentation from source ngdocs
# Changes must be commited on `gh-pages` branch
gulp docs

# To run local documentation server
gulp serve

# Build dist and docs
gulp
```

Finally, test the package:

```bash
# To run tests from `/test/specs` with npm
npm test
```
