/**
 * logger.js — Winston logger untuk SAP StockMon
 * Log ke file (app.log, error.log) + console di dev mode
 */

const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Determine log directory
function getLogDir() {
  try {
    const userDataPath = app.getPath('userData');
    const logDir = path.join(userDataPath, 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    return logDir;
  } catch {
    // Fallback jika app belum ready (misal: saat test)
    const fallback = path.join(__dirname, '..', '..', 'logs');
    if (!fs.existsSync(fallback)) {
      fs.mkdirSync(fallback, { recursive: true });
    }
    return fallback;
  }
}

const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

let logger;

function initLogger() {
  const logDir = getLogDir();

  const logTransports = [
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
    new transports.File({
      filename: path.join(logDir, 'app.log'),
      level: 'info',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3,
    }),
  ];

  if (isDev) {
    logTransports.push(
      new transports.Console({
        format: format.combine(
          format.colorize(),
          format.printf(({ level, message, timestamp }) =>
            `[${timestamp}] [${level}] ${message}`
          )
        ),
      })
    );
  }

  logger = createLogger({
    level: isDev ? 'debug' : 'info',
    format: logFormat,
    transports: logTransports,
    exitOnError: false,
  });

  logger.info('Logger initialized', { logDir, isDev });
  return logger;
}

function getLogger() {
  if (!logger) {
    // Lazy init dengan console fallback
    logger = createLogger({
      level: 'debug',
      format: logFormat,
      transports: [new transports.Console()],
    });
  }
  return logger;
}

module.exports = { initLogger, getLogger };
