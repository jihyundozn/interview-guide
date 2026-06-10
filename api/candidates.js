function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
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

function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return {};
    }
  }
  return {};
}

function normalizeId(value) {
  return String(value || "").trim();
}

async function findCandidateIdByAnalysisId(analysisId) {
  if (!analysisId) return "";
  const analysisRows = await supabaseRequest(
    `ai_resume_analyses?select=id,candidate_id&id=eq.${encodeURIComponent(analysisId)}&limit=1`,
    { method: "GET" }
  );
  return analysisRows && analysisRows[0] ? analysisRows[0].candidate_id : "";
}

async function findCandidateIdByNameAndPosition(candidateName, positionTitle) {
  const name = normalizeText(candidateName);
  const position = normalizeText(positionTitle);
  if (!name || !position) return "";
  const rows = await supabaseRequest(
    `candidates?select=id&candidate_name=eq.${encodeFilterValue(name)}&position_title=eq.${encodeFilterValue(position)}&limit=1`,
    { method: "GET" }
  );
  return rows && rows[0] ? rows[0].id : "";
}

async function deleteCandidateAndAnalyses({ candidateId, analysisId, candidateName, positionTitle }) {
  let targetCandidateId = normalizeId(candidateId);
  const targetAnalysisId = normalizeId(analysisId);

  if (!targetCandidateId && targetAnalysisId) {
    targetCandidateId = await findCandidateIdByAnalysisId(targetAnalysisId);
  }

  if (!targetCandidateId && candidateName && positionTitle) {
    targetCandidateId = await findCandidateIdByNameAndPosition(candidateName, positionTitle);
  }

  let deletedAnalysis = [];
  let deletedCandidate = [];

  // 더 확실하게 지우기 위해 cascade에만 의존하지 않고 분석 결과를 먼저 삭제합니다.
  if (targetCandidateId) {
    deletedAnalysis = await supabaseRequest(`ai_resume_analyses?candidate_id=eq.${encodeURIComponent(targetCandidateId)}`, {
      method: "DELETE",
    });

    deletedCandidate = await supabaseRequest(`candidates?id=eq.${encodeURIComponent(targetCandidateId)}`, {
      method: "DELETE",
    });
  } else if (targetAnalysisId) {
    deletedAnalysis = await supabaseRequest(`ai_resume_analyses?id=eq.${encodeURIComponent(targetAnalysisId)}`, {
      method: "DELETE",
    });
  }

  return {
    target_candidate_id: targetCandidateId || null,
    target_analysis_id: targetAnalysisId || null,
    deleted_analysis: deletedAnalysis || [],
    deleted_candidate: deletedCandidate || [],
  };
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
          { method: "GET" }
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
      const body = getBody(req);

      // 일부 브라우저/배포 환경에서 DELETE 요청이 캐시되거나 반영이 늦는 경우를 피하기 위한 안전한 삭제 경로입니다.
      if (body.action === "delete") {
        const candidateId = body.candidate_id || body.candidateId || "";
        const analysisId = body.analysis_id || body.analysisId || "";

        if (!candidateId && !analysisId) {
          return sendJson(res, 400, {
            ok: false,
            error: "삭제할 candidate_id 또는 analysis_id가 필요합니다.",
          });
        }

        const deleted = await deleteCandidateAndAnalyses({
          candidateId,
          analysisId,
          candidateName: body.candidate_name || body.candidateName,
          positionTitle: body.position_title || body.positionTitle,
        });
        return sendJson(res, 200, {
          ok: true,
          ...deleted,
        });
      }

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
        { method: "GET" }
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
      const body = getBody(req);
      const candidateId = body.candidate_id || body.candidateId;

      if (!candidateId) {
        return sendJson(res, 400, {
          ok: false,
          error: "candidate_id가 필요합니다.",
        });
      }

      const updates = { updated_at: new Date().toISOString() };

      if (typeof body.is_added_to_guide === "boolean") {
        updates.is_added_to_guide = body.is_added_to_guide;
        updates.added_to_guide_at = body.is_added_to_guide ? new Date().toISOString() : null;
      }

      if (body.status) updates.status = String(body.status);
      if (body.latest_analysis_id || body.latestAnalysisId) {
        updates.latest_analysis_id = body.latest_analysis_id || body.latestAnalysisId;
      }

      const updated = await supabaseRequest(`candidates?id=eq.${encodeURIComponent(candidateId)}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });

      return sendJson(res, 200, {
        ok: true,
        candidate: Array.isArray(updated) ? updated[0] : updated,
      });
    }

    if (req.method === "DELETE") {
      const body = getBody(req);
      const candidateId = req.query.candidate_id || req.query.candidateId || body.candidate_id || body.candidateId;
      const analysisId = req.query.analysis_id || req.query.analysisId || body.analysis_id || body.analysisId;

      if (!candidateId && !analysisId) {
        return sendJson(res, 400, {
          ok: false,
          error: "삭제할 candidate_id 또는 analysis_id가 필요합니다.",
        });
      }

      const deleted = await deleteCandidateAndAnalyses({
        candidateId,
        analysisId,
        candidateName: body.candidate_name || body.candidateName || req.query.candidate_name || req.query.candidateName,
        positionTitle: body.position_title || body.positionTitle || req.query.position_title || req.query.positionTitle,
      });

      return sendJson(res, 200, {
        ok: true,
        ...deleted,
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
