export { SessionRoom } from './room.js';

/**
 * נקודת הכניסה. אפליקציה אחת, deployment אחד:
 * הנכסים הסטטיים מוגשים ישירות, ורק /ws ו־/api עוברים ל־Durable Object
 * היחיד שמחזיק את מצב הפעילות.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/ws' || url.pathname.startsWith('/api/')) {
      const id = env.SESSION_ROOM.idFromName('main');
      return env.SESSION_ROOM.get(id).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
