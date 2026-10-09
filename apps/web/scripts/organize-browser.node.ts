export {};

process.argv.push("--editing-local", "--organize-local");
await import("./account-browser.node");
