package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "behavior_logs")
public class BehaviorLog {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "log_id")
	private Long logId;

	@Column(name = "context_id", length = 50, nullable = false)
	private String contextId; // 익명 세션 ID

	@Column(name = "event_type", length = 30, nullable = false)
	private String eventType; // VIEW(공고조회), BOOKMARK(찜), FILTER(필터/아이콘클릭), SEARCH(검색), DISMISS(관심없음)

	@Column(name = "notice_id", length = 100)
	private String noticeId; // 클릭한 대상 공고 ID (검색/필터일 경우 null)

	@Column(name = "category", length = 50)
	private String category; // 행동이 발생한 분야 (예: 청년, 소상공인, 어르신 등)

	@Column(name = "keyword", length = 100)
	private String keyword; // 입력한 검색어 또는 클릭한 태그

	@Column(name = "dwell_time_sec")
	private int dwellTimeSec = 0; // 공고를 읽으며 머문 체류 시간(초)

	@Column(name = "created_at", updatable = false)
	private LocalDateTime createdAt = LocalDateTime.now();

	public BehaviorLog() {
	}

	public BehaviorLog(String contextId, String eventType, String noticeId, String category, String keyword,
			int dwellTimeSec) {
		this.contextId = contextId;
		this.eventType = eventType;
		this.noticeId = noticeId;
		this.category = category;
		this.keyword = keyword;
		this.dwellTimeSec = dwellTimeSec;
		this.createdAt = LocalDateTime.now();
	}

	// Getter & Setter
	public Long getLogId() {
		return logId;
	}

	public void setLogId(Long logId) {
		this.logId = logId;
	}

	public String getContextId() {
		return contextId;
	}

	public void setContextId(String contextId) {
		this.contextId = contextId;
	}

	public String getEventType() {
		return eventType;
	}

	public void setEventType(String eventType) {
		this.eventType = eventType;
	}

	public String getNoticeId() {
		return noticeId;
	}

	public void setNoticeId(String noticeId) {
		this.noticeId = noticeId;
	}

	public String getCategory() {
		return category;
	}

	public void setCategory(String category) {
		this.category = category;
	}

	public String getKeyword() {
		return keyword;
	}

	public void setKeyword(String keyword) {
		this.keyword = keyword;
	}

	public int getDwellTimeSec() {
		return dwellTimeSec;
	}

	public void setDwellTimeSec(int dwellTimeSec) {
		this.dwellTimeSec = dwellTimeSec;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}
}
