import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');

function ensure() {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

/** שומר Session שהסתיים כקובץ JSON אנונימי. נתוני חזרה לעולם אינם נשמרים. */
export function saveSession(record) {
  if (record.mode === 'rehearsal') return null;
  ensure();
  const file = path.join(SESSIONS_DIR, `${record.id}.json`);
  fs.writeFileSync(file, JSON.stringify(record, null, 2), 'utf8');
  return file;
}

export function listSessions() {
  ensure();
  return fs
    .readdirSync(SESSIONS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8'));
        return {
          id: raw.id,
          label: raw.label,
          startedAt: raw.startedAt,
          endedAt: raw.endedAt,
          participants: raw.participantCount,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
}

export function readSession(id) {
  ensure();
  const file = path.join(SESSIONS_DIR, `${path.basename(id)}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
