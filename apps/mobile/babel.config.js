module.exports = {
  presets: ["babel-preset-expo"],
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
