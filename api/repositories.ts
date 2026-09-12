import statisticalModel from '../src/data/statisticalModel.json';

export default function handler(req: any, res: any) {
  if (req.method && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { status, category, search } = req.query || {};
  let repos = [...statisticalModel.repositories];

  if (status) {
    repos = repos.filter(r => r.status.toLowerCase() === String(status).toLowerCase());
  }

  if (category) {
    repos = repos.filter(r => r.category.toLowerCase().includes(String(category).toLowerCase()));
  }

  if (search) {
    const q = String(search).toLowerCase();
    repos = repos.filter(r => r.repo.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  return res.status(200).json({
    status: 'success',
    count: repos.length,
    total_repositories: statisticalModel.repositories.length,
    repositories: repos
  });
}
