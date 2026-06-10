function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.");
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ""),
    serviceRoleKey,
  };
}

async function supabaseRequest(path, options = {}) {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = text;
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object"
        ? data.message || data.error || JSON.stringify(data)
        : text;

    throw new Error(message || `Supabase 요청 실패: ${response.status}`);
  }

  return data;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function encodeFilterValue(value) {
  return encodeURIComponent(value).replace(/%20/g, "%20");
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return sendJson(res, 200, { ok: true });
  }

  try {
    if (req.method === "GET") {
      const positionTitle = normalizeText(req.query.position || req.query.position_title);

      let candidatePath =
        "candidates?select=id,position_title,candidate_name,source,status,is_added_to_guide,added_to_guide_at,latest_analysis_id,created_at,updated_at&order=created_at.desc";

      if (positionTitle) {
        candidatePath += `&position_title=eq.${encodeFilterValue(positionTitle)}`;
      }

      const candidates = await supabaseRequest(candidatePath, {
        method: "GET",
      });

      const candidateIds = (candidates || []).map((candidate) => candidate.id);

      let analyses = [];

      if (candidateIds.length > 0) {
        const idList = candidateIds.map((id) => `"${id}"`).join(",");

        analyses = await supabaseRequest(
          `ai_resume_analyses?select=id,candidate_id,position_title,candidate_name,overall_fit_score,analysis_result,selected_questions,created_at,updated_at&candidate_id=in.(${idList})&order=created_at.desc`,
          {
            method: "GET",
          }
        );
      }

      const analysesByCandidateId = {};

      for (const analysis of analyses || []) {
        if (!analysesByCandidateId[analysis.candidate_id]) {
          analysesByCandidateId[analysis.candidate_id] = [];
        }

        analysesByCandidateId[analysis.candidate_id].push(analysis);
      }

      const mergedCandidates = (candidates || []).map((candidate) => ({
        ...candidate,
        ai_resume_analyses: analysesByCandidateId[candidate.id] || [],
      }));

      return sendJson(res, 200, {
        ok: true,
        candidates: mergedCandidates,
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      const positionTitle = normalizeText(body.position_title || body.positionTitle);
      const candidateName = normalizeText(body.candidate_name || body.candidateName);

      if (!positionTitle || !candidateName) {
        return sendJson(res, 400, {
          ok: false,
          error: "포지션명과 후보자명이 필요합니다.",
        });
      }

      const existing = await supabaseRequest(
        `candidates?select=id,latest_analysis_id&position_title=eq.${encodeFilterValue(positionTitle)}&candidate_name=eq.${encodeFilterValue(candidateName)}&limit=1`,
        {
          method: "GET",
        }
      );

      if (existing && existing.length > 0) {
        return sendJson(res, 200, {
          ok: true,
          candidate_id: existing[0].id,
          latest_analysis_id: existing[0].latest_analysis_id || null,
        });
      }

      const inserted = await supabaseRequest("candidates", {
        method: "POST",
        body: JSON.stringify({
          position_title: positionTitle,
          candidate_name: candidateName,
          source: body.source || "manual",
          status: body.status || "registered",
          is_added_to_guide: Boolean(body.is_added_to_guide || false),
        }),
      });

      const candidate = Array.isArray(inserted) ? inserted[0] : inserted;

      return sendJson(res, 200, {
        ok: true,
        candidate_id: candidate.id,
        latest_analysis_id: candidate.latest_analysis_id || null,
      });
    }

    if (req.method === "PATCH") {
      const body = req.body || {};
      const candidateId = body.candidate_id || body.candidateId;

      if (!candidateId) {
        return sendJson(res, 400, {
          ok: false,
          error: "candidate_id가 필요합니다.",
        });
      }

      const updates = {
        updated_at: new Date().toISOString(),
      };

      if (typeof body.is_added_to_guide === "boolean") {
        updates.is_added_to_guide = body.is_added_to_guide;
        updates.added_to_guide_at = body.is_added_to_guide
          ? new Date().toISOString()
          : null;
      }

      if (body.status) {
        updates.status = String(body.status);
      }

      if (body.latest_analysis_id || body.latestAnalysisId) {
        updates.latest_analysis_id = body.latest_analysis_id || body.latestAnalysisId;
      }

      const updated = await supabaseRequest(
        `candidates?id=eq.${encodeURIComponent(candidateId)}`,
        {
          method: "PATCH",
          body: JSON.stringify(updates),
        }
      );

      return sendJson(res, 200, {
        ok: true,
        candidate: Array.isArray(updated) ? updated[0] : updated,
      });
    }

    return sendJson(res, 405, {
      ok: false,
      error: "지원하지 않는 요청 방식입니다.",
    });
  } catch (error) {
    console.error("[candidates-api-error]", error);

    return sendJson(res, 500, {
      ok: false,
      error: "후보자 데이터 처리 중 오류가 발생했습니다.",
      detail: error.message,
    });
  }
};
