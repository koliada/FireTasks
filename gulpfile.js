var gulp = require('gulp'),
    browserify = require('browserify'),
    rename = require('gulp-rename'),
    fs = require('fs');

var watchify = require('watchify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var gutil = require('gulp-util');

var webserver = require('gulp-webserver');

function bundle() {
    // set up the browserify instance on a task basis
    var b = browserify({
        entries: './js/index.js',
        debug: true
    });
    //b = watchify(b);
    b.transform('brfs');

    return b.bundle()
        .pipe(source('./bundle.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
        // Add transformation tasks to the pipeline here.
        //.pipe(uglify())
        .on('error', gutil.log)
        .pipe(sourcemaps.write('./', {includeContent: false, sourceRoot: '..'}))
        .pipe(gulp.dest('./build'));
}

gulp.task('build', function () {
    return bundle();
});

gulp.task('watch', function () {
    return gulp.watch(['./js/**/*.js', 'version.json'], bundle);
    //watcher.on('change', function(event) {
    //    console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
    //    bundle();
    //});
});

gulp.task('dev', ['watch'], function () {
    return gulp.src('.')
        .pipe(webserver({
            livereload: false,
            host: 'dev.firetasks.com',
            port: 8000,
            directoryListing: false
        }));
});
