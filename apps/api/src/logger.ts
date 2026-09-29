type LogLevel = "debug" | "info" | "warn" | "error";

const priority: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const configuredLevel = (process.env.LOG_LEVEL as LogLevel | undefined) ?? "info";

function write(level: LogLevel, message: string, fields: Record<string, unknown> = {}) {
  if (priority[level] < priority[configuredLevel]) return;
  const entry = { level, message, timestamp: new Date().toISOString(), ...fields };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, fields?: Record<string, unknown>) => write("debug", message, fields),
  info: (message: string, fields?: Record<string, unknown>) => write("info", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => write("warn", message, fields),
  error: (message: string, fields?: Record<string, unknown>) => write("error", message, fields)
};
