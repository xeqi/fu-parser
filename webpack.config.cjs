const TerserPlugin = require("terser-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
	mode: "production",
	entry: {
		main: "./src/main.ts",
		"pdf.worker": "pdfjs-dist/build/pdf.worker.mjs",
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: "ts-loader",
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		extensions: [".tsx", ".ts", ".js"],
	},
	output: {
		filename: "[name].js",
	},
	optimization: {
		minimizer: [
			new TerserPlugin({
				extractComments: /@license/i,
			}),
		],
	},
	plugins: [
		new CopyPlugin({
			patterns: [
				{ from: "module.json", to: "module.json" },
				{ from: "src/style.css", to: "style.css" },
				{ from: "src/templates", to: "templates" },
			],
		}),
	],
};
