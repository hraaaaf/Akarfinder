// Tiny console logger with timestamps. No external deps.

function ts() {
  return new Date().toISOString();
}

export const logger = {
  info(message: string, ...rest: unknown[]) {
    console.log(`[${ts()}] [info] ${message}`, ...rest);
  },
  warn(message: string, ...rest: unknown[]) {
    console.warn(`[${ts()}] [warn] ${message}`, ...rest);
  },
  error(message: string, ...rest: unknown[]) {
    console.error(`[${ts()}] [error] ${message}`, ...rest);
  },
  step(message: string) {
    console.log(`\n— ${message}`);
  },
};
