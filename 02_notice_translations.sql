USE siheung_ai_notice;

-- 5. 공고 번역 테이블 (원본 notices 1행 : 언어별 N행)
--    - 언어 추가 시 스키마 변경 없이 lang 값만 늘리면 됨
--    - 필터/카테고리 값(ai_category, target_age 등)은 번역하지 않음 → 프론트엔드 i18n에서 표시만 변환
--    - 조회 예: LEFT JOIN notice_translations t ON t.notice_id = n.notice_id AND t.lang = 'en'
--              COALESCE(t.title, n.title) 로 번역이 없으면 한국어 원문으로 대체
CREATE TABLE IF NOT EXISTS notice_translations (
    notice_id     VARCHAR(100) NOT NULL COMMENT '원본 공고 ID (notices.notice_id)',
    lang          VARCHAR(10)  NOT NULL COMMENT '대상 언어 코드 (BCP-47: en, zh-CN, vi ...)',

    -- 번역 결과 (원문보다 길어질 수 있어 원본보다 여유 있게 잡음)
    title         VARCHAR(500) NULL COMMENT '번역된 제목 (notices.title)',
    summary       TEXT         NULL COMMENT '번역된 AI 요약 (notices.ai_summary)',
    content       TEXT         NULL COMMENT '번역된 본문 (notices.clean_content)',

    -- 재번역 판단 및 운영용 메타데이터
    source_hash   CHAR(64)     NOT NULL COMMENT '번역 당시 한국어 원문(제목+요약+본문)의 SHA-256. 현재 원문 해시와 다르면 재번역',
    status        VARCHAR(20)  NOT NULL DEFAULT 'DONE' COMMENT 'DONE: 번역 완료 / FAILED: 실패(재시도 대상)',
    last_error    VARCHAR(500) NULL COMMENT '마지막 실패 사유 (status = FAILED 일 때)',
    model         VARCHAR(50)  NULL COMMENT '번역에 사용한 모델명 (예: gemini-2.5-flash)',

    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    translated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (notice_id, lang),
    KEY idx_tr_lang_status (lang, status) COMMENT '언어별 실패 건 재시도 조회용',
    CONSTRAINT fk_tr_notice FOREIGN KEY (notice_id) REFERENCES notices (notice_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
