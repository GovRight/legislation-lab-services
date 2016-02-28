'use strict';

module.exports = function(config) {
  config.set({
    browsers: ['PhantomJS'],
    preprocessors: {
      'test/fixtures/**/*.json': ['json_fixtures']
    },
    files : [
      'bower_components/angular-mocks/angular-mocks.js',
      'test/fixtures/**/*.json',
      'src/module.js',
      'src/services/*.js',
      'test/mocks/**/*.js',
      'test/specs/**/*.js'
    ],
    logLevel: 'info',
    basePath: '../',
    frameworks: ['mocha', 'chai', 'wiredep', 'angular-filesort'],
    reporters: ['spec'],
    colors: true,
    plugins : [
      'karma-wiredep',
      'karma-mocha',
      'karma-chai',
      'karma-angular-filesort',
      'karma-phantomjs-launcher',
      'karma-mocha-reporter',
      'karma-spec-reporter',
      'karma-json-fixtures-preprocessor'
    ],
    specReporter: {
      maxLogLines: 3
    },
    angularFilesort: {
      whitelist: [
        'src/**/*.js'
      ]
    },
    jsonFixturesPreprocessor: {
      stripPrefix: 'test/fixtures/',
      camelizeFilenames: true
    }
  });
};
