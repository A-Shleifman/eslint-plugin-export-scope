/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  modulePathIgnorePatterns: ["<rootDir>/src/__tests__/project"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "./src/__tests__/project/tsconfig.json",
      },
    ],
  },
  collectCoverageFrom: ["dist/*.{ts,js}", "!src/dist/tsPlugin/**"],
};
