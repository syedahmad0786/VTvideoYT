export default function handler(req, res) {
  return res.status(200).json({
    status: 'ok',
    name: 'hrmny Sales & Growth API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
}
