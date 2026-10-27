import { createHash } from 'node:crypto';

const attempts = new Map();
const windowMs = 10 * 60 * 1000;
function reply(res, code, message, ok = false) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ ok, message }));
}

// Shared by the local server and the Vercel function. Never imported by browser code.
export function createLeadHandler({ env = process.env, fetchImpl = fetch, now = Date.now, limiter = attempts } = {}) {
  return async (req, res) => {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return reply(res, 405, 'Используйте форму заявки.'); }
    if (!(req.headers['content-type'] || '').startsWith('application/json')) return reply(res, 415, 'Неверный формат заявки.');
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (origin && ![`https://${host}`, `http://${host}`, env.LEAD_ALLOWED_ORIGIN].filter(Boolean).includes(origin)) return reply(res, 403, 'Отправьте заявку с сайта Ивана.');
    let body;
    try {
      if (req.body !== undefined) {
        const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        if (Buffer.byteLength(raw) > 4096) return reply(res, 413, 'Слишком длинная заявка.');
        body = JSON.parse(raw);
      } else {
        let size = 0;
        const chunks = [];
        for await (const chunk of req) {
          size += Buffer.byteLength(chunk);
          if (size > 4096) return reply(res, 413, 'Слишком длинная заявка.');
          chunks.push(Buffer.from(chunk));
        }
        body = JSON.parse(Buffer.concat(chunks).toString());
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    } catch { return reply(res, 400, 'Не удалось прочитать заявку.'); }
    if (body.website) return reply(res, 400, 'Не удалось отправить заявку.');
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const contact = typeof body.contact === 'string' ? body.contact.trim() : '';
    const budgetText = typeof body.budget === 'string' ? body.budget.replace(/[\s\u00a0]/g, '') : '';
    const budget = Number(budgetText);
    if (name.length < 2 || name.length > 80 || contact.length < 5 || contact.length > 120 || /[\r\n\x00-\x1f]/.test(name + contact) || !['buy', 'sell'].includes(body.intent) || !/^\d{1,13}$/.test(budgetText) || !Number.isSafeInteger(budget) || budget <= 0 || body.consent !== 'on' || !/^[a-f0-9-]{36}$/i.test(body.requestId || '')) return reply(res, 400, 'Проверьте имя, контакт, бюджет и согласие на обработку данных.');
    const testMode = env.VK_TEST_MODE === 'true';
    const peerId = testMode ? env.VK_TEST_PEER_ID : env.VK_PEER_ID;
    const domain = testMode ? env.VK_TEST_RECIPIENT_DOMAIN : env.VK_RECIPIENT_DOMAIN;
    const recipient = /^[1-9]\d*$/.test(peerId || '') ? { peer_id: peerId }
      : /^[a-z][a-z0-9_.]{2,63}$/i.test(domain || '') ? { domain } : null;
    const copyToOwner = testMode && env.VK_TEST_COPY_TO_OWNER === 'true';
    const owner = /^[1-9]\d*$/.test(env.VK_PEER_ID || '') ? { peer_id: env.VK_PEER_ID }
      : /^[a-z][a-z0-9_.]{2,63}$/i.test(env.VK_RECIPIENT_DOMAIN || '') ? { domain: env.VK_RECIPIENT_DOMAIN } : null;
    if (!env.VK_COMMUNITY_TOKEN || !recipient || (copyToOwner && !owner)) return reply(res, 503, 'Приём заявок пока настраивается. Пожалуйста, напишите Ивану в Telegram или позвоните.');
    const recipients = [recipient];
    if (copyToOwner && JSON.stringify(owner) !== JSON.stringify(recipient)) recipients.push(owner);
    // Per-instance throttle supplements the honeypot; use platform firewall limits for distributed traffic.
    const time = now();
    for (const [key, value] of limiter) if (value.expires <= time) limiter.delete(key);
    const ip = req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
    const key = createHash('sha256').update(String(ip)).digest('hex');
    const attempt = limiter.get(key) || { count: 0, expires: time + windowMs };
    if (attempt.count >= 5 || limiter.size >= 10000) return reply(res, 429, 'Слишком много попыток. Попробуйте через 10 минут или напишите в Telegram.');
    attempt.count++; limiter.set(key, attempt);
    const intent = body.intent === 'buy' ? 'Покупка' : 'Продажа';
    const message = `Новая заявка с сайта Ивана Зубова\n\nИмя: ${name}\nЗадача: ${intent}\n${body.intent === 'buy' ? 'Бюджет' : 'Желаемая цена'}: ${new Intl.NumberFormat('ru-RU').format(budget)} ₽\nКонтакт: ${contact}\n\nЗаявка: ${body.requestId}`;
    try {
      const deliveries = await Promise.allSettled(recipients.map(async (destination) => {
      const randomId = createHash('sha256').update(`${body.requestId}:${name}:${contact}:${budget}:${body.intent}:${JSON.stringify(destination)}`).digest().readUInt32BE(0) & 0x7fffffff;
      const response = await fetchImpl('https://api.vk.com/method/messages.send', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ access_token: env.VK_COMMUNITY_TOKEN, ...destination, random_id: String(randomId || 1), message: testMode ? `[ТЕСТ]\n${message}` : message, v: '5.199' }),
        signal: AbortSignal.timeout(12000)
      });
      const data = await response.json();
      if (!response.ok || data.error || !Number.isInteger(data.response) || data.response <= 0) throw new Error('VK rejected notification');
      }));
      if (deliveries.some((delivery) => delivery.status === 'rejected')) throw new Error('Incomplete delivery');
      return reply(res, 200, 'Заявка доставлена.', true);
    } catch { return reply(res, 502, 'Не удалось подтвердить доставку. Повторите отправку или свяжитесь с Иваном в Telegram.'); }
  };
}

export default createLeadHandler();
