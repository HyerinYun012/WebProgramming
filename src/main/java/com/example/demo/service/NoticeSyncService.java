package com.example.demo.service;

import com.example.demo.entity.Notice;
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

    // 본문 텍스트 안에 숨어있는 날짜(예: 2026-03-15, 2025.11.01 등) 추출용 정규식
    private static final Pattern DATE_PATTERN = Pattern.compile("(202[3-6])[-./년\\s]+(0?[1-9]|1[0-2])[-./월\\s]+(0?[1-9]|[12][0-9]|3[01])");

    public NoticeSyncService(NoticeRepository noticeRepository) {
        this.noticeRepository = noticeRepository;
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public int fetchAndSaveSiheungNotices() {
        try {
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

                    // 💡 업그레이드된 날짜 결정 로직 (API 날짜 -> 본문 날짜 추출 -> ID 기반 분산 날짜)
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
                noticeRepository.deleteAllInBatch();
                noticeRepository.saveAll(targetNotices);
            }

            return targetNotices.size();

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException(e.getMessage());
        }
    }

    /**
     * 1순위: API의 LAST_UPD_DE 값 사용
     * 2순위: LAST_UPD_DE가 null이면 제목/본문 안에서 날짜 패턴(YYYY-MM-DD) 자동 추출
     * 3순위: 본문에도 날짜가 없는 상시 서비스는 공고 고유 ID를 기반으로 최근 60일 내의 고유 날짜 부여 (모두 같은 날짜로 찍히는 현상 방지!)
     */
    private String resolveSmartDate(String rawDate, String textContent, String noticeId) {
        // 1. API 원본에 날짜가 있는 경우
        if (rawDate != null && !rawDate.trim().isEmpty() && !rawDate.equalsIgnoreCase("null")) {
            String digits = rawDate.replaceAll("[^0-9]", "");
            if (digits.length() >= 8) {
                return digits.substring(0, 4) + "-" + digits.substring(4, 6) + "-" + digits.substring(6, 8);
            }
        }

        // 2. 본문이나 제목 텍스트 안에 날짜가 적혀있는 경우 추출
        if (textContent != null) {
            Matcher matcher = DATE_PATTERN.matcher(textContent);
            if (matcher.find()) {
                String year = matcher.group(1);
                String month = String.format("%02d", Integer.parseInt(matcher.group(2)));
                String day = String.format("%02d", Integer.parseInt(matcher.group(3)));
                return year + "-" + month + "-" + day;
            }
        }

        // 3. 상시 서비스여서 날짜가 아예 없는 경우: 공고 ID 해시값으로 최근 1~60일 전 날짜를 일관되게 부여
        // (※ 만약 날짜 대신 '상시운영'이라는 글자로 넣기를 원하시면 아래 두 줄 대신 return "상시운영"; 으로 바꾸셔도 됩니다!)
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