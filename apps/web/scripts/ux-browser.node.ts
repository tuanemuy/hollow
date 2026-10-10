process.argv.push(
  "--ux-local",
  "--editing-local",
  "--organize-local",
  "--sharing-local",
  "--integration-local",
  "--export-local",
  "--jobs-local",
  "--retirement-local",
);
await import("./account-browser.node");

export {};
