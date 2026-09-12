import prRecordsData from '../src/data/prRecords.json';

export default function handler(req: any, res: any) {
  if (req.method && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const {
    repo,
    subsystem,
    is_first_time,
    is_bot,
    page = 1,
    limit = 25,
    search
  } = req.query || {};

  let list = [...prRecordsData.pull_requests];

  if (repo) {
    list = list.filter(p => p.repo.toLowerCase() === String(repo).toLowerCase());
  }

  if (subsystem) {
    list = list.filter(p => p.subsystem.toLowerCase() === String(subsystem).toLowerCase());
  }

  if (is_first_time !== undefined) {
    const ftBool = String(is_first_time) === 'true';
    list = list.filter(p => p.is_first_time_contributor === ftBool);
  }

  if (is_bot !== undefined) {
    const botBool = String(is_bot) === 'true';
    list = list.filter(p => p.is_bot_filtered === botBool);
  } else {
    // Default to human PRs unless explicitly requested
    list = list.filter(p => !p.is_bot_filtered);
  }

  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(p => 
      p.title.toLowerCase().includes(q) || 
      p.author.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  }

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 25));
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedResults = list.slice(startIndex, startIndex + limitNum);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  return res.status(200).json({
    status: 'success',
    pagination: {
      total_items: list.length,
      current_page: pageNum,
      per_page: limitNum,
      total_pages: Math.ceil(list.length / limitNum)
    },
    pull_requests: paginatedResults
  });
}
