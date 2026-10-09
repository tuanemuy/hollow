export {};

process.argv.push("--editing-local", "--sharing-local", "--export-local");
await import("./account-browser.node");
