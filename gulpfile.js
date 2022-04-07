// Include gulp
var gulp = require('gulp');

// Include Our Plugins
var jshint = require('gulp-jshint');
var jslint = require('gulp-jslint');
var sass   = require('gulp-sass');
var cleanCSS = require('gulp-clean-css');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var htmlmin = require('gulp-htmlmin');
var bower = require('gulp-bower-src');
var image = require('gulp-image');
var gulpFilter = require('gulp-filter');
var gulpif = require('gulp-if')
var browserSync = require('browser-sync').create();
var runSequence = require('run-sequence');
var del    = require('del');
var config = require('./config');
var delConfig = config.del;

function isProd(env) {
    return env == 'prod';
}
// Lint Task
function lint(env) {
    return function() {
        return gulp.src('js/**/*.js')
            .pipe(jshint())
            .pipe(jshint.reporter('unix'))
            .pipe(jshint.reporter('fail'));
    }
}
gulp.task('dev:lint', lint('dev'));
gulp.task('prod:lint', lint('prod'));

// Compile Sass
function compile_sass(env) {
    return function() {
        return gulp.src('scss/**/*.scss')
        .pipe(sass())
        .pipe(gulpFilter(['**/style.css', '**/index.css']))
        .pipe(gulpif(isProd(env), cleanCSS()))
        .pipe(gulp.dest(config[env] + '/css'));
    }
}
gulp.task('dev:sass', compile_sass('dev'));
gulp.task('prod:sass', compile_sass('prod'));

// Concatenate & Minify JS
function compile_js(env) {
    return function () {
        return gulp.src('js/**/*.js')
        .pipe(concat('app.min.js'))
        .pipe(gulpif(isProd(env), uglify()))
        .pipe(gulp.dest(config[env] + '/js'));
    }
}
gulp.task('dev:scripts', compile_js('dev'));
gulp.task('prod:scripts', compile_js('prod'));

// Concatenate & Minify vendor js
function compile_vendor_js(env){
    return function(){
        return bower()
            .pipe(gulpFilter([
            '**/jquery/dist/jquery.js',
            '**/jquery-ui/jquery-ui.js',
            '**/renderjson/renderjson.js',
            '**/urijs/src/URI.js',
            '**/jqueryui-timepicker-addon/dist/jquery-ui-timepicker-addon.js',
            '**/sprintf/src/sprintf.js',
            '**/leaflet/dist/leaflet-src.js',
            '**/notifyjs/dist/notify.js',
            '**/wkt2geojson/wkt2geojson.js',
            '**/leaflet.label/leaflet.label.js',
            '**/d3/d3.js']))
            .pipe(concat('lib.min.js'))
            .pipe(gulpif(isProd(env),uglify()))
            .pipe(gulp.dest(config[env] + '/lib'));
    }
}
gulp.task('dev:bowerJs', compile_vendor_js('dev'));
gulp.task('prod:bowerJs', compile_vendor_js('prod'));

// Concatenate & Minify vendor css
function compile_vendor_css(env){
    return function(){
        return bower()
        .pipe(gulpFilter([
            '**/jqueryui-timepicker-addon/dist/jquery-ui-timepicker-addon.css',
            '**/leaflet/dist/leaflet.css',
            '**/leaflet.label/leaflet.label.css',
            '**/notifyjs/dist/styles/metro/notify-metro.css']))
            .pipe(concat('vendor.min.css'))
            .pipe(gulpif(isProd(env),cleanCSS()))
            .pipe(gulp.dest(config[env] + '/css'));
    }
}
gulp.task('dev:bowerCss', compile_vendor_css('dev'));
gulp.task('prod:bowerCss', compile_vendor_css('prod'));

// Concatenate & Minify vendor css
function copy_vendor_image(env){

    return function(){
        return bower()
            .pipe(gulpFilter([
                '**/leaflet/dist/images/*.png'
            ]
            ))
            .pipe(image({
                pngquant: true,
                optipng: false,
                zopflipng: true,
                advpng: true,
                jpegRecompress: false,
                jpegoptim: true,
                mozjpeg: true,
                gifsicle: true,
                svgo: true
            }))
            .pipe(gulp.dest(config[env] + '/lib/img'));
    }
}
gulp.task('dev:bowerImg', copy_vendor_image('dev'));
gulp.task('prod:bowerImg', copy_vendor_image('prod'));

gulp.task('dev:bower', 
    gulp.parallel('dev:bowerJs', 'dev:bowerCss', 'dev:bowerImg')
);

gulp.task('prod:bower', 
    gulp.parallel('prod:bowerJs', 'prod:bowerCss', 'prod:bowerImg')
);

// Compress img
function compress_img(env) {
    return function(){
        return gulp.src('img/**')
            .pipe(image({
                pngquant: true,
                optipng: false,
                zopflipng: true,
                advpng: true,
                jpegRecompress: false,
                jpegoptim: true,
                mozjpeg: true,
                gifsicle: true,
                svgo: true
            }))
            .pipe(gulp.dest(config[env] + '/img'));
    }
}
gulp.task('dev:img', compress_img('dev'));
gulp.task('prod:img', compress_img('prod'));

// Minify html
function compile_html(env){
    return function() {
        return gulp.src('app/*.html')
        .pipe(htmlmin({collapseWhitespace: isProd(env)}))
        .pipe(gulp.dest(config[env]))
    }
}
gulp.task('dev:minify_html', compile_html('dev'));
gulp.task('prod:minify_html', compile_html('prod'));

// Add CNAME if exist
function add_cname(env){
    return function() {
        return gulp.src('CNAME')
        .pipe(gulp.dest(config[env]))
    }
}
gulp.task('dev:add_cname', add_cname('dev'));
gulp.task('prod:add_cname', add_cname('prod'));

// Watch Files For Changes
function watch(env){
    return function() {
        gulp.watch('js/**/*.js', gulp.series(env + ':scripts'));
        gulp.watch('scss/**/*.scss', gulp.series(env + ':sass'));
        gulp.watch('img/**', gulp.series(env + ':img'));
        gulp.watch('app/*.html', gulp.series(env + ':minify_html'));
        gulp.watch('CNAME', gulp.series(env + ':add_cname'));
        browserSync.init(config.browsersync[env]);
    }
}
gulp.task('dev:watch', watch('dev'));
gulp.task('prod:watch', watch('prod'));

// build sequence
function build(env) {
    return gulp.series( env + ':scripts', env + ':lint',
                        gulp.parallel(
                            env + ':sass', 
                            env + ':bower',
                            env + ':img',
                            env + ':minify_html',
                            env + ':add_cname')
    );
}
gulp.task('dev:build', build('dev'));
gulp.task('prod:build', build('prod'));

gulp.task('dev', gulp.series('dev:build', 'dev:watch'));
gulp.task('prod', gulp.series('prod:build', 'prod:watch'));

gulp.task('all:clean', function(cb) {
    del(delConfig.all)
    cb();
})

gulp.task('dev:clean', function(cb){
    del(delConfig.dev);
    cb();
})

gulp.task('prod:clean', function(cb){
    del(delConfig.prod);
    cb();
})
