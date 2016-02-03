# GovRight Legislation Lab Services

The `govright.llServices` module provides services that encapsulate
common techniques of interacting with the GovRight Corpus API.

## Usage

Add `govright.llServices` module as a dependency to your main application module. 
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

Useful commands:

* `npm test` - run tests
* `gulp` - build packaged files (dist) from sources
* `gulp docs` - build html documentation from source ngdocs, changes must be commited on `gh-pages` branch
* `gulp serve` - run local documentation server
