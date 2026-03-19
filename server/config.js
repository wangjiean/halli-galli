export const PORT = process.env.PORT || 7779;
export const HOST = '0.0.0.0';
export const JWT_SECRET = process.env.JWT_SECRET || 'halli-galli-secret-key-2026';
export const JWT_EXPIRES_IN = '7d';
export const DATA_FILE = new URL('./db/data.json', import.meta.url).pathname;
