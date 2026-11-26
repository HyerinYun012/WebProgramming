package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "anonymous_contexts")
public class AnonymousContext {

	@Id
	@Column(name = "context_id", length = 50)
	private String contextId; // 브라우저 익명 세션 UUID

	@Column(name = "active_filters", length = 500)
	private String activeFilters = ""; // 현재 선택된 필터 태그들 (쉼표 구분)

	@Column(name = "recent_keywords", length = 500)
	private String recentKeywords = ""; // 최근 검색어 목록 (쉼표 구분)

	@Column(name = "inferred_persona", length = 300)
	private String inferredPersona = "시흥시 맞춤 지원사업을 탐색 중인 시민"; // AI가 추론한 현재 탐색 의도

	@Column(name = "last_active_at")
	private LocalDateTime lastActiveAt = LocalDateTime.now();

	@Column(name = "created_at", updatable = false)
	private LocalDateTime createdAt = LocalDateTime.now();

	public AnonymousContext() {
	}

	public AnonymousContext(String contextId) {
		this.contextId = contextId;
		this.lastActiveAt = LocalDateTime.now();
		this.createdAt = LocalDateTime.now();
	}

	// Getter & Setter
	public String getContextId() {
		return contextId;
	}

	public void setContextId(String contextId) {
		this.contextId = contextId;
	}

	public String getActiveFilters() {
		return activeFilters;
	}

	public void setActiveFilters(String activeFilters) {
		this.activeFilters = activeFilters;
	}

	public String getRecentKeywords() {
		return recentKeywords;
	}

	public void setRecentKeywords(String recentKeywords) {
		this.recentKeywords = recentKeywords;
	}

	public String getInferredPersona() {
		return inferredPersona;
	}

	public void setInferredPersona(String inferredPersona) {
		this.inferredPersona = inferredPersona;
	}

	public LocalDateTime getLastActiveAt() {
		return lastActiveAt;
	}

	public void setLastActiveAt(LocalDateTime lastActiveAt) {
		this.lastActiveAt = lastActiveAt;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}
}
