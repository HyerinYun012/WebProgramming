package com.example.demo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Google Gemini REST API 호출 전담 클래스.
 * 분류(NoticeAiService)와 번역(NoticeTranslationService)이 함께 사용한다.
 * 모델명/API 버전/인증 방식이 바뀌면 이 클래스만 고치면 된다.
 */
@Component
public class GeminiClient {

    private static final String ENDPOINT =
            "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

    private final JsonMapper jsonMapper;
    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    public GeminiClient(JsonMapper jsonMapper,
                        @Value("${gemini.api.key:NONE}") String apiKey,
                        @Value("${gemini.model:gemini-2.5-flash}") String model) {
        this.jsonMapper = jsonMapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(90));
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    /** API 키가 설정돼 있으면 true (NONE 이거나 비어 있으면 Gemini를 쓰지 않음) */
    public boolean isEnabled() {
        return !apiKey.isEmpty() && !apiKey.equals("NONE");
    }

    public String getModel() {
        return model;
    }

    /**
     * 프롬프트를 보내고 모델이 돌려준 JSON 응답을 파싱해서 반환한다.
     *
     * @throws RuntimeException HTTP 오류(할당량 초과 429 등), 빈 응답, JSON 파싱 실패 시
     */
    public JsonNode generateJson(String prompt, double temperature) {
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "temperature", temperature
                )
        );

        String response = restClient.post()
                .uri(ENDPOINT, model)
                .header("x-goog-api-key", apiKey) // 키를 URL에 넣지 않아 로그에 남지 않음
                .contentType(MediaType.APPLICATION_JSON)
                .body(jsonMapper.writeValueAsBytes(requestBody))
                .retrieve()
                .body(String.class);

        JsonNode text = jsonMapper.readTree(response)
                .path("candidates").path(0)
                .path("content").path("parts").path(0)
                .path("text");

        if (text.isMissingNode() || text.asString().isBlank()) {
            throw new IllegalStateException("Gemini 응답에 내용이 없습니다 (안전 필터 차단 등): " + abbreviate(response));
        }
        return jsonMapper.readTree(text.asString());
    }

    private String abbreviate(String s) {
        if (s == null) return "null";
        return s.length() > 300 ? s.substring(0, 300) + "..." : s;
    }
}
