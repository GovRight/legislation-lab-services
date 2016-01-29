'use strict';

module.exports = function(config) {
  config.set({
    browsers: ['PhantomJS'],
    files : [
      'bower_components/angular-mocks/angular-mocks.js',
      'src/module.js',
      'src/services/*.js',
      //'test/unit/lib/*.js',
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
      'karma-spec-reporter'
    ],
    specReporter: {
      maxLogLines: 3
    },
    angularFilesort: {
      whitelist: [
        'src/**/*.js'
      ]
    }
  });
};
