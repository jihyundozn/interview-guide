function jsonResponse(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error('요청 본문이 너무 큽니다. 이력서 텍스트를 줄여주세요.'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function safeString(value) {
  return String(value || '').trim();
}

function compactWhitespace(text) {
  return safeString(text)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[￾�]/g, ' ')
    .replace(/\[[0-9]+p\]/gi, ' ')
    .replace(/페이지\s*[0-9]+\s*\/\s*[0-9]+/g, ' ')
    .replace(/([가-힣A-Za-z0-9])\|([가-힣A-Za-z0-9])/g, '$1 / $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanResumeTextForPrompt(text) {
  let cleaned = compactWhitespace(text);

  const brokenTerms = [
    ['백 엔 드', '백엔드'],
    ['프 론 트 엔 드', '프론트엔드'],
    ['개 발 자', '개발자'],
    ['경 력', '경력'],
    ['기 반', '기반'],
    ['업 무', '업무'],
    ['시 스 템', '시스템'],
    ['연 동', '연동'],
    ['모 델', '모델'],
    ['재 설 계', '재설계'],
    ['경 험', '경험'],
    ['보 유', '보유'],
    ['프 로 젝 트', '프로젝트'],
    ['서 비 스', '서비스'],
  ];

  brokenTerms.forEach(([from, to]) => {
    cleaned = cleaned.replaceAll(from, to);
  });

  return cleaned
    .replace(/\s+([,.:;!?])/g, '$1')
    .replace(/([,.:;!?])(?=[가-힣A-Za-z0-9])/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
}


function normalizeGeneratedText(value) {
  let text = safeString(value);

  const replacements = [
    ['TypeScript,Next.js', 'TypeScript, Next.js'],
    ['Java/Spring,ORM', 'Java/Spring, ORM'],
    ['API및TCP통신', 'API 및 TCP 통신'],
    ['API/TCP통신', 'API/TCP 통신'],
    ['TypeScript, Next.js기반', 'TypeScript, Next.js 기반'],
    ['Java/Spring, ORM기반', 'Java/Spring, ORM 기반'],
    ['기반서비스개발경험', '기반 서비스 개발 경험'],
    ['기반서비스개발', '기반 서비스 개발'],
    ['서비스개발경험', '서비스 개발 경험'],
    ['서비스개발', '서비스 개발'],
    ['개발경험', '개발 경험'],
    ['외부시스템연동', '외부 시스템 연동'],
    ['시스템연동', '시스템 연동'],
    ['운영관리용', '운영 관리용'],
    ['어드민웹개발', '어드민 웹 개발'],
    ['DB모델', 'DB 모델'],
    ['모델재설계', '모델 재설계'],
    ['요구사항분석', '요구사항 분석'],
    ['업무계획', '업무 계획'],
    ['업무일정관리', '업무 일정 관리'],
    ['커뮤니케이션능력', '커뮤니케이션 능력'],
    ['팀워크마인드', '팀워크 마인드'],
    ['필수경험충족도', '필수 경험 충족도'],
    ['개발요구사항', '개발 요구사항'],
    ['직접연관성', '직접 연관성'],
    ['충족도', '충족도'],
    ['문제해결력', '문제 해결력'],
    ['분석력', '분석력'],
  ];

  replacements.forEach(([from, to]) => {
    text = text.replaceAll(from, to);
  });

  return text
    .replace(/\[[0-9]+p\]/gi, ' ')
    .replace(/[￾�]+/g, ' ')
    .replace(/(\d+)\s*\/\s*100\s*종합\s*적합도[\s\.:：-]*/gi, '')
    .replace(/\b(Java\s*\/\s*Spring|TypeScript|Next\.js|React|Node\.js|Python)\s*기반\s*[가-힣A-Za-z0-9|·\s]{0,45}\|?\s*경력\s*\d+\s*년\s*\d*\s*개월?/gi, ' ')
    .replace(/필수자격\s*\/\s*필요경험\s*중\s*/g, '')
    .replace(/이력서에서는\s*/g, '')
    .replace(/내용이\s*우선적으로\s*확인되며,?/g, '')
    .replace(/또한(?=[A-Za-z가-힣])/g, '')
    .replace(/,(?=\S)/g, ', ')
    .replace(/\.(?=\S)/g, '. ')
    .replace(/\)(?=\S)/g, ') ')
    .replace(/([가-힣])([A-Za-z])/g, '$1 $2')
    .replace(/([A-Za-z])([가-힣])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAnalysisPayload(analysis) {
  if (!analysis || typeof analysis !== 'object') return analysis;

  const clean = normalizeGeneratedText;
  return {
    ...analysis,
    summary: clean(analysis.summary),
    jdFit: Array.isArray(analysis.jdFit)
      ? analysis.jdFit.map((item) => ({
          ...item,
          competency: clean(item.competency),
          evidence: clean(item.evidence),
        }))
      : [],
    verificationPoints: Array.isArray(analysis.verificationPoints)
      ? analysis.verificationPoints.map(clean).filter(Boolean)
      : [],
    customQuestions: Array.isArray(analysis.customQuestions)
      ? analysis.customQuestions.map((item) => ({
          ...item,
          type: clean(item.type),
          main: clean(item.main),
          follow: Array.isArray(item.follow) ? item.follow.map(clean).filter(Boolean) : [],
          intent: clean(item.intent),
          relatedCompetency: clean(item.relatedCompetency),
          sourceEvidence: clean(item.sourceEvidence),
          points: Array.isArray(item.points) ? item.points.map(clean).filter(Boolean) : [],
        }))
      : [],
  };
}

function buildPrompt({ positionContext, resumeText, existingQuestions }) {
  const cleanResume = cleanResumeTextForPrompt(resumeText).slice(0, 30000);
  const questionText = Array.isArray(existingQuestions)
    ? existingQuestions.slice(0, 120).map((item, index) => {
        if (typeof item === 'string') return `${index + 1}. ${item}`;
        return `${index + 1}. [${safeString(item.competency)}] ${safeString(item.question)}`;
      }).join('\n')
    : '';

  return `당신은 채용담당자와 현업 면접관을 돕는 시니어 HRBP/채용 면접 설계자입니다.
아래 [HR 등록 포지션 분석 기준]과 [지원자 이력서 텍스트]를 바탕으로, 면접관이 바로 읽을 수 있는 사전 검토 브리프를 작성하세요.

핵심 목표:
- 이력서 원문을 복사해 붙여넣지 말고, 이력서에 담긴 경험을 해석해 JD 기준의 의미로 바꿔 작성하세요.
- JD 문장을 그대로 반복하지 말고, JD 요구사항을 면접 평가 언어로 재구성하세요.
- 결과물은 "이 후보자가 어떤 경험을 가지고 있고, 그 경험이 이 포지션에서 어떤 의미가 있으며, 면접에서 무엇을 확인해야 하는지"가 자연스럽게 드러나야 합니다.

출력 톤:
- HR이 면접관에게 전달하는 사전 검토 메모처럼 작성하세요.
- 자연스러운 한국어 문장으로 작성하세요. PDF 추출 텍스트에 띄어쓰기가 없어도 최종 결과는 반드시 사람이 읽기 좋은 띄어쓰기로 다시 작성하세요.
- 후보자의 경험을 긍정적으로 해석하되, 근거가 부족한 부분은 차분하게 검증 필요 사항으로 남기세요.
- 사용자가 예시로 든 문장처럼 작성하세요. 예: "평가제도 설계부터 온보딩, 노무 이슈까지 HR 전반을 실제로 '작동'시킨 경험이 인상적입니다. 다만, 각 프로젝트에서 '왜 그 방향을 선택했는지' 의사결정 맥락이 빠져있어, HRBP로서의 전략적 판단력은 면접에서 추가 확인이 필요합니다."

절대 금지:
- 이력서 본문 또는 JD 문장을 긴 따옴표로 그대로 가져오지 마세요.
- OCR 텍스트의 페이지 표기, 깨진 문자, 불필요한 띄어쓰기, 원문 문단을 그대로 출력하지 마세요. 예: "[1p]", "기 반 백 엔 드", 긴 원문 복사 금지.
- 후보자 직무 헤더를 그대로 쓰지 마세요. 예: "Java/Spring 기반 백엔드 개발자 | 경력 3년 7개월" 같은 제목성 문구 금지.
- "이력서에서는 ‘...긴 원문...’ 내용이 우선적으로 확인되며" 같은 표현을 쓰지 마세요.
- "필수자격/필요경험 중 ‘...JD 원문...’에 대해서는"처럼 JD 항목을 그대로 붙이지 마세요.
- summary 본문에 "76/100 종합 적합도"처럼 점수를 반복하지 마세요. 점수는 overallFitScore 필드에만 작성하세요.
- "커뮤니케이션 능력이 좋아 보입니다", "문제해결력이 있습니다"처럼 이력서 없이도 쓸 수 있는 일반론을 쓰지 마세요.
- 합격/불합격을 판단하지 마세요. 면접 전 검토 보조자료만 작성하세요.
- 민감정보, 차별 소지가 있는 내용, 사생활 질문은 제외하세요.

근거 사용 방식:
- 이력서 근거는 프로젝트명, 업무명, 성과 수치, 경력 흐름 정도만 짧게 언급하세요.
- 근거를 언급할 때도 원문을 그대로 복사하지 말고, "운영관리용 어드민 개발", "외부 시스템 연동", "ATS 전환을 통한 채용 리드타임 개선"처럼 요약해 표현하세요.
- sourceEvidence 필드는 원문 전체가 아니라 근거가 되는 경험명/성과명만 짧게 적으세요.

점수 산정 기준:
- overallFitScore는 0~100 정수로 산정하세요.
- JD 역량별 score도 0~100 정수로 산정하세요.
- 90점 이상: JD 요구와 이력서 근거가 매우 직접적이고, 성과/역할/맥락이 구체적임
- 80~89점: JD와 직접 연결되는 경험이 충분하나 일부 판단 근거 또는 깊이 확인 필요
- 70~79점: 관련 경험은 있으나 전략적 판단, 의사결정 맥락, 성과 근거가 일부 불명확함
- 60~69점: 간접 경험 위주이거나 JD 핵심업무와의 연결성이 제한적임
- 60점 미만: 이력서상 근거가 부족함
- 점수를 후하게 주지 마세요. 경험이 있어도 본인 역할, 의사결정 기준, 성과 산정 방식이 불명확하면 70점대로 조정하세요.

출력 품질 기준:
1. overallFitScore
- 0~100 정수로 작성하세요.

2. summary
- 점수는 별도 필드(overallFitScore)에만 작성하세요. summary 본문에는 점수 표현을 반복하지 마세요.
- 2~4문장으로 작성하세요.
- 경력 흐름, JD와의 강한 연결점, 가장 중요한 추가 검증 필요 사항을 모두 포함하세요.
- 원문 인용 대신 해석 문장으로 작성하세요.
- OCR 텍스트에 띄어쓰기가 무너져 있어도, 반드시 자연스러운 한국어 띄어쓰기로 다시 작성하세요.
- JD 자격요건 문구를 그대로 쓰지 말고 "프론트엔드 서비스 개발 경험", "외부 시스템 연동 경험"처럼 평가 언어로 바꿔 쓰세요.

3. jdFit
- JD 역량 적합도는 반드시 [HR 등록 포지션 분석 기준]의 requiredQualifications, 즉 필수자격/필요경험 내용을 1차 기준으로 도출하세요.
- keyTasks는 포지션 맥락을 이해하기 위한 보조 정보로만 사용하고, jdFit 항목명은 주요업무 문장을 그대로 가져오지 마세요.
- 필수자격/필요경험에 기술 스택, 요구사항 분석, 일정 관리, 커뮤니케이션, 팀워크가 함께 들어있다면 아래처럼 묶어 3~5개 항목으로 재구성하세요.
  예: "필수 기술 경험 충족도", "개발 요구사항 분석력", "업무 일정 관리 능력", "커뮤니케이션 능력", "팀워크"
- 기술 스택이 여러 개라면 하나의 항목 안에서 묶어 평가하세요. 예: TypeScript/Next.js, Java/Spring/ORM, API/TCP 통신 이해를 "필수 기술 경험 충족도"로 통합.
- 각 항목은 competency, score, evidence로 작성하세요.
- competency에는 JD 원문을 그대로 붙이지 말고 면접관이 보기 쉬운 평가 항목명으로 바꿔 쓰세요.
- evidence는 1~3문장으로 작성하세요.
- evidence에는 이력서상 확인되는 경험을 해석한 내용과 아직 면접에서 확인해야 할 한계를 함께 쓰세요.
- evidence는 원문을 복사하지 말고 자연스러운 평가 문장으로 작성하세요.
- evidence의 첫 문장을 "또한"으로 시작하지 마세요.
- "경험은 실질적 변화를 만든 사례로 볼 여지가 있습니다"처럼 어색한 문장은 쓰지 말고, "실질적인 개선 경험으로 해석할 수 있습니다"처럼 자연스럽게 작성하세요.

4. verificationPoints
- 4~6개 작성하세요.
- 면접에서 확인해야 할 항목을 구체적으로 작성하세요.
- 각 항목은 “무엇을 / 왜 확인해야 하는지”가 드러나야 합니다.
- 검증 포인트도 원문/JD 복사가 아니라, 경험 해석 기반으로 작성하세요.

5. customQuestions
- 6개 작성하세요.
- 모든 질문은 후보자의 이력서에 적힌 특정 경험/프로젝트/성과를 바탕으로 작성하되, 긴 원문을 그대로 복사하지 마세요.
- 질문은 본인 기여도 확인, 성과 수치/개선 효과의 산정 기준 확인, 주요업무와 실제 경험의 연결성 확인, 필수 경험의 깊이 확인, 팀 성과와 개인 역할 구분, 우려사항 해소 중 하나 이상을 충족해야 합니다.
- “가장 어려웠던 경험을 말해주세요”처럼 모든 후보자에게 물을 수 있는 질문은 금지합니다.
- sourceEvidence에는 원문 문장 전체가 아니라 "전사 평가제도 기획 및 SaaS툴 도입", "리드타임 평균 3일 단축"처럼 짧은 근거 라벨을 적으세요.

좋지 않은 질문 예시:
- 협업 과정에서 어려웠던 경험을 말씀해주세요.
- 문제를 해결했던 경험을 말씀해주세요.
- 우리 회사에 지원한 이유는 무엇인가요?
- 이력서에 적힌 "[1p] Java/Spring 기 반 백 엔 드 개 발 자..." 내용에 대해 설명해 주세요.

좋은 질문 예시:
- 전사 평가제도와 SaaS 평가툴 도입 과정에서, 평가 항목과 직급별 기대 수준을 정할 때 어떤 대안을 비교했고 왜 그 방향을 선택했는지 설명해 주세요.
- ATS 전환으로 채용 리드타임을 단축한 경험에서, 병목을 어떻게 정의했고 본인이 직접 바꾼 프로세스는 무엇이었는지 설명해 주세요.
- 포괄임금제 로직 개선 과정에서 법적 리스크와 비용 부담 사이의 균형을 어떤 기준으로 판단했는지 설명해 주세요.

[HR 등록 포지션 분석 기준]
${JSON.stringify(positionContext || {}, null, 2)}

[기존 구조화면접 질문 예시 - 중복 금지]
${questionText}

[지원자 이력서 텍스트]
${cleanResume}`;
}

function getAnalysisSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      overallFitScore: { type: 'number' },
      summary: { type: 'string' },
      jdFit: {
        type: 'array',
        minItems: 3,
        maxItems: 5,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            competency: { type: 'string' },
            score: { type: 'number' },
            evidence: { type: 'string' },
          },
          required: ['competency', 'score', 'evidence'],
        },
      },
      verificationPoints: { type: 'array', items: { type: 'string' } },
      customQuestions: {
        type: 'array',
        minItems: 4,
        maxItems: 8,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            type: { type: 'string' },
            main: { type: 'string' },
            follow: { type: 'array', items: { type: 'string' } },
            intent: { type: 'string' },
            relatedCompetency: { type: 'string' },
            sourceEvidence: { type: 'string' },
            points: { type: 'array', items: { type: 'string' } },
          },
          required: ['type', 'main', 'follow', 'intent', 'relatedCompetency', 'sourceEvidence', 'points'],
        },
      },
    },
    required: ['overallFitScore', 'summary', 'jdFit', 'verificationPoints', 'customQuestions'],
  };
}

function extractOutputText(data) {
  if (data.output_text) return data.output_text;

  const chunks = [];
  (data.output || []).forEach((item) => {
    (item.content || []).forEach((content) => {
      // output_text 타입은 content.text에 이미 담겨 있습니다.
      // 같은 텍스트를 두 번 push하면 { ... }\n{ ... } 형태가 되어 JSON.parse 오류가 발생합니다.
      if (content.type === 'output_text' && content.text) {
        chunks.push(content.text);
      } else if (content.text) {
        chunks.push(content.text);
      }
    });
  });
  return chunks.join('\n');
}

function parseAnalysisJson(outputText) {
  const text = safeString(outputText);

  try {
    return JSON.parse(text);
  } catch (firstError) {
    // 혹시 모델/SDK 응답에 JSON 앞뒤 설명 또는 중복 JSON이 섞이면
    // 첫 번째 완전한 JSON 객체만 안전하게 잘라서 다시 파싱합니다.
    const start = text.indexOf('{');
    if (start === -1) throw firstError;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i += 1) {
      const char = text[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === '{') depth += 1;
      if (char === '}') depth -= 1;

      if (depth === 0) {
        return JSON.parse(text.slice(start, i + 1));
      }
    }

    throw firstError;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return jsonResponse(res, 405, { error: 'POST 요청만 지원합니다.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return jsonResponse(res, 500, { error: 'Vercel 환경변수 OPENAI_API_KEY가 설정되어 있지 않습니다.' });
  }

  try {
    const rawBody = await readBody(req);
    const body = JSON.parse(rawBody || '{}');
    const positionContext = body.positionContext || {};
    const resumeText = safeString(body.resumeText);
    const existingQuestions = Array.isArray(body.existingQuestions) ? body.existingQuestions : [];

    if (!resumeText) {
      return jsonResponse(res, 400, { error: '이력서 텍스트가 비어 있습니다.' });
    }

    const prompt = buildPrompt({ positionContext, resumeText, existingQuestions });
    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        store: false,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: '당신은 채용담당자와 현업 면접관을 돕는 HR 어시스턴트입니다. 모든 응답은 한국어로 작성하고, 반드시 요청한 JSON 구조만 반환하세요.',
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: prompt,
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'resume_interview_analysis',
            strict: true,
            schema: getAnalysisSchema(),
          },
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return jsonResponse(res, response.status, { error: data.error?.message || 'OpenAI 분석 요청에 실패했습니다.' });
    }

    const outputText = extractOutputText(data);
    if (!outputText) {
      return jsonResponse(res, 502, { error: 'AI 응답에서 분석 결과를 찾지 못했습니다.' });
    }

    const analysis = normalizeAnalysisPayload(parseAnalysisJson(outputText));
    return jsonResponse(res, 200, { analysis });
  } catch (error) {
    console.error(error);
    return jsonResponse(res, 500, { error: error.message || 'AI 분석 중 오류가 발생했습니다.' });
  }
};
