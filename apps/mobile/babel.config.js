module.exports = {
  presets: ["module:@react-native/babel-preset"],
  plugins: [
    [
      "module-resolver",
      {
        root: ["./"],
        alias: {
          "@": "./src",
          "@convex": "../../convex"
        }
      }
    ],
    "react-native-worklets/plugin"
  ]
};
