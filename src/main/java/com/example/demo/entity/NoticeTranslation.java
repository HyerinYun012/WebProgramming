package com.example.demo.entity;

import jakarta.persistence.*;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * 공고 번역 결과 (notices 1행 : 언어별 N행). 스키마는 02_notice_translations.sql 참고.
 */
@Entity
@Table(name = "notice_translations")
@IdClass(NoticeTranslation.Key.class)
public class NoticeTranslation {

    public static final String STATUS_DONE = "DONE";
    public static final String STATUS_FAILED = "FAILED";

    @Id
    @Column(name = "notice_id", length = 100)
    private String noticeId;

    @Id
    @Column(name = "lang", length = 10)
    private String lang;

    @Column(name = "title", length = 500)
    private String title;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "source_hash", nullable = false, columnDefinition = "CHAR(64)")
    private String sourceHash;

    @Column(name = "status", nullable = false, length = 20)
    private String status = STATUS_DONE;

    @Column(name = "last_error", length = 500)
    private String lastError;

    @Column(name = "model", length = 50)
    private String model;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "translated_at", nullable = false)
    private LocalDateTime translatedAt = LocalDateTime.now();

    protected NoticeTranslation() {
    }

    public NoticeTranslation(String noticeId, String lang) {
        this.noticeId = noticeId;
        this.lang = lang;
    }

    /** 번역 성공 결과를 기록한다. */
    public void markDone(String title, String summary, String content, String sourceHash, String model) {
        this.title = title;
        this.summary = summary;
        this.content = content;
        this.sourceHash = sourceHash;
        this.model = model;
        this.status = STATUS_DONE;
        this.lastError = null;
        this.translatedAt = LocalDateTime.now();
    }

    /** 번역 실패를 기록한다. 이전 번역문이 있으면 그대로 남겨 화면에는 계속 보이게 한다. */
    public void markFailed(String sourceHash, String error) {
        this.sourceHash = sourceHash;
        this.status = STATUS_FAILED;
        this.lastError = error == null ? null : (error.length() > 500 ? error.substring(0, 500) : error);
        this.translatedAt = LocalDateTime.now();
    }

    /** 현재 원문 해시 기준으로 다시 번역해야 하면 true */
    public boolean needsTranslation(String currentSourceHash) {
        return !STATUS_DONE.equals(status) || !Objects.equals(sourceHash, currentSourceHash);
    }

    public boolean isFailed() {
        return STATUS_FAILED.equals(status);
    }

    public String getNoticeId() { return noticeId; }
    public String getLang() { return lang; }
    public String getTitle() { return title; }
    public String getSummary() { return summary; }
    public String getContent() { return content; }
    public String getSourceHash() { return sourceHash; }
    public String getStatus() { return status; }
    public String getLastError() { return lastError; }
    public String getModel() { return model; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getTranslatedAt() { return translatedAt; }

    /** 복합 기본 키 (notice_id, lang) */
    public static class Key implements Serializable {
        private String noticeId;
        private String lang;

        public Key() {
        }

        public Key(String noticeId, String lang) {
            this.noticeId = noticeId;
            this.lang = lang;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Key key)) return false;
            return Objects.equals(noticeId, key.noticeId) && Objects.equals(lang, key.lang);
        }

        @Override
        public int hashCode() {
            return Objects.hash(noticeId, lang);
        }
    }
}
