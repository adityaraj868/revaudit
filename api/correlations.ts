import statisticalModel from '../src/data/statisticalModel.json';

export default function handler(req: any, res: any) {
  if (req.method && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  return res.status(200).json({
    status: 'success',
    hypothesis: statisticalModel.hypotheses.find(h => h.id === 'H1'),
    workload_correlation_sample: statisticalModel.workload_correlation_sample,
    regression_trend: statisticalModel.regression_trend
  });
}
