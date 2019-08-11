const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CleanPlugin = require('clean-webpack-plugin');
const LodashPlugin = require('lodash-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
let { publicPath } = require('./ftp.settings');

if (process.env.NODE_ENV === 'development') {
    publicPath = '/dist/';
}

const babelConfig = {
    compact: true,
    minified: true,
    presets: [
        ['@babel/preset-env', {
            loose: true, // Enable "loose" transformations for any plugins in this preset that allow them
            modules: false, // Don't transform modules; needed for tree-shaking
            useBuiltIns: 'usage', // Tree-shake babel-polyfill
            targets: '> 1%, last 2 versions, Firefox ESR',
            corejs: {
                version: 3,
            },
        }],
        ['@babel/preset-react'],
    ],
    plugins: [
        ['@babel/plugin-proposal-decorators', { legacy: true }],
        '@babel/plugin-proposal-class-properties',
        'lodash', // Tree-shake lodash
        '@babel/plugin-syntax-dynamic-import', // add support for dynamic imports (used in app.js)
    ],
};

// Common configuration, with extensions in webpack.dev.js and webpack.prod.js.
module.exports = {
    bail: true,
    context: path.join(__dirname),
    entry: {
        polyfill: ['babel-polyfill'],
        main: './assets/js/app.js',
    },
    module: {
        rules: [
            {
                test: /\.coffee$/,
                use: {
                    loader: 'coffee-loader',
                    options: {
                        sourceMap: true,
                        compact: true,
                        minified: true,
                        transpile: {
                            ...babelConfig,
                        },
                    },
                },
            },
            {
                test: /\.jsx?$/,
                include: /(assets(?:\/|\\)js)/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            ...babelConfig,
                            cacheDirectory: true,
                        },
                    },
                ],
            },
            {
                test: /\.tsx?$/,
                include: /(assets\/js)/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            ...babelConfig,
                            plugins: [
                                ...babelConfig.plugins,
                                ['@babel/plugin-proposal-decorators', { decoratorsBeforeExport: true }],
                            ],
                        },
                    },
                    {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true,
                            configFile: 'tsconfig.json',
                        },
                    },
                ],
            },
            {
                test: /\/jquery(\.min)?\.js/,
                use: [
                    {
                        loader: 'expose-loader',
                        options: 'jQuery',
                    },
                    {
                        loader: 'expose-loader',
                        options: '$',
                    },
                ],
            },
            {
                test: /\.(woff(2)?|ttf|eot|svg|gif)(\?v=\d+\.\d+\.\d+)?$/,
                use: [{
                    loader: 'file-loader',
                    options: {
                        name: '[name].[ext]',
                        publicPath: url => url.replace(/public/, url),
                    },
                }],
            },
        ],
    },
    performance: {
        hints: 'warning',
        maxAssetSize: 1024 * 300,
        maxEntrypointSize: 1024 * 300,
    },
    plugins: [
        new CleanPlugin(['dist/js'], {
            verbose: false,
            watch: false,
        }),
        new LodashPlugin(), // Complements babel-plugin-lodash by shrinking its cherry-picked builds further.
        new webpack.ProvidePlugin({ // Provide jquery automatically without explicit import
            $: 'jquery',
            jQuery: 'jquery',
            'window.jQuery': 'jquery',
            React: 'react',
            ReactDOM: 'react-dom',
            slick: 'slick-carousel',
        }),
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
        }),
    ],
    output: {
        chunkFilename: '[chunkhash].chunk.js',
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist/js'),
        publicPath,
    },
    resolve: {
        extensions: ['.js', '.jsx', '.json'],
        modules: ['node_modules', 'assets/extensions'], // eventually we want to remove these as more javascript gets added to the main bundle
    },
};
