const { getDb } = require('./_firebase');

const REGISTRATION_TTL_MS = 12 * 60 * 60 * 1000; // 12時間

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const num = Number(req.body && req.body.number);
  if (!Number.isInteger(num) || num < 1 || num > 100) {
    res.status(400).json({ error: 'invalid number' });
    return;
  }

  const db = getDb();
  const ref = db.ref(`lineRegistrations/${num}`);
  const snap = await ref.once('value');
  const registration = snap.val();

  const isValid =
    registration &&
    registration.userId &&
    Date.now() - registration.timestamp <= REGISTRATION_TTL_MS;

  if (!isValid) {
    if (registration) await ref.remove();
    res.status(200).json({ sent: false });
    return;
  }

  const pushRes = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      to: registration.userId,
      messages: [{ type: 'text', text: `${num}番の方、受付までお戻り頂き、受付スタッフにお声をおかけください。` }]
    })
  });

  await ref.remove();

  res.status(200).json({ sent: pushRes.ok });
};
