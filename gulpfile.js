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
  ]).pipe($.concat('govright-ll-services.js'))
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
      glob: ['./dist/govright-ll-services.js'],
      api: true,
      title: 'API Reference'
    }
  }).pipe($.ngdocs.process({
    startPage: '/api/govright.llServices',
    html5Mode: false,
    title: 'GovRight Legislation Lab Services',
    styles: [ 'bower_components/gulp-ngdocs-supplemental/dist/style.css' ],
    navTemplate: './ngdocs_assets/navbar.html'
  }))
    .pipe(gulp.dest('./docs'));
});

gulp.task('serve', ['docs'], function () {
  browserSync({
    notify: false,
    port: 9000,
    server: {
      baseDir: ['./docs']
    }
  });
  gulp.watch([
    './dist/govright-ll-services.js',
    './docs/partials/**/*',
    './docs/css/**/*'
  ]).on('change', reload);
  gulp.watch([
    './dist/govright-ll-services.js',
    './ngdocs_assets/**/*'
  ], ['docs']);
  gulp.watch([
    './src/**/*.js'
  ], ['js']);
});

gulp.task('docs', ['docs-html'/*, 'docs-md'*/]);

gulp.task('default', ['js']);
