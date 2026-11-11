package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notices")
public class Notice {

    @Id
    @Column(name = "notice_id", length = 100)
    private String noticeId;

    @Column(nullable = false)
    private String title;

    @Column(length = 100)
    private String dept;

    @Column(name = "posted_date", length = 20)
    private String postedDate;

    @Column(name = "support_type")
    private String supportType;

    @Column(length = 500)
    private String url;

    @Column(name = "clean_content", columnDefinition = "TEXT")
    private String cleanContent;

    // 👇 프론트엔드 4대 필터 & 8대 분야 매칭용 AI 분류 컬럼들
    @Column(name = "target_age", length = 50)
    private String targetAge = "전체"; // 전체, 청년, 어르신, 영유아·아동, 중장년

    @Column(name = "target_nationality", length = 50)
    private String targetNationality = "전체"; // 전체, 외국인, 다문화

    @Column(name = "ai_category", length = 50)
    private String aiCategory = "생활·복지"; // 청년, 외국인, 다문화, 소상공인, 가족, 어르신, 교육, 문화·행사, 생활·복지

    @Column(name = "region", length = 50)
    private String region = "경기도 전체"; // 시흥시, 경기도 전체

    @Column(name = "ai_summary", columnDefinition = "TEXT")
    private String aiSummary; // AI 3줄 핵심 요약

    @Column(name = "ai_tags", length = 500)
    private String aiTags; // 해시태그 (예: "#청년,#주거지원,#시흥시")

    @Column(name = "is_ai_processed")
    private boolean isAiProcessed = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Notice() {
    }

    public Notice(String noticeId, String title, String dept, String postedDate,
                  String supportType, String url, String cleanContent, boolean isAiProcessed) {
        this.noticeId = noticeId;
        this.title = title;
        this.dept = dept;
        this.postedDate = postedDate;
        this.supportType = supportType;
        this.url = url;
        this.cleanContent = cleanContent;
        this.isAiProcessed = isAiProcessed;
        this.createdAt = LocalDateTime.now();
    }

    // Getter & Setter
    public String getNoticeId() { return noticeId; }
    public void setNoticeId(String noticeId) { this.noticeId = noticeId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDept() { return dept; }
    public void setDept(String dept) { this.dept = dept; }

    public String getPostedDate() { return postedDate; }
    public void setPostedDate(String postedDate) { this.postedDate = postedDate; }

    public String getSupportType() { return supportType; }
    public void setSupportType(String supportType) { this.supportType = supportType; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getCleanContent() { return cleanContent; }
    public void setCleanContent(String cleanContent) { this.cleanContent = cleanContent; }

    public String getTargetAge() { return targetAge; }
    public void setTargetAge(String targetAge) { this.targetAge = targetAge; }

    public String getTargetNationality() { return targetNationality; }
    public void setTargetNationality(String targetNationality) { this.targetNationality = targetNationality; }

    public String getAiCategory() { return aiCategory; }
    public void setAiCategory(String aiCategory) { this.aiCategory = aiCategory; }

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }

    public String getAiSummary() { return aiSummary; }
    public void setAiSummary(String aiSummary) { this.aiSummary = aiSummary; }

    public String getAiTags() { return aiTags; }
    public void setAiTags(String aiTags) { this.aiTags = aiTags; }

    public boolean isAiProcessed() { return isAiProcessed; }
    public void setAiProcessed(boolean aiProcessed) { isAiProcessed = aiProcessed; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}