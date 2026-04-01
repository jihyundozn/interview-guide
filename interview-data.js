window.INTERVIEW_DATA = {
  siteTitle: "더즌 구조화 면접 가이드",
  siteDescription:
    "포지션 선택 후, 킥오프 미팅 기반으로 설계된 질문 세트와 평가 기준을 바로 확인할 수 있습니다.",
  scoreGuide:
    "1점: 불충분 / 3점: 기본 충족 / 5점: 구체적 경험과 깊이 있는 설명",
  pdfFooterNote:
    "면접 질문별 메모와 역량 점수를 바탕으로 PDF 1~2장 분량으로 저장되는 형태를 가정한 샘플입니다.",
  interviewRules: [
    "모든 후보자에게 동일한 메인 질문 적용",
    "답변의 구체성이 부족할 때만 꼬리질문 활용",
    "느낌보다 행동 근거와 판단 기준 중심으로 기록",
  ],
  finalOptions: ["추천", "보류", "비추천"],
  labels: {
    openPositions: "현재 오픈 포지션 선택",
    selectPositionGuide: "담당 중인 채용 포지션을 선택해주세요.",
    startGuide: "면접 가이드 시작하기",
    cautionButton: "면접 유의사항",
    coreCompetencies: "이번 면접에서 확인할 핵심 역량",
    interviewRules: "질문 운영 방식",
    scoreScale: "평가 척도",
    questionSet: "질문 세트",
    mainQuestion: "메인 질문",
    followUp: "꼬리 질문",
    checkPoints: "확인 포인트",
    rubric: "평가기준",
    purpose: "질문 의도",
    goodSignal: "좋은 답변 신호",
    averageAnswer: "보통 답변",
    riskSignal: "우려 신호",
    memo: "면접 메모",
    memoPlaceholder:
      "후보자의 답변에서 확인된 행동 근거, 판단 기준, 결과를 중심으로 기록",
    finalReview: "최종평가",
    savePdf: "PDF 저장",
    candidateName: "후보자명",
    interviewer: "면접관",
    interviewDate: "면접일",
    overallComment: "역량별 종합 코멘트",
    followUpCheck: "추가 확인 필요사항 / 레퍼런스 체크 포인트",
    finalOpinion: "최종 의견",
    pdfPreview: "PDF 저장 미리보기",
    pdfSample: "면접 결과 PDF 샘플",
    close: "닫기",
    memoSummary: "면접 메모 요약",
    overallCommentTitle: "종합 의견",
    followUpTitle: "추가 확인 필요사항",
  },
  positions: [
    {
      id: "accounting-manager",
      name: "회계팀장",
      guideTitle: "회계팀장 구조화 면접 가이드",
      summary:
        "킥오프 미팅에서 정의한 핵심 역량을 바탕으로, 실제 면접에서 바로 사용할 수 있도록 질문과 평가 기준을 정리한 면접 가이드입니다.",
      competencies: [
        {
          id: "problem-solving",
          name: "문제해결",
          order: "추천 순서 1",
          questions: [
            {
              type: "과거 경험 기반",
              main: "가장 복잡하거나 판단이 어려웠던 문제를 해결했던 경험을 말씀해주세요.",
              follow: [
                "당시 문제의 핵심을 어떻게 정의하셨나요?",
                "가능한 선택지 중 어떤 기준으로 우선순위를 정하셨나요?",
                "결과적으로 어떤 변화가 있었나요?",
              ],
              points: [
                "문제 정의의 명확성",
                "판단 기준의 구체성",
                "결과와 학습 연결",
              ],
              rubric: {
                purpose:
                  "문제 인식, 해결 방식, 판단 기준을 실제 사례를 통해 확인합니다.",
                good:
                  "맥락-문제-행동-결과가 분명하고, 본인의 판단 기준이 설명됩니다.",
                average:
                  "경험은 있으나 본인 역할이나 판단 근거 설명이 다소 약합니다.",
                weak:
                  "상황 설명이 추상적이거나 결과만 말하고 과정이 보이지 않습니다.",
              },
            },
            {
              type: "상황 가정형",
              main:
                "업무 진행 중 예상치 못한 변수로 기존 계획을 수정해야 한다면 어떻게 대응하시겠습니까?",
              follow: [
                "무엇을 먼저 확인하시겠어요?",
                "어떤 이해관계자와 먼저 소통하시겠어요?",
              ],
              points: [
                "우선순위 조정",
                "리스크 판단",
                "커뮤니케이션 방식",
              ],
              rubric: {
                purpose:
                  "변수 발생 시 대응 순서와 리스크 관리 방식을 확인합니다.",
                good:
                  "영향 범위를 파악하고 우선순위를 조정하며 관련자와 협의하는 흐름이 분명합니다.",
                average:
                  "대응 방향은 있으나 구체적인 우선순위나 기준이 부족합니다.",
                weak:
                  "무조건 진행/무조건 보류처럼 단선적 답변에 그칩니다.",
              },
            },
          ],
        },
        {
          id: "communication",
          name: "협업 · 커뮤니케이션",
          order: "추천 순서 2",
          questions: [
            {
              type: "과거 경험 기반",
              main:
                "타 부서 또는 이해관계자와 의견 차이가 있었던 상황에서 어떻게 조율하셨는지 말씀해주세요.",
              follow: [
                "상대가 중요하게 본 포인트는 무엇이었나요?",
                "최종적으로 어떤 합의에 도달했나요?",
              ],
              points: ["상대 관점 이해", "조율 방식", "합의 도출 과정"],
              rubric: {
                purpose:
                  "의견 충돌 상황에서의 소통과 조정 능력을 확인합니다.",
                good:
                  "충돌 원인, 조율 방식, 합의 결과가 구체적으로 설명됩니다.",
                average:
                  "갈등 상황은 설명되지만 본인의 조율 역할이 뚜렷하지 않습니다.",
                weak:
                  "상대가 이해하도록 했다 정도로 추상적이거나 일방향적 대응만 설명합니다.",
              },
            },
          ],
        },
        {
          id: "execution",
          name: "실행력",
          order: "추천 순서 3",
          questions: [
            {
              type: "과거 경험 기반",
              main:
                "기한이 촉박하거나 리소스가 제한된 상황에서도 결과를 만들어낸 경험이 있나요?",
              follow: [
                "당시 무엇을 포기하고 무엇을 지키셨나요?",
                "실행 과정에서 가장 어려웠던 점은 무엇이었나요?",
              ],
              points: ["우선순위 설정", "실행 속도", "결과 책임감"],
              rubric: {
                purpose:
                  "제한된 조건에서 결과를 만드는 실행 방식을 확인합니다.",
                good:
                  "제약 조건을 인식하고 현실적인 선택과 실행 과정을 설명합니다.",
                average:
                  "실행 경험은 있으나 기준과 판단 흐름이 다소 약합니다.",
                weak:
                  "열심히 했다 수준의 표현에 머물고 실제 행동이 드러나지 않습니다.",
              },
            },
          ],
        },
        {
          id: "expertise",
          name: "직무 전문성",
          order: "추천 순서 4",
          questions: [
            {
              type: "기술 · 지식 기반",
              main:
                "이 포지션에서 반드시 알아야 한다고 생각하는 핵심 업무 원칙이나 기준은 무엇인가요?",
              follow: [
                "그 기준이 실제 업무에서 중요했던 사례가 있나요?",
                "팀 내 다른 구성원과 기준이 달랐던 경험이 있었다면 어떻게 맞추셨나요?",
              ],
              points: ["핵심 기준 이해", "실무 적용 경험", "전문성의 언어화"],
              rubric: {
                purpose:
                  "직무 판단의 기준과 실무 전문성을 확인합니다.",
                good:
                  "핵심 원칙을 분명히 설명하고 실제 적용 사례까지 연결합니다.",
                average:
                  "원칙은 말하지만 구체적 사례나 기준 설명이 약합니다.",
                weak:
                  "원론적 이야기만 하고 직무 특화된 관점이 보이지 않습니다.",
              },
            },
          ],
        },
      ],
      pdfPreview: {
        candidateName: "홍길동",
        interviewers: "오지현 / 김OO",
        interviewDate: "2026.04.01",
        overallComment:
          "전반적으로 직무 이해도와 실행력은 안정적으로 확인되었고, 협업 과정에서의 조율 경험도 구체적으로 설명했습니다. 팀장 포지션 기준으로는 리더십 경험과 의사결정 범위를 추가 확인하면 좋겠습니다.",
        followUps: [
          "조직 리딩 범위와 실제 의사결정 권한 수준",
          "대내외 커뮤니케이션에서 어려운 상황을 다룬 사례",
          "레퍼런스 체크 시 확인할 리스크 포인트",
        ],
        finalDecision: "추천",
      },
    },
    {
      id: "hr-junior",
      name: "인사팀 주니어",
      guideTitle: "인사팀 주니어 구조화 면접 가이드",
      summary:
        "킥오프 미팅에서 정의한 핵심 역량을 바탕으로, 실제 면접에서 바로 사용할 수 있도록 질문과 평가 기준을 정리한 면접 가이드입니다.",
      competencies: [
        {
          id: "ownership",
          name: "책임감",
          order: "추천 순서 1",
          questions: [
            {
              type: "과거 경험 기반",
              main:
                "담당한 업무를 끝까지 책임지고 마무리했던 경험을 말씀해주세요.",
              follow: [
                "예상과 달리 어려움이 생겼을 때 어떻게 대응하셨나요?",
                "그 경험 이후 본인의 일하는 방식이 달라진 점이 있나요?",
              ],
              points: ["책임 범위 인식", "문제 대응", "마무리의 완성도"],
              rubric: {
                purpose:
                  "업무를 맡았을 때 끝까지 책임지는 태도와 실행 방식을 확인합니다.",
                good:
                  "문제 상황에서도 주도적으로 대응하며 결과까지 책임진 사례가 구체적입니다.",
                average:
                  "책임 있게 수행한 경험은 있으나 본인 판단이나 역할 설명이 약합니다.",
                weak:
                  "지시받은 일을 수행했다 수준으로만 설명합니다.",
              },
            },
          ],
        },
      ],
      pdfPreview: {
        candidateName: "김지원",
        interviewers: "오지현",
        interviewDate: "2026.04.08",
        overallComment:
          "기본적인 실행력과 책임감은 확인되었으며, 실무 적응 속도와 커뮤니케이션 방식은 추가 확인이 필요합니다.",
        followUps: [
          "초기 온보딩 적응 속도",
          "실수 발생 시 대처 방식",
          "우선순위 관리 습관",
        ],
        finalDecision: "보류",
      },
    },
    {
      id: "service-planning",
      name: "서비스기획",
      guideTitle: "서비스기획 구조화 면접 가이드",
      summary:
        "샘플 포지션입니다. 실제 킥오프 미팅 결과에 맞춰 교체해서 사용하면 됩니다.",
      competencies: [],
      pdfPreview: {
        candidateName: "홍길동",
        interviewers: "오지현",
        interviewDate: "2026.04.01",
        overallComment: "서비스기획 포지션용 샘플 종합 의견입니다.",
        followUps: ["핵심 프로젝트 범위", "협업 구조", "의사결정 기준"],
        finalDecision: "보류",
      },
    },
  ],
};
