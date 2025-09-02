export default [
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        alert: "readonly",
        Papa: "readonly",
        tf: "readonly",
        Worker: "readonly",
        self: "readonly",
        importScripts: "readonly",
        FileReader: "readonly",
        localStorage: "readonly",
        setTimeout: "readonly",
        DEBUG: "readonly"
      }
    },
    rules: {
      // Keep current recommended rules
      "no-unused-vars": "error",
      "no-undef": "error",
      "prefer-const": "warn",
      "no-var": "error"
    },
    files: ["js/**/*.js", "tests/**/*.js"]
  },
  {
    // Web worker specific config
    files: ["js/workers/**/*.js"],
    languageOptions: {
      globals: {
        self: "readonly",
        importScripts: "readonly",
        postMessage: "readonly",
        onmessage: "writable",
        onerror: "writable"
      }
    }
  }
];