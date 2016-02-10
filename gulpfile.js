var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var browserSync = require('browser-sync');
var reload = browserSync.reload;

gulp.task('jshint', function () {
  return gulp.src('./src/**/*.js')
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'));
});

gulp.task('js', function () {
  return gulp.src([
    './src/module.js',
    './src/services/*.js'
  ]).pipe($.concat('govright-platform-services.js'))
    .pipe($.replace(/'use strict';\n/g, ''))
    .pipe($.wrap('(function(){\'use strict\';\n<%= contents %>})();'))
    .pipe(gulp.dest('./dist'))
    .pipe($.uglify())
    .pipe($.rename({
      extname: '.min.js'
    }))
    .pipe(gulp.dest('./dist'));
});

gulp.task('docs-html', function () {
  return $.ngdocs.sections({
    api: {
      glob: ['./dist/govright-platform-services.js'],
      api: true,
      title: 'API Reference'
    }
  }).pipe($.ngdocs.process({
    startPage: '/api/govright.platformServices',
    html5Mode: false,
    title: 'GovRight Platform Services',
    styles: [ 'bower_components/gulp-ngdocs-supplemental/dist/style.css' ],
    navTemplate: './ngdocs_assets/navbar.html'
  }))
    .pipe(gulp.dest('./docs'));
});

gulp.task('serve', ['default'], function () {
  browserSync({
    notify: false,
    port: 9000,
    server: {
      baseDir: ['./docs']
    }
  });
  gulp.watch([
    './dist/govright-platform-services.js',
    './docs/partials/**/*',
    './docs/css/**/*'
  ]).on('change', reload);
  gulp.watch([
    './dist/govright-platform-services.js',
    './ngdocs_assets/**/*'
  ], ['docs-html']);
  gulp.watch([
    './src/**/*.js'
  ], ['js']);
});

gulp.task('docs', function() {
  return require('del')(['./docs']).then(function() {
    return gulp.start('docs-html');
  });
});

gulp.task('default', ['js'], function() {
  return gulp.start('docs');
});
