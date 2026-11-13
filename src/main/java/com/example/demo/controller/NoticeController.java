package com.example.demo.controller;

import com.example.demo.entity.Notice;
import com.example.demo.repository.NoticeRepository;
import com.example.demo.service.NoticeAiService;
import com.example.demo.service.NoticeSyncService;
import com.example.demo.service.NoticeTranslationService;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notices")
@CrossOrigin(origins = "*") // 프론트엔드(React/Vue/HTML)에서 CORS 에러 없이 호출 가능하도록 허용!
public class NoticeController {

	private final NoticeSyncService noticeSyncService;
	private final NoticeAiService noticeAiService;
	private final NoticeTranslationService noticeTranslationService;
	private final NoticeRepository noticeRepository;

	public NoticeController(NoticeSyncService noticeSyncService, NoticeAiService noticeAiService,
			NoticeTranslationService noticeTranslationService, NoticeRepository noticeRepository) {
		this.noticeSyncService = noticeSyncService;
		this.noticeAiService = noticeAiService;
		this.noticeTranslationService = noticeTranslationService;
		this.noticeRepository = noticeRepository;
	}

	// 1. 공공데이터 수집 → AI 자동 분류 → 외국어 번역을 한 번에 실행!
	// 호출 주소: http://localhost:8080/api/notices/sync
	@GetMapping("/sync")
	public Map<String, Object> syncAndClassifyNotices() {
		try {
			int savedCount = noticeSyncService.fetchAndSaveSiheungNotices();
			int classifiedCount = noticeAiService.classifyAllNotices();

			// 번역이 실패해도 수집/분류 결과는 이미 저장됐으므로 전체를 실패로 처리하지 않음
			Object translatedCount;
			try {
				translatedCount = noticeTranslationService.translatePendingNotices();
			} catch (Exception e) {
				translatedCount = "ERROR: " + e.getMessage();
			}

			return Map.of("status", "SUCCESS", "saved_count", savedCount, "ai_classified_count", classifiedCount,
					"translated_count", translatedCount,
					"message", "공공데이터 수집, AI 자동 분류, 외국어 번역 완료!");
		} catch (Exception e) {
			return Map.of("status", "ERROR", "error_detail", String.valueOf(e.getMessage()));
		}
	}

	// 1-1. 이미 분석된 공고의 번역만 실행할 때 쓰는 주소 (한 번에 app.translation.batch-size 건씩)
	// 호출 주소: http://localhost:8080/api/notices/translate
	@GetMapping("/translate")
	public Map<String, Object> translateOnly() {
		int count = noticeTranslationService.translatePendingNotices();
		return Map.of("status", "SUCCESS", "translated_count", count);
	}

	// 2. 이미 DB에 있는 데이터만 빠르게 AI 재분류 실행할 때 쓰는 주소
	// 호출 주소: http://localhost:8080/api/notices/classify
	@GetMapping("/classify")
	public Map<String, Object> classifyOnly() {
		int count = noticeAiService.classifyAllNotices();
		return Map.of("status", "SUCCESS", "classified_count", count);
	}

	// 3. 프론트엔드 메인 화면 [4대 필터 + 검색어] 실시간 맞춤형 조회 API
	// 호출 예시: http://localhost:8080/api/notices?category=청년&region=시흥시&keyword=월세
	@GetMapping
	public List<Notice> getFilteredNotices(@RequestParam(required = false, defaultValue = "전체") String age,
			@RequestParam(required = false, defaultValue = "전체") String nationality,
			@RequestParam(required = false, defaultValue = "전체") String category,
			@RequestParam(required = false, defaultValue = "전체") String region,
			@RequestParam(required = false, defaultValue = "") String keyword) {
		List<Notice> allNotices = noticeRepository.findAll();

		return allNotices.stream()
				.filter(n -> "전체".equals(age) || age.equals(n.getTargetAge()) || "전체".equals(n.getTargetAge()))
				.filter(n -> "전체".equals(nationality) || nationality.equals(n.getTargetNationality()))
				.filter(n -> "전체".equals(category) || category.equals(n.getAiCategory()))
				.filter(n -> "전체".equals(region) || (n.getRegion() != null && n.getRegion().contains(region)))
				.filter(n -> keyword.isEmpty() || (n.getTitle() != null && n.getTitle().contains(keyword))
						|| (n.getCleanContent() != null && n.getCleanContent().contains(keyword))
						|| (n.getAiTags() != null && n.getAiTags().contains(keyword)))
				.collect(Collectors.toList());
	}

	// 4. 프론트엔드 [분야별로 찾아보기] 8개 아이콘 아래 건수(예: 청년 38건) 자동 계산 API
	// 호출 주소: http://localhost:8080/api/notices/counts
	@GetMapping("/counts")
	public Map<String, Long> getCategoryCounts() {
		List<Notice> all = noticeRepository.findAll();
		Map<String, Long> counts = new LinkedHashMap<>();
		String[] categories = { "청년", "외국인", "다문화", "소상공인", "가족", "어르신", "교육", "문화·행사" };

		for (String cat : categories) {
			long cnt = all.stream().filter(n -> cat.equals(n.getAiCategory())).count();
			counts.put(cat, cnt);
		}
		counts.put("전체", (long) all.size());
		return counts;
	}

	// 5. 특정 공고 상세 조회 API (카드 클릭 시 상세 모달/페이지용)
	// 호출 예시: GET http://localhost:8080/api/notices/W00001234
	@GetMapping("/{noticeId}")
	public Notice getNoticeDetail(@PathVariable String noticeId) {
		return noticeRepository.findById(noticeId)
				.orElseThrow(() -> new RuntimeException("해당 공고를 찾을 수 없습니다: " + noticeId));
	}

	// 6. [핵심] Zero-PII 행동 컨텍스트 기반 AI 맞춤 공고 추천 API (메인 화면 추천 카드 4개용)
	// 호출 예시: GET
	// http://localhost:8080/api/notices/recommend?recentCategory=청년&recentKeyword=월세
	@GetMapping("/recommend")
	public List<Map<String, Object>> getContextualRecommendations(
			@RequestParam(required = false, defaultValue = "청년") String recentCategory,
			@RequestParam(required = false, defaultValue = "") String recentKeyword) {
		List<Notice> all = noticeRepository.findAll();
		List<Map<String, Object>> recommendedList = new ArrayList<>();

		for (Notice n : all) {
			int score = 60; // 기본 적합도 점수
			List<String> reasons = new ArrayList<>();

			// 사용자의 최근 관심 카테고리 행동과 일치하면 가산점 부여
			if (recentCategory.equals(n.getAiCategory()) || recentCategory.equals(n.getTargetAge())) {
				score += 25;
				reasons.add("최근 탐색하신 '" + recentCategory + "' 분야 관심 행동과 일치");
			}
			// 시흥시 직접 사업이면 가산점 부여
			if ("시흥시".equals(n.getRegion())) {
				score += 10;
				reasons.add("시흥시 직접 지원 사업");
			}
			// 최근 검색 키워드가 제목/본문/태그에 포함되면 가산점 부여
			if (!recentKeyword.isEmpty() && ((n.getTitle() != null && n.getTitle().contains(recentKeyword))
					|| (n.getCleanContent() != null && n.getCleanContent().contains(recentKeyword)))) {
				score += 15;
				reasons.add("최근 검색어('" + recentKeyword + "') 맥락 부합");
			}

			if (score > 99)
				score = 99;
			if (reasons.isEmpty()) {
				reasons.add("시흥시민이 신청 가능한 경기도 주요 혜택");
			}

			Map<String, Object> item = new LinkedHashMap<>();
			item.put("noticeId", n.getNoticeId());
			item.put("title", n.getTitle());
			item.put("dept", n.getDept());
			item.put("aiCategory", n.getAiCategory());
			item.put("region", n.getRegion());
			item.put("supportType", n.getSupportType());
			item.put("aiSummary", n.getAiSummary());
			item.put("aiTags", n.getAiTags());
			item.put("url", n.getUrl());
			item.put("matchScore", score); // 프론트 카드 좌상단 'AI 적합도 95%' 뱃지용!
			item.put("matchReason", String.join(" · ", reasons)); // AI 추천 사유 툴팁용!

			recommendedList.add(item);
		}

		// 적합도 점수(matchScore) 높은 순으로 정렬해서 상위 8개 반환!
		recommendedList.sort((a, b) -> Integer.compare((int) b.get("matchScore"), (int) a.get("matchScore")));
		return recommendedList.subList(0, Math.min(8, recommendedList.size()));
	}

}
