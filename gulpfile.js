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
var zip = require('gulp-zip');

var webserver = require('gulp-webserver');

function bundle() {
    // set up the browserify instance on a task basis
    var b = browserify({
        entries: './js/index.js',
        debug: true
    });
    //b = watchify(b);
    b.transform('brfs');

    //TODO: fires twice
    b.on('bundle', function () {
        gutil.log('Bundle compiled');
    });

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

gulp.task('server', function () {
    return gulp.src('.')
        .pipe(webserver({
            livereload: false,
            host: 'dev.firetasks.com',
            port: 8000,
            directoryListing: false
        }));
});

gulp.task('package', function () {
    gulp.src(['build/bundle.js', 'build/bundle.js.map', 'css/*.css', 'fonts/**/*', 'icons/**/*', 'images/**/*', 'style/**/*', 'style_unstable/**/*', '!js', './*.html', './*.css', './*.json', './manifest.webapp', 'WHATSNEW', './*.appcache'], {base: '.'})
        .pipe(zip('package.zip', {compress: true}))
        .pipe(gulp.dest('.'));
});

gulp.task('out', ['build'], function () {
    gulp.src(['build/bundle.js', 'build/bundle.js.map', 'css/*.css', 'fonts/**/*', 'icons/**/*', 'images/**/*', 'style/**/*', 'style_unstable/**/*', 'js/**/*', './*.html', './*.css', './*.json', './manifest.webapp', 'WHATSNEW', './*.appcache'], {base: '.'})
        .pipe(gulp.dest('./build/package'));
});

gulp.task('dev', ['server', 'watch']);

gulp.task('release', ['package']);
