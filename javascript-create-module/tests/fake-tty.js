import process from "node:process";

// Pretend stdin is interactive
process.stdin.isTTY = true;
process.stdin.setRawMode ??= () => process.stdin;
