
/*
 * translations.js
 *
 * 목적:
 * - 시흥쏙쏙 웹사이트의 다국어 번역 데이터 관리
 * - Google Cloud Translation API 자동 번역을 위한 한국어 원문 관리
 *
 * 지원 언어:
 * - ko : 한국어
 * - en : 영어
 * - zh-CN : 중국어 간체
 * - zh-TW : 중국어 번체
 * - ja : 일본어
 * - vi : 베트남어
 *
 * 동작 방식:
 * - 한국어 원문을 기준으로 자동 번역 데이터 생성
 * - generated-translations.js에서 자동 생성 번역 데이터 적용
 * - 번역 데이터가 없는 경우 한국어 원문 사용
 * - language.js에서 언어 변경 및 화면 갱신 처리
 */
const translations = {
  ko: {
    search: "검색",
    searchResults: "검색 결과",
    nationality: "국적",
    all: "전체",
    supportProgram: "지원사업",
	notice: "공고 · 알림",
	culture: "문화 · 행사",
	lifeInfo: "생활정보",
	participation: "시민참여",
	login: "로그인",
	signup: "회원가입",
	searchPlaceholder: "관심 있는 지원사업, 행사, 교육을 검색해 보세요",
	popularSearches: "인기 검색어",
	recentSearches: "최근 검색어",
	recommendedSearches: "추천 검색어",
	clearAll: "전체 삭제",
	resetFilters: "필터 초기화",
	viewDetails: "자세히 보기",
	latest: "최신순",
	popular: "인기순",
	deadline: "마감순",
	open: "모집중",
	closing: "마감임박",
	soon: "접수예정",
	closed: "마감",
	heroTitle: "{city}의 다양한 공공사업과 소식을 찾아보세요.",
	heroDescription: "시민을 위한 지원사업, 문화행사, 교육프로그램 등 유용한 정보를 한 번에 검색할 수 있습니다.",
	categoryTitle: "분야별로 찾아보기",
	categoryDescription: "관심 있는 분야를 선택하면 관련 공고만 모아서 보여드려요.",
	categoryLabels: ["청년", "외국인", "다문화", "소상공인", "가족", "어르신", "교육", "문화 · 행사"],

	//  맞춤형 추천 카드 번역
	personaTitles: ["청년이라면", "외국인 주민이라면", "어르신이라면", "사장님이라면"],
	personaDescriptions: ["취업·주거·문화 지원 한눈에", "생활·통역·행정 안내", "건강·디지털·돌봄 서비스", "소상공인 경영·시설 지원"],
	personaCountSuffix: "개 공고 보기",

	//  Google Cloud 자동 번역을 위한 한국어 원문 추가

	//  공통 문구
	languageSelect: "언어 선택",
	cityName: "시흥시",
	siteName: "시흥쏙쏙",
	countUnit: "건",
	personUnit: "명",
	illustration: "일러스트",
	viewAll: "전체 보기",
	home: "홈",
	reset: "초기화",
	delete: "삭제",

	// 검색창 및 자동완성
	integratedSearch: "통합검색",
	clearSearch: "검색어 지우기",
	noRecentSearches: "최근 검색어가 없습니다.",
	directAnnouncements: "바로가기 공고",
	autocompleteHelp: "↑↓ 키로 이동 · Enter로 검색",
	closeAutocomplete: "자동완성 닫기",
	closeSuggestions: "검색 제안 닫기",
	recentAndPopularSearches: "최근 검색어와 인기 검색어",

	//  검색 필터
	age: "나이",
	category: "카테고리",
	region: "지역",
	ageYoung: "19 ~ 34세",
	ageAdult: "35 ~ 64세",
	ageSenior: "65세 이상",
	domesticResident: "내국인",
	foreigner: "외국인",
	multiculturalFamily: "다문화 가족",
	employmentEducationCulture: "취업 · 교육 · 문화",
	employment: "취업",
	education: "교육",
	cultureOnly: "문화",
	livingSupport: "생활지원",
	environment: "환경",
	jeongwang: "정왕동",
	baegot: "배곧동",
	daeya: "대야동",
	janghyeon: "장현동",
	appliedFilters: "적용된 필터",
	clearAllFilters: "전체 해제",
	searchResultFilters: "검색 결과 필터",

	//  검색 결과
	sort: "정렬",
	sortResults: "검색 결과 정렬",
	resultView: "검색 결과 보기 방식",
	gridView: "카드형 보기",
	listView: "리스트형 보기",
	filtersApplied: "필터 {count}개 적용",

	// 검색 결과 없음
	selectedConditions: "선택한 조건",
	noSearchResults: "‘{query}’에 대한 검색 결과가 없어요",
	noResultsDescription: "현재 진행 중인 공고가 없거나, 다른 표현으로 등록되어 있을 수 있어요.",
	checkSpelling: "단어의 철자가 정확한지 확인해 주세요.",
	shorterKeyword: "‘드론’, ‘자격증’처럼 더 짧은 검색어로 검색해 보세요.",
	removeSelectedFilters: "선택된 필터를 해제해 보세요.",
	suggestOtherKeywords: "이 검색어는 어떠세요?",
	relatedNotification: "관련 공고 알림 받기",

	//메인 페이지
	closingAnnouncements: "곧 마감되는 공고",
	closingDescription: "놓치기 전에 확인하세요.",
	announcement: "공고",
	officialNotice: "고시",
	pressRelease: "보도자료",
	press: "보도",
	weeklyEvents: "이번 주 행사",
	calendar: "달력",
	weekdays: ["월", "화", "수", "목", "금", "토", "일"],
	notificationTitle: "새 공고가 올라오면 바로 알려드릴게요",
	notificationDescription: "관심 분야를 등록하면 카카오톡·문자로 맞춤 공고 알림을 보내드려요.",
	subscribeNotification: "알림 신청하기",

	// 추천 공고
	recommendationTitle: "이런것도 있어요!",
	recommendationDescription: "검색어 외에도 국적, 관심 카테고리, 연령, 언어 설정을 바탕으로 필요한 공고를 재분류해서 추천해드려요.",

	//  공고 분류명
	youth: "청년",
	multicultural: "다문화",
	smallBusiness: "소상공인",
	family: "가족",
	senior: "어르신",
	child: "아동",
	housing: "주거",
	event: "행사",

	// 공고 상세 페이지 고정 문구
	currentLocation: "현재 위치",
	announcementDetail: "공고 상세",
	department: "담당",
	registrationDate: "등록일",
	views: "조회",
	programOverview: "사업 개요",
	// 사업 개요 고정 안내 문구
	programOverviewDescription: "{benefit}을 중심으로 시민에게 필요한 정보와 참여 기회를 제공하는 시흥시 공공사업입니다. 신청 대상과 기간을 확인한 뒤 온라인으로 간편하게 신청할 수 있습니다.",
	supportContent: "지원 내용",
	participationTarget: "참여 대상",
	supportTarget: "지원 대상",
	recruitmentNumber: "모집 인원",
	applicationPeriod: "신청 기간",
	operationPeriod: "운영 기간",
	participationFee: "참가비",
	location: "장소",
	applicationMethod: "신청 방법",
	attachments: "첨부파일",
	applicationClosed: "접수 마감",
	deadlineRemaining: "마감까지 {dday}",
	applicationStatus: "신청 현황",
	apply: "신청하기",
	saveAnnouncement: "관심 공고 저장",
	shareAnnouncement: "공고 공유",
	inquiry: "문의",
	weekdaysOnly: "평일",
	relatedAnnouncements: "함께 보면 좋은 공고",

	//  신청 절차 안내
	onlineApplication: "온라인 신청",
	onlineApplicationDescription: "시흥쏙쏙에서 신청서 작성",
	documentReview: "서류 확인",
	documentReviewDescription: "자격 요건 확인 (3일 이내)",
	selectionNotice: "선정 안내",
	selectionNoticeDescription: "문자 · 이메일로 개별 안내",
	programParticipation: "사업 참여",
	programParticipationDescription: "안내된 일정에 맞춰 참여",

	//하단 푸터
	privacyPolicy: "개인정보처리방침",
	termsOfService: "이용약관",
	copyrightPolicy: "저작권정책",
	webAccessibility: "웹 접근성",
	siteMap: "사이트맵",
	footerAddress: "(14988) 경기도 시흥시 시청로 20 (장현동) 시흥시청 · 대표전화 031-310-2114",

	// 브라우저 페이지 제목 및 설명
	publicProgramSearch: "공공사업 통합검색",
	siteDescription: "시흥시 공공사업, 지원사업, 행사와 교육 정보를 한 번에 찾는 통합검색"
  },
  
  en: {
    search: "Search",
    searchResults: "Search Results",
    nationality: "Nationality",
    all: "All",
    supportProgram: "Support Programs",
	notice: "Notices",
	culture: "Culture · Events",
	lifeInfo: "Living Information",
	participation: "Citizen Participation",
	login: "Log In",
	signup: "Sign Up",
	searchPlaceholder: "Search for support programs, events, and education",
	popularSearches: "Popular Searches",
	recentSearches: "Recent Searches",
	recommendedSearches: "Suggested Searches",
	clearAll: "Clear All",
	resetFilters: "Reset Filters",
	viewDetails: "View Details",
	latest: "Newest",
	popular: "Most Popular",
	deadline: "Deadline",
	open: "Open",
	closing: "Closing Soon",
	soon: "Opening Soon",
	closed: "Closed",
	heroTitle: "Discover public programs and local news in {city}.",
	heroDescription: "Search support programs, cultural events, education, and useful information for residents.",
	categoryTitle: "Browse by Category",
	categoryDescription: "Select a category to explore related announcements.",
	categoryLabels: ["Youth", "Foreign Residents", "Multicultural", "Small Businesses", "Family", "Seniors", "Education", "Culture · Events"],

	//  맞춤형 추천 카드 번역
	personaTitles: ["For Young People", "For Foreign Residents", "For Seniors", "For Business Owners"],
	personaDescriptions: ["Employment, housing, and cultural support", "Living, interpretation, and administrative services", "Health, digital, and care services", "Business management and facility support"],
	personaCountSuffix: " announcements"

	
  },
  zh: {
    search: "搜索",
    searchResults: "搜索结果",
    nationality: "国籍",
    all: "全部",
    supportProgram: "扶持项目",
	notice: "公告 · 通知",
	culture: "文化 · 活动",
	lifeInfo: "生活信息",
	participation: "市民参与",
	login: "登录",
	signup: "注册",
	searchPlaceholder: "搜索感兴趣的扶持项目、活动和教育课程",
	popularSearches: "热门搜索",
	recentSearches: "最近搜索",
	recommendedSearches: "推荐搜索",
	clearAll: "全部删除",
	resetFilters: "重置筛选条件",
	viewDetails: "查看详情",
	latest: "最新",
	popular: "最热门",
	deadline: "截止日期",
	open: "报名中",
	closing: "即将截止",
	soon: "即将开放",
	closed: "已截止",
	heroTitle: "探索{city}的各类公共项目与最新消息。",
	heroDescription: "一站式搜索面向市民的扶持项目、文化活动、教育课程等实用信息。",
	categoryTitle: "按类别浏览",
	categoryDescription: "选择感兴趣的类别，查看相关公告。",
	categoryLabels: ["青年", "外国居民", "多元文化", "小微企业", "家庭", "老年人", "教育", "文化 · 活动"],
	

	// 맞춤형 추천 카드 번역
	personaTitles: ["青年专区", "外国居民专区", "老年人专区", "企业主专区"],
	personaDescriptions: ["就业、住房及文化支持", "生活、翻译及行政服务指南", "健康、数字及照护服务", "小微企业经营及设施支持"],
	personaCountSuffix: "条公告"


  },
  ja: {
    search: "検索",
    searchResults: "検索結果",
    nationality: "国籍",
    all: "すべて",
    supportProgram: "支援事業",
	notice: "公告 · お知らせ",
	culture: "文化 · イベント",
	lifeInfo: "生活情報",
	participation: "市民参加",
	login: "ログイン",
	signup: "新規登録",
	searchPlaceholder: "支援事業、イベント、教育プログラムを検索",
	popularSearches: "人気の検索語",
	recentSearches: "最近の検索",
	recommendedSearches: "おすすめの検索語",
	clearAll: "すべて削除",
	resetFilters: "フィルターをリセット",
	viewDetails: "詳細を見る",
	latest: "新着順",
	popular: "人気順",
	deadline: "締切順",
	open: "募集中",
	closing: "締切間近",
	soon: "受付予定",
	closed: "終了",
	heroTitle: "{city}のさまざまな公共事業やお知らせをご覧ください。",
	heroDescription: "市民向けの支援事業、文化イベント、教育プログラムなどの情報をまとめて検索できます。",
	categoryTitle: "カテゴリーから探す",
	categoryDescription: "興味のあるカテゴリーを選ぶと、関連するお知らせを表示します。",
	categoryLabels: ["若者", "外国人住民", "多文化", "中小事業者", "家族", "高齢者", "教育", "文化 · イベント"],
	

	// 맞춤형 추천 카드 번역
	personaTitles: ["若者の方へ", "外国人住民の方へ", "高齢者の方へ", "事業主の方へ"],
	personaDescriptions: ["就職・住居・文化支援をまとめて確認", "生活・通訳・行政サービスのご案内", "健康・デジタル・介護サービス", "小規模事業者の経営・施設支援"],
	personaCountSuffix: "件の公告を見る"

  },
  vi: {
    search: "Tìm kiếm",
    searchResults: "Kết quả tìm kiếm",
    nationality: "Quốc tịch",
    all: "Tất cả",
    supportProgram: "Chương trình hỗ trợ",
	notice: "Thông báo",
	culture: "Văn hóa · Sự kiện",
	lifeInfo: "Thông tin đời sống",
	participation: "Tham gia cộng đồng",
	login: "Đăng nhập",
	signup: "Đăng ký",
	searchPlaceholder: "Tìm kiếm chương trình hỗ trợ, sự kiện và khóa học",
	popularSearches: "Tìm kiếm phổ biến",
	recentSearches: "Tìm kiếm gần đây",
	recommendedSearches: "Tìm kiếm đề xuất",
	clearAll: "Xóa tất cả",
	resetFilters: "Đặt lại bộ lọc",
	viewDetails: "Xem chi tiết",
	latest: "Mới nhất",
	popular: "Phổ biến nhất",
	deadline: "Theo hạn chót",
	open: "Đang nhận đăng ký",
	closing: "Sắp hết hạn",
	soon: "Sắp mở đăng ký",
	closed: "Đã kết thúc",
	heroTitle: "Khám phá các chương trình công cộng và tin tức tại {city}.",
	heroDescription: "Tìm kiếm các chương trình hỗ trợ, sự kiện văn hóa, giáo dục và thông tin hữu ích cho người dân.",
	categoryTitle: "Khám phá theo danh mục",
	categoryDescription: "Chọn danh mục bạn quan tâm để xem các thông báo liên quan.",
	categoryLabels: ["Thanh niên", "Cư dân nước ngoài", "Đa văn hóa", "Doanh nghiệp nhỏ", "Gia đình", "Người cao tuổi", "Giáo dục", "Văn hóa · Sự kiện"],

	//  맞춤형 추천 카드 번역
	personaTitles: ["Dành cho thanh niên", "Dành cho cư dân nước ngoài", "Dành cho người cao tuổi", "Dành cho chủ doanh nghiệp"],
	personaDescriptions: ["Hỗ trợ việc làm, nhà ở và văn hóa", "Hướng dẫn đời sống, phiên dịch và hành chính", "Dịch vụ sức khỏe, kỹ thuật số và chăm sóc", "Hỗ trợ quản lý kinh doanh và cơ sở vật chất"],
	personaCountSuffix: " thông báo"

  }
};


/*
 * 공고 데이터 다국어 번역
 *
 * - 공고 제목, 지원 대상, 지원 내용을 언어별로 관리
 * - 원본 공고 데이터는 수정하지 않음
 * - 실제 화면 연결은 추후 진행
 */

const announcementTranslations = {
    ko: {
        foreignResident: {
            title: "외국인 주민 생활지원 안내",
            target: "시흥시 거주 외국인 주민",
            benefit: "생활 상담, 통역 지원, 행정 안내 등",
			
        },
		
		youthEmployment: {
		    title: "청년 취업역량 강화 프로그램",
		    target: "19세 ~ 34세 청년",
		    benefit: "취업 특강, 면접 컨설팅, 직무 교육 등"
		},
		
		multiculturalEducation: {
		    title: "다문화 가족 한국어 교육",
		    target: "시흥시 거주 다문화 가족",
		    benefit: "한국어 교육, 생활 적응 지원 등"
		},
		
		smallBusiness: {
		    title: "소상공인 지원 공고",
		    target: "시흥시 관내 소상공인",
		    benefit: "경영 컨설팅, 시설개선비, 홍보 지원 등"
		},
		
		familyEvent: {
		    title: "가족 체험 행사 참가자 모집",
		    target: "시흥시 거주 가족 (유아~초등 자녀)",
		    benefit: "가족 체험 프로그램, 놀이 체험, 공연 등"
		},
		

		youthCulture: {
		    title: "시흥시 청년 문화 프로그램 참여자 모집",
		    target: "시흥시 거주 청년 (만 19세 ~ 34세)",
		    benefit: "문화 체험, 예술 창작 프로그램 등"
		},
		

		jobTraining: {
		    title: "시흥시 취업 역량 강화 교육 신청",
		    target: "시흥시 거주 구직자 및 청년",
		    benefit: "이력서 작성, 면접 준비, 직무 교육 등"
		},
		
		seniorDigital: {
		    title: "시흥시 어르신 디지털 교육 수강생 모집",
		    target: "시흥시 거주 만 65세 이상",
		    benefit: "스마트폰 활용, 키오스크 사용 교육"
		},
		

		youthRent: {
		    title: "시흥시 청년 월세 한시 특별지원",
		    target: "만 19세 ~ 34세 무주택 청년",
		    benefit: "월 최대 20만원, 최대 12개월"
		},

		environmentVolunteer: {
		    title: "시흥 갯골 환경정화 시민 봉사단 모집",
		    target: "시흥시민 누구나",
		    benefit: "봉사시간 인정, 기념품 제공"
		},

		interviewSuit: {
		    title: "시흥시 청년 면접정장 무료 대여 사업",
		    target: "만 19세 ~ 34세 구직 청년",
		    benefit: "면접 정장 연 3회 무료 대여"
		},

		buskingFestival: {
		    title: "시흥 청년 버스킹 페스티벌 참가팀 모집",
		    target: "시흥시 거주·활동 청년 예술인",
		    benefit: "공연비 지원, 무대·음향 제공"
		},

		financialEducation: {
		    title: "시흥시 청년 금융 교육 아카데미",
		    target: "시흥시 거주 청년 (만 19세 ~ 39세)",
		    benefit: "재무 상담, 자산 관리 교육 등"
		}



    },

    en: {
        foreignResident: {
            title: "Living Support for Foreign Residents",
            target: "Foreign residents living in Siheung",
            benefit: "Daily life counseling, interpretation and administrative guidance"
        },
		
		youthEmployment: {
		    title: "Youth Employment Skills Development Program",
		    target: "Young adults aged 19 to 34",
		    benefit: "Career lectures, interview coaching, and job training"
		},
		
		multiculturalEducation: {
		    title: "Korean Language Classes for Multicultural Families",
		    target: "Multicultural families living in Siheung",
		    benefit: "Korean language education and support for daily life adaptation"
		},
		
		smallBusiness: {
		    title: "Small Business Support Program",
		    target: "Small business owners in Siheung",
		    benefit: "Business consulting, facility improvement funding, and marketing support"
		},
		
		familyEvent: {
		    title: "Family Experience Event Recruitment",
		    target: "Families living in Siheung with preschool or elementary school children",
		    benefit: "Family activities, interactive experiences, and performances"
		},
		

		youthCulture: {
		    title: "Recruitment for Siheung Youth Cultural Program",
		    target: "Young adults aged 19 to 34 living in Siheung",
		    benefit: "Cultural experiences and creative arts programs"
		},
		

		jobTraining: {
		    title: "Siheung Employment Skills Training Program",
		    target: "Job seekers and young adults living in Siheung",
		    benefit: "Resume writing, interview preparation, and job skills training"
		},
		
		seniorDigital: {
		    title: "Digital Skills Training for Seniors in Siheung",
		    target: "Siheung residents aged 65 and older",
		    benefit: "Smartphone usage and self-service kiosk training"
		},
		

		youthRent: {
		    title: "Temporary Monthly Rent Support for Young Adults in Siheung",
		    target: "Young adults aged 19 to 34 who do not own a home",
		    benefit: "Up to KRW 200,000 per month for a maximum of 12 months"
		},

		environmentVolunteer: {
		    title: "Recruitment of Siheung Gaetgol Environmental Cleanup Volunteers",
		    target: "All Siheung residents",
		    benefit: "Volunteer service hours recognition and commemorative gifts"
		},

		interviewSuit: {
		    title: "Free Interview Suit Rental Program for Young Adults in Siheung",
		    target: "Job-seeking young adults aged 19 to 34",
		    benefit: "Free interview suit rental up to three times per year"
		},

		buskingFestival: {
		    title: "Recruitment of Teams for Siheung Youth Busking Festival",
		    target: "Young artists living or performing in Siheung",
		    benefit: "Performance fee support, stage and sound equipment provided"
		},

		financialEducation: {
		    title: "Siheung Youth Financial Education Academy",
		    target: "Young adults aged 19 to 39 living in Siheung",
		    benefit: "Financial counseling and asset management education"
		}

		


    },

    zh: {
        foreignResident: {
            title: "外国居民生活支持指南",
            target: "居住在始兴市的外国居民",
            benefit: "生活咨询、口译支持及行政指导等"
        },
		
		youthEmployment: {
		    title: "青年就业能力提升项目",
		    target: "19至34岁的青年",
		    benefit: "就业讲座、面试辅导及职业培训等"
		},
		
		multiculturalEducation: {
		    title: "多元文化家庭韩语教育",
		    target: "居住在始兴市的多元文化家庭",
		    benefit: "韩语教育及生活适应支持等"
		},
		
		smallBusiness: {
		    title: "小微企业扶持公告",
		    target: "始兴市辖区内的小微企业经营者",
		    benefit: "经营咨询、设施改善费用及宣传支持等"
		},
		
		familyEvent: {
		    title: "家庭体验活动参与者招募",
		    target: "居住在始兴市且有幼儿或小学生子女的家庭",
		    benefit: "家庭体验项目、互动游戏及演出等"
		},
		

		youthCulture: {
		    title: "始兴市青年文化项目参与者招募",
		    target: "居住在始兴市的19至34岁青年",
		    benefit: "文化体验、艺术创作项目等"
		},
		

		jobTraining: {
		    title: "始兴市就业能力提升培训报名",
		    target: "居住在始兴市的求职者及青年",
		    benefit: "简历撰写、面试准备及职业技能培训等"
		},
		
		seniorDigital: {
		    title: "始兴市老年人数字技能培训招生",
		    target: "居住在始兴市的65岁及以上居民",
		    benefit: "智能手机使用及自助服务终端操作培训"
		},
		

		youthRent: {
		    title: "始兴市青年月租金临时特别补贴",
		    target: "19至34岁的无房青年",
		    benefit: "每月最高补贴20万韩元，最长12个月"
		},

		environmentVolunteer: {
		    title: "始兴市盐田湿地环境清洁志愿者招募",
		    target: "所有始兴市民",
		    benefit: "认可志愿服务时数并提供纪念品"
		},

		interviewSuit: {
		    title: "始兴市青年面试正装免费租赁项目",
		    target: "19至34岁的求职青年",
		    benefit: "每年最多免费租赁面试正装3次"
		},

		buskingFestival: {
		    title: "始兴青年街头表演节参赛团队招募",
		    target: "居住在始兴市或在当地开展活动的青年艺术家",
		    benefit: "提供演出费用补助、舞台及音响设备"
		},

		financialEducation: {
		    title: "始兴市青年金融教育学院",
		    target: "居住在始兴市的19至39岁青年",
		    benefit: "财务咨询及资产管理教育等"
		}



    },

    ja: {
        foreignResident: {
            title: "外国人住民向け生活支援案内",
            target: "始興市在住の外国人住民",
            benefit: "生活相談、通訳支援、行政手続きの案内など"
        },
		
		youthEmployment: {
		    title: "若者向け就職能力強化プログラム",
		    target: "19歳から34歳までの若者",
		    benefit: "就職講座、面接指導、職業研修など"
		},
		
		multiculturalEducation: {
		    title: "多文化家族向け韓国語教育",
		    target: "始興市在住の多文化家族",
		    benefit: "韓国語教育、生活適応支援など"
		},
		
		smallBusiness: {
		    title: "小規模事業者支援のお知らせ",
		    target: "始興市内の小規模事業者",
		    benefit: "経営コンサルティング、施設改善費、広報支援など"
		},
		
		familyEvent: {
		    title: "家族体験イベント参加者募集",
		    target: "始興市在住の家族（未就学児から小学生の子どもがいる家庭）",
		    benefit: "家族体験プログラム、遊び体験、公演など"
		},
		

		youthCulture: {
		    title: "始興市青年文化プログラム参加者募集",
		    target: "始興市在住の19歳から34歳までの若者",
		    benefit: "文化体験、芸術創作プログラムなど"
		},
		

		jobTraining: {
		    title: "始興市就職能力向上研修の申込案内",
		    target: "始興市在住の求職者および若者",
		    benefit: "履歴書作成、面接対策、職業研修など"
		},
		
		seniorDigital: {
		    title: "始興市高齢者向けデジタル教育受講者募集",
		    target: "始興市在住の65歳以上の方",
		    benefit: "スマートフォンの活用、キオスク端末の操作研修"
		},
		

		youthRent: {
		    title: "始興市青年向け家賃の臨時特別支援",
		    target: "19歳から34歳までの住宅を所有していない若者",
		    benefit: "月額最大20万ウォン、最長12か月間支援"
		},

		environmentVolunteer: {
		    title: "始興ケッコル環境美化市民ボランティア募集",
		    target: "始興市民なら誰でも参加可能",
		    benefit: "ボランティア活動時間の認定、記念品の提供"
		},

		interviewSuit: {
		    title: "始興市青年向け面接スーツ無料貸出事業",
		    target: "19歳から34歳までの求職中の若者",
		    benefit: "面接用スーツを年3回まで無料貸出"
		},

		buskingFestival: {
		    title: "始興青年ストリートパフォーマンスフェスティバル参加チーム募集",
		    target: "始興市に居住または活動する若手アーティスト",
		    benefit: "出演料の支援、ステージ・音響設備の提供"
		},

		financialEducation: {
		    title: "始興市青年金融教育アカデミー",
		    target: "始興市在住の19歳から39歳までの若者",
		    benefit: "財務相談、資産管理教育など"
		}



    },

    vi: {
        foreignResident: {
            title: "Hỗ trợ đời sống cho cư dân nước ngoài",
            target: "Người nước ngoài cư trú tại thành phố Siheung",
            benefit: "Tư vấn đời sống, hỗ trợ phiên dịch và hướng dẫn thủ tục hành chính"
        },
		
		youthEmployment: {
		    title: "Chương trình nâng cao kỹ năng tìm việc cho thanh niên",
		    target: "Thanh niên từ 19 đến 34 tuổi",
		    benefit: "Hội thảo việc làm, tư vấn phỏng vấn và đào tạo nghề"
		},
		
		multiculturalEducation: {
		    title: "Lớp học tiếng Hàn dành cho gia đình đa văn hóa",
		    target: "Các gia đình đa văn hóa cư trú tại thành phố Siheung",
		    benefit: "Đào tạo tiếng Hàn và hỗ trợ thích nghi với cuộc sống"
		},
		
		smallBusiness: {
		    title: "Chương trình hỗ trợ doanh nghiệp nhỏ",
		    target: "Các chủ doanh nghiệp nhỏ tại thành phố Siheung",
		    benefit: "Tư vấn kinh doanh, hỗ trợ cải thiện cơ sở vật chất và quảng bá"
		},
		
		familyEvent: {
		    title: "Tuyển người tham gia sự kiện trải nghiệm gia đình",
		    target: "Các gia đình sống tại Siheung có con ở độ tuổi mẫu giáo hoặc tiểu học",
		    benefit: "Hoạt động trải nghiệm gia đình, trò chơi tương tác và biểu diễn"
		},
		

		youthCulture: {
		    title: "Tuyển người tham gia chương trình văn hóa thanh niên Siheung",
		    target: "Thanh niên từ 19 đến 34 tuổi cư trú tại Siheung",
		    benefit: "Trải nghiệm văn hóa và các chương trình sáng tạo nghệ thuật"
		},
		

		jobTraining: {
		    title: "Đăng ký chương trình nâng cao kỹ năng tìm việc tại Siheung",
		    target: "Người tìm việc và thanh niên cư trú tại Siheung",
		    benefit: "Viết hồ sơ xin việc, chuẩn bị phỏng vấn và đào tạo kỹ năng nghề nghiệp"
		},
		
		seniorDigital: {
		    title: "Tuyển học viên khóa đào tạo kỹ năng số cho người cao tuổi tại Siheung",
		    target: "Cư dân Siheung từ 65 tuổi trở lên",
		    benefit: "Hướng dẫn sử dụng điện thoại thông minh và máy tự phục vụ"
		},
		

		youthRent: {
		    title: "Chương trình hỗ trợ tiền thuê nhà tạm thời cho thanh niên Siheung",
		    target: "Thanh niên từ 19 đến 34 tuổi chưa sở hữu nhà ở",
		    benefit: "Hỗ trợ tối đa 200.000 won mỗi tháng trong tối đa 12 tháng"
		},

		environmentVolunteer: {
		    title: "Tuyển tình nguyện viên bảo vệ môi trường tại Gaetgol Siheung",
		    target: "Tất cả cư dân thành phố Siheung",
		    benefit: "Được công nhận giờ tình nguyện và nhận quà lưu niệm"
		},

		interviewSuit: {
		    title: "Chương trình cho thuê miễn phí trang phục phỏng vấn dành cho thanh niên Siheung",
		    target: "Thanh niên tìm việc từ 19 đến 34 tuổi",
		    benefit: "Miễn phí thuê trang phục phỏng vấn tối đa 3 lần mỗi năm"
		},

		buskingFestival: {
		    title: "Tuyển nhóm tham gia Lễ hội biểu diễn đường phố thanh niên Siheung",
		    target: "Nghệ sĩ trẻ sinh sống hoặc hoạt động tại Siheung",
		    benefit: "Hỗ trợ chi phí biểu diễn, sân khấu và thiết bị âm thanh"
		},

		financialEducation: {
		    title: "Học viện giáo dục tài chính dành cho thanh niên Siheung",
		    target: "Thanh niên từ 19 đến 39 tuổi cư trú tại Siheung",
		    benefit: "Tư vấn tài chính và đào tạo quản lý tài sản"
		}



    }
};
//  중국어 간체 언어 코드 연결
translations["zh-CN"] = translations.zh;

//  중국어 번체 임시 데이터
// Google Cloud API 활성화 후 번체 번역 데이터로 교체
translations["zh-TW"] = {};
