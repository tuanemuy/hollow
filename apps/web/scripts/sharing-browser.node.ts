export {};

process.argv.push("--editing-local", "--sharing-local");
await import("./account-browser.node");
