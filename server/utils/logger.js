const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const LOG_COLORS = {
  ERROR: '\x1b[31m',
  WARN: '\x1b[33m',
  INFO: '\x1b[36m',
  DEBUG: '\x1b[90m',
  RESET: '\x1b[0m'
};

class Logger {
  constructor(module) {
    this.module = module;
    this.level = process.env.LOG_LEVEL || 'INFO';
  }

  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const color = LOG_COLORS[level] || '';
    const reset = LOG_COLORS.RESET;
    
    let logMessage = `${color}[${timestamp}] [${level}] [${this.module}]${reset} ${message}`;
    
    if (data !== undefined) {
      logMessage += '\n' + JSON.stringify(data, null, 2);
    }
    
    return logMessage;
  }

  shouldLog(level) {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
  }

  error(message, data) {
    if (this.shouldLog('ERROR')) {
      console.error(this.formatMessage('ERROR', message, data));
    }
  }

  warn(message, data) {
    if (this.shouldLog('WARN')) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  info(message, data) {
    if (this.shouldLog('INFO')) {
      console.log(this.formatMessage('INFO', message, data));
    }
  }

  debug(message, data) {
    if (this.shouldLog('DEBUG')) {
      console.log(this.formatMessage('DEBUG', message, data));
    }
  }

  socket(event, data) {
    this.info(`[Socket] ${event}`, data);
  }

  http(method, path, status, duration) {
    this.info(`[HTTP] ${method} ${path} - ${status} (${duration}ms)`);
  }
}

export function createLogger(module) {
  return new Logger(module);
}

export default createLogger;