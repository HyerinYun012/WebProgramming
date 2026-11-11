CREATE DATABASE IF NOT EXISTS siheung_ai_notice
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE siheung_ai_notice;

-- 1. 시흥시 공공서비스(공고) 테이블 (PublServcList 명세서 완벽 반영)
CREATE TABLE IF NOT EXISTS notices (
    notice_id VARCHAR(100) NOT NULL COMMENT '공공서비스아이디 (PUBL_SERVC_ID)',
    title VARCHAR(255) NOT NULL COMMENT '공공서비스제목 (PUBL_SERVC_TITLE)',
    dept VARCHAR(100) NULL COMMENT '공공서비스소관기관명 (PUBL_SERVC_JURSDCTN_INST_NM)',
    posted_date VARCHAR(20) NULL COMMENT '최종수정일자 (LAST_UPD_DE)',
    support_type VARCHAR(255) NULL COMMENT '지원형태내역 (SPORT_FORM_DTLS)',
    url VARCHAR(500) NULL COMMENT '공공서비스상세URL (PUBL_SERVC_DETAIL_URL)',
    clean_content TEXT NULL COMMENT '공공서비스목적상세내용 (PUBL_SERVC_PURPS_DTCONT)',
    
    -- AI 1차 분석 결과 컬럼
    ai_category VARCHAR(50) NULL COMMENT 'AI 분류 카테고리',
    ai_summary TEXT NULL COMMENT 'AI 3줄 요약',
    ai_tags JSON NULL COMMENT 'AI 추출 핵심 해시태그 배열',
    is_ai_processed BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'AI 요약 완료 여부',
    
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (notice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 익명 행동 컨텍스트 테이블 (Zero-PII)
CREATE TABLE IF NOT EXISTS anonymous_contexts (
    context_id CHAR(36) NOT NULL COMMENT '브라우저 임시 발급 익명 UUID v4',
    active_filters JSON NULL,
    recent_keywords JSON NULL,
    category_weights JSON NULL,
    inferred_persona VARCHAR(300) NULL,
    last_active_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (context_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 실시간 행동 이벤트 로그 테이블
CREATE TABLE IF NOT EXISTS behavior_logs (
    log_id BIGINT NOT NULL AUTO_INCREMENT,
    context_id CHAR(36) NOT NULL,
    event_type VARCHAR(30) NOT NULL,
    notice_id VARCHAR(100) NULL,
    action_metadata JSON NULL,
    dwell_time_sec INT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (log_id),
    CONSTRAINT fk_logs_context FOREIGN KEY (context_id) REFERENCES anonymous_contexts (context_id) ON DELETE CASCADE,
    CONSTRAINT fk_logs_notice FOREIGN KEY (notice_id) REFERENCES notices (notice_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 컨텍스트별 AI 공고 매칭 결과 테이블
CREATE TABLE IF NOT EXISTS context_notice_matches (
    match_id BIGINT NOT NULL AUTO_INCREMENT,
    context_id CHAR(36) NOT NULL,
    notice_id VARCHAR(100) NOT NULL,
    is_matched BOOLEAN NOT NULL DEFAULT FALSE,
    match_score INT NOT NULL DEFAULT 0,
    match_reason VARCHAR(500) NULL,
    is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE,
    analyzed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (match_id),
    UNIQUE KEY uk_context_notice (context_id, notice_id),
    CONSTRAINT fk_matches_context FOREIGN KEY (context_id) REFERENCES anonymous_contexts (context_id) ON DELETE CASCADE,
    CONSTRAINT fk_matches_notice_ctx FOREIGN KEY (notice_id) REFERENCES notices (notice_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
