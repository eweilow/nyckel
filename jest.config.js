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
      branches: 95,
      functions: 95,
      lines: 90
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
