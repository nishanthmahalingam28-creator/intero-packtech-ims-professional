const { spawn } = require("child_process");

const processes = [];

function start(name, command, args) {
  console.log(`\n[${name}] Starting...`);

  const child = spawn(command, args, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  processes.push(child);

  child.on("exit", (code) => {
    console.log(`[${name}] exited with code ${code}`);
  });
}

// Frontend
start("Frontend", "npm", ["run", "dev:client"]);

// Backend
start("Backend", "npm", ["run", "dev:server"]);

function shutdown() {
  console.log("\nStopping development servers...");

  for (const child of processes) {
    if (!child.killed) {
      child.kill();
    }
  }

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);