module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  globals: {
    "ts-jest": {
      tsConfig: "tsconfig.json"
    }
  },
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80
    }
  },
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/\\.ts-node/",
    "\\.snap",
    "/\\.cache-loader/",
    "/\\.excitare/",
    ".*\\/dist\\/.*",
    "dist"
  ]
};
