const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = [
    // Main process config
    {
        mode: process.env.NODE_ENV || 'development',
        entry: './src/main/index.ts',
        target: 'electron-main',
        resolve: {
            extensions: ['.ts', '.js'],
            modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
            ],
        },
        output: {
            filename: 'index.js',
            path: path.resolve(__dirname, 'dist/main'),
        },
    },
    // Preload config
    {
        mode: process.env.NODE_ENV || 'development',
        entry: './src/main/preload.ts',
        target: 'electron-preload',
        resolve: {
            extensions: ['.ts', '.js'],
            modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
            ],
        },
        output: {
            filename: 'preload.js',
            path: path.resolve(__dirname, 'dist/main'),
        },
    },
    // Renderer process config
    {
        mode: process.env.NODE_ENV || 'development',
        entry: './src/renderer/index.tsx',
        target: 'electron-renderer',
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
            modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader'],
                },
            ],
        },
        output: {
            filename: 'App.js',
            path: path.resolve(__dirname, 'dist/renderer'),
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: './src/renderer/index.html',
                filename: 'index.html',
            }),
        ],
    },
];
