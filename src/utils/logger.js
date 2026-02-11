import { format } from 'date-fns';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LEVEL = LEVELS[process.env.LOG_LEVEL || 'info'];

function timestamp() {
  return format(new Date(), 'yyyy-MM-dd HH:mm:ss');
}

function log(level, tag, message, data = null) {
  if (LEVELS[level] < CURRENT_LEVEL) return;

  const prefix = `[${timestamp()}] [${level.toUpperCase()}] [${tag}]`;
  const line = data
    ? `${prefix} ${message} ${JSON.stringify(data)}`
    : `${prefix} ${message}`;

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (tag, msg, data) => log('debug', tag, msg, data),
  info: (tag, msg, data) => log('info', tag, msg, data),
  warn: (tag, msg, data) => log('warn', tag, msg, data),
  error: (tag, msg, data) => log('error', tag, msg, data),
};
