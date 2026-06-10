const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

function normalizePositionTitle(value) {
  return String(value || "").trim();
}

function normalizeCandidateName(value) {
  return String(value || "").trim();
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return sendJson(res, 200, { ok: true });
  }

  let supabase;

  try {
    supabase = getSupabaseClient();
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: "Supabase 설정이 누락되어 후보자 데이터를 불러올 수 없습니다.",
      detail: error.message,
    });
  }

  try {
    if (req.method === "GET") {
      const positionTitle = normalizePositionTitle(req.query.position || req.query.position_title);

      let query = supabase
        .from("candidates")
        .select(`
          id,
          position_title,
          candidate_name,
          source,
          status,
          is_added_to_guide,
          added_to_guide_at,
          latest_analysis_id,
          created_at,
          updated_at,
          ai_resume_analyses (
            id,
            overall_fit_score,
            analysis_result,
            selected_questions,
            created_at,
            updated_at
          )
        `)
        .order("created_at", { ascending: false });

      if (positionTitle) {
        query = query.eq("position_title", positionTitle);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return sendJson(res, 200, {
        ok: true,
        candidates: data || [],
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      const positionTitle = normalizePositionTitle(body.position_title || body.positionTitle);
      const candidateName = normalizeCandidateName(body.candidate_name || body.candidateName);

      if (!positionTitle || !candidateName) {
        return sendJson(res, 400, {
          ok: false,
          error: "포지션명과 후보자명이 필요합니다.",
        });
      }

      const { data: existingCandidate, error: existingError } = await supabase
        .from("candidates")
        .select("id, latest_analysis_id")
        .eq("position_title", positionTitle)
        .eq("candidate_name", candidateName)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      let candidate = existingCandidate;

      if (!candidate) {
        const { data: insertedCandidate, error: insertCandidateError } = await supabase
          .from("candidates")
          .insert({
            position_title: positionTitle,
            candidate_name: candidateName,
            source: body.source || "manual",
            status: body.status || "registered",
            is_added_to_guide: Boolean(body.is_added_to_guide || false),
          })
          .select("id, latest_analysis_id")
          .single();

        if (insertCandidateError) {
          throw insertCandidateError;
        }

        candidate = insertedCandidate;
      }

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

      const updates = {};

      if (typeof body.is_added_to_guide === "boolean") {
        updates.is_added_to_guide = body.is_added_to_guide;
        updates.added_to_guide_at = body.is_added_to_guide ? new Date().toISOString() : null;
      }

      if (body.status) {
        updates.status = String(body.status);
      }

      if (body.latest_analysis_id || body.latestAnalysisId) {
        updates.latest_analysis_id = body.latest_analysis_id || body.latestAnalysisId;
      }

      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("candidates")
        .update(updates)
        .eq("id", candidateId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return sendJson(res, 200, {
        ok: true,
        candidate: data,
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
