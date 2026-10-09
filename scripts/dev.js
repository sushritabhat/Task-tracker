const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const processes = [
    spawn(process.execPath, [path.join(root, "server", "server.js")], {
        cwd: path.join(root, "server"),
        stdio: "inherit"
    }),
    spawn(process.execPath, [path.join(root, "client", "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1"], {
        cwd: path.join(root, "client"),
        stdio: "inherit"
    })
];

let isShuttingDown = false;
function shutdown(exitCode = 0) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    for (const child of processes) {
        if (!child.killed) child.kill("SIGTERM");
    }
    setTimeout(() => process.exit(exitCode), 1000).unref();
}

for (const child of processes) {
    child.on("error", (error) => {
        console.error("Unable to start a development process:", error.message);
        shutdown(1);
    });
    child.on("exit", (code) => {
        if (!isShuttingDown && code !== 0) shutdown(code || 1);
    });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
