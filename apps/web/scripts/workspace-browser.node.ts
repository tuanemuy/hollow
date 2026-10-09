process.argv.push("--editing-local", "--smtp-local", "--invitation-local");
await import("./account-browser.node");

export {};
