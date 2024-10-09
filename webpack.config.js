// const path = require('path');
// const TerserPlugin = require('terser-webpack-plugin');
//
// module.exports = {
//     entry: './PayGroove.v2.ts',                   // Entry point for your application
//     output: {
//         filename: 'paygroove.v2.js',      // Output filename
//         path: path.resolve(__dirname, 'dist'), // Output directory
//     },
//     resolve: {
//         extensions: ['.ts', '.js'],            // Resolve these extensions
//     },
//     module: {
//         rules: [
//             {
//                 test: /\.ts$/,                 // Apply this rule to TypeScript files
//                 use: 'ts-loader',              // Use ts-loader to transpile TypeScript
//                 exclude: /node_modules/,       // Exclude node_modules
//             },
//         ],
//     },
//     optimization: {
//         minimize: true,                        // Enable minification
//         minimizer: [
//             new TerserPlugin({
//                 terserOptions: {
//                     compress: true,            // Enable compression
//                     mangle: true,              // Enable mangling of variable names
//                 },
//             }),
//         ],
//     },
//     mode: 'production',                        // Set mode to production for optimization
// };


// webpack.config.js
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    entry: './src/PayGroove.v2.ts',              // Entry point for your application
    output: {
        filename: 'paygroove.v2.js',              // Output filename
        path: path.resolve(__dirname, 'dist'),     // Output directory
    },
    resolve: {
        extensions: ['.ts', '.js'],               // Resolve these extensions
    },
    module: {
        rules: [
            {
                test: /\.ts$/,                     // Apply this rule to TypeScript files
                use: 'ts-loader',                  // Use ts-loader to transpile TypeScript
                exclude: /node_modules/,           // Exclude node_modules
            },
        ],
    },
    optimization: {
        minimize: true,                            // Enable minification
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: true,                // Enable compression
                    mangle: true,                  // Enable mangling of variable names
                },
            }),
        ],
    },
    mode: 'production',                            // Set mode to production for optimization
};
