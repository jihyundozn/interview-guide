export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hrEditPassword = process.env.HR_EDIT_PASSWORD;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Supabase 환경변수가 설정되지 않았습니다.' });
  }

  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  function mapRow(row) {
    if (!row) return null;
    return {
      positionId: row.position_id || '',
      positionName: row.position_name || '',
      keyTasks: row.duties || '',
      requiredQualifications: row.requirements || '',
      preferredQualifications: row.preferences || '',
      coreCompetencies: row.competencies || '',
      updatedAt: row.updated_at ? formatKoreanDate(row.updated_at) : '',
    };
  }

  function formatKoreanDate(value) {
    try {
      const date = new Date(value);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const mi = String(date.getMinutes()).padStart(2, '0');
      return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
    } catch (e) {
      return '';
    }
  }

  try {
    if (req.method === 'GET') {
      const { positionId } = req.query;
      if (!positionId) {
        return res.status(400).json({ error: 'positionId가 필요합니다.' });
      }

      const url = `${baseUrl}/rest/v1/position_criteria?position_id=eq.${encodeURIComponent(positionId)}&select=*`;
      const response = await fetch(url, { method: 'GET', headers });
      const text = await response.text();
      let rows = [];
      try { rows = text ? JSON.parse(text) : []; } catch (e) { rows = []; }

      if (!response.ok) {
        return res.status(response.status).json({ error: rows?.message || text || '포지션 분석 기준 조회에 실패했습니다.' });
      }

      return res.status(200).json({ criteria: mapRow(rows[0]) });
    }

    if (req.method === 'POST') {
      const password = req.headers['x-hr-password'];
      if (!hrEditPassword || password !== hrEditPassword) {
        return res.status(401).json({ error: 'HR 수정 비밀번호가 올바르지 않습니다.' });
      }

      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const positionId = String(body.positionId || '').trim();
      const positionName = String(body.positionName || positionId).trim();

      if (!positionId) {
        return res.status(400).json({ error: 'positionId가 필요합니다.' });
      }

      const payload = {
        position_id: positionId,
        position_name: positionName,
        duties: String(body.keyTasks || '').trim(),
        requirements: String(body.requiredQualifications || '').trim(),
        preferences: String(body.preferredQualifications || '').trim(),
        competencies: String(body.coreCompetencies || '').trim(),
        updated_at: new Date().toISOString(),
      };

      if (!payload.duties) {
        return res.status(400).json({ error: '주요업무를 입력해주세요.' });
      }

      const url = `${baseUrl}/rest/v1/position_criteria?on_conflict=position_id`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let rows = [];
      try { rows = text ? JSON.parse(text) : []; } catch (e) { rows = []; }

      if (!response.ok) {
        return res.status(response.status).json({ error: rows?.message || text || '포지션 분석 기준 저장에 실패했습니다.' });
      }

      return res.status(200).json({ criteria: mapRow(Array.isArray(rows) ? rows[0] : rows) });
    }

    return res.status(405).json({ error: '허용되지 않은 요청 방식입니다.' });
  } catch (error) {
    return res.status(500).json({ error: error.message || '서버 오류가 발생했습니다.' });
  }
}
