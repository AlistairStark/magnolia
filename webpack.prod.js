const merge = require('webpack-merge');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const commonConfig = require('./webpack.common.js');

/**
 * Webpack production config
 */
module.exports = merge(commonConfig, {
    devtool: 'source-map',
    mode: 'production',
    optimization: {
        splitChunks: {
            cacheGroups: {
                default: false,
                vendors: false,
                vendor: {
                    test: /\node_modules/,
                    chunks: 'all',
                    name: 'vendor',
                    enforce: true,
                },
                themeModules: {
                    test: /\/assets\/extensions/,
                    name: 'theme-vendor',
                    enforce: true,
                },
            },
        },
        noEmitOnErrors: true,
        minimizer: [new UglifyJsPlugin({
            cache: true,
            parallel: true,
            uglifyOptions: {
                output: {
                    comments: false,
                    beautify: false,
                },
            },
        })],
    },
});
