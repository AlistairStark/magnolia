const merge = require('webpack-merge');
const commonConfig = require('./webpack.common.js');

module.exports = merge(commonConfig, {
    devtool: 'cheap-module-eval-source-map',
    mode: 'development',
    performance: {
        hints: false,
    },
    watch: true,
});
