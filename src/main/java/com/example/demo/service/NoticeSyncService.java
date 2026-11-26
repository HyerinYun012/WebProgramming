package com.example.demo.service;

import com.example.demo.entity.Notice;
import com.example.demo.repository.AnonymousContextRepository;
import com.example.demo.repository.BehaviorLogRepository;
import com.example.demo.repository.NoticeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.json.BasicJsonParser;
import org.springframework.boot.json.JsonParser;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class NoticeSyncService {

    private final NoticeRepository noticeRepository;
    private final BehaviorLogRepository behaviorLogRepository;
    private final AnonymousContextRepository anonymousContextRepository;
    private final JsonParser jsonParser = new BasicJsonParser();

    @Value("${gg.api.url}")
    private String apiUrl;

    @Value("${gg.api.key}")
    private String apiKey;

    private static final String[] OTHER_CITIES = {
        "수원", "성남", "의정부", "안양", "부천", "광명", "평택", "동두천", "안산", "고양",
        "과천", "구리", "남양주", "오산", "군포", "의왕", "하남", "용인", "파주", "이천",
        "안성", "김포", "화성", "광주", "양주", "포천", "여주", "연천", "가평", "양평"
    };

    private static final Pattern DATE_PATTERN = Pattern.compile("(202[3-6])[-./년\\s]+(0?[1-9]|1[0-2])[-./월\\s]+(0?[1-9]|[12][0-9]|3[01])");

    public NoticeSyncService(NoticeRepository noticeRepository,
                             BehaviorLogRepository behaviorLogRepository,
                             AnonymousContextRepository anonymousContextRepository) {
        this.noticeRepository = noticeRepository;
        this.behaviorLogRepository = behaviorLogRepository;
        this.anonymousContextRepository = anonymousContextRepository;
    }

    /**
     * 기존 DB 테이블(공고 + 행동로그 + 익명컨텍스트)을 완전히 싹 밀어버리고(Wipe),
     * 경기공공데이터 OpenAPI에서 새로 받아와 깨끗하게 채워 넣는 메소드
     */
    @Transactional
    @SuppressWarnings("unchecked")
    public int fetchAndSaveSiheungNotices() {
        try {
            // 1. 기존 DB 데이터 전체 초기화 (싹 밀어버리기!)
            System.out.println("🧹 기존 DB 데이터를 모두 초기화(Wipe)합니다...");
            behaviorLogRepository.deleteAllInBatch();
            anonymousContextRepository.deleteAllInBatch();
            noticeRepository.deleteAllInBatch();
            noticeRepository.flush();

            RestTemplate restTemplate = new RestTemplate();
            restTemplate.getMessageConverters().add(0, new StringHttpMessageConverter(StandardCharsets.UTF_8));

            List<Notice> targetNotices = new ArrayList<>();
            int siheungCount = 0;
            int gyeonggiCount = 0;

            for (int page = 1; page <= 5; page++) {
                URI uri = UriComponentsBuilder.fromUriString(apiUrl)
                        .queryParam("KEY", apiKey.trim())
                        .queryParam("Type", "json")
                        .queryParam("pIndex", page)
                        .queryParam("pSize", 1000)
                        .build()
                        .toUri();

                String jsonResponse = restTemplate.getForObject(uri, String.class);
                if (jsonResponse == null || !jsonResponse.contains("PublServcList")) {
                    break;
                }

                Map<String, Object> responseMap = jsonParser.parseMap(jsonResponse);
                List<Object> publServcList = (List<Object>) responseMap.get("PublServcList");
                if (publServcList == null || publServcList.size() < 2) {
                    break;
                }

                Map<String, Object> secondElement = (Map<String, Object>) publServcList.get(1);
                List<Map<String, Object>> rows = (List<Map<String, Object>>) secondElement.get("row");
                if (rows == null || rows.isEmpty()) {
                    break;
                }

                for (Map<String, Object> item : rows) {
                    String id = getString(item, "PUBL_SERVC_ID", "");
                    if (id.isEmpty()) continue;

                    String title = getString(item, "PUBL_SERVC_TITLE", "제목 없음");
                    String dept = getString(item, "PUBL_SERVC_JURSDCTN_INST_NM", "경기도");
                    String rawDate = getString(item, "LAST_UPD_DE", "");
                    String purpsDtcont = getString(item, "PUBL_SERVC_PURPS_DTCONT", "");
                    String sportForm = getString(item, "SPORT_FORM_DTLS", "상시지원");
                    String detailUrl = getString(item, "PUBL_SERVC_DETAIL_URL", "");

                    if (detailUrl.isEmpty()) {
                        detailUrl = getString(item, "PUBL_SERVC_DETAIL_KOR_URL", "");
                    }

                    String postedDate = resolveSmartDate(rawDate, title + " " + purpsDtcont, id);

                    boolean isSiheung = dept.contains("시흥") || title.contains("시흥") || purpsDtcont.contains("시흥");
                    boolean isOtherCity = isOtherCityNotice(dept, title);
                    boolean isGyeonggiCommon = !isOtherCity && (dept.contains("경기") || title.contains("경기") || purpsDtcont.contains("경기도"));

                    if (isSiheung || isGyeonggiCommon) {
                        Notice notice = new Notice(
                                id,
                                title,
                                dept,
                                postedDate,
                                sportForm,
                                detailUrl,
                                cleanHtml(purpsDtcont),
                                false
                        );
                        targetNotices.add(notice);

                        if (isSiheung) siheungCount++;
                        else gyeonggiCount++;
                    }
                }

                if (rows.size() < 1000) {
                    break;
                }
            }

            if (!targetNotices.isEmpty()) {
                noticeRepository.saveAll(targetNotices);
            }

            System.out.println("==========================================");
            System.out.println("🎉 DB 초기화 및 신규 적재 완료! 총 저장 건수: " + targetNotices.size() + "건");
            System.out.println("   - 시흥시 직접 관련 공고: " + siheungCount + "건");
            System.out.println("   - 경기도 자체(광역) 공고: " + gyeonggiCount + "건");
            System.out.println("==========================================");

            return targetNotices.size();

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException(e.getMessage());
        }
    }

    private String resolveSmartDate(String rawDate, String textContent, String noticeId) {
        if (rawDate != null && !rawDate.trim().isEmpty() && !rawDate.equalsIgnoreCase("null")) {
            String digits = rawDate.replaceAll("[^0-9]", "");
            if (digits.length() >= 8) {
                return digits.substring(0, 4) + "-" + digits.substring(4, 6) + "-" + digits.substring(6, 8);
            }
        }
        if (textContent != null) {
            Matcher matcher = DATE_PATTERN.matcher(textContent);
            if (matcher.find()) {
                String year = matcher.group(1);
                String month = String.format("%02d", Integer.parseInt(matcher.group(2)));
                String day = String.format("%02d", Integer.parseInt(matcher.group(3)));
                return year + "-" + month + "-" + day;
            }
        }
        int daysAgo = Math.abs(noticeId.hashCode() % 60);
        return LocalDate.now().minusDays(daysAgo).toString();
    }

    private boolean isOtherCityNotice(String dept, String title) {
        for (String city : OTHER_CITIES) {
            if (dept.contains(city) || title.contains(city + "시") || title.contains(city + "군")) {
                return true;
            }
        }
        return false;
    }

    private String getString(Map<String, Object> map, String key, String defaultValue) {
        Object val = map.get(key);
        if (val == null) return defaultValue;
        String str = String.valueOf(val).trim();
        return (str.isEmpty() || str.equalsIgnoreCase("null")) ? defaultValue : str;
    }

    private String cleanHtml(String raw) {
        if (raw == null) return "";
        String cleaned = raw.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
        return cleaned.length() > 1500 ? cleaned.substring(0, 1500) : cleaned;
    }
}
