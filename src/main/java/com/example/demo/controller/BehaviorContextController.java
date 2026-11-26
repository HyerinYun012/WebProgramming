package com.example.demo.controller;

import com.example.demo.service.BehaviorContextService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/context")
@CrossOrigin(origins = "*")
public class BehaviorContextController {

	private final BehaviorContextService contextService;

	public BehaviorContextController(BehaviorContextService contextService) {
		this.contextService = contextService;
	}

	// 1. [브라우저 주소창 테스트 & GET 요청용] 행동 로그 저장 API
	// 테스트 주소:
	// http://localhost:8080/api/context/log?contextId=my-test-01&eventType=VIEW&category=소상공인&keyword=창업&dwellTimeSec=40
	@GetMapping("/log")
	public Map<String, Object> logBehaviorGet(
			@RequestParam(value = "contextId", defaultValue = "anon-default-session") String contextId,
			@RequestParam(value = "eventType", defaultValue = "VIEW") String eventType,
			@RequestParam(value = "noticeId", required = false) String noticeId,
			@RequestParam(value = "category", required = false) String category,
			@RequestParam(value = "keyword", required = false) String keyword,
			@RequestParam(value = "dwellTimeSec", defaultValue = "0") int dwellTimeSec) {
		try {
			return contextService.recordBehavior(contextId, eventType, noticeId, category, keyword, dwellTimeSec);
		} catch (Exception e) {
			e.printStackTrace();
			return Map.of("status", "ERROR", "message", e.getMessage());
		}
	}

	// 2. [프론트엔드 fetch POST 요청용] JSON Body로 행동 로그 저장 API
	@PostMapping("/log")
	public Map<String, Object> logBehaviorPost(@RequestBody Map<String, Object> body) {
		try {
			String contextId = String.valueOf(body.getOrDefault("contextId", "anon-default-session"));
			String eventType = String.valueOf(body.getOrDefault("eventType", "VIEW"));
			String noticeId = body.get("noticeId") != null ? String.valueOf(body.get("noticeId")) : null;
			String category = body.get("category") != null ? String.valueOf(body.get("category")) : null;
			String keyword = body.get("keyword") != null ? String.valueOf(body.get("keyword")) : null;
			int dwellTimeSec = body.get("dwellTimeSec") != null
					? Integer.parseInt(String.valueOf(body.get("dwellTimeSec")))
					: 0;

			return contextService.recordBehavior(contextId, eventType, noticeId, category, keyword, dwellTimeSec);
		} catch (Exception e) {
			e.printStackTrace();
			return Map.of("status", "ERROR", "message", e.getMessage());
		}
	}

	// 3. 누적된 행동을 기반으로 AI 맞춤 공고 추천받기
	// 테스트 주소: http://localhost:8080/api/context/recommend?contextId=my-test-01
	@GetMapping("/recommend")
	public Map<String, Object> getRecommendations(
			@RequestParam(value = "contextId", defaultValue = "anon-default-session") String contextId) {
		try {
			return contextService.getPersonalizedRecommendations(contextId);
		} catch (Exception e) {
			e.printStackTrace();
			return Map.of("status", "ERROR", "message", e.getMessage());
		}
	}

	// 4. 익명 컨텍스트 초기화
	@GetMapping("/reset")
	public Map<String, String> resetUserContext(
			@RequestParam(value = "contextId", defaultValue = "anon-default-session") String contextId) {
		contextService.resetContext(contextId);
		return Map.of("status", "RESET_SUCCESS", "message", "익명 행동 컨텍스트가 초기화되었습니다.");
	}
}