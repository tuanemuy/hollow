process.argv.push(
  "--editing-local",
  "--sharing-local",
  "--integration-local",
  "--export-local",
  "--jobs-local",
);
await import("./account-browser.node");

export {};
