const gulp = require('gulp');
const sass = require('gulp-sass');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const postcss = require('gulp-postcss');
const gUtil = require('gulp-util');
const svgstore = require('gulp-svgstore');
const inject = require('gulp-inject');
const ftp = require('vinyl-ftp');
const cssnano = require('cssnano');
const autoprefixer = require('autoprefixer');
const browserSync = require('browser-sync').create();
const webpack = require('webpack');
const chalk = require('chalk');
const async = require('async');
// webpack config
const devConfig = require('./webpack.dev');
const prodConfig = require('./webpack.prod');
// gulp functions
const { src, dest, series } = gulp;
// store url to proxy
const ftpSettings = require('./ftp.settings.json');
const { toProxy } = ftpSettings;
// scss paths
const scssStyles = [
    './assets/scss/main.scss',
];
// compiled css paths
const cssStyles = [
    './dist/css/main.min.css',
];

/*-------------------------------------------------
---------------------------------------------------
    Gulp Tasks
---------------------------------------------------
/*-------------------------------------------------

/**
 * Compile css
 */
gulp.task('compileCSS', done => {
    minifyScss().on('end', () => {
        console.log(`SCSS COMPILED ${chalk.magenta(' SUCCESSFULLY!')}`);
        done();
    });
});

/**
 * Compile for development on the server
 */
gulp.task('compile:dev', done => buildWebpackDev(devConfig, done));

/**
 * Compile js for production
 */
gulp.task('compileJs:prod', done => buildWebpackDev(prodConfig, done));

/**
 * Start local dev server
 */
gulp.task('serve', () => {
    console.log(chalk.magenta('compiling scss...'));
    console.log(chalk.yellow('compiling js...'));
    compileScss();
    buildWebpackDev(devConfig, setWatchers);
});

/**
 * Upload to server
 */
gulp.task('upload', done => {
    const { host, user, password, remotePath } = ftpSettings;
    // const validPath = /^\/subdomains\//;
    // if (!validPath.test(remotePath)) {
    //     return done(console.log(chalk.bold.redBright('deploying to this path is forbidden!')));
    // }
    console.log(chalk.bold.cyanBright('Starting upload...'));
    console.log(chalk.blue('cleaning up remote...'));
    const connection = ftp.create({
        host,
        user,
        password,
        log: gUtil.log,
    });
    const options = {
        jsPath: 'assets/dist/**',
        cssPath: 'assets/css/**',
        remotePath,
    }
    const distPathRemote = `${options.remotePath}/dist`;
    const cssPathRemote = `${options.remotePath}/css`;
    cleanServer(connection, [cssPathRemote, distPathRemote], err => {
        if (err) throw err;
        console.log(chalk.greenBright('All clean!'));
        console.log(chalk.bold.blueBright('Uploading to remote...'));
        const uploading = uploadToServer(connection, options)
        uploading.on('end', () => {
            console.log(chalk.greenBright('Upload is complete!'));
            done();
        });
        done();
    })
});

/**
 * Compile css and js for production
 */
gulp.task('compile:prod', series('compileCSS', 'compileJs:prod'));

/**
 * Compiles and deploys to server
 */
gulp.task('deploy:prod', series('compileCSS', 'compileJs:prod', 'upload'));

/**
 * Svgstore
 */
gulp.task('svgstore', runSvgstore);

/*-------------------------------------------------
---------------------------------------------------
    Functions
---------------------------------------------------
/*-------------------------------------------------

/**
 * Runs svgstore
 */
function compileSvgstore() {
    return gulp
        .src('assets/icons/*.svg')
        .pipe(svgstore({ inlineSvg: true }))
}

function runSvgstore() {
    const svgs = compileSvgstore();

    function fileContents(filePath, file) {
        return file.contents.toString();
    }

    return gulp
        .src('template-parts/icons.php')
        .pipe(inject(svgs, { transform: fileContents }))
        .pipe(gulp.dest('template-parts'));
}

/**
 * Compile scss for local development
 */
function compileScss() {   
    return src(scssStyles)
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(sourcemaps.write('.'))
        .pipe(dest('dist/css'));
}

/**
 * Compile scss for production
 */
function minifyScss() {
    return src(scssStyles)
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(sass({
            outputStyles: 'compressed',
        }))
        .pipe(postcss([ autoprefixer(), cssnano({ discardComments: true })]))
        .pipe(rename({ suffix: '.min' }))
        .pipe(sourcemaps.write('./'))
        .pipe(dest('dist/css'))
}

/**
 * Start browsersync instance. Proxies store url
 */
function startBrowserSync() {
    const { publicPath } = ftpSettings;
    const trimmedPath = publicPath.replace(/(^\.\/|^\/)/, '');
    const cssPath = trimmedPath.replace('dist/', 'css/');
    return browserSync.init({
        https: true,
        open: false,
        proxy: {
            target: toProxy,
            proxyRes: [
                (proxyRes, req) => {
                    const cspHeader = proxyRes.headers['content-security-policy'];
                    if (!cspHeader) return
                    const newCsp = new CspParse(cspHeader);
                    const url = `wss://${req.headers.host}`;
                    newCsp.add('default-src', url);
                    const newCspString = newCsp.toString();
                    proxyRes.headers['content-security-policy'] = newCspString;
                }
            ]
        },
        files: ['dist/**'],
        serveStatic: ['./dist'],
        rewriteRules: [
            {
                match: new RegExp(`${trimmedPath}main.js`),
                fn: () => 'main.js',
            },
            {
                match: new RegExp(`${trimmedPath}polyfill.js`),
                fn: () => 'polyfill.js',
            },
            {
                match: new RegExp(`${cssPath}main.css`),
                fn: () => 'main.css',
            },
        ],
    });
};

/**
 * Builds js with webpack
 * @param {object} config the webpack config object
 * @param {function} done callback
 */
function buildWebpackDev(config, done) {
    webpack(config).run(onBuild(done));
}

/**
 * After webpack build callback. Outputs build info
 * @param {function} done callback 
 */
function onBuild(done) {
    return (err, stats) => {
        if (err) {
            console.log('Error', err);
        } else {
            Object.keys(stats.compilation.assets).forEach((key) => {
                console.log(`Webpack: ${chalk.cyan('output')} `, chalk.green(key));
            });
            console.log('Webpack: ', chalk.blue('finished!'));
        }
        if (done) done();
    }
}

/**
 * Starts dev server and watches files for changes
 */
function setWatchers() {
    console.log(chalk.green('starting local dev...'));
    startBrowserSync();

    const scssWatcher = gulp.watch([
        'assets/**/*.scss',
    ]);
    scssWatcher.on('change', path => {
        compileScss().on('end', () => browserSync.reload(cssStyles));
        console.log(chalk.magenta('scss change in: '), chalk.green(path));
    });

    
    const jsWatcher = gulp.watch([
        'assets/**/*.js',
        'assets/**/*.jsx',
    ]);
    jsWatcher.on('change', path => {
        console.log(chalk.yellow('js change in: '), chalk.green(path));
        buildWebpackDev(devConfig, () => {
                console.log(chalk.yellow('js compiled!'));
                browserSync.reload();
        });
    });

    const phpWatcher = gulp.watch([
        './**/*.php'
    ]);
    phpWatcher.on('change', path => {
        console.log(chalk.blue('php change in: '), chalk.green(path));
        
        if (toProxy.indexOf('localhost') !== -1) {
            // if dev is local, just reload
            browserSync.reload();
        } else {
            // TODO ftp template upload
        }
        
    });
}

/**
 * Uploads files to server
 * @param {object} connection ftp connection object
 * @param {object} options user defined options 
 */
function uploadToServer(connection, options) {
    const { jsPath, cssPath, remotePath } = options;
    return src([jsPath, cssPath], { base: './assets/', buffer: false })
        .pipe(connection.dest(remotePath))
}

/**
 * Cleans remote server's css and js folders
 * @param {object} connection ftp connection object 
 * @param {arr} remotePaths array of remote paths of dirs to remove
 * @param {function} cb callback 
 */
function cleanServer(connection, remotePaths, cb) {
    async.each(remotePaths, (path, callback) => {
        connection.rmdir(path, err => {
            if (err) {
                callback(err);
            } else {
                console.log(chalk.blueBright(`removed ${path}!`));
                callback();
            }
        })
    }, (err, res) => {
        cb(err, res);
    });
}
