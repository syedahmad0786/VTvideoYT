// hrmny Sales & Growth — API Health Check
export default function handler(req, res) {
  res.json({
    status: 'ok',
    name: 'hrmny Sales & Growth API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
}
