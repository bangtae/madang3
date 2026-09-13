window.PORTAL_DATA_APIS = [
    {
        "id":  "api_blogger_72663466",
        "docsUrl":  "인증된 사용자가 관리자 또는 작성자로 권한을 가진 Blogger 블로그 목록을 조회합니다. (GET, OAuth 2.0 필요)",
        "tags":  [
                     "Google",
                     "Blogger",
                     "내블로그",
                     "블로그목록",
                     "OAuth"
                 ],
        "serviceUrl":  "https://www.googleapis.com/blogger/v3/users/self/blogs",
        "createdAt":  "2026-09-13T11:01:36.706739+00:00",
        "category":  "Google - Blogger",
        "title":  "Blogger 내 블로그 목록 검색"
    },
    {
        "id":  "api_blogger_53a21def",
        "docsUrl":  "특정 블로그의 게시물 목록을 검색하고 기간/라벨/상태 필터링 및 페이지네이션으로 조회합니다. (GET)",
        "tags":  [
                     "Google",
                     "Blogger",
                     "게시물",
                     "포스트목록",
                     "검색"
                 ],
        "serviceUrl":  "https://www.googleapis.com/blogger/v3/blogs/{blogId}/posts",
        "createdAt":  "2026-09-13T11:01:36.706739+00:00",
        "category":  "Google - Blogger",
        "title":  "Blogger 게시물 목록 검색"
    },
    {
        "id":  "api_blogger_eccbc7fd",
        "docsUrl":  "게시물 ID를 통해 특정 게시물의 제목, 본문(HTML), 작성자, 발행일, 태그 정보를 상세 조회합니다. (GET)",
        "tags":  [
                     "Google",
                     "Blogger",
                     "게시물상세",
                     "포스트본문"
                 ],
        "serviceUrl":  "https://www.googleapis.com/blogger/v3/blogs/{blogId}/posts/{postId}",
        "createdAt":  "2026-09-13T11:01:36.706739+00:00",
        "category":  "Google - Blogger",
        "title":  "Blogger 특정 게시물 상세 검색"
    },
    {
        "id":  "api_blogger_605429de",
        "docsUrl":  "지정한 게시물에 등록된 댓글 목록과 각 댓글의 작성자, 내용, 작성일시를 조회합니다. (GET)",
        "tags":  [
                     "Google",
                     "Blogger",
                     "댓글",
                     "댓글목록"
                 ],
        "serviceUrl":  "https://www.googleapis.com/blogger/v3/blogs/{blogId}/posts/{postId}/comments",
        "createdAt":  "2026-09-13T11:01:36.706739+00:00",
        "category":  "Google - Blogger",
        "title":  "Blogger 게시물 댓글 목록 검색"
    },
    {
        "id":  "api_blogger_b3e76219",
        "docsUrl":  "댓글 ID를 지정하여 특정 댓글 1건의 상세 내용과 메타데이터를 조회합니다. (GET)",
        "tags":  [
                     "Google",
                     "Blogger",
                     "댓글상세",
                     "단일댓글"
                 ],
        "serviceUrl":  "https://www.googleapis.com/blogger/v3/blogs/{blogId}/posts/{postId}/comments/{commentId}",
        "createdAt":  "2026-09-13T11:01:36.706739+00:00",
        "category":  "Google - Blogger",
        "title":  "Blogger 특정 댓글 상세 검색"
    },
    {
        "id":  "api_blogger_864c6c48",
        "docsUrl":  "블로그에 생성된 독립 정적 페이지(소개, 약관 등 독립 URL 페이지) 목록을 조회합니다. (GET)",
        "tags":  [
                     "Google",
                     "Blogger",
                     "페이지",
                     "정적페이지",
                     "독립페이지"
                 ],
        "serviceUrl":  "https://www.googleapis.com/blogger/v3/blogs/{blogId}/pages",
        "createdAt":  "2026-09-13T11:01:36.706739+00:00",
        "category":  "Google - Blogger",
        "title":  "Blogger 정적 페이지 목록 검색"
    },
    {
        "id":  "api_blogger_f4845405",
        "docsUrl":  "페이지 ID를 통해 특정 정적 페이지의 제목, 본문 콘텐츠 및 상태 정보를 조회합니다. (GET)",
        "tags":  [
                     "Google",
                     "Blogger",
                     "페이지상세",
                     "정적페이지본문"
                 ],
        "serviceUrl":  "https://www.googleapis.com/blogger/v3/blogs/{blogId}/pages/{pageId}",
        "createdAt":  "2026-09-13T11:01:36.706739+00:00",
        "category":  "Google - Blogger",
        "title":  "Blogger 특정 정적 페이지 상세 검색"
    },
    {
        "id":  "api_blogger_2425ba32",
        "docsUrl":  "인증된 Blogger 사용자의 공개 프로필(이름, 프로필 이미지 URL, 자기소개 등)을 조회합니다. (GET, OAuth 2.0 필요)",
        "tags":  [
                     "Google",
                     "Blogger",
                     "사용자",
                     "프로필",
                     "OAuth"
                 ],
        "serviceUrl":  "https://www.googleapis.com/blogger/v3/users/self",
        "createdAt":  "2026-09-13T11:01:36.706739+00:00",
        "category":  "Google - Blogger",
        "title":  "Blogger 사용자 프로필 검색"
    },
    {
        "id":  "api_blogger_519c65e6",
        "docsUrl":  "블로그 ID를 기반으로 블로그의 메타데이터(제목, 설명, URL, 게시물 수, 댓글 수 등)를 조회합니다. (GET)",
        "tags":  [
                     "Google",
                     "Blogger",
                     "블로그",
                     "블로그정보",
                     "v3"
                 ],
        "serviceUrl":  "https://www.googleapis.com/blogger/v3/blogs/{blogId}",
        "createdAt":  "2026-09-13T11:01:36.706739+00:00",
        "category":  "Google - Blogger",
        "title":  "Blogger 블로그 정보 검색"
    },
    {
        "id":  "api_naver_08b3f11d",
        "docsUrl":  "https://developers.naver.com/docs/utils/mobileapp/",
        "tags":  [
                     "네이버",
                     "모바일앱",
                     "URLScheme",
                     "인앱호출"
                 ],
        "serviceUrl":  "naversearchapp://",
        "createdAt":  "2026-09-12T16:17:27.476477+00:00",
        "category":  "네이버 - 소셜/플러그인",
        "title":  "네이버 모바일앱 URL Scheme 연동"
    },
    {
        "id":  "api_naver_7f8ff19e",
        "docsUrl":  "https://developers.naver.com/docs/openmain/",
        "tags":  [
                     "네이버",
                     "오픈메인",
                     "바로가기",
                     "홈화면추가"
                 ],
        "serviceUrl":  "https://developers.naver.com/docs/openmain/",
        "createdAt":  "2026-09-12T16:17:27.476477+00:00",
        "category":  "네이버 - 소셜/플러그인",
        "title":  "네이버 오픈메인 메인화면 추가 플러그인"
    },
    {
        "id":  "api_naver_35d79252",
        "docsUrl":  "https://developers.naver.com/docs/serviceapi/search/blog/blog.md",
        "tags":  [
                     "네이버",
                     "검색",
                     "블로그",
                     "JSON"
                 ],
        "serviceUrl":  "https://openapi.naver.com/v1/search/blog.json",
        "createdAt":  "2026-09-12T16:17:27.476477+00:00",
        "category":  "네이버 - 검색",
        "title":  "네이버 블로그 검색"
    },
    {
        "id":  "api_coupang_7da8ef34",
        "docsUrl":  "개인화 맞춤 추천 피드 상품 목록을 조회합니다. (OpenAPI V2)",
        "tags":  [
                     "쿠팡",
                     "추천피드",
                     "V2"
                 ],
        "serviceUrl":  "https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/v2/products/reco",
        "createdAt":  "2026-09-12T15:58:08.18618+00:00",
        "category":  "쿠팡 파트너스 - 상품",
        "title":  "개인화 맞춤 추천 피드 조회 (v2)"
    },
    {
        "id":  "api_demo_1",
        "docsUrl":  "https://apis.map.kakao.com/web/documentation/",
        "tags":  [

                 ],
        "serviceUrl":  "https://dapi.kakao.com/v2/maps/sdk.js",
        "createdAt":  "2026-08-20T15:34:31.395198+00:00",
        "category":  "지도 / 위치",
        "title":  "Kakao Maps API"
    },
    {
        "id":  "api_demo_2",
        "docsUrl":  "https://platform.openai.com/docs/api-reference",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.openai.com/v1",
        "createdAt":  "2026-08-20T15:34:31.395198+00:00",
        "category":  "AI / LLM",
        "title":  "OpenAI API"
    },
    {
        "id":  "api_1786375143842_2289",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://yesno.wtf/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "테스트 데이터",
        "title":  "임의로 ○ 또는 아니요를 생성합니다."
    },
    {
        "id":  "api_1786375143841_5609",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/thm/uinames",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "테스트 데이터",
        "title":  "임의의 가짜 이름을 생성합니다."
    },
    {
        "id":  "api_1786375143841_813",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://thispersondoesnotexist.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "테스트 데이터",
        "title":  "존재하지 않는 사람들의 실제같은 얼굴을 생성합니다."
    },
    {
        "id":  "api_1786375143840_1740",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://robohash.org/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "테스트 데이터",
        "title":  "임의의 로봇/외계인 아바타를 생성합니다."
    },
    {
        "id":  "api_1786375143840_2153",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://randomuser.me",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "테스트 데이터",
        "title":  "임의의 사용자 데이터를 생성합니다."
    },
    {
        "id":  "api_1786375143839_4856",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://loripsum.net/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "테스트 데이터",
        "title":  "Lorem Ipsum를 생성합니다."
    },
    {
        "id":  "api_1786375143839_3785",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://lorempicsum.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "테스트 데이터",
        "title":  "플레이스홀더 사진을 생성합니다."
    },
    {
        "id":  "api_1786375143838_9236",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://market.mashape.com/montanaflynn/lorem-text-generator",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "테스트 데이터",
        "title":  "Lorem Ipsum를 생성합니다."
    },
    {
        "id":  "api_1786375143838_288",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://jsonplaceholder.typicode.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "테스트 데이터",
        "title":  "가짜 데이터를 테스트 및 프로토타이핑합니다."
    },
    {
        "id":  "api_1786375143837_7908",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.kwelo.com/media/identicon/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "테스트 데이터",
        "title":  "가상의 아바타 이미지를 생성합니다."
    },
    {
        "id":  "api_1786375143837_5253",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://hipsterjesus.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "테스트 데이터",
        "title":  "Hipster Ipsum를 생성합니다."
    },
    {
        "id":  "api_1786375143836_3815",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://fhirtest.uhn.ca/home",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "테스트 데이터",
        "title":  "신속한 의료 상호 운용성의 리소스 테스트 데이터"
    },
    {
        "id":  "api_1786375143836_7469",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://fakejson.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "테스트 데이터",
        "title":  "테스트 및 가짜 데이터를 생성하는 서비스"
    },
    {
        "id":  "api_1786375143835_6660",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://avatars.dicebear.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "테스트 데이터",
        "title":  "임의의 픽셀아트 아바타를 생성합니다."
    },
    {
        "id":  "api_1786375143835_2590",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://baconipsum.com/json-api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "테스트 데이터",
        "title":  "Meatier Lorem Ipsum 생성기"
    },
    {
        "id":  "api_1786375143834_693",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://avatars.adorable.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "테스트 데이터",
        "title":  "랜덤 만화 아바타를 생성합니다."
    },
    {
        "id":  "api_1786375143834_6268",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.wetransfer.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "클라우드 저장소 \u0026 파일 공유",
        "title":  "파일 공유"
    },
    {
        "id":  "api_1786375143833_4884",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://gateway.temporal.cloud/ipns/docs.api.temporal.cloud",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "클라우드 저장소 \u0026 파일 공유",
        "title":  "IPFS 기반 파일 저장소, 선택적 IPNS 이름으로 공유"
    },
    {
        "id":  "api_1786375143833_2281",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://pastebin.com/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "클라우드 저장소 \u0026 파일 공유",
        "title":  "평문 저장소"
    },
    {
        "id":  "api_1786375143832_5402",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://dev.onedrive.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "클라우드 저장소 \u0026 파일 공유",
        "title":  "파일 공유와 저장소"
    },
    {
        "id":  "api_1786375143832_1467",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.google.com/drive/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "클라우드 저장소 \u0026 파일 공유",
        "title":  "파일 공유와 저장소"
    },
    {
        "id":  "api_1786375143832_5406",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.dropbox.com/developers",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "클라우드 저장소 \u0026 파일 공유",
        "title":  "파일 공유와 저장소"
    },
    {
        "id":  "api_1786375143831_4959",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.box.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "클라우드 저장소 \u0026 파일 공유",
        "title":  "파일 공유와 저장소"
    },
    {
        "id":  "api_1786375143831_8367",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.penguinrandomhouse.biz/webservices/rest/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "책",
        "title":  "책, 책표지와 관련된 데이터"
    },
    {
        "id":  "api_1786375143830_7691",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://openlibrary.org/developers/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "책",
        "title":  "책, 책표지와 관련된 데이터"
    },
    {
        "id":  "api_1786375143830_3320",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://garbage.world/posts/libgen/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "책",
        "title":  "라이브러리 제네시스의 검색 엔진"
    },
    {
        "id":  "api_1786375143829_80",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.google.com/books/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "책",
        "title":  "책"
    },
    {
        "id":  "api_1786375143829_7570",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.goodreads.com/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "책",
        "title":  "책"
    },
    {
        "id":  "api_1786375143828_6514",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://bnb.data.bl.uk/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "책",
        "title":  "책"
    },
    {
        "id":  "api_1786375143828_9849",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.booknomads.com/dev",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "책",
        "title":  "네덜란드와 플란데런에서 출판된 책 (약 250만), 책 표지와 관련된 데이터"
    },
    {
        "id":  "api_1786027334394",
        "docsUrl":  "쿠팡 URL을 회원 트래킹 코드가 포함된 단축 URL로 변환합니다.",
        "tags":  [
                     "쿠팡",
                     "딥링크",
                     "단축URL",
                     "파트너스"
                 ],
        "serviceUrl":  "https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쿠팡 파트너스 - 링크",
        "title":  "쿠팡 딥링크 생성"
    },
    {
        "id":  "api_1786026303834",
        "docsUrl":  "카테고리 별 베스트 상품에 대한 상세 상품 정보를 생성합니다.",
        "tags":  [
                     "쿠팡",
                     "베스트상품",
                     "카테고리"
                 ],
        "serviceUrl":  "https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/v1/products/bestcategories/{categoryId}",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쿠팡 파트너스 - 상품",
        "title":  "카테고리별 베스트 상품 조회"
    },
    {
        "id":  "api_1786026368570",
        "docsUrl":  "골드박스 상품에 대한 상세 상품 정보를 생성합니다. (매일 오전 7:30 업데이트)",
        "tags":  [
                     "쿠팡",
                     "골드박스",
                     "특가"
                 ],
        "serviceUrl":  "https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/v1/products/goldbox",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쿠팡 파트너스 - 상품",
        "title":  "골드박스 상품 조회"
    },
    {
        "id":  "api_1786026423923",
        "docsUrl":  "쿠팡 PL(자체 브랜드) 상품에 대한 상세 정보를 생성합니다.",
        "tags":  [
                     "쿠팡",
                     "PL상품",
                     "PB"
                 ],
        "serviceUrl":  "https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/v1/products/coupangPL",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쿠팡 파트너스 - 상품",
        "title":  "쿠팡 PL 상품 조회"
    },
    {
        "id":  "api_1786026464759",
        "docsUrl":  "쿠팡 PL 브랜드 별 상품 상세 정보를 생성합니다.",
        "tags":  [
                     "쿠팡",
                     "PL상품",
                     "브랜드"
                 ],
        "serviceUrl":  "https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/v1/products/coupangPL/{brandId}",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쿠팡 파트너스 - 상품",
        "title":  "쿠팡 PL 브랜드별 상품 조회"
    },
    {
        "id":  "api_1786026543013",
        "docsUrl":  "검색 키워드에 대한 쿠팡 검색 결과와 상세 상품 정보를 생성합니다. (1분당 최대 50회 호출 가능)",
        "tags":  [
                     "쿠팡",
                     "상품검색",
                     "키워드"
                 ],
        "serviceUrl":  "https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/v1/products/search",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쿠팡 파트너스 - 상품",
        "title":  "쿠팡 키워드 상품 검색"
    },
    {
        "id":  "api_1786026615641",
        "docsUrl":  "입력된 ADID 값을 이용해 개인화 추천 상품을 조회합니다.",
        "tags":  [
                     "쿠팡",
                     "추천상품",
                     "개인화"
                 ],
        "serviceUrl":  "https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/v1/products/reco",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쿠팡 파트너스 - 상품",
        "title":  "개인화 추천 상품 조회 (v1)"
    },
    {
        "id":  "api_1786026690050",
        "docsUrl":  "일 별 클릭 수에 대한 정보를 생성합니다. (매일 오후 15:00 업데이트)",
        "tags":  [
                     "쿠팡",
                     "실적리포트",
                     "클릭수"
                 ],
        "serviceUrl":  "https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/v1/reports/clicks",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쿠팡 파트너스 - 리포트",
        "title":  "일별 클릭 수 리포트"
    },
    {
        "id":  "api_1786026736174",
        "docsUrl":  "일 별 주문 정보를 생성합니다. (매일 오후 15:00 업데이트)",
        "tags":  [
                     "쿠팡",
                     "실적리포트",
                     "주문정보"
                 ],
        "serviceUrl":  "https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/v1/reports/orders",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쿠팡 파트너스 - 리포트",
        "title":  "일별 주문 정보 리포트"
    },
    {
        "id":  "api_1786026788393",
        "docsUrl":  "일 별 취소 정보를 생성합니다. (매일 오후 15:00 업데이트)",
        "tags":  [
                     "쿠팡",
                     "실적리포트",
                     "취소정보"
                 ],
        "serviceUrl":  "https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/v1/reports/cancels",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쿠팡 파트너스 - 리포트",
        "title":  "일별 취소 정보 리포트"
    },
    {
        "id":  "api_1786026855527",
        "docsUrl":  "일 별 수익 정보를 생성합니다. (매일 오후 15:00 업데이트)",
        "tags":  [
                     "쿠팡",
                     "실적리포트",
                     "수익정보"
                 ],
        "serviceUrl":  "https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/v1/reports/commission",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쿠팡 파트너스 - 리포트",
        "title":  "일별 수익 정보 리포트"
    },
    {
        "id":  "api_1786026925214",
        "docsUrl":  "카테고리 배너와 다이나믹 배너에 대한 광고 요청, 응답, 노출, 클릭 수치를 조회합니다. (매일 오후 15:00 업데이트)",
        "tags":  [
                     "쿠팡",
                     "광고리포트",
                     "배너클릭"
                 ],
        "serviceUrl":  "https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/v1/reports/ads/impression-click",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쿠팡 파트너스 - 리포트",
        "title":  "배너 광고 노출 및 클릭 수치 리포트"
    },
    {
        "id":  "api_1786375143817_3922",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.zippopotam.us",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "국가, 도시, 주 등의 장소에 대한 정보를 얻습니다."
    },
    {
        "id":  "api_1786375143817_1378",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.zipcodeapi.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "미국 우편 번호 거리, 반경 및 위치 API"
    },
    {
        "id":  "api_1786375143816_3429",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://viacep.com.br",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "브라질의 우편번호 API"
    },
    {
        "id":  "api_1786375143816_3386",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.mapserv.utah.gov",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "유타 주소 지역위치정보를 위한 유타 웹 API"
    },
    {
        "id":  "api_1786375143815_1672",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://smartystreets.com/docs/cloud/us-zipcode-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "US Zip Code에 대한 데이터를 확인하고 추가합니다."
    },
    {
        "id":  "api_1786375143815_2462",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://uebermaps.com/api/v2",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "지도를 검색하고 친구들과 공유합니다."
    },
    {
        "id":  "api_1786375143814_7453",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://smartip.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "IP 지역위치정보 및 위협 지능 API"
    },
    {
        "id":  "api_1786375143814_3402",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://restcountries.eu",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "RESTful API를 통해 국가 정보를 얻습니다."
    },
    {
        "id":  "api_1786375143813_1332",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://postcodes.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "영국의 우편 번호 조회 및 지역위치정보"
    },
    {
        "id":  "api_1786375143813_1307",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://api.postcodedata.nl/v1/postcode/?postcode=1211EP\u0026streetnumber=60\u0026ref=domeinnaam.nl\u0026type=json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "네덜란드어 주소의 우편 번호를 기준으로 지리 위치 데이터를 제공합니다."
    },
    {
        "id":  "api_1786375143812_369",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://wiki.openstreetmap.org/wiki/API",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "탐색, 지리 위치 및 지리적 데이터"
    },
    {
        "id":  "api_1786375143812_7842",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://opencagedata.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "열린 데이터를 사용하여 지역위치정보를 확인합니다."
    },
    {
        "id":  "api_1786375143812_3894",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://onwater.io/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "위도/경도가 물 위에 있는지 또는 육지에 있는지 확인합니다."
    },
    {
        "id":  "api_1786375143811_9343",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://docs.onemap.sg/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "싱가포르 주소용 싱가포르 토지 당국 REST API 서비스"
    },
    {
        "id":  "api_1786375143810_8874",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/IcaliaLabs/sepomex",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "멕시코 RESTful zip code API"
    },
    {
        "id":  "api_1786375143810_2730",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.mapbox.com/developers/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "아름다운 디지털 맵을 만들거나 사용자화합니다."
    },
    {
        "id":  "api_1786375143809_3351",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://locationiq.org/docs/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "전진/후진 지역위치정보 및 집단 지역위치정보를 제공합니다."
    },
    {
        "id":  "api_1786375143809_305",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.kwelo.com/network/ip-address",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "IP 주소에 대한 자세한 정보를 찾아 가져옵니다."
    },
    {
        "id":  "api_1786375143808_1031",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://ipstack.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "IP 주소로 웹 사이트 방문자를 찾아 식별합니다."
    },
    {
        "id":  "api_1786026987478",
        "docsUrl":  "카테고리 배너와 다이나믹 배너에 대한 주문 리포트를 조회합니다. (매일 오후 15:00 업데이트)",
        "tags":  [
                     "쿠팡",
                     "광고리포트",
                     "배너주문"
                 ],
        "serviceUrl":  "https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/v1/reports/ads/orders",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쿠팡 파트너스 - 리포트",
        "title":  "배너 광고 주문 리포트"
    },
    {
        "id":  "api_1786027159320",
        "docsUrl":  "카테고리 배너와 다이나믹 배너에 대한 취소 리포트를 조회합니다. (매일 오후 15:00 업데이트)",
        "tags":  [
                     "쿠팡",
                     "광고리포트",
                     "배너취소"
                 ],
        "serviceUrl":  "https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/v1/reports/ads/cancels",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쿠팡 파트너스 - 리포트",
        "title":  "배너 광고 취소 리포트"
    },
    {
        "id":  "api_1786027232595",
        "docsUrl":  "카테고리 배너와 다이나믹 배너에 대한 일별 eCPM 값을 조회합니다. (매일 오후 15:00 업데이트)",
        "tags":  [
                     "쿠팡",
                     "광고리포트",
                     "eCPM"
                 ],
        "serviceUrl":  "https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/v1/reports/ads/performance",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쿠팡 파트너스 - 리포트",
        "title":  "배너 광고 eCPM 성과 리포트"
    },
    {
        "id":  "api_1786027291621",
        "docsUrl":  "카테고리 배너와 다이나믹 배너에 대한 수익 리포트를 조회합니다. (매일 오후 15:00 업데이트)",
        "tags":  [
                     "쿠팡",
                     "광고리포트",
                     "배너수익"
                 ],
        "serviceUrl":  "https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/v1/reports/ads/commission",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쿠팡 파트너스 - 리포트",
        "title":  "배너 광고 수익 리포트"
    },
    {
        "id":  "api_1786375143802_5764",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.fourtonfish.com/hellosalut/hello/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "사용자 언어에 따라 \"Hello\"에 대한 변역을 얻습니다."
    },
    {
        "id":  "api_1786375143798_6750",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://freegeoip.app/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "등록할 필요가 없는 무료 Geo IP 정보입니다. 시간당 15k 속도 제한"
    },
    {
        "id":  "api_1786375143798_3328",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://apis.map.kakao.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "카카오 지도 API는 웹사이트와 모바일 애플리케이션에서 지도를 이용한 서비스를 제작할 수 있도록 다양한 기능을 제공하고 있습니다."
    },
    {
        "id":  "api_1786375143797_9716",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.citysdk.eu/citysdk-toolkit/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "유럽 도시 오픈 API"
    },
    {
        "id":  "api_1786375143797_3196",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.getthedata.com/bng2latlong",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "영국 OSGB36 Easting 및 Northing(영국 국가 그리드)을 WGS84 위도 및 경도로 변환합니다."
    },
    {
        "id":  "api_1786375143796_1274",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.microsoft.com/maps/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "빙 지도 데이터를 기반으로 디지털 맵을 생성/사용자화합니다."
    },
    {
        "id":  "api_1786375143796_9593",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://battuta.medunes.net",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "나의 국가/지역/도시 위치 API"
    },
    {
        "id":  "api_1786375143795_9027",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://adresse.data.gouv.fr",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "프랑스의 주소 데이터베이스"
    },
    {
        "id":  "api_1786375143795_2628",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://docs.travis-ci.com/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지속적 통합",
        "title":  "즉시, 코드를 테스트하기위해 GitHub 프로젝트를 트레비스 CI로 동기화합니다."
    },
    {
        "id":  "api_1786375143794_9318",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://apidocs.codeship.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지속적 통합",
        "title":  "코드쉽은 클라우드에 있는 지속적 통합 플랫폼입니다."
    },
    {
        "id":  "api_1786375143794_3071",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://circleci.com/docs/api/v1-reference/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지속적 통합",
        "title":  "지속적 통합과 지속적 전달을 이용한 소프트웨어 개발 과정 자동화"
    },
    {
        "id":  "api_1786375143793_8229",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.usaspending.gov/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "미국 연방 지출 데이터"
    },
    {
        "id":  "api_1786375143793_5824",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://represent.opennorth.ca/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "캐나다 정부 대표자를 찾습니다."
    },
    {
        "id":  "api_1786375143792_7881",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.data.gov/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "미국 정부 오픈 데이터"
    },
    {
        "id":  "api_1786375143858_4236",
        "docsUrl":  "https://developers.naver.com/docs/utils/captcha/overview/",
        "tags":  [
                     "네이버",
                     "보안",
                     "캡차",
                     "이미지캡차"
                 ],
        "serviceUrl":  "https://openapi.naver.com/v1/captcha/nkey",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "네이버 - 보안/유틸리티",
        "title":  "네이버 이미지 캡차 (Captcha)"
    },
    {
        "id":  "api_1786375143859_1364",
        "docsUrl":  "https://developers.naver.com/docs/utils/scaptcha/overview/",
        "tags":  [
                     "네이버",
                     "보안",
                     "캡차",
                     "음성캡차"
                 ],
        "serviceUrl":  "https://openapi.naver.com/v1/captcha/skey",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "네이버 - 보안/유틸리티",
        "title":  "네이버 음성 캡차 (Audio Captcha)"
    },
    {
        "id":  "api_1786375143860_695",
        "docsUrl":  "https://developers.naver.com/docs/share/navershare/",
        "tags":  [
                     "네이버",
                     "소셜",
                     "공유하기",
                     "플러그인"
                 ],
        "serviceUrl":  "https://share.naver.com/web/shareView.nhn",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "네이버 - 소셜/플러그인",
        "title":  "네이버 콘텐츠 공유하기 (Share)"
    },
    {
        "id":  "api_1786375143782_208",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://app.traitify.com/developer",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "인물",
        "title":  "성격을 평가, 수집 및 분석합니다."
    },
    {
        "id":  "api_1786375143782_81",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://quotesondesign.com/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "인물",
        "title":  "영감을 주는 인용구"
    },
    {
        "id":  "api_1786375143782_2096",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://pprathameshmore.github.io/QuoteGarden/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "인물",
        "title":  "5000개 이상의 유명한 인용구를 제공하는 REST API"
    },
    {
        "id":  "api_1786375143781_6267",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/skolakoda/programming-quotes-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "인물",
        "title":  "오픈 소스 프로젝트를 위한 프로그래밍 인용구 API"
    },
    {
        "id":  "api_1786375143780_6274",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/theIYD/NaMoMemes",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "인물",
        "title":  "나렌드라 모디 밈"
    },
    {
        "id":  "api_1786375143780_8517",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/Medium/medium-api-docs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "인물",
        "title":  "독자와 아이디어에 대한 독특한 관점을 제공하는 독자와 작가들의 커뮤니티"
    },
    {
        "id":  "api_1786375143780_6795",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://kanye.rest",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "인물",
        "title":  "칸예 웨스트 인용구 REST API"
    },
    {
        "id":  "api_1786375143770_571",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/andyklimczak/TheReportOfTheWeek-API",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음식 \u0026 음료",
        "title":  "음식 \u0026 음료수 리뷰"
    },
    {
        "id":  "api_1786375143770_7028",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/evz/tacofancy-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음식 \u0026 음료",
        "title":  "커뮤니티 기반 타코 데이터베이스"
    },
    {
        "id":  "api_1786375143769_4545",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.recipepuppy.com/about/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음식 \u0026 음료",
        "title":  "음식"
    },
    {
        "id":  "api_1786375143769_8288",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://punkapi.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음식 \u0026 음료",
        "title":  "브루독 맥주 레시피"
    },
    {
        "id":  "api_1786375143768_8515",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://world.openfoodfacts.org/data",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음식 \u0026 음료",
        "title":  "식품 데이터베이스"
    },
    {
        "id":  "api_1786375143755_9108",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://api.thenounproject.com/목차.html",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "예술 \u0026 디자인",
        "title":  "아이콘"
    },
    {
        "id":  "api_1786375143755_3025",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://docs.icons8.apiary.io/#reference/0/meta",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "예술 \u0026 디자인",
        "title":  "아이콘"
    },
    {
        "id":  "api_1786375143754_402",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.iconfinder.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "예술 \u0026 디자인",
        "title":  "아이콘"
    },
    {
        "id":  "api_1786375143754_415",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/harvardartmuseums/api-docs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "예술 \u0026 디자인",
        "title":  "예술"
    },
    {
        "id":  "api_1786375143753_7919",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://developer.dribbble.com/v1/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "예술 \u0026 디자인",
        "title":  "디자인"
    },
    {
        "id":  "api_1786375143753_6322",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://collection.cooperhewitt.org/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "예술 \u0026 디자인",
        "title":  "스미스소니언 디자인 박물관"
    },
    {
        "id":  "api_1786375143753_7658",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.behance.net/dev",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "예술 \u0026 디자인",
        "title":  "디자인"
    },
    {
        "id":  "api_1786375143752_8007",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://ghibliapi.herokuapp.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "애니메이션",
        "title":  "스튜디오 지브리 필름 리소스"
    },
    {
        "id":  "api_1786375143752_8821",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://docs.kitsu.apiary.io/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "애니메이션",
        "title":  "애니메이션 검색 플랫폼"
    },
    {
        "id":  "api_1786375143752_7931",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://jikan.moe",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "애니메이션",
        "title":  "비공식 나만의 애니메이션 목록 API"
    },
    {
        "id":  "api_1786375143751_8979",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.animenewsnetwork.com/encyclopedia/api.php",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "애니메이션",
        "title":  "애니메이션 산업 소식"
    },
    {
        "id":  "api_1786375143751_9188",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/AniList/ApiV2-GraphQL-Docs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "애니메이션",
        "title":  "애니메이션 검색 \u0026 트래킹"
    },
    {
        "id":  "api_1786375143751_9539",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.worldcoinindex.com/apiservice",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "암호화폐 가격"
    },
    {
        "id":  "api_1786375143751_3902",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://poloniex.com/support/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "미국 기반의 디지털 자산 거래"
    },
    {
        "id":  "api_1786375143750_958",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://docs.nicehash.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "최대 암호화폐 채굴 시장"
    },
    {
        "id":  "api_1786375143750_3176",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://nexchange2.docs.apiary.io/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "암호화폐 거래 자동화 서비스"
    },
    {
        "id":  "api_1786375143749_1222",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.mercadobitcoin.net/api-doc/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "브라질 암호화폐 정보"
    },
    {
        "id":  "api_1786375143749_2279",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.livecoin.net/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "암호화폐 거래"
    },
    {
        "id":  "api_1786375143749_5408",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://icobench.com/developers",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "목록화, 점수, 상태 등에 대한 다양한 정보"
    },
    {
        "id":  "api_1786375143749_1181",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://docs.gemini.com/rest-api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "암호화폐 거래"
    },
    {
        "id":  "api_1786375143748_8714",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.cryptonator.com/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "암호화폐 거래 비율"
    },
    {
        "id":  "api_1786375143748_8147",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.cryptocompare.com/api#",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "암호화폐 비교"
    },
    {
        "id":  "api_1786375143748_8442",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://docs.coinranking.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "실시간 암호화폐 데이터"
    },
    {
        "id":  "api_1786375143748_1599",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.coinpaprika.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "암호화폐 가격, 양 그리고 그 외 여러가지들"
    },
    {
        "id":  "api_1786375143748_5995",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://coinmarketcap.com/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "암호화폐 가격"
    },
    {
        "id":  "api_1786375143747_5484",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.coinlore.com/cryptocurrency-data-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "암호화폐 가격, 양 그리고 그 외 여러가지들"
    },
    {
        "id":  "api_1786375143747_8685",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://coinlib.io/apidocs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "암호화폐 가격"
    },
    {
        "id":  "api_1786375143747_3725",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://coinlayer.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "실시간 암호화폐 거래 비율"
    },
    {
        "id":  "api_1786375143747_860",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://coinigy.docs.apiary.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "코이니지 계정과 상호작용하고 즉시 교환"
    },
    {
        "id":  "api_1786375143746_4603",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.coingecko.com/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "암호화폐 가격, 시장, 그리고 개발/사회적 데이터"
    },
    {
        "id":  "api_1786375143746_9566",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.coindesk.com/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "비트코인 가격 지수"
    },
    {
        "id":  "api_1786375143746_2584",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://docs.pro.coinbase.com/#api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "암호화폐 거래 플랫폼"
    },
    {
        "id":  "api_1786375143746_502",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.coinbase.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "비트코인, 비트코인 캐쉬, 라이트코인과 이더리움 가격"
    },
    {
        "id":  "api_1786375143745_9336",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://docs.coinapi.io/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "단일 API로 통합된 모든 암호화폐 거래"
    },
    {
        "id":  "api_1786375143745_4809",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.blockchain.info/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "비트코인 지불, 지갑 \u0026 트랜젝션 데이터"
    },
    {
        "id":  "api_1786375143745_4298",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.block.io/docs/basic",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "비트코인 지불, 지갑 \u0026 트랜젝션 데이터"
    },
    {
        "id":  "api_1786375143745_897",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://bittrex.com/Home/Api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "차세대 암호화폐 거래 플랫폼"
    },
    {
        "id":  "api_1786375143744_7836",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.bitmex.com/app/apiOverview",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "홍콩 실시간 암호화폐 파생상품 거래 플랫폼"
    },
    {
        "id":  "api_1786375143744_9621",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://docs.bitfinex.com/docs/getting-started",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "암호화폐 거래 플랫폼"
    },
    {
        "id":  "api_1786375143744_1887",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://bitcoincharts.com/about/exchanges/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "비트코인 네트워크와 연관된 금융과 기술적 데이터"
    },
    {
        "id":  "api_1786375143744_5481",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://apiv2.bitcoinaverage.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "블록체인 산업의 디지털 가격 데이터"
    },
    {
        "id":  "api_1786375143743_3657",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/binance-exchange/binance-official-api-docs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "암호화폐",
        "title":  "중국 암호화폐 거래소"
    },
    {
        "id":  "api_1786375143743_4336",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.mywot.com/en/API",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "안티멀웨어",
        "title":  "웹사이트 평가"
    },
    {
        "id":  "api_1786375143743_3043",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.virustotal.com/en/documentation/public-api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "안티멀웨어",
        "title":  "바이러스토탈 파일/URL 분석"
    },
    {
        "id":  "api_1786375143742_9531",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://metacert.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "안티멀웨어",
        "title":  "메타서트 링크 플래깅"
    },
    {
        "id":  "api_1786375143742_7253",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.google.com/safe-browsing/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "안티멀웨어",
        "title":  "구글 링크/도메인 플래깅"
    },
    {
        "id":  "api_1786375143742_3507",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://otx.alienvault.com/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "안티멀웨어",
        "title":  "IP/도메인/URL 평가"
    },
    {
        "id":  "api_1786375143741_1288",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://docs.abuseipdb.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "안티멀웨어",
        "title":  "IP/도메인/URL 평가"
    },
    {
        "id":  "api_1786375143741_4692",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://wger.de/en/software/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "스포츠 \u0026 피트니스",
        "title":  "운동, 근육 또는 장비에 대한 운동 관리 데이터"
    },
    {
        "id":  "api_1786375143740_3477",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.thesportsdb.com/api.php",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "스포츠 \u0026 피트니스",
        "title":  "크라우드 소스를 통한 스포츠 자료 및 아트워크"
    },
    {
        "id":  "api_1786375143740_1886",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://suredbits.com/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "스포츠 \u0026 피트니스",
        "title":  "팀, 플레이어, 게임, 점수 및 통계를 포함한 스포츠 데이터를 검색합니다."
    },
    {
        "id":  "api_1786375143739_2601",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://strava.github.io/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "스포츠 \u0026 피트니스",
        "title":  "운동선수, 활동 등과 연결합니다."
    },
    {
        "id":  "api_1786375143739_4769",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://promotocrossapi.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "스포츠 \u0026 피트니스",
        "title":  "출발 관문에 있는 모든 레이서의 RESTful AMA 프로 모토크로스 랩타임"
    },
    {
        "id":  "api_1786375143739_2060",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://gitlab.com/dword4/nhlapi",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "스포츠 \u0026 피트니스",
        "title":  "NHL 기록 데이터 및 통계"
    },
    {
        "id":  "api_1786375143738_2302",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://nflarrest.com/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "스포츠 \u0026 피트니스",
        "title":  "NFL 어레스트의 데이터"
    },
    {
        "id":  "api_1786375143738_3026",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://any-api.com/nba_com/nba_com/docs/API_Description",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "스포츠 \u0026 피트니스",
        "title":  "현재 및 과거 NBA 통계"
    },
    {
        "id":  "api_1786375143738_992",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.jcdecaux.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "스포츠 \u0026 피트니스",
        "title":  "JCDecaux의 셀프 서비스 자전거"
    },
    {
        "id":  "api_1786375143737_6228",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://api.football-data.org/index",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "스포츠 \u0026 피트니스",
        "title":  "축구 데이터"
    },
    {
        "id":  "api_1786375143737_1309",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://boggio-analytics.com/fp-api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "스포츠 \u0026 피트니스",
        "title":  "다가오는 축구 경기, 승산, 결과 및 통계 예측"
    },
    {
        "id":  "api_1786375143737_2597",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.scorebat.com/video-api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "스포츠 \u0026 피트니스",
        "title":  "프리미어 리그, 분데스리가, 세리에 A 등의 골과 하이라이트를 위한 내장 코드"
    },
    {
        "id":  "api_1786375143736_6726",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://dev.fitbit.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "스포츠 \u0026 피트니스",
        "title":  "핏빗 정보"
    },
    {
        "id":  "api_1786375143736_6486",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://ergast.com/mrd/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "스포츠 \u0026 피트니스",
        "title":  "1950년 세계 챔피언십의 시작부터 지금까지의 F1 데이터"
    },
    {
        "id":  "api_1786375143736_6236",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://market.mashape.com/dev132/cricket-live-scores",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "스포츠 \u0026 피트니스",
        "title":  "실시간 크리켓 스코어"
    },
    {
        "id":  "api_1786375143735_9533",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://api.citybik.es/v2/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "스포츠 \u0026 피트니스",
        "title":  "전세계의 City Bikes"
    },
    {
        "id":  "api_1786375143735_1954",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/wgenial/cartrolandofc",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "스포츠 \u0026 피트니스",
        "title":  "Cartola FC API는 당신의 팀의 부분 포인트 정보를 제공합니다."
    },
    {
        "id":  "api_1786375143735_6823",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://api.cfl.ca/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "스포츠 \u0026 피트니스",
        "title":  "CFL에 대한 실시간 리그, 팀 및 플레이어 통계를 제공하는 공식 JSON API"
    },
    {
        "id":  "api_1786375143734_4391",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.bikewise.org/documentation/api_v2",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "스포츠 \u0026 피트니스",
        "title":  "BikeWise는 자전거 충돌, 위험 요소 및 도난에 대해 배우고 보고하는 곳입니다."
    },
    {
        "id":  "api_1786375143734_203",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://balldontlie.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "스포츠 \u0026 피트니스",
        "title":  "Balldontlie는 NBA 통계 데이터에 접근할 수 있도록 합니다."
    },
    {
        "id":  "api_1786375143734_8936",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://dev.wegmans.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쇼핑",
        "title":  "웨그먼스 푸드마켓"
    },
    {
        "id":  "api_1786375143733_8286",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.walmartlabs.com/docs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쇼핑",
        "title":  "월마트의 물건 가격과 다양한 정보"
    },
    {
        "id":  "api_1786375143733_863",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://go.developer.ebay.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쇼핑",
        "title":  "이베이를 통해 물건을 사고 팝니다."
    },
    {
        "id":  "api_1786375143733_1909",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.bratabase.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쇼핑",
        "title":  "다양한 종류의 브라 사이즈 데이터베이스"
    },
    {
        "id":  "api_1786375143732_4871",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://bestbuyapis.github.io/api-documentation/#overview",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "쇼핑",
        "title":  "제품, 구매 옵션, 범주, 추천, 상점 및 커머스"
    },
    {
        "id":  "api_1786375143732_7107",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://vk.com/dev/sites",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "vk 데이터를 읽고 씁니다."
    },
    {
        "id":  "api_1786375143732_3863",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.twitter.com/en/docs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "트위터 데이터를 읽고 씁니다."
    },
    {
        "id":  "api_1786375143731_675",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://dev.twitch.tv/docs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "게임 스트리밍 API"
    },
    {
        "id":  "api_1786375143731_5524",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.tumblr.com/docs/en/api/v2",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "텀블러 데이터를 읽고 씁니다."
    },
    {
        "id":  "api_1786375143731_45",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://trashnothing.com/developer",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "매일 수천 개의 무료 아이템이 올라오는 무료 자전거 커뮤니티입니다."
    },
    {
        "id":  "api_1786375143730_7167",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://core.telegram.org/api#getting-started",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "텔레그램 데이터를 읽고 씁니다."
    },
    {
        "id":  "api_1786375143730_4495",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://core.telegram.org/bots/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "봇을 위한 MTProto API의 HTTP 버전을 단순화합니다."
    },
    {
        "id":  "api_1786375143730_9935",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.slack.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "팀 메시지 교환 시스템"
    },
    {
        "id":  "api_1786375143729_2688",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://docs.sharedcount.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "특정 URL의 소셜 미디어 좋아요와 공유 데이터"
    },
    {
        "id":  "api_1786375143729_4782",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.reddit.com/dev/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "인터넷의 홈페이지"
    },
    {
        "id":  "api_1786375143729_5580",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://pwrtelegram.xyz",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "텔레그램 봇 API 업그레이드 버전"
    },
    {
        "id":  "api_1786375143728_4189",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.pinterest.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "세계의 아이디어 목록"
    },
    {
        "id":  "api_1786375143728_1439",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://docs.opencollective.com/help/developers/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "Open Collective 데이터를 가져옵니다."
    },
    {
        "id":  "api_1786375143728_8193",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://mysocialapp.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "모든 앱에 원활한 소셜 네트워킹 기능, API, SDK를 제공합니다."
    },
    {
        "id":  "api_1786375143727_2248",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://dev.mixer.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "게임 스트리밍 API"
    },
    {
        "id":  "api_1786375143727_4471",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.meetup.com/meetup_api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "Meetup.com의 모임 데이터"
    },
    {
        "id":  "api_1786375143727_7618",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.linkedin.com/docs/rest-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "모든 디지털 통합의 기반, 링크드인"
    },
    {
        "id":  "api_1786375143726_9561",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.instagram.com/developer/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "인스타그램 로그인, 인스타그램에 공유, 소셜 플러그인 등"
    },
    {
        "id":  "api_1786375143726_8757",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/HackerNews/API",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "컴퓨터 공학와 기업가 정신을 위한 소셜 뉴스"
    },
    {
        "id":  "api_1786375143726_3471",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.fullcontact.com/developer/docs/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "소셜 미디어 프로필 및 연락처 정보를 가져옵니다."
    },
    {
        "id":  "api_1786375143726_8819",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.foaas.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "누군가에게 꺼져달라고 요청합니다."
    },
    {
        "id":  "api_1786375143725_2754",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.foursquare.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "포스퀘어 사용자 및 장소(지오로케이션 기반 체크인, 사진, 팁, 이벤트 등)와 상호 작용합니다."
    },
    {
        "id":  "api_1786375143725_7858",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.facebook.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "페이스북 로그인, 페이스북 공유, 소셜 플러그인, 분석 등"
    },
    {
        "id":  "api_1786375143725_997",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://disqus.com/api/docs/auth/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "Disqus 데이터와 통신합니다."
    },
    {
        "id":  "api_1786375143724_1845",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://discordapp.com/developers/docs/intro",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "Discord용 봇를 만들고 Discord를 외부 플랫폼에 통합합니다."
    },
    {
        "id":  "api_1786375143724_881",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.ciscospark.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "팀 공동 작업 소프트웨어"
    },
    {
        "id":  "api_1786375143723_7945",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://buffer.com/developers/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "소셜",
        "title":  "버퍼에서 보류 중이거나 전송된 업데이트에 접근합니다."
    },
    {
        "id":  "api_1786375143723_6097",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://wallhaven.cc/help/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사진",
        "title":  "월페이퍼"
    },
    {
        "id":  "api_1786375143723_278",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://unsplash.com/developers",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사진",
        "title":  "사진"
    },
    {
        "id":  "api_1786375143722_8435",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://screenshotlayer.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사진",
        "title":  "해당 URL을 Image로 바꿔줍니다."
    },
    {
        "id":  "api_1786375143722_7031",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://placekitten.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사진",
        "title":  "크기 조정 가능한 고양이 플레이스홀더 이미지"
    },
    {
        "id":  "api_1786375143722_2870",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://pixhost.org/api/index.html",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사진",
        "title":  "이미지, 사진, 갤러리 업로드"
    },
    {
        "id":  "api_1786375143721_3046",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://pixabay.com/sk/service/about/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사진",
        "title":  "사진"
    },
    {
        "id":  "api_1786375143721_5694",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.pexels.com/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사진",
        "title":  "무료 사진 및 비디오"
    },
    {
        "id":  "api_1786375143721_2633",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://picsum.photos/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사진",
        "title":  "Unsplash 이미지"
    },
    {
        "id":  "api_1786375143720_4025",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://apidocs.imgur.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사진",
        "title":  "이미지"
    },
    {
        "id":  "api_1786375143720_5213",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://gyazo.com/api/docs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사진",
        "title":  "이미지 업로드"
    },
    {
        "id":  "api_1786375143720_1008",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.giphy.com/docs/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사진",
        "title":  "모든 GIF를 얻는다."
    },
    {
        "id":  "api_1786375143720_233",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.gfycat.com/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사진",
        "title":  "짧은 GIF"
    },
    {
        "id":  "api_1786375143719_4068",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://developers.gettyimages.com/en/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사진",
        "title":  "세계에서 가장 강력한 이미지를 사용하여 애플리케이션을 만듭니다."
    },
    {
        "id":  "api_1786375143719_5347",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.flickr.com/services/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사진",
        "title":  "플리커 서비스"
    },
    {
        "id":  "api_1786375143719_1176",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.wordsapi.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사전",
        "title":  "150,000개가 넘는 단어의 정의와 동의어"
    },
    {
        "id":  "api_1786375143718_2393",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://developer.wordnik.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사전",
        "title":  "사전 데이터"
    },
    {
        "id":  "api_1786375143718_3093",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.oxforddictionaries.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사전",
        "title":  "사전 데이터"
    },
    {
        "id":  "api_1786375143718_4771",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://owlbot.info/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사전",
        "title":  "단어의 정의를 예문, 사진과 함께 보여줍니다."
    },
    {
        "id":  "api_1786375143717_1387",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://dictionaryapi.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사전",
        "title":  "사전 및 동의어 데이터"
    },
    {
        "id":  "api_1786375143717_1624",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.linguarobot.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사전",
        "title":  "단어의 정의, 발음, 동의어, 반음어 등"
    },
    {
        "id":  "api_1786375143717_1266",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://pro.whitepages.com/developer/documentation/reverse-address-api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사기 예방",
        "title":  "정규화된 물리적 주소, 거주자, 주소 유형 및 유효성 데이터"
    },
    {
        "id":  "api_1786375143716_3009",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://pro.whitepages.com/developer/documentation/phone-intelligence-api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사기 예방",
        "title":  "전화 번호 유효성 검사"
    },
    {
        "id":  "api_1786375143716_9537",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://pro.whitepages.com/developer/documentation/reverse-phone-api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사기 예방",
        "title":  "전화 번호를 기준으로 사용자 이름, 주소, 인구 통계를 가져옵니다."
    },
    {
        "id":  "api_1786375143716_1379",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://pro.whitepages.com/developer/documentation/phone-reputation-api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사기 예방",
        "title":  "스팸 전화를 감지하기 위한 전화번호의 평판도"
    },
    {
        "id":  "api_1786375143715_6712",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://pro.whitepages.com/developer/documentation/identity-check-api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사기 예방",
        "title":  "전화, 주소, 이메일 및 IP를 통해 글로벌 ID를 확인합니다."
    },
    {
        "id":  "api_1786375143715_5286",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.fraudlabspro.com/developer/api/screen-order",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "사기 예방",
        "title":  "부정 행위를 탐지하는 AI를 사용하여 주문 정보를 차단합니다."
    },
    {
        "id":  "api_1786375143715_4772",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.trello.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비즈니스",
        "title":  "당신의 프로젝트를 조정하고 우선순위를 정하는 걸 도와주는 게시판, 목록과 카드"
    },
    {
        "id":  "api_1786375143715_5759",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://ticksel.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비즈니스",
        "title":  "사람을 위해 만들어 진 친근한 웹사이트 분석"
    },
    {
        "id":  "api_1786375143714_2646",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.markerapi.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비즈니스",
        "title":  "트레이드마크 Search"
    },
    {
        "id":  "api_1786375143714_8995",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.mailgun.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비즈니스",
        "title":  "이메일 Service"
    },
    {
        "id":  "api_1786375143714_9041",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.mailboxvalidator.com/api-single-validation",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비즈니스",
        "title":  "전달가능성을 높이기위해 이메일 주소를 검증하세요"
    },
    {
        "id":  "api_1786375143713_8700",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.google.com/analytics/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비즈니스",
        "title":  "실제 사용자에게 닿기 위한 당신의 데이터를 모으고, 확인하고 분석하세요"
    },
    {
        "id":  "api_1786375143713_6006",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.google.com/gmail/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비즈니스",
        "title":  "사용자의 메일을 위한 유연하고 REST스러운 접근"
    },
    {
        "id":  "api_1786375143713_4829",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.freelancer.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비즈니스",
        "title":  "일을 받을 수 있는 프리랜서 고용"
    },
    {
        "id":  "api_1786375143713_570",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://domainsdb.info/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비즈니스",
        "title":  "등록된 도메인 이름 검색"
    },
    {
        "id":  "api_1786375143712_9796",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://clearbit.com/docs#logo-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비즈니스",
        "title":  "회사 로고를 찾고, 당신의 프로젝트에 넣어보세요."
    },
    {
        "id":  "api_1786375143712_5236",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://charityapi.orghunter.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비즈니스",
        "title":  "비영리 자선단체 데이터"
    },
    {
        "id":  "api_1786375143712_5841",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.google.com/youtube/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비디오",
        "title":  "사이트 및 앱에 YouTube 기능을 추가합니다."
    },
    {
        "id":  "api_1786375143711_5201",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.vimeo.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비디오",
        "title":  "비메오 개발자 API"
    },
    {
        "id":  "api_1786375143711_2328",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://market.mashape.com/utelly/utelly",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비디오",
        "title":  "TV 프로그램 또는 영화가 시청가능한 곳을 확인합니다."
    },
    {
        "id":  "api_1786375143711_4533",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.tvmaze.com/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비디오",
        "title":  "TV쇼 데이터"
    },
    {
        "id":  "api_1786375143711_8486",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.thetvdb.com/swagger",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비디오",
        "title":  "TV 데이터"
    },
    {
        "id":  "api_1786375143710_3046",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://trakt.tv/b/api-docs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비디오",
        "title":  "영화와 TV 데이터"
    },
    {
        "id":  "api_1786375143710_2218",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.themoviedb.org/documentation/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비디오",
        "title":  "커뮤니티 기반의 영화 데이터"
    },
    {
        "id":  "api_1786375143710_103",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://the-one-api.herokuapp.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비디오",
        "title":  "반지의 제왕 API"
    },
    {
        "id":  "api_1786375143710_4560",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://swapi.co",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비디오",
        "title":  "스타워즈 정보"
    },
    {
        "id":  "api_1786375143710_7534",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://stapi.co",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비디오",
        "title":  "스타트랙에 대한 모든 정보"
    },
    {
        "id":  "api_1786375143710_1737",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/jamesseanwright/ron-swanson-quotes#ron-swanson-quotes-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비디오",
        "title":  "TV"
    },
    {
        "id":  "api_1786375143709_2404",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.omdbapi.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비디오",
        "title":  "영화 정보"
    },
    {
        "id":  "api_1786375143709_8824",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.potterapi.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비디오",
        "title":  "해라포터 API"
    },
    {
        "id":  "api_1786375143709_4970",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.dailymotion.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비디오",
        "title":  "데일리모션 개발자 API"
    },
    {
        "id":  "api_1786375143709_343",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.ceskatelevize.cz/xml/tv-program/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비디오",
        "title":  "체코 TV의 TV 프로그램"
    },
    {
        "id":  "api_1786375143708_8510",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/shevabam/breaking-bad-quotes",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비디오",
        "title":  "브레이킹 배드 대사"
    },
    {
        "id":  "api_1786375143708_4773",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://breakingbadapi.com/documentation",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비디오",
        "title":  "브레이킹 배드 API"
    },
    {
        "id":  "api_1786375143707_1382",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://anapioficeandfire.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "비디오",
        "title":  "왕좌의 게임 API"
    },
    {
        "id":  "api_1786375143707_3240",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://data.police.uk/docs/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "보안",
        "title":  "영국 경찰 데이터"
    },
    {
        "id":  "api_1786375143707_8181",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.shodan.io/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "보안",
        "title":  "인터넷에 연결된 장치를 위한 검색 엔진"
    },
    {
        "id":  "api_1786375143707_6402",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://securitytrails.com/corp/apidocs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "보안",
        "title":  "현재 및 과거 WHOIS 및 DNS 레코드같은 도메인 및 IP 관련 정보"
    },
    {
        "id":  "api_1786375143706_8447",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://nvd.nist.gov/vuln/Data-Feeds/JSON-feed-changelog",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "보안",
        "title":  "미국 국가 취약성 데이터베이스"
    },
    {
        "id":  "api_1786375143706_2886",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://haveibeenpwned.com/API/v3",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "보안",
        "title":  "이전에 데이터 침해에 노출된 암호"
    },
    {
        "id":  "api_1786375143706_269",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://filterlists.com/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "보안",
        "title":  "애드블록 및 방화벽에 대한 필터 목록"
    },
    {
        "id":  "api_1786375143706_3621",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://crxcavator.io/apidocs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "보안",
        "title":  "크롬 확장 프로그램 위험 점수"
    },
    {
        "id":  "api_1786375143705_3788",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://censys.io/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "보안",
        "title":  "인터넷에 연결된 호스트 및 장치를 검색합니다."
    },
    {
        "id":  "api_1786375143705_1647",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.wunderlist.com/documentation",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "문서 \u0026 생산성",
        "title":  "할 일 목록"
    },
    {
        "id":  "api_1786375143705_8999",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://wakatime.com/developers",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "문서 \u0026 생산성",
        "title":  "개발자를 위한 자동화된 시간 추적 리더보드"
    },
    {
        "id":  "api_1786375143705_7823",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://vector.express",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "문서 \u0026 생산성",
        "title":  "무료 벡터 파일 변환 API"
    },
    {
        "id":  "api_1786375143704_4421",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.todoist.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "문서 \u0026 생산성",
        "title":  "할 일 목록"
    },
    {
        "id":  "api_1786375143704_1059",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://restpack.io/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "문서 \u0026 생산성",
        "title":  "스크린샷, HTML을 PDF로 변환, 내용 추출 API"
    },
    {
        "id":  "api_1786375143704_5719",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://prexview.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "문서 \u0026 생산성",
        "title":  "XML이나 JSON로 부터 얻은 데이터를 PDF, HTML 또는 이미지로 바꿔줍니다."
    },
    {
        "id":  "api_1786375143704_7219",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://getpocket.com/developer/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "문서 \u0026 생산성",
        "title":  "북마킹 서비스"
    },
    {
        "id":  "api_1786375143703_2249",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://pdflayer.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "문서 \u0026 생산성",
        "title":  "HTML 또는 URL을 PDF로 변환합니다."
    },
    {
        "id":  "api_1786375143703_9060",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://mercury.postlight.com/web-parser/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "문서 \u0026 생산성",
        "title":  "웹 파서"
    },
    {
        "id":  "api_1786375143703_9877",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.file.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "문서 \u0026 생산성",
        "title":  "파일 공유"
    },
    {
        "id":  "api_1786375143703_5176",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://cloudmersive.com/convert-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "문서 \u0026 생산성",
        "title":  "HTML나 URL을 PDF 또는 PNG로 변환하거나, 공식 문서를 PDF 또는 이미지로 변환"
    },
    {
        "id":  "api_1786375143702_86",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://wit.ai/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "머신러닝",
        "title":  "자연어 처리"
    },
    {
        "id":  "api_1786375143702_777",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://unplu.gg/test_api.html",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "머신러닝",
        "title":  "시계열 데이터 예측 API"
    },
    {
        "id":  "api_1786375143702_3282",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://timedoor.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "머신러닝",
        "title":  "시계열 분석 API"
    },
    {
        "id":  "api_1786375143702_3509",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://keen.io/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "머신러닝",
        "title":  "데이터 분석"
    },
    {
        "id":  "api_1786375143701_1370",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://dialogflow.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "머신러닝",
        "title":  "자연어 처리"
    },
    {
        "id":  "api_1786375143701_2711",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.deepcode.ai/docs/Overview%252FOverview",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "머신러닝",
        "title":  "코드 리뷰를 위한 AI"
    },
    {
        "id":  "api_1786375143701_3283",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.cloudmersive.com/image-recognition-and-processing-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "머신러닝",
        "title":  "이미지 캡션, 얼굴 인식, NSFW 분류"
    },
    {
        "id":  "api_1786375143701_4769",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.clarifai.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "머신러닝",
        "title":  "컴퓨터 비전"
    },
    {
        "id":  "api_1786375143700_3940",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://shibe.online/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "동물",
        "title":  "무작위 시바견, 고양이 또는 새 사진"
    },
    {
        "id":  "api_1786375143700_1587",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://userguide.rescuegroups.org/display/APIDG/API+Developers+Guide+Home",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "동물",
        "title":  "입양"
    },
    {
        "id":  "api_1786375143700_2615",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://randomfox.ca/floof/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "동물",
        "title":  "무작위 여우 사진"
    },
    {
        "id":  "api_1786375143700_3079",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://random.dog/woof.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "동물",
        "title":  "무작위 개 사진"
    },
    {
        "id":  "api_1786375143699_8817",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://aws.random.cat/meow",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "동물",
        "title":  "무작위 고양이 사진"
    },
    {
        "id":  "api_1786375143699_143",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://placegoat.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "동물",
        "title":  "플레이스 홀더 염소 이미지"
    },
    {
        "id":  "api_1786375143699_4278",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.petfinder.com/developers/v2/docs/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "동물",
        "title":  "입양"
    },
    {
        "id":  "api_1786375143698_15",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/movebank/movebank-api-doc",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "동물",
        "title":  "동물의 움직임과 이주 데이터"
    },
    {
        "id":  "api_1786375143698_6214",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://apiv3.iucnredlist.org/api/v3/docs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "동물",
        "title":  "IUCN 적색목록의 위협종"
    },
    {
        "id":  "api_1786375143698_9921",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://http.cat/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "동물",
        "title":  "모든 HTTP 상태를 위한 고양이"
    },
    {
        "id":  "api_1786375143698_8551",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://dog.ceo/dog-api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "동물",
        "title":  "스탠포드의 개 데이터셋에 기반함"
    },
    {
        "id":  "api_1786375143697_769",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://docs.thecatapi.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "동물",
        "title":  "텀블러에서 가져온 고양이 사진"
    },
    {
        "id":  "api_1786375143697_4269",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://alexwohlbruck.github.io/cat-facts/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "동물",
        "title":  "고양이에 대한 사실"
    },
    {
        "id":  "api_1786375143697_4827",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://vatlayer.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "데이터 검증",
        "title":  "VAT 번호를 검증"
    },
    {
        "id":  "api_1786375143697_837",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://smartystreets.com/docs/cloud/us-street-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "데이터 검증",
        "title":  "미국 우편 주소를 확인하고 데이터를 추가합니다."
    },
    {
        "id":  "api_1786375143697_4938",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://smartystreets.com/products/apis/us-extract-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "데이터 검증",
        "title":  "전자 메일을 포함한 모든 텍스트에서 우편 주소를 추출합니다."
    },
    {
        "id":  "api_1786375143696_5549",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://smartystreets.com/docs/cloud/us-autocomplete-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "데이터 검증",
        "title":  "실시간 주소 제안을 이용해서 주소 데이터를 빠르게 입력합니다."
    },
    {
        "id":  "api_1786375143696_4415",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.purgomalum.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "데이터 검증",
        "title":  "욕설과 외설성에 대한 내용 검증기"
    },
    {
        "id":  "api_1786375143696_6333",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://numverify.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "데이터 검증",
        "title":  "핸드폰 번호 검증"
    },
    {
        "id":  "api_1786375143696_5171",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://numvalidate.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "데이터 검증",
        "title":  "오픈소스 핸드폰 번호 검증"
    },
    {
        "id":  "api_1786375143695_3120",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://mailboxlayer.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "데이터 검증",
        "title":  "이메일 주소 검증"
    },
    {
        "id":  "api_1786375143695_9888",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://lob.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "데이터 검증",
        "title":  "미국 주소 확인"
    },
    {
        "id":  "api_1786375143695_5037",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://languagelayer.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "데이터 검증",
        "title":  "언어 감지"
    },
    {
        "id":  "api_1786375143695_8683",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://cloudmersive.com/validate-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "데이터 검증",
        "title":  "이메일 주소, 핸드폰 번호, VAT 번호와 도메인 이름을 검증합니다."
    },
    {
        "id":  "api_1786375143694_9636",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/egno/work-calendar",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "달력",
        "title":  "해당 날짜가 러시아 공휴일인지 아닌 지 확인합니다."
    },
    {
        "id":  "api_1786375143694_3058",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/gadael/icsdb",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "달력",
        "title":  "평일이 아닌 날을 위한 ICS 파일 데이터베이스"
    },
    {
        "id":  "api_1786375143694_5290",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.abalin.net/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "달력",
        "title":  "다양한 나라를 위한 영명 축일을 제공합니다."
    },
    {
        "id":  "api_1786375143694_9713",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://date.nager.at",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "달력",
        "title":  "90개가 넘는 나라를 위한 공공의 공휴일"
    },
    {
        "id":  "api_1786375143693_1107",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.lectserve.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "달력",
        "title":  "개신교 전례 달력"
    },
    {
        "id":  "api_1786375143693_6344",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://holidayapi.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "달력",
        "title":  "공휴일과 관련된 역사적 데이터"
    },
    {
        "id":  "api_1786375143693_6111",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.hebcal.com/home/developer-apis",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "달력",
        "title":  "그레고리안력과 히브리력을 전환하고, 안식일과 공휴일 등을 가져옵니다."
    },
    {
        "id":  "api_1786375143692_8524",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.google.com/google-apps/calendar/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "달력",
        "title":  "구글 달력의 일정을 보여주고, 생성하며 수정합니다."
    },
    {
        "id":  "api_1786375143692_5359",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://svatky.adresa.info/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "달력",
        "title":  "이름을 확인하고 영명 축일 날을 얻습니다."
    },
    {
        "id":  "api_1786375143692_9918",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://calapi.inadiutorium.cz/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "달력",
        "title":  "카톨릭 전례 달력"
    },
    {
        "id":  "api_1786375143691_1631",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.calendarindex.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "달력",
        "title":  "전세계의 공휴일과 평일"
    },
    {
        "id":  "api_1786375143691_7970",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/theoldreader/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "뉴스",
        "title":  "RSS 독자"
    },
    {
        "id":  "api_1786375143691_1126",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://open-platform.theguardian.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "뉴스",
        "title":  "태그 및 섹션으로 분류된 가디언이 작성하는 모든 컨텐츠에 접근합니다."
    },
    {
        "id":  "api_1786375143691_8766",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://dev.npr.org/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "뉴스",
        "title":  "NPR의 맞춤형 뉴스 청취 경험"
    },
    {
        "id":  "api_1786375143691_8604",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://newsapi.org/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "뉴스",
        "title":  "현재 다양한 뉴스 출처와 블로그에 게시된 헤드라인"
    },
    {
        "id":  "api_1786375143690_8630",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.nytimes.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "뉴스",
        "title":  "뉴욕타임즈 뉴스"
    },
    {
        "id":  "api_1786375143690_1971",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.feedster.me/v1/docs/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "뉴스",
        "title":  "검색 가능하고 분류된 RSS 피드 모음"
    },
    {
        "id":  "api_1786375143690_2016",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/feedbin/feedbin-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "뉴스",
        "title":  "RSS 독자"
    },
    {
        "id":  "api_1786375143690_1834",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://currentsapi.services/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "뉴스",
        "title":  "다양한 뉴스 출처, 블로그 및 포럼에 게시된 최신 뉴스"
    },
    {
        "id":  "api_1786375143689_7778",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://chroniclingamerica.loc.gov/about/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "뉴스",
        "title":  "의회 도서관에 있는 수백만 페이지의 역사적인 미국 신문에 접근할 수 있도록 합니다."
    },
    {
        "id":  "api_1786375143689_6397",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.ap.org/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "뉴스",
        "title":  "AP 통신에서 뉴스 및 메타데이터를 검색합니다."
    },
    {
        "id":  "api_1786375143689_2956",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.yahoo.com/weather/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "날씨",
        "title":  "날씨"
    },
    {
        "id":  "api_1786375143689_3477",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.weatherbit.io/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "날씨",
        "title":  "날씨"
    },
    {
        "id":  "api_1786375143689_868",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://stormglass.io/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "날씨",
        "title":  "다양한 출처의 국제 해양 날씨"
    },
    {
        "id":  "api_1786375143688_2168",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://openweathermap.org/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "날씨",
        "title":  "날씨"
    },
    {
        "id":  "api_1786375143688_6417",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.openuv.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "날씨",
        "title":  "실시간 UV 지수 예보"
    },
    {
        "id":  "api_1786375143688_1493",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://api.oceandrivers.com/static/docs.html",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "날씨",
        "title":  "날씨와 날씨 웹캠"
    },
    {
        "id":  "api_1786375143688_4966",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.ncdc.noaa.gov/cdo-web/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "날씨",
        "title":  "날씨와 기후 데이터"
    },
    {
        "id":  "api_1786375143688_9501",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.met.no/weatherapi/documentation",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "날씨",
        "title":  "날씨와 기후 데이터"
    },
    {
        "id":  "api_1786375143688_1764",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.metaweather.com/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "날씨",
        "title":  "날씨"
    },
    {
        "id":  "api_1786375143688_9852",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://darksky.net/dev/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "날씨",
        "title":  "날씨"
    },
    {
        "id":  "api_1786375143687_1716",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.apixu.com/doc/request.aspx",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "날씨",
        "title":  "날씨"
    },
    {
        "id":  "api_1786375143687_983",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.7timer.info/doc.php?lang=en",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "날씨",
        "title":  "날씨 특히 천체날씨"
    },
    {
        "id":  "api_1786375143687_1234",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.youneedabudget.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "금융",
        "title":  "예산짜기 \u0026 계획하기"
    },
    {
        "id":  "api_1786375143687_3167",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://jsonvat.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "금융",
        "title":  "EU 국가들의 모든 부가가치세 비율의 집합"
    },
    {
        "id":  "api_1786375143687_6445",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.tradier.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "금융",
        "title":  "미국 주식/옵션 시장 데이터(지연, 현재, 과거)"
    },
    {
        "id":  "api_1786375143687_9469",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.routingnumbers.info/api/index.html",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "금융",
        "title":  "ACH/NACHA 은행 라우팅 번호"
    },
    {
        "id":  "api_1786375143686_7993",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://ifsc.razorpay.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "금융",
        "title":  "인도 금융 시스템 코드(은행 지점 코드)"
    },
    {
        "id":  "api_1786375143686_9530",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://plaid.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "금융",
        "title":  "사용자의 은행 계좌에 연결하여 거래 데이터에 접근합니다."
    },
    {
        "id":  "api_1786375143686_1190",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://labs.ig.com/gettingstarted",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "금융",
        "title":  "분산 투자와 CFD 마켓 데이터"
    },
    {
        "id":  "api_1786375143686_1517",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://iexcloud.io/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "금융",
        "title":  "실시간 \u0026 과거 주식 및 시장 데이터"
    },
    {
        "id":  "api_1786375143686_5312",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://iextrading.com/developer/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "금융",
        "title":  "실시간 주식 데이터"
    },
    {
        "id":  "api_1786375143686_9590",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://financialmodelingprep.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "금융",
        "title":  "주식 정보 및 데이터"
    },
    {
        "id":  "api_1786375143685_608",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://data.consumerfinance.gov/resource/jhzv-w97w.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "금융",
        "title":  "금융 서비스 소비자 불만 데이터"
    },
    {
        "id":  "api_1786375143685_4665",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.barchartondemand.com/free",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "금융",
        "title":  "주식, 선물 및 외환 시장 데이터"
    },
    {
        "id":  "api_1786375143685_6104",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.alphavantage.co/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "금융",
        "title":  "실시간 및 과거 주식 데이터"
    },
    {
        "id":  "api_1786375143685_8753",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.whereismytransport.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "신흥 도시의 대중 교통 데이터를 위한 플랫폼"
    },
    {
        "id":  "api_1786375143685_6920",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.uber.com/products",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "우버 승차 요청 및 가격 예측"
    },
    {
        "id":  "api_1786375143684_1493",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.wmata.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "미국 워싱턴 지하철 API"
    },
    {
        "id":  "api_1786375143684_6147",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.ptv.vic.gov.au/about-ptv/ptv-data-and-reports/digital-products/ptv-timetable-api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "PTV, 호주 빅토리아주 교통 API"
    },
    {
        "id":  "api_1786375143684_825",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.translink.ca/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "TransLink 캐나다 벤쿠버 교통 API"
    },
    {
        "id":  "api_1786375143684_2804",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.nextbus.com/xmlFeedDocs/NextBusXMLFeed.pdf",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "NextBus의 미국 버스 API"
    },
    {
        "id":  "api_1786375143683_2509",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://myttc.ca/developers",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "캐나다 토론토 교통"
    },
    {
        "id":  "api_1786375143683_8162",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/skywave/KV78Turbo-OVAPI/wiki",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "OVAPI, 네덜란드 전국 대중교통"
    },
    {
        "id":  "api_1786375143683_6241",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.ns.nl/reisinformatie/ns-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "NS, 네덜란드 기차 정보"
    },
    {
        "id":  "api_1786375143683_8209",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://transport.opendata.ch/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "스위스 대중교통 API"
    },
    {
        "id":  "api_1786375143683_8722",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://opentransportdata.swiss/en/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "스위스의 공식 대중 교통 오픈 API"
    },
    {
        "id":  "api_1786375143683_1813",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.trafiklab.se/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "스웨덴 대중 교통 API"
    },
    {
        "id":  "api_1786375143683_4835",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.sptrans.com.br/desenvolvedores/APIOlhoVivo/Documentacao.aspx",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "브라질 상파울로 교통"
    },
    {
        "id":  "api_1786375143682_8292",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www3.septa.org/hackathon/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "SEPTA, 미국 필라델피아 교통 API"
    },
    {
        "id":  "api_1786375143682_6426",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://data.ratp.fr/api/v1/console/datasets/1.0/search/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "RATP, 프랑스 파리 교통 API"
    },
    {
        "id":  "api_1786375143682_3365",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://restratpws.azurewebsites.net/swagger/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "프랑스 파리의 간단한 실시간 대중교통 스케줄"
    },
    {
        "id":  "api_1786375143682_6379",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.octranspo.com/index.php/developers",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "캐나다 오타와 버스 API"
    },
    {
        "id":  "api_1786375143682_8959",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://reisapi.ruter.no/help",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "노르웨이의 교통 API"
    },
    {
        "id":  "api_1786375143682_4001",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://datamine.mta.info/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "미국 뉴욕 교통정보"
    },
    {
        "id":  "api_1786375143682_9890",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.tfgm.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "맨체스터 교통 네트워크 데이터"
    },
    {
        "id":  "api_1786375143682_2623",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://opendata.emtmadrid.es/Servicios-web/BUS",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "마드리드 버스 API"
    },
    {
        "id":  "api_1786375143681_1018",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.tfl.gov.uk",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "영국 런던 교통 API"
    },
    {
        "id":  "api_1786375143681_2469",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://emel.city-platform.com/opendata/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "버스 노선, 주차 및 교통에 대한 데이터"
    },
    {
        "id":  "api_1786375143681_2481",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://data.gov.in/sector/transport",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "인도 대중교통 API"
    },
    {
        "id":  "api_1786375143681_283",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://hea.thebus.org/api_info.asp",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "호놀룰루 교통 정보"
    },
    {
        "id":  "api_1786375143681_1608",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.metromobilite.fr/pages/opendata/OpenDataApi.html",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "그레노블 대중교통"
    },
    {
        "id":  "api_1786375143681_5188",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://data.deutschebahn.com/dataset/api-fahrplan",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "독일 철도 API"
    },
    {
        "id":  "api_1786375143681_9033",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://digitransit.fi/en/developers/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "핀란드 교통 API"
    },
    {
        "id":  "api_1786375143681_3080",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.rtd-denver.com/gtfs-developer-guide.shtml",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "RTD, 미국 덴버 교통 API"
    },
    {
        "id":  "api_1786375143680_2423",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.chaps.cz/eng/products/idos-internet",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "체코 교통 API"
    },
    {
        "id":  "api_1786375143680_8608",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.transitchicago.com/developers/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "CTA, 미국 시카오 교통 API"
    },
    {
        "id":  "api_1786375143680_6875",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://bkkfutar.docs.apiary.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "부다페스트 대중교통 API"
    },
    {
        "id":  "api_1786375143680_7623",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://mbta.com/developers/v3-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "MBTA, 미국 보스턴 교통 API"
    },
    {
        "id":  "api_1786375143680_3117",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendata.bordeaux-metropole.fr/explore/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "프랑스의 보르도 메트로폴 대중교통 등"
    },
    {
        "id":  "api_1786375143680_8912",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/derhuerst/vbb-rest/blob/master/docs/index.md",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "VBB, 독일 베를린 서드파티 교통 API"
    },
    {
        "id":  "api_1786375143679_1551",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://hello.irail.be/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "벨기에의 교통 API"
    },
    {
        "id":  "api_1786375143679_8852",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.at.govt.nz/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "오클랜드 교통 API"
    },
    {
        "id":  "api_1786375143679_3056",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.itsmarta.com/app-developer-resources.aspx",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "Marta, 미국 아틀란타 교통 API"
    },
    {
        "id":  "api_1786375143679_7166",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://transit.land/documentation/datastore/api-endpoints.html",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "수송 집합"
    },
    {
        "id":  "api_1786375143679_7489",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.schiphol.nl/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "네덜란드 암스테르담 스키폴 공항"
    },
    {
        "id":  "api_1786375143679_4164",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.refugerestrooms.org/api/docs/#!/restrooms",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "트랜스젠더, 인터섹스에게 안전한 화장실 정보를 제공합니다."
    },
    {
        "id":  "api_1786375143679_26",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.navitia.io/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "운행 데이터로 멋진 것을 만들 수 있는 개방형 API"
    },
    {
        "id":  "api_1786375143679_4990",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://app.metrolisboa.pt/status/getLinhas.php",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "지하철 노선에서 지연"
    },
    {
        "id":  "api_1786375143679_3321",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://api-docs.izi.travel/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "여행자를 위한 오디오 가이드"
    },
    {
        "id":  "api_1786375143678_458",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://api.erail.in/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "인도 철도 정보"
    },
    {
        "id":  "api_1786375143678_8081",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://docs.apis.is/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "아이슬란드와 관련된 서비스를 제공하는 오픈 API"
    },
    {
        "id":  "api_1786375143678_6788",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://graphhopper.com/api/1/docs/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "턴 바이 턴(Turn-by-turn) 지침을 통한 A-to-B 라우팅"
    },
    {
        "id":  "api_1786375143678_8921",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.goibibo.com/docs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "여행 검색 API"
    },
    {
        "id":  "api_1786375143678_1842",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/transitland/transitland-datastore/blob/master/README.md#api-endpoints",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "Transitland의 API"
    },
    {
        "id":  "api_1786375143678_8378",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://dev.blablacar.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "차량 공유 여행을 검색"
    },
    {
        "id":  "api_1786375143678_3669",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://api.bart.gov",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "BART(Bay Area Rapid Transit) 정류장과 도착예정 시간"
    },
    {
        "id":  "api_1786375143678_3303",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://sandbox.amadeus.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "여행 검색 - 사용량이 제한"
    },
    {
        "id":  "api_1786375143678_3291",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.aisweb.aer.mil.br/api/doc/index.cfm",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "항공 우주 제어부(DECEA)에서 제작한 디지털 미디어로 된 항공 정보"
    },
    {
        "id":  "api_1786375143678_988",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.aishub.net/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "AIS 추적 시스템이 장착된 모든 해양 및 내륙 선박의 실시간 데이터"
    },
    {
        "id":  "api_1786375143677_7852",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.adsbexchange.com/data/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "교통",
        "title":  "모든 항공기의 실시간 및 과거 데이터에 접근합니다."
    },
    {
        "id":  "api_1786375143677_2770",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://datahelpdesk.worldbank.org/knowledgebase/topics/125589",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "가난이 없는 세상을 위해 일합니다."
    },
    {
        "id":  "api_1786375143677_4150",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://waterservices.usgs.gov/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "강과 호수에 대한 수질과 수위 정보"
    },
    {
        "id":  "api_1786375143677_8298",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://earthquake.usgs.gov/fdsnws/event/1/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "실시간 지진 데이터"
    },
    {
        "id":  "api_1786375143677_4233",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://trefle.io/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "식물 종에 대한 데이터"
    },
    {
        "id":  "api_1786375143677_32",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://sunrise-sunset.org/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "주어진 위도 및 경도에 대한 일출 및 일출 시간"
    },
    {
        "id":  "api_1786375143677_7917",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/r-spacex/SpaceX-API",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "회사, 차량, 런치패드 및 론칭 데이터"
    },
    {
        "id":  "api_1786375143677_2254",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://share.osf.io/api/v2/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "연구 및 학술 활동에 대한 무료 공개 데이터 세트"
    },
    {
        "id":  "api_1786375143677_9789",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.osf.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "스터디 설계, 연구 자료, 데이터, 원고 등을 위한 저장소와 아카이브"
    },
    {
        "id":  "api_1786375143677_4187",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://open-notify.org/Open-Notify-API/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "ISS 우주비행사, 현재 위치 등"
    },
    {
        "id":  "api_1786375143676_4199",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://numbersapi.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "숫자에 대한 사실들"
    },
    {
        "id":  "api_1786375143676_9177",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://newton.now.sh/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "기호 및 산술 함수 계산기"
    },
    {
        "id":  "api_1786375143676_7767",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://apodapi.herokuapp.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "메타데이터와 함께 APOD(Astronomy Image of the Day) 이미지를 가져올 수 있는 API"
    },
    {
        "id":  "api_1786375143676_6969",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.nasa.gov",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "사진을 포함한 NASA 데이터"
    },
    {
        "id":  "api_1786375143676_2636",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.asterank.com/mpc",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "Asterank.com 정보"
    },
    {
        "id":  "api_1786375143676_1820",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://launchlibrary.net/docs/1.3/api.html",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "다가오는 우주선 발사"
    },
    {
        "id":  "api_1786375143675_4387",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.itis.gov/ws_description.html",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "통합 분류학 정보 시스템"
    },
    {
        "id":  "api_1786375143675_4600",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://inspirehep.net/info/hep/api?ln=en",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "높은 에너지 물리학 정보"
    },
    {
        "id":  "api_1786375143779_110",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://icanhazdadjoke.com/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "인물",
        "title":  "인터넷의 미국식 아재 농담 모음"
    },
    {
        "id":  "api_1786375143675_5019",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/idigbio/idigbio-search-api/wiki",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "전 세계 조직의 수백만 개의 박물관 견본에 접근합니다."
    },
    {
        "id":  "api_1786375143675_8606",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://api.gbif.org/v1/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "전 세계 생물 다양성 정보"
    },
    {
        "id":  "api_1786375143675_2144",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://core.ac.uk/services#api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "전 세계의 공개적으로 접근 가능한 연구 보고서에 접근합니다."
    },
    {
        "id":  "api_1786375143674_2656",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.arcsecond.io/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "과학 \u0026 수학",
        "title":  "여러 천문학 데이터"
    },
    {
        "id":  "api_1786320000001",
        "docsUrl":  "https://age-of-empires-2-api.herokuapp.com",
        "tags":  [

                 ],
        "serviceUrl":  "https://age-of-empires-2-api.herokuapp.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "에이지 오브 엠파이어 II의 리소스에 대한 정보를 얻습니다."
    },
    {
        "id":  "api_1786320000002",
        "docsUrl":  "http://www.amiiboapi.com/",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.amiiboapi.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "아미보 정보"
    },
    {
        "id":  "api_1786320000003",
        "docsUrl":  "https://dev.battle.net/",
        "tags":  [

                 ],
        "serviceUrl":  "https://dev.battle.net/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "블리자드 엔터테인먼트"
    },
    {
        "id":  "api_1786320000004",
        "docsUrl":  "http://www.icndb.com/api/",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.icndb.com/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "농담 모음"
    },
    {
        "id":  "api_1786320000005",
        "docsUrl":  "https://developer.clashofclans.com",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.clashofclans.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "클래시 오브 클랜 게임 정보"
    },
    {
        "id":  "api_1786320000006",
        "docsUrl":  "https://developer.clashroyale.com",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.clashroyale.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "클래시 로얄 게임 정보"
    },
    {
        "id":  "api_1786320000007",
        "docsUrl":  "https://comicvine.gamespot.com/api/documentation",
        "tags":  [

                 ],
        "serviceUrl":  "https://comicvine.gamespot.com/api/documentation",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "코믹스"
    },
    {
        "id":  "api_1786320000008",
        "docsUrl":  "http://deckofcardsapi.com/",
        "tags":  [

                 ],
        "serviceUrl":  "http://deckofcardsapi.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "카드 덱"
    },
    {
        "id":  "api_1786320000009",
        "docsUrl":  "https://github.com/Bungie-net/api",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/Bungie-net/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "번지 플랫폼 API"
    },
    {
        "id":  "api_1786320000010",
        "docsUrl":  "https://docs.opendota.com/",
        "tags":  [

                 ],
        "serviceUrl":  "https://docs.opendota.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "도타 2의 플레이어 통계, 매치 통계, 랭킹 정보를 제공합니다."
    },
    {
        "id":  "api_1786320000011",
        "docsUrl":  "http://www.dnd5eapi.co/",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.dnd5eapi.co/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "던전 앤 드래곤 5번째 에디션의 주문, 클래스, 몬스터 등에 대한 참조"
    },
    {
        "id":  "api_1786320000012",
        "docsUrl":  "https://esi.evetech.net/ui",
        "tags":  [

                 ],
        "serviceUrl":  "https://esi.evetech.net/ui",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "이브 온라인 서드파티 개발자 문서"
    },
    {
        "id":  "api_1786320000013",
        "docsUrl":  "https://xivapi.com/",
        "tags":  [

                 ],
        "serviceUrl":  "https://xivapi.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "파이널 판타지 XIV 게임 데이터 API"
    },
    {
        "id":  "api_1786320000014",
        "docsUrl":  "https://fortniteapi.com/",
        "tags":  [

                 ],
        "serviceUrl":  "https://fortniteapi.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "포트나이트 통계 \u0026 치장 아이템"
    },
    {
        "id":  "api_1786320000015",
        "docsUrl":  "https://fortnitetracker.com/site-api",
        "tags":  [

                 ],
        "serviceUrl":  "https://fortnitetracker.com/site-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "포트나이트 통계"
    },
    {
        "id":  "api_1786320000016",
        "docsUrl":  "https://www.giantbomb.com/api/documentation",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.giantbomb.com/api/documentation",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "비디오 게임"
    },
    {
        "id":  "api_1786320000017",
        "docsUrl":  "https://wiki.guildwars2.com/wiki/API:Main",
        "tags":  [

                 ],
        "serviceUrl":  "https://wiki.guildwars2.com/wiki/API:Main",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "길드 워 2 정보"
    },
    {
        "id":  "api_1786320000018",
        "docsUrl":  "https://developer.haloapi.com/",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.haloapi.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "헤일로 5와 헤일로 워즈 2 정보"
    },
    {
        "id":  "api_1786320000019",
        "docsUrl":  "http://hearthstoneapi.com/",
        "tags":  [

                 ],
        "serviceUrl":  "http://hearthstoneapi.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "하스스톤 카드 정보"
    },
    {
        "id":  "api_1786320000020",
        "docsUrl":  "https://api.hypixel.net/",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.hypixel.net/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "하이픽셀 플레이어 통계"
    },
    {
        "id":  "api_1786320000021",
        "docsUrl":  "https://api.igdb.com/",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.igdb.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "비디오 게임 데이터베이스"
    },
    {
        "id":  "api_1786320000022",
        "docsUrl":  "https://sv443.net/jokeapi",
        "tags":  [

                 ],
        "serviceUrl":  "https://sv443.net/jokeapi",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "프로그래밍, 어두운 그리고 이것저것 다양한 농담"
    },
    {
        "id":  "api_1786320000023",
        "docsUrl":  "https://github.com/15Dkatz/official_joke_api",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/15Dkatz/official_joke_api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "프로그래밍과 일반적 농담"
    },
    {
        "id":  "api_1786320000024",
        "docsUrl":  "http://jservice.io",
        "tags":  [

                 ],
        "serviceUrl":  "http://jservice.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "《제퍼디!》 게임 쇼의 문제 데이터베이스"
    },
    {
        "id":  "api_1786320000025",
        "docsUrl":  "http://magicthegathering.io/",
        "tags":  [

                 ],
        "serviceUrl":  "http://magicthegathering.io/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "매직: 더 개더링 정보"
    },
    {
        "id":  "api_1786320000026",
        "docsUrl":  "http://developer.marvel.com",
        "tags":  [

                 ],
        "serviceUrl":  "http://developer.marvel.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "마블 코믹스"
    },
    {
        "id":  "api_1786320000027",
        "docsUrl":  "https://docs.mod.io",
        "tags":  [

                 ],
        "serviceUrl":  "https://docs.mod.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "크로스 플랫폼 사이트 모드 API"
    },
    {
        "id":  "api_1786320000028",
        "docsUrl":  "https://opentdb.com/api_config.php",
        "tags":  [

                 ],
        "serviceUrl":  "https://opentdb.com/api_config.php",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "잡학 문제"
    },
    {
        "id":  "api_1786320000029",
        "docsUrl":  "https://api.pandascore.co",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.pandascore.co",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "E-스포츠 게임과 결과"
    },
    {
        "id":  "api_1786320000030",
        "docsUrl":  "https://pubgtracker.com/site-api",
        "tags":  [

                 ],
        "serviceUrl":  "https://pubgtracker.com/site-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "배틀그라운드(PUBG) 통계"
    },
    {
        "id":  "api_1786320000031",
        "docsUrl":  "https://pokeapi.co",
        "tags":  [

                 ],
        "serviceUrl":  "https://pokeapi.co",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "포켓몬스터 정보"
    },
    {
        "id":  "api_1786320000032",
        "docsUrl":  "https://pokemontcg.io",
        "tags":  [

                 ],
        "serviceUrl":  "https://pokemontcg.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "포켓몬스터 TCG 정보"
    },
    {
        "id":  "api_1786320000033",
        "docsUrl":  "https://rickandmortyapi.com",
        "tags":  [

                 ],
        "serviceUrl":  "https://rickandmortyapi.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "이미지를 포함한 모든 릭 앤 모티 정보"
    },
    {
        "id":  "api_1786320000034",
        "docsUrl":  "https://developer.riotgames.com/",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.riotgames.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "리그 오브 레전드 정보"
    },
    {
        "id":  "api_1786320000035",
        "docsUrl":  "https://scryfall.com/docs/api",
        "tags":  [

                 ],
        "serviceUrl":  "https://scryfall.com/docs/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "매직: 더 개더링 데이터베이스"
    },
    {
        "id":  "api_1786320000036",
        "docsUrl":  "https://developer.valvesoftware.com/wiki/Steam_Web_API",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.valvesoftware.com/wiki/Steam_Web_API",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "스팀 클라이언트 상호작용"
    },
    {
        "id":  "api_1786320000037",
        "docsUrl":  "https://superheroapi.com",
        "tags":  [

                 ],
        "serviceUrl":  "https://superheroapi.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "단일 API로 모든 유니버스의 모든 슈퍼히어로와 악당 데이터를 가져옵니다."
    },
    {
        "id":  "api_1786320000038",
        "docsUrl":  "https://www.tronalddump.io/",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.tronalddump.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "인물",
        "title":  "도널드 트럼프 대통령이 말한 것들에 대한 API \u0026 웹 아카이브입니다."
    },
    {
        "id":  "api_1786320000039",
        "docsUrl":  "https://developer.vainglorygame.com/",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.vainglorygame.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "베인글로리 플레이어, 매치와 원격측정"
    },
    {
        "id":  "api_1786320000040",
        "docsUrl":  "https://developers.wargaming.net/",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.wargaming.net/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "Wargaming.net의 정보와 통계"
    },
    {
        "id":  "api_1786320000041",
        "docsUrl":  "https://xkcd.com/json.html",
        "tags":  [

                 ],
        "serviceUrl":  "https://xkcd.com/json.html",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "게임 \u0026 만화",
        "title":  "xkcd 만화를 JSON으로 얻어옵니다."
    },
    {
        "id":  "api_1786310000001",
        "docsUrl":  "https://developer.betterdoctor.com/",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.betterdoctor.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "건강",
        "title":  "근방에 있는 의사에 대한 자세한 정보"
    },
    {
        "id":  "api_1786310000002",
        "docsUrl":  "http://predictbgl.com/api/",
        "tags":  [

                 ],
        "serviceUrl":  "http://predictbgl.com/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "건강",
        "title":  "당뇨병 정보 기록 및 검색"
    },
    {
        "id":  "api_1786310000003",
        "docsUrl":  "http://www.flutrack.org/",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.flutrack.org/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "건강",
        "title":  "지오트래킹으로 인플루엔자 증상 현황을 확인합니다."
    },
    {
        "id":  "api_1786310000004",
        "docsUrl":  "https://www.healthcare.gov/developers/",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.healthcare.gov/developers/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "건강",
        "title":  "미국 의료 보험 시장 관련 교육 콘텐츠"
    },
    {
        "id":  "api_1786310000005",
        "docsUrl":  "https://docs.lexigram.io/v1/welcome",
        "tags":  [

                 ],
        "serviceUrl":  "https://docs.lexigram.io/v1/welcome",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "건강",
        "title":  "텍스트에서 임상 개념의 언급을 추출하여, 임상 종양학에 대한 접근을 제공하는 NLP"
    },
    {
        "id":  "api_1786310000006",
        "docsUrl":  "http://makeup-api.herokuapp.com/",
        "tags":  [

                 ],
        "serviceUrl":  "http://makeup-api.herokuapp.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "건강",
        "title":  "메이크업 정보"
    },
    {
        "id":  "api_1786310000007",
        "docsUrl":  "https://data.medicare.gov/developers",
        "tags":  [

                 ],
        "serviceUrl":  "https://data.medicare.gov/developers",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "건강",
        "title":  "medicare.gov의 CMS의 데이터를 접근합니다."
    },
    {
        "id":  "api_1786310000008",
        "docsUrl":  "https://npiregistry.cms.hhs.gov/registry/help-api",
        "tags":  [

                 ],
        "serviceUrl":  "https://npiregistry.cms.hhs.gov/registry/help-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "건강",
        "title":  "미국에 등록된 의료 공급업체에 대한 정보"
    },
    {
        "id":  "api_1786310000009",
        "docsUrl":  "https://developer.nutritionix.com/",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.nutritionix.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "건강",
        "title":  "세계 최대 규모의 검증된 영양 데이터베이스"
    },
    {
        "id":  "api_1786310000010",
        "docsUrl":  "https://open.fda.gov",
        "tags":  [

                 ],
        "serviceUrl":  "https://open.fda.gov",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "건강",
        "title":  "약, 장치 및 식품에 대한 FDA의 공식 데이터"
    },
    {
        "id":  "api_1786310000011",
        "docsUrl":  "https://ndb.nal.usda.gov/ndb/doc/index",
        "tags":  [

                 ],
        "serviceUrl":  "https://ndb.nal.usda.gov/ndb/doc/index",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "건강",
        "title":  "표준 참조를 위한 국가 영양 데이터베이스"
    },
    {
        "id":  "api_1786284758830",
        "docsUrl":  "https://apiflash.com/",
        "tags":  [

                 ],
        "serviceUrl":  "https://apiflash.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "개발자를 위한 크롬 기반 스크린샷 API"
    },
    {
        "id":  "api_1786284758831",
        "docsUrl":  "https://apility.io/apidocs/",
        "tags":  [

                 ],
        "serviceUrl":  "https://apility.io/apidocs/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "IP, 도메인 및 이메일 어뷰징을 막기위한 API 차단 목록"
    },
    {
        "id":  "api_1786284758832",
        "docsUrl":  "https://apis.guru/api-doc/",
        "tags":  [

                 ],
        "serviceUrl":  "https://apis.guru/api-doc/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "공공 API를 위한 웹 API용 위키백과, OpenAPI/Swagger 스펙"
    },
    {
        "id":  "api_1786284758833",
        "docsUrl":  "http://bettermeta.io",
        "tags":  [

                 ],
        "serviceUrl":  "http://bettermeta.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "사이트의 메타 태그를 JSON 포멧으로 반환합니다."
    },
    {
        "id":  "api_1786284758834",
        "docsUrl":  "https://api.bitbucket.org/2.0/users/karllhughes",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.bitbucket.org/2.0/users/karllhughes",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "공공정보를 Bitbucket 계정에 가져옵시다."
    },
    {
        "id":  "api_1786284758835",
        "docsUrl":  "https://www.boredapi.com/",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.boredapi.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "지루함에 맞설 무작위 활동을 찾아보세요."
    },
    {
        "id":  "api_1786284758836",
        "docsUrl":  "https://browshot.com/api/documentation",
        "tags":  [

                 ],
        "serviceUrl":  "https://browshot.com/api/documentation",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "웹 페이지의 스크린샷을 모든 화면 크기, 모든 기기 크기로 쉽게 만들 수 있습니다."
    },
    {
        "id":  "api_1786284758837",
        "docsUrl":  "https://api.cdnjs.com/libraries/jquery",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.cdnjs.com/libraries/jquery",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "CDNJS의 라이브러리 정보"
    },
    {
        "id":  "api_1786284758838",
        "docsUrl":  "https://changelogs.md",
        "tags":  [

                 ],
        "serviceUrl":  "https://changelogs.md",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "오픈소스 프로젝트의 구조화된 변화 로그 메타데이터"
    },
    {
        "id":  "api_1786284758839",
        "docsUrl":  "https://countapi.xyz",
        "tags":  [

                 ],
        "serviceUrl":  "https://countapi.xyz",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "무료 및 간단한 카운팅 서비스, 페이지 히트 및 특정 이벤트를 추적하는 데 사용할 수 있습니다."
    },
    {
        "id":  "api_1786284758840",
        "docsUrl":  "https://status.digitalocean.com/api/v1",
        "tags":  [

                 ],
        "serviceUrl":  "https://status.digitalocean.com/api/v1",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "모든 DigitalOcean 서비스의 상태"
    },
    {
        "id":  "api_1786284758841",
        "docsUrl":  "https://domainsdb.info/apidomainsdb/index.php",
        "tags":  [

                 ],
        "serviceUrl":  "https://domainsdb.info/apidomainsdb/index.php",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "특정 단어/문자/etc를 포함하는 모든 도메인을 찾기 위한 도메인 이름 검색기"
    },
    {
        "id":  "api_1786284758842",
        "docsUrl":  "https://www.faceplusplus.com/",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.faceplusplus.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "얼굴을 감지하는 도구"
    },
    {
        "id":  "api_1786284758843",
        "docsUrl":  "https://genderize.io",
        "tags":  [

                 ],
        "serviceUrl":  "https://genderize.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "이름에서 성별을 알아냅니다."
    },
    {
        "id":  "api_1786284758844",
        "docsUrl":  "https://developer.github.com/v3/",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.github.com/v3/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "GitHub 저장소, 코드 및 사용자 정보를 프로그래밍 방식으로 이용합니다."
    },
    {
        "id":  "api_1786284758845",
        "docsUrl":  "https://docs.gitlab.com/ee/api/",
        "tags":  [

                 ],
        "serviceUrl":  "https://docs.gitlab.com/ee/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "GitLab 상호 작용을 프로그래밍 방식으로 자동화합니다."
    },
    {
        "id":  "api_1786284758846",
        "docsUrl":  "https://github.com/gitterHQ/docs",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/gitterHQ/docs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "GitHub를 위한 채팅"
    },
    {
        "id":  "api_1786284758847",
        "docsUrl":  "https://http2.pro/doc/api",
        "tags":  [

                 ],
        "serviceUrl":  "https://http2.pro/doc/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "클라이언트 및 서버 HTTP/2 프로토콜 지원을 테스트합니다."
    },
    {
        "id":  "api_1786284758848",
        "docsUrl":  "https://console.bluemix.net/docs/services/text-to-speech/getting-started.html",
        "tags":  [

                 ],
        "serviceUrl":  "https://console.bluemix.net/docs/services/text-to-speech/getting-started.html",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "텍스트를 음성으로 변환합니다."
    },
    {
        "id":  "api_1786284758849",
        "docsUrl":  "http://api.docs.import.io/",
        "tags":  [

                 ],
        "serviceUrl":  "http://api.docs.import.io/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "웹 사이트 또는 RSS 피드로부터 구조화된 데이터를 검색합니다."
    },
    {
        "id":  "api_1786284758850",
        "docsUrl":  "https://www.ipify.org/",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.ipify.org/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "간단한 IP 주소 API"
    },
    {
        "id":  "api_1786284758851",
        "docsUrl":  "https://ipinfo.io/developers",
        "tags":  [

                 ],
        "serviceUrl":  "https://ipinfo.io/developers",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "간단한 IP 주소"
    },
    {
        "id":  "api_1786284758852",
        "docsUrl":  "https://json2jsonp.com/",
        "tags":  [

                 ],
        "serviceUrl":  "https://json2jsonp.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "클라이언트 측에서 JavaScript를 사용하여 도메인 간 데이터 요청을 쉽게 처리하기 위해 즉시 JSON를 JSONP로 변환합니다."
    },
    {
        "id":  "api_1786284758853",
        "docsUrl":  "https://jsonbin.io",
        "tags":  [

                 ],
        "serviceUrl":  "https://jsonbin.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "무료 JSON 스토리지 서비스입니다. 소규모 웹 애플리케이션, 웹 사이트 및 모바일 애플리케이션에 적합합니다."
    },
    {
        "id":  "api_1786284758854",
        "docsUrl":  "https://api.judge0.com/",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.judge0.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "소스 코드를 컴파일하고 실행합니다."
    },
    {
        "id":  "api_1786284758855",
        "docsUrl":  "https://github.com/letsvalidate/api",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/letsvalidate/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "웹 사이트 및 URL에서 썸네일을 추출하는데 사용하는 기술을 공개합니다."
    },
    {
        "id":  "api_1786284758856",
        "docsUrl":  "https://github.com/cmccandless/license-api/blob/master/README.md",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/cmccandless/license-api/blob/master/README.md",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "choosealicense.com를 위한 비공식 REST API"
    },
    {
        "id":  "api_1786284758857",
        "docsUrl":  "https://www.liveedu.tv/developer/applications/",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.liveedu.tv/developer/applications/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "실시간 코딩 스트리밍"
    },
    {
        "id":  "api_1786284758858",
        "docsUrl":  "https://macaddress.io",
        "tags":  [

                 ],
        "serviceUrl":  "https://macaddress.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "MAC 주소 또는 OUI에 대한 벤더 세부 정보 및 기타 정보를 가져옵니다."
    },
    {
        "id":  "api_1786284758859",
        "docsUrl":  "http://myjson.com/api",
        "tags":  [

                 ],
        "serviceUrl":  "http://myjson.com/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "웹이나 모바일 앱을 위한 간단한 JSON 스토어"
    },
    {
        "id":  "api_1786284758860",
        "docsUrl":  "https://nationalize.io",
        "tags":  [

                 ],
        "serviceUrl":  "https://nationalize.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "이름으로 국적을 추정합니다."
    },
    {
        "id":  "api_1786284758861",
        "docsUrl":  "https://oopspam.com/",
        "tags":  [

                 ],
        "serviceUrl":  "https://oopspam.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "다중 스팸 필터링 서비스"
    },
    {
        "id":  "api_1786284758862",
        "docsUrl":  "https://plino.herokuapp.com/",
        "tags":  [

                 ],
        "serviceUrl":  "https://plino.herokuapp.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "스팸 필터링 시스템"
    },
    {
        "id":  "api_1786284758863",
        "docsUrl":  "https://docs.api.getpostman.com/",
        "tags":  [

                 ],
        "serviceUrl":  "https://docs.api.getpostman.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "API를 테스트하기 위한 도구"
    },
    {
        "id":  "api_1786284758864",
        "docsUrl":  "https://proxycrawl.com",
        "tags":  [

                 ],
        "serviceUrl":  "https://proxycrawl.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "안티캡차 서비스를 스크랩하고 크롤링합니다."
    },
    {
        "id":  "api_1786284758865",
        "docsUrl":  "https://github.com/davemachado/public-api",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/davemachado/public-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "웹 개발에 사용할 수 있는 무료 JSON API 목록"
    },
    {
        "id":  "api_1786284758866",
        "docsUrl":  "https://github.com/dl0312/public-apis-korea",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/dl0312/public-apis-korea",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "한국어 사용자를 위한 웹 개발에 사용할 수 있는 무료 JSON API 목록"
    },
    {
        "id":  "api_1786284758867",
        "docsUrl":  "https://pusher.com/beams",
        "tags":  [

                 ],
        "serviceUrl":  "https://pusher.com/beams",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "Android \u0026 iOS에 대한 알림을 보냅니다."
    },
    {
        "id":  "api_1786284758868",
        "docsUrl":  "http://qrtag.net/api/",
        "tags":  [

                 ],
        "serviceUrl":  "http://qrtag.net/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "읽기 쉬운 QR 코드와 URL 쇼트너를 만듭니다."
    },
    {
        "id":  "api_1786284758869",
        "docsUrl":  "http://goqr.me/api/",
        "tags":  [

                 ],
        "serviceUrl":  "http://goqr.me/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "QR 코드를 생성하고 해석하여 읽습니다."
    },
    {
        "id":  "api_1786284758870",
        "docsUrl":  "https://quickchart.io/",
        "tags":  [

                 ],
        "serviceUrl":  "https://quickchart.io/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "차트 및 그래프 이미지를 생성합니다."
    },
    {
        "id":  "api_1786284758871",
        "docsUrl":  "https://reqres.in/",
        "tags":  [

                 ],
        "serviceUrl":  "https://reqres.in/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "AJAX 요청에 응답할 준비가 된 호스팅된 REST-API"
    },
    {
        "id":  "api_1786284758872",
        "docsUrl":  "https://market.mashape.com/tommytcchan/scrape-website-email",
        "tags":  [

                 ],
        "serviceUrl":  "https://market.mashape.com/tommytcchan/scrape-website-email",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "URL에서 이메일 주소를 가져옵니다."
    },
    {
        "id":  "api_1786284758873",
        "docsUrl":  "https://www.scraperapi.com",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.scraperapi.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "확장 가능한 웹 스크래퍼를 쉽게 제작합니다."
    },
    {
        "id":  "api_1786284758874",
        "docsUrl":  "https://screenshotapi.net/",
        "tags":  [

                 ],
        "serviceUrl":  "https://screenshotapi.net/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "픽셀 단위까지 완벽한 웹 사이트 스크린샷을 생성합니다."
    },
    {
        "id":  "api_1786284758875",
        "docsUrl":  "http://shoutcloud.io/",
        "tags":  [

                 ],
        "serviceUrl":  "http://shoutcloud.io/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "영어 문자열을 모두 대문자로 만들어주는 서비스"
    },
    {
        "id":  "api_1786284758876",
        "docsUrl":  "https://api.stackexchange.com/",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.stackexchange.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "개발자들을 위한 Q\u0026A 포럼"
    },
    {
        "id":  "api_1786284758877",
        "docsUrl":  "https://verse.pawelad.xyz/",
        "tags":  [

                 ],
        "serviceUrl":  "https://verse.pawelad.xyz/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "가장 좋아하는 오픈 소스 프로젝트의 최신 버전을 확인합니다."
    },
    {
        "id":  "api_1786284758878",
        "docsUrl":  "https://developers.wso2apistore.com/",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.wso2apistore.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "개발자 유틸리티 통합 API"
    },
    {
        "id":  "api_1786303746000",
        "docsUrl":  "https://agify.io",
        "tags":  [

                 ],
        "serviceUrl":  "https://agify.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "이름에서 연령을 추정합니다."
    },
    {
        "id":  "api_sample_24pullrequests",
        "docsUrl":  "https://24pullrequests.com/api",
        "tags":  [

                 ],
        "serviceUrl":  "https://24pullrequests.com/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "개발",
        "title":  "12월 동안 오픈 소스 협업을 촉진하기 위한 프로젝트"
    },
    {
        "id":  "api_1786275357427",
        "docsUrl":  "https://developers.tossinvest.com/docs/conditional-order-history#tag/conditional-order-history/getconditionalorder",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/conditional-orders/{conditionalOrderId}",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 등록한 조건주문의 목록과 상세를 조회",
        "title":  "조건주문 단건 상세를 조회"
    },
    {
        "id":  "api_1786275319134",
        "docsUrl":  "https://developers.tossinvest.com/docs/conditional-order-history#tag/conditional-order-history/getconditionalorders",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/conditional-orders",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 등록한 조건주문의 목록과 상세를 조회",
        "title":  "조건주문 목록을 조회"
    },
    {
        "id":  "api_1786275277440",
        "docsUrl":  "https://developers.tossinvest.com/docs/conditional-order#tag/conditional-order/modifyconditionalorder",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/conditional-orders/{conditionalOrderId}/modify",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 특정 종목의 가격을 감시해 조건 충족 시 자동으로 매매(매수/매도) 주문을 생성하는 조건주문을 등록·수정·취소",
        "title":  "조건주문을 수정"
    },
    {
        "id":  "api_1786275194407",
        "docsUrl":  "https://developers.tossinvest.com/docs/conditional-order#tag/conditional-order/cancelconditionalorder",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/conditional-orders/{conditionalOrderId}",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 특정 종목의 가격을 감시해 조건 충족 시 자동으로 매매(매수/매도) 주문을 생성하는 조건주문을 등록·수정·취소",
        "title":  "조건주문을 취소"
    },
    {
        "id":  "api_1786275159899",
        "docsUrl":  "https://developers.tossinvest.com/docs/conditional-order#tag/conditional-order/createconditionalorder",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/conditional-orders",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 특정 종목의 가격을 감시해 조건 충족 시 자동으로 매매(매수/매도) 주문을 생성하는 조건주문을 등록·수정·취소",
        "title":  "특정 종목의 가격을 감시해 조건 충족 시 자동으로 매매(매수/매도)하는 조건주문을 생성"
    },
    {
        "id":  "api_1786270488529",
        "docsUrl":  "https://developers.tossinvest.com/docs/order-info#tag/order-info/getcommissions",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/commissions",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 주문을 내기 전 확인하는 거래 가능 정보를 제공",
        "title":  "현재 계좌의 시장별 매매 수수료율을 조회"
    },
    {
        "id":  "api_1786270456281",
        "docsUrl":  "https://developers.tossinvest.com/docs/order-info#tag/order-info/getsellablequantity",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/sellable-quantity",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 주문을 내기 전 확인하는 거래 가능 정보를 제공",
        "title":  "특정 종목의 판매 가능 수량을 조회"
    },
    {
        "id":  "api_1786270425123",
        "docsUrl":  "https://developers.tossinvest.com/docs/order-info#tag/order-info/getbuyingpower",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/buying-power",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 주문을 내기 전 확인하는 거래 가능 정보를 제공",
        "title":  "매수 주문 시 사용할 수 있는 매수 가능 금액을 조회"
    },
    {
        "id":  "api_1786270301388",
        "docsUrl":  "https://developers.tossinvest.com/docs/order-history#tag/order-history/getorder",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/orders/{orderId}",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 제출한 주문의 처리 상태와 체결 내역을 조회",
        "title":  "특정 주문의 상세 정보를 조회"
    },
    {
        "id":  "api_1786270270219",
        "docsUrl":  "https://developers.tossinvest.com/docs/order-history#tag/order-history/getorders",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/orders",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 제출한 주문의 처리 상태와 체결 내역을 조회",
        "title":  "주문 목록을 조회"
    },
    {
        "id":  "api_1786270214002",
        "docsUrl":  "https://developers.tossinvest.com/docs/order#tag/order/cancelorder",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/orders/{orderId}/cancel",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 실제 매매 주문을 처리",
        "title":  "기존 주문을 취소"
    },
    {
        "id":  "api_1786375143818_6183",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://authenticjobs.com/api/docs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "직업",
        "title":  "디자이너, 해커 및 창의적인 전문가를 위한 일자리 게시판"
    },
    {
        "id":  "api_1786270177007",
        "docsUrl":  "https://developers.tossinvest.com/docs/order#tag/order/modifyorder",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/orders/{orderId}/modify",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 실제 매매 주문을 처리",
        "title":  "기존 주문의 가격 또는 수량을 정정"
    },
    {
        "id":  "api_1786270140285",
        "docsUrl":  "https://developers.tossinvest.com/docs/order#tag/order/createorder",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/orders",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 실제 매매 주문을 처리",
        "title":  "매수 또는 매도 주문을 생성"
    },
    {
        "id":  "api_1786260381304",
        "docsUrl":  "https://developers.tossinvest.com/docs/asset#tag/asset/getholdings",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/holdings",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 본인 계좌의 보유 자산 현황을 조회",
        "title":  "보유 주식 정보를 조회"
    },
    {
        "id":  "api_1786260347848",
        "docsUrl":  "https://developers.tossinvest.com/docs/account#tag/account/getaccounts",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/accounts",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 사용자 본인의 계좌 목록을 조회",
        "title":  "사용자의 계좌 목록을 조회"
    },
    {
        "id":  "api_1786260200080",
        "docsUrl":  "https://developers.tossinvest.com/docs/market-indicators#tag/market-indicators/getmarketindicatorinvestortrading",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/market-indicators/{symbol}/investor-trading",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 국내 주요 지수(코스피·코스닥)와 한국 국채 금리 시세, KRX 투자자별 매매대금을 조회",
        "title":  "KRX 시장(코스피·코스닥)의 투자자별 매매대금을 조회"
    },
    {
        "id":  "api_1786260166162",
        "docsUrl":  "https://developers.tossinvest.com/docs/market-indicators#tag/market-indicators/getmarketindicatorcandles",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/market-indicators/{symbol}/candles",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 국내 주요 지수(코스피·코스닥)와 한국 국채 금리 시세, KRX 투자자별 매매대금을 조회",
        "title":  "시장 지표(국내 지수·국채)의 캔들(OHLCV) 차트 데이터를 조회"
    },
    {
        "id":  "api_1786260129675",
        "docsUrl":  "https://developers.tossinvest.com/docs/market-indicators#tag/market-indicators/getmarketindicatorprices",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/market-indicators/prices",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 국내 주요 지수(코스피·코스닥)와 한국 국채 금리 시세, KRX 투자자별 매매대금을 조회",
        "title":  "시장 지표(국내 지수·국채)의 현재가를 조회"
    },
    {
        "id":  "api_1786258364498",
        "docsUrl":  "https://developers.tossinvest.com/docs/ranking#tag/ranking/getrankings",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/rankings",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 국내·미국 주식의 랭킹을 조회",
        "title":  "지정한 시장(marketCountry) · 기간(duration) · 기준(type)의 주식 랭킹을 조회"
    },
    {
        "id":  "api_1786258300196",
        "docsUrl":  "https://developers.tossinvest.com/docs/market-info#tag/market-info/getusmarketcalendar",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/market-calendar/US",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 환율과 시장 운영 일정을 조회",
        "title":  "미국 시장의 장 운영 시간을 조회"
    },
    {
        "id":  "api_1786258267742",
        "docsUrl":  "https://developers.tossinvest.com/docs/market-info#tag/market-info/getexchangerate",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/market-calendar/KR",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 환율과 시장 운영 일정을 조회",
        "title":  "국내 시장의 거래 가능 시간을 조회"
    },
    {
        "id":  "api_1786258229261",
        "docsUrl":  "https://developers.tossinvest.com/docs/market-info#tag/market-info/getexchangerate",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/exchange-rate",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 환율과 시장 운영 일정을 조회",
        "title":  "KRW ↔ USD 환율 정보를 조회"
    },
    {
        "id":  "api_1786257999588",
        "docsUrl":  "https://developers.tossinvest.com/docs/stock-info#tag/stock-info/getstocksecuritieslending",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/stocks/{symbol}/securities-lending",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 종목명·시장·통화·상장 상태·발행주식수 등 종목의 기본 참조 정보와 매수 유의사항, 그리고 국내(KR) 종목의 수급 동향을 제공",
        "title":  "국내(KR) 종목의 대차거래 동향을 일별 시계열로 조회"
    },
    {
        "id":  "api_1786257903208",
        "docsUrl":  "https://developers.tossinvest.com/docs/stock-info#tag/stock-info/getstockcredittrades",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/stocks/{symbol}/credit-trades",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 종목명·시장·통화·상장 상태·발행주식수 등 종목의 기본 참조 정보와 매수 유의사항, 그리고 국내(KR) 종목의 수급 동향을 제공",
        "title":  "국내(KR) 종목의 신용거래 동향을 일별 시계열로 조회"
    },
    {
        "id":  "api_1786257800531",
        "docsUrl":  "https://developers.tossinvest.com/docs/stock-info#tag/stock-info/getstockshortselling",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/stocks/{symbol}/short-selling",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 종목명·시장·통화·상장 상태·발행주식수 등 종목의 기본 참조 정보와 매수 유의사항, 그리고 국내(KR) 종목의 수급 동향을 제공",
        "title":  "국내(KR) 종목의 공매도 동향을 일별 시계열로 조회"
    },
    {
        "id":  "api_1786257770676",
        "docsUrl":  "https://developers.tossinvest.com/docs/stock-info#tag/stock-info/getstockprogramtrades",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/stocks/{symbol}/program-trades",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 종목명·시장·통화·상장 상태·발행주식수 등 종목의 기본 참조 정보와 매수 유의사항, 그리고 국내(KR) 종목의 수급 동향을 제공",
        "title":  "국내(KR) 종목의 프로그램매매 동향을 일별 거래량 시계열로 조회"
    },
    {
        "id":  "api_1786257724833",
        "docsUrl":  "https://developers.tossinvest.com/docs/stock-info#tag/stock-info/getstockinvestortrading",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/stocks/{symbol}/investor-trading",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 종목명·시장·통화·상장 상태·발행주식수 등 종목의 기본 참조 정보와 매수 유의사항, 그리고 국내(KR) 종목의 수급 동향을 제공",
        "title":  "국내(KR) 종목의 투자자별 매매동향을 일별 거래량 시계열로 조회"
    },
    {
        "id":  "api_1786257687931",
        "docsUrl":  "https://developers.tossinvest.com/docs/stock-info#tag/stock-info/getstockwarnings",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/stocks/{symbol}/warnings",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 종목명·시장·통화·상장 상태·발행주식수 등 종목의 기본 참조 정보와 매수 유의사항, 그리고 국내(KR) 종목의 수급 동향을 제공",
        "title":  "종목의 매수 유의사항 및 변동성 완화(VI) 발동 정보를 조회"
    },
    {
        "id":  "api_1786257417400",
        "docsUrl":  "https://developers.tossinvest.com/docs/stock-info#tag/stock-info/getstocks",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/stocks",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 종목명·시장·통화·상장 상태·발행주식수 등 종목의 기본 참조 정보와 매수 유의사항, 그리고 국내(KR) 종목의 수급 동향을 제공",
        "title":  "종목의 기본 정보를 조회"
    },
    {
        "id":  "api_1786257374259",
        "docsUrl":  "https://developers.tossinvest.com/docs/market-data#tag/market-data/gettrades",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/candles",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 종목의 실시간성 시세 정보를 조회",
        "title":  "종목의 캔들(OHLCV) 차트 데이터를 조회"
    },
    {
        "id":  "api_1786257342860",
        "docsUrl":  "https://developers.tossinvest.com/docs/market-data#tag/market-data/gettrades",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/price-limits",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 종목의 실시간성 시세 정보를 조회",
        "title":  "종목의 당일 상한가 및 하한가를 조회"
    },
    {
        "id":  "api_1786257309020",
        "docsUrl":  "http://developers.tossinvest.com/docs/market-data#tag/market-data/gettrades",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/trades",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 종목의 실시간성 시세 정보를 조회",
        "title":  "당일 최근 체결 내역을 조회"
    },
    {
        "id":  "api_1786257279897",
        "docsUrl":  "https://developers.tossinvest.com/docs/market-data#tag/market-data/getprices",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/prices",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 종목의 실시간성 시세 정보를 조회",
        "title":  "종목의 현재가 정보를 조회"
    },
    {
        "id":  "api_1786257223385",
        "docsUrl":  "https://developers.tossinvest.com/docs/market-data#tag/market-data/getorderbook",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/api/v1/orderbook",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 종목의 실시간성 시세 정보를 조회",
        "title":  "매수/매도 호가 및 잔량을 조회"
    },
    {
        "id":  "api_1786257085533",
        "docsUrl":  "https://developers.tossinvest.com/docs/auth#tag/auth/issueoauth2token",
        "tags":  [

                 ],
        "serviceUrl":  "https://openapi.tossinvest.com/oauth2/token",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "토스증권 Open API의 모든 요청에 필요한 액세스 토큰을 발급",
        "title":  "OAuth2 액세스 토큰 발급"
    },
    {
        "id":  "api_1785941684617",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS006\u0026apiId=2020056",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/stkdpRs.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "증권신고서",
        "title":  "증권예탁증권"
    },
    {
        "id":  "api_1785941665787",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS006\u0026apiId=2020054",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/estkRs.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "증권신고서",
        "title":  "지분증권"
    },
    {
        "id":  "api_1785941634145",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS006\u0026apiId=2020055",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/bdRs.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "증권신고서",
        "title":  "채무증권"
    },
    {
        "id":  "api_1785941609146",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS006\u0026apiId=2020059",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/dvRs.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "증권신고서",
        "title":  "분할"
    },
    {
        "id":  "api_1785941587930",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS006\u0026apiId=2020057",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/mgRs.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "증권신고서",
        "title":  "합병"
    },
    {
        "id":  "api_1785941565966",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS006\u0026apiId=2020058",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/extrRs.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "증권신고서",
        "title":  "주식의포괄적교환·이전"
    },
    {
        "id":  "api_1785941532048",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020020",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/bsnSp.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "영업정지"
    },
    {
        "id":  "api_1785941488139",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020048",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/stkrtbdInhDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "주권 관련 사채권 양수 결정"
    },
    {
        "id":  "api_1785941468133",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020050",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/cmpMgDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "회사합병 결정"
    },
    {
        "id":  "api_1785941445682",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020051",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/cmpDvDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "회사분할 결정"
    },
    {
        "id":  "api_1785941423335",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020052",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/cmpDvmgDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "회사분할합병 결정"
    },
    {
        "id":  "api_1785941404585",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020053",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/stkExtrDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "주식교환·이전 결정"
    },
    {
        "id":  "api_1785941382715",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020038",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/tsstkAqDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "자기주식 취득 결정"
    },
    {
        "id":  "api_1785941363452",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020039",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/tsstkDpDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "자기주식 처분 결정"
    },
    {
        "id":  "api_1785941340637",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020040",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/tsstkAqTrctrCnsDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "자기주식취득 신탁계약 체결 결정"
    },
    {
        "id":  "api_1785941317647",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020041",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/tsstkAqTrctrCcDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "자기주식취득 신탁계약 해지 결정"
    },
    {
        "id":  "api_1785941292112",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020042",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/bsnInhDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "영업양수 결정"
    },
    {
        "id":  "api_1785941264189",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020043",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/bsnTrfDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "영업양도 결정"
    },
    {
        "id":  "api_1785941239382",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020046",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/otcprStkInvscrInhDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "타법인 주식 및 출자증권 양수결정"
    },
    {
        "id":  "api_1785941216066",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020044",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/tgastInhDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "유형자산 양수 결정"
    },
    {
        "id":  "api_1785941188346",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020045",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/tgastTrfDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "유형자산 양도 결정"
    },
    {
        "id":  "api_1785941162733",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020047",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/otcprStkInvscrTrfDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "타법인 주식 및 출자증권 양도결정"
    },
    {
        "id":  "api_1785941137436",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020018",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/astInhtrfEtcPtbkOpt.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "자산양수도(기타), 풋백옵션"
    },
    {
        "id":  "api_1785941107256",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020037",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/wdCocobdIsDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "상각형 조건부자본증권 발행결정"
    },
    {
        "id":  "api_1785941084305",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020036",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/bnkMngtPcsp.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "채권은행 등의 관리절차 중단"
    },
    {
        "id":  "api_1785941056299",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020035",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/exbdIsDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "교환사채권 발행결정"
    },
    {
        "id":  "api_1785941034577",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020034",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/bdwtIsDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "신주인수권부사채권 발행결정"
    },
    {
        "id":  "api_1785941011575",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020033",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/cvbdIsDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "전환사채권 발행결정"
    },
    {
        "id":  "api_1785940724373",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020032",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/ovDlst.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "해외 증권시장 주권등 상장폐지"
    },
    {
        "id":  "api_1785940690524",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020031",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/ovLst.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "해외 증권시장 주권등 상장"
    },
    {
        "id":  "api_1785940662784",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020030",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/ovDlstDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "해외 증권시장 주권등 상장폐지 결정"
    },
    {
        "id":  "api_1785940612822",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020029",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/ovLstDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "해외 증권시장 주권등 상장 결정"
    },
    {
        "id":  "api_1785940587181",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020028",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/lwstLg.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "소송 등의 제기"
    },
    {
        "id":  "api_1785940560375",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020027",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/bnkMngtPcbg.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "채권은행 등의 관리절차 개시"
    },
    {
        "id":  "api_1785940535865",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020026",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/crDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "감자 결정"
    },
    {
        "id":  "api_1785940501636",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020025",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/pifricDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "유무상증자 결정"
    },
    {
        "id":  "api_1785940472856",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020024",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/fricDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "무상증자 결정"
    },
    {
        "id":  "api_1785940446670",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020023",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/piicDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "유상증자 결정"
    },
    {
        "id":  "api_1785940420517",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020022",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/dsRsOcr.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "해산사유 발생"
    },
    {
        "id":  "api_1785940391974",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020021",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/ctrcvsBgrq.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "회생절차 개시신청"
    },
    {
        "id":  "api_1785940367107",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020049",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/stkrtbdTrfDecsn.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "주권 관련 사채권 양도 결정"
    },
    {
        "id":  "api_1785940336631",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005\u0026apiId=2020019",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/dfOcr.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "주요사항보고서",
        "title":  "부도발생"
    },
    {
        "id":  "api_1785940276535",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS004\u0026apiId=2019021",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/majorstock.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지분공시",
        "title":  "대량보유 상황보고"
    },
    {
        "id":  "api_1785940245819",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS004\u0026apiId=2019022",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/elestock.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지분공시",
        "title":  "임원ㆍ주요주주 소유보고"
    },
    {
        "id":  "api_1785940214452",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS003\u0026apiId=2019020",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "단일회사 전체 재무제표"
    },
    {
        "id":  "api_1785940163835",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS003\u0026apiId=2022001",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/fnlttSinglIndx.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "단일회사 주요 재무지표"
    },
    {
        "id":  "api_1785940137214",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS003\u0026apiId=2020001",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/xbrlTaxonomy.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "XBRL택사노미재무제표양식"
    },
    {
        "id":  "api_1785940114454",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS003\u0026apiId=2022002",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/fnlttCmpnyIndx.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "다중회사 주요 재무지표"
    },
    {
        "id":  "api_1785940092546",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS003\u0026apiId=2019019",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/fnlttXbrl.xml",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "재무제표 원본파일(XBRL)"
    },
    {
        "id":  "api_1785940070545",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS003\u0026apiId=2019017",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/fnlttMultiAcnt.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "다중회사 주요계정"
    },
    {
        "id":  "api_1785940046034",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS003\u0026apiId=2019016",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/fnlttSinglAcnt.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "단일회사 주요계정"
    },
    {
        "id":  "api_1785939755126",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2019015",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/otrCprInvstmntSttus.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "타법인 출자현황"
    },
    {
        "id":  "api_1785939732906",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2026001",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/hmvAuditIndvdlBySttusV2.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "이사·감사의 개인별 보수현황(5억원 이상) (Ver 2.0)"
    },
    {
        "id":  "api_1785939706889",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2019012",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/hmvAuditIndvdlBySttus.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "이사·감사의 개인별 보수현황(5억원 이상)"
    },
    {
        "id":  "api_1785939669047",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2020015",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/drctrAdtAllMendngSttusMendngPymntamtTyCl.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "이사·감사 전체의 보수현황(보수지급금액 - 유형별)"
    },
    {
        "id":  "api_1785939645183",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2019013",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/hmvAuditAllSttus.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "이사·감사 전체의 보수현황(보수지급금액 - 이사·감사 전체)"
    },
    {
        "id":  "api_1785939618686",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2020014",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/drctrAdtAllMendngSttusGmtsckConfmAmount.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "이사·감사 전체의 보수현황(주주총회 승인금액)"
    },
    {
        "id":  "api_1785939590384",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2020013",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/unrstExctvMendngSttus.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "미등기임원 보수현황",
        "title":  "미등기임원 보수현황"
    },
    {
        "id":  "api_1785939564425",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2019011",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/empSttus.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "직원 현황"
    },
    {
        "id":  "api_1785939544566",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2019010",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/exctvSttus.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "임원 현황"
    },
    {
        "id":  "api_1785939521281",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2019009",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/mrhlSttus.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "소액주주 현황"
    },
    {
        "id":  "api_1785939496120",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2019007",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/hyslrSttus.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "최대주주 현황"
    },
    {
        "id":  "api_1785939465642",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2020012",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/outcmpnyDrctrNdChangeSttus.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "독립(사외)이사 및 그 변동현황"
    },
    {
        "id":  "api_1785939436237",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2020011",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/accnutAdtorNonAdtServcCnclsSttus.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "회계감사인과의 비감사용역 계약체결 현황"
    },
    {
        "id":  "api_1785939415493",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2020010",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/adtServcCnclsSttus.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "감사용역체결현황"
    },
    {
        "id":  "api_1785939379311",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2020009",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/accnutAdtorNmNdAdtOpinion.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "회계감사인의 명칭 및 감사의견"
    },
    {
        "id":  "api_1785939338388",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2020017",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/prvsrpCptalUseDtls.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "사모자금의 사용내역"
    },
    {
        "id":  "api_1785939305443",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2020016",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/pssrpCptalUseDtls.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "공모자금의 사용내역"
    },
    {
        "id":  "api_1785939278499",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2020008",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/cndlCaplScritsNrdmpBlce.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "조건부 자본증권 미상환 잔액"
    },
    {
        "id":  "api_1785939248670",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2020007",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/newCaplScritsNrdmpBlce.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "신종자본증권 미상환 잔액"
    },
    {
        "id":  "api_1785939216216",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2020006",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/cprndNrdmpBlce.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "회사채 미상환 잔액"
    },
    {
        "id":  "api_1785939185507",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2020005",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/srtpdPsndbtNrdmpBlce.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "단기사채 미상환 잔액"
    },
    {
        "id":  "api_1785939157518",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2020004",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/entrprsBilScritsNrdmpBlce.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "기업어음증권 미상환 잔액"
    },
    {
        "id":  "api_1785939127901",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2020003",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/detScritsIsuAcmslt.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "채무증권 발행실적"
    },
    {
        "id":  "api_1785939100310",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2019004",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/irdsSttus.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "증자(감자) 현황"
    },
    {
        "id":  "api_1785939071168",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2019005",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/alotMatter.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "배당에 관한 사항"
    },
    {
        "id":  "api_1785939045669",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2019006",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/tesstkAcqsDspsSttus.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "자기주식 취득 및 처분 현황"
    },
    {
        "id":  "api_1785939016536",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002\u0026apiId=2020002",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/stockTotqySttus.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정기보고서",
        "title":  "주식의 총수 현황"
    },
    {
        "id":  "api_1786375143779_2248",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://forismatic.com/en/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "인물",
        "title":  "영감을 주는 명언"
    },
    {
        "id":  "api_1785938940929",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001\u0026apiId=2019018",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/corpCode.xml",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "공시정보",
        "title":  "고유번호"
    },
    {
        "id":  "api_1785938907455",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001\u0026apiId=2019003",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/document.xml",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "공시정보",
        "title":  "공시서류원본파일"
    },
    {
        "id":  "api_1785938840327",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001\u0026apiId=2019002",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/company.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "공시정보",
        "title":  "기업개황"
    },
    {
        "id":  "api_1785938792880",
        "docsUrl":  "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001\u0026apiId=2019001",
        "tags":  [

                 ],
        "serviceUrl":  "https://opendart.fss.or.kr/api/list.json",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "공시정보",
        "title":  "공시검색"
    },
    {
        "id":  "api_1786375143866_1550",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.kakao.com/features/kakao#카카오모먼트-API",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "카카오",
        "title":  "카카오모먼트"
    },
    {
        "id":  "api_1786375143866_3113",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.kakao.com/features/kakao#카카오톡-채널-API",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "카카오",
        "title":  "카카오톡 채널"
    },
    {
        "id":  "api_1786375143865_9633",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.kakao.com/features/platform#번역",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "카카오",
        "title":  "카카오 번역"
    },
    {
        "id":  "api_1786375143865_345",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.kakao.com/features/platform#비전",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "카카오",
        "title":  "카카오 비전"
    },
    {
        "id":  "api_1786375143864_4424",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.kakao.com/features/platform#지도-로컬",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "카카오",
        "title":  "카카오 지도/로컬"
    },
    {
        "id":  "api_1786375143864_8584",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.kakao.com/features/platform#음성",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "카카오",
        "title":  "카카오 음성"
    },
    {
        "id":  "api_1786375143863_2200",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.kakao.com/features/platform#검색",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "카카오",
        "title":  "카카오 검색"
    },
    {
        "id":  "api_1786375143863_4584",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.kakao.com/features/platform#앱로그-분석",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "카카오",
        "title":  "카카오 앱로그 분석"
    },
    {
        "id":  "api_1786375143863_8926",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.kakao.com/features/platform#푸시-알림",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "카카오",
        "title":  "카카오톡 푸시 알림"
    },
    {
        "id":  "api_1786375143862_5681",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.kakao.com/features/kakao#카카오스토리-API",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "카카오",
        "title":  "카카오스토리"
    },
    {
        "id":  "api_1786375143862_9828",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.kakao.com/features/kakao#카카오페이-API",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "카카오",
        "title":  "카카오페이"
    },
    {
        "id":  "api_1786375143862_8846",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.kakao.com/features/kakao#카카오내비-API",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "카카오",
        "title":  "카카오내비"
    },
    {
        "id":  "api_1786375143861_9698",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.kakao.com/features/kakao#카카오톡-API",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "카카오",
        "title":  "카카오톡"
    },
    {
        "id":  "api_1786375143861_7593",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.kakao.com/features/kakao#카카오-링크",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "카카오",
        "title":  "카카오 링크"
    },
    {
        "id":  "api_1786375143861_7673",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.kakao.com/features/platform#친구-API",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "카카오",
        "title":  "카카오톡 친구 목록을 활용해 소셜 기능까지"
    },
    {
        "id":  "api_1786375143860_8165",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.kakao.com/features/platform#사용자-관리",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "카카오",
        "title":  "카카오 계정 사용자 관리"
    },
    {
        "id":  "api_1786375143860_4904",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.ncloud.com/product/applicationService/nShortUrl",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "네이버",
        "title":  "입력된 URL을 me2.do 형태의 짧은 URL로 변환"
    },
    {
        "id":  "api_1786375143859_7221",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.naver.com/products/blog/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "네이버",
        "title":  "네이버 회원의 블로그에 글을 쓸 수 있습니다."
    },
    {
        "id":  "api_1786375143859_1400",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.naver.com/products/cafe/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "네이버",
        "title":  "특정 네이버 카페 가입하고 글을 쓸 수 있습니다."
    },
    {
        "id":  "api_1786375143859_2726",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.naver.com/products/calendar/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "네이버",
        "title":  "로그인한 사용자 캘린더에 일정 추가 가능"
    },
    {
        "id":  "api_1786375143857_3919",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.naver.com/products/clova/face/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "네이버",
        "title":  "입력된 사진을 입력받아 얼굴윤곽/부위/표정/유명인 닮음도를 리턴"
    },
    {
        "id":  "api_1786375143857_4088",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.naver.com/products/nmt/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "네이버",
        "title":  "Papago 번역 인공신경망 기반 기계 번역"
    },
    {
        "id":  "api_1786375143857_2986",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.naver.com/products/login/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "네이버",
        "title":  "외부 사이트에서 네이버 아이디로 로그인 기능 구현 및 프로필 조회"
    },
    {
        "id":  "api_1786375143856_9775",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.ncloud.com/product/applicationService/maps",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "네이버",
        "title":  "네이버 지도 표시 및 주소 좌표 변환"
    },
    {
        "id":  "api_1786375143856_59",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.naver.com/products/search/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "네이버",
        "title":  "네이버 블로그, 이미지, 웹, 뉴스, 백과사전, 책, 카페, 지식iN 등 검색"
    },
    {
        "id":  "api_1786375143856_2500",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://rel.ink",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "URL 쇼트너",
        "title":  "안전하고 무료인 URL 쇼트너"
    },
    {
        "id":  "api_1786375143855_1548",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.rebrandly.com/v1/docs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "URL 쇼트너",
        "title":  "URL 쇼트너 브랜드 링크 커스텀"
    },
    {
        "id":  "api_1786375143855_4956",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://support.clickmeter.com/hc/en-us/categories/201474986",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "URL 쇼트너",
        "title":  "당신의 마케팅 링크를 모니터하고 비교하고 최적화합니다."
    },
    {
        "id":  "api_1786375143855_3642",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://cleanuri.com/docs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "URL 쇼트너",
        "title":  "URL 쇼트너 서비스"
    },
    {
        "id":  "api_1786375143854_1390",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://dev.bitly.com/get_started.html",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "URL 쇼트너",
        "title":  "URL 쇼트너와 링크 관리"
    },
    {
        "id":  "api_1786375143849_441",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://developer.ticketmaster.com/products-and-docs/apis/getting-started/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "행사",
        "title":  "행사, 명소 또는 장소를 검색합니다."
    },
    {
        "id":  "api_1786375143818_3720",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.adzuna.com/overview",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "직업",
        "title":  "일자리 게시판 모음"
    },
    {
        "id":  "api_1786375143858_5613",
        "docsUrl":  "https://developers.naver.com/docs/serviceapi/datalab/search/search.md",
        "tags":  [
                     "네이버",
                     "데이터랩",
                     "검색트렌드",
                     "빅데이터"
                 ],
        "serviceUrl":  "https://openapi.naver.com/v1/datalab/search",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "네이버 - 데이터랩",
        "title":  "네이버 통합 검색어 트렌드"
    },
    {
        "id":  "api_1786375143858_4804",
        "docsUrl":  "https://developers.naver.com/docs/serviceapi/datalab/shopping/shopping.md",
        "tags":  [
                     "네이버",
                     "데이터랩",
                     "쇼핑인사이트",
                     "이커머스"
                 ],
        "serviceUrl":  "https://openapi.naver.com/v1/datalab/shopping/categories",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "네이버 - 데이터랩",
        "title":  "네이버 쇼핑인사이트 트렌드"
    },
    {
        "id":  "api_1786375143849_8505",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://developer.picatic.com/?utm_medium=web\u0026utm_source=github\u0026utm_campaign=public-apis%20repo\u0026utm_content=toddmotto",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "행사",
        "title":  "어디서든 티켓을 팔아보세요."
    },
    {
        "id":  "api_1786375143848_2351",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.eventbrite.com/developer/v3/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "행사",
        "title":  "행사를 찾아보세요"
    },
    {
        "id":  "api_1786375143848_544",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.uspto.gov/learning-and-resources/open-data-and-mobility",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "특허",
        "title":  "미국 특허 API 서비스"
    },
    {
        "id":  "api_1786375143848_6554",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://tiponet.tipo.gov.tw/Gazette/OpenData/OD/OD05.aspx?QryDS=API00",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "특허",
        "title":  "대만 특허검색시스템 API"
    },
    {
        "id":  "api_1786375143847_9232",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.epo.org/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "특허",
        "title":  "유럽 특허검색시스템 API"
    },
    {
        "id":  "api_1786375143847_635",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://whatpulse.org/pages/webapi/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "트래킹",
        "title":  "키보드/마우스 사용량을 측정하는 어플리캐이션"
    },
    {
        "id":  "api_1786375143846_440",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.ups.com/upsdeveloperkit",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "트래킹",
        "title":  "발송 및 주소 정보"
    },
    {
        "id":  "api_1786375143846_7983",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.postnord.com/docs2",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "트래킹",
        "title":  "운송 중인 소포에 대한 정보를 제공합니다."
    },
    {
        "id":  "api_1786375143845_5366",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://postmon.com.br",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "트래킹",
        "title":  "쉽고, 빠르고, 무료로 브라질 ZIP 코드를 쿼리하고 주문할 수 있는 API"
    },
    {
        "id":  "api_1786375143845_9061",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.ibm.com/watson/developercloud/natural-language-understanding/api/v1/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "텍스트 분석",
        "title":  "고급 텍스트 분석을 위한 자연 언어 처리"
    },
    {
        "id":  "api_1786375143844_6304",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://semantria.readme.io/docs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "텍스트 분석",
        "title":  "감성 분석, 분류 및 명명된 엔티티를 추출하는 텍스트 분석"
    },
    {
        "id":  "api_1786375143844_7498",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://rapidapi.com/BigLobster/api/language-identification-prediction",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "텍스트 분석",
        "title":  "모든 텍스트에 대한 자동 언어 감지합니다. (175개 이상의 언어 지원)"
    },
    {
        "id":  "api_1786375143844_4814",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://cloud.google.com/natural-language/docs/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "텍스트 분석",
        "title":  "감성 및 구문 분석을 포함한 자연어 이해 기술"
    },
    {
        "id":  "api_1786375143843_6127",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://detectlanguage.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "텍스트 분석",
        "title":  "텍스트 언어를 감지합니다."
    },
    {
        "id":  "api_1786375143843_8693",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.cloudmersive.com/nlp-api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "텍스트 분석",
        "title":  "자연어 처리 및 텍스트 분석"
    },
    {
        "id":  "api_1786375143843_6661",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://docs.aylien.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "텍스트 분석",
        "title":  "정보 검색 및 자연어 API의 집합"
    },
    {
        "id":  "api_1786375143827_7417",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://smartcar.com/docs/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "차량",
        "title":  "차량을 잠그거나 잠금 해제하고 주행 기록계 수치 및 위치와 같은 데이터를 가져옵니다. 대부분의 신차에 적용됩니다."
    },
    {
        "id":  "api_1786375143826_6009",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://vpic.nhtsa.dot.gov/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "차량",
        "title":  "NHTSA 제품 정보 카탈로그 및 차량 목록"
    },
    {
        "id":  "api_1786375143825_3069",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.mercedes-benz.com/apis",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "차량",
        "title":  "텔레매틱스 데이터, 원격으로 차량 기능, 차량 구성 도구, 서비스 딜러점을 찾습니다."
    },
    {
        "id":  "api_1786375143825_910",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://developer.kbb.com/#!/data/1-Default",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "차량",
        "title":  "차량 정보, 가격, 구성 및 기타 정보"
    },
    {
        "id":  "api_1786375143825_1836",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://deividfortuna.github.io/fipe/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "차량",
        "title":  "Fundação Instituto de Pesquisas Econômicas의 차량 정보 - Fipe"
    },
    {
        "id":  "api_1786375143824_1134",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.ziprecruiter.com/publishers",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "직업",
        "title":  "일자리 검색 앱 및 웹 사이트"
    },
    {
        "id":  "api_1786375143824_7813",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.usajobs.gov/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "직업",
        "title":  "미국 정부 일자리 게시판"
    },
    {
        "id":  "api_1786375143823_5325",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.upwork.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "직업",
        "title":  "프리랜서 일자리 게시판과 관리 시스템"
    },
    {
        "id":  "api_1786375143823_4129",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.themuse.com/developers/api/v2",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "직업",
        "title":  "일자리 게시판과 회사 정보"
    },
    {
        "id":  "api_1786375143823_6907",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://search.gov/developer/jobs.html",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "직업",
        "title":  "미국 정부의 일자리 목록"
    },
    {
        "id":  "api_1786375143822_7419",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.reed.co.uk/developers",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "직업",
        "title":  "일자리 게시판 모음"
    },
    {
        "id":  "api_1786375143822_2976",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/workforce-data-initiative/skills-api/wiki/API-Overview",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "직업",
        "title":  "일자리 제목, 기술 및 관련 작업 데이터"
    },
    {
        "id":  "api_1786375143821_4726",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.juju.com/publisher/spec/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "직업",
        "title":  "일자리 검색 엔진"
    },
    {
        "id":  "api_1786375143821_8400",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://us.jooble.org/api/about",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "직업",
        "title":  "일자리 검색 엔진"
    },
    {
        "id":  "api_1786375143820_9416",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://api.jobs2careers.com/api/spec.pdf",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "직업",
        "title":  "일자리 모음"
    },
    {
        "id":  "api_1786375143820_9573",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.indeed.com/publisher",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "직업",
        "title":  "일자리 게시판 모음"
    },
    {
        "id":  "api_1786375143819_5891",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.graphql.jobs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "직업",
        "title":  "GraphQL을 이용한 일자리"
    },
    {
        "id":  "api_1786375143819_3785",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://jobs.github.com/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "직업",
        "title":  "소프트웨어 개발자를 위한 일자리"
    },
    {
        "id":  "api_1786375143819_4028",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.careerjet.com/partners/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "직업",
        "title":  "일자리 검색 엔진"
    },
    {
        "id":  "api_1786375143827_835",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://bhagavadgita.io/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "책",
        "title":  "바가바드 기타의 글"
    },
    {
        "id":  "api_1786375143808_4417",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://ipinfodb.com/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "IP 주소로 국가, 지역, 도시 및 시간대 조회를 위한 무료 지역위치정보 도구와 API"
    },
    {
        "id":  "api_1786375143807_547",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://ipgeolocationapi.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "국가 세부 정보가 포함된 IP를 통해 방문자를 찾습니다."
    },
    {
        "id":  "api_1786375143807_6458",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.ip2location.com/web-service/ip2proxy",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "IP 주소를 사용하여 프록시 및 VPN을 검색합니다."
    },
    {
        "id":  "api_1786375143806_2468",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.ip2location.com/web-service/ip2location",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "55개 이상의 인자를 얻을 수 있는 IP 지리위치정보 웹 서비스"
    },
    {
        "id":  "api_1786375143806_8943",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.ipvigilante.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "무료 IP 지리위치정보 API"
    },
    {
        "id":  "api_1786375143805_1882",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://ipsidekick.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "IP 주소에 대한 추가 정보를 반환하는 지리위치정보 API입니다."
    },
    {
        "id":  "api_1786375143805_2465",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://ipapi.co/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "IP 주소 위치 정보를 찾습니다."
    },
    {
        "id":  "api_1786375143805_5024",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://ip-api.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "IP 주소가 있는 위치를 찾습니다."
    },
    {
        "id":  "api_1786375143804_1767",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://ipinfo.io/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "IP 주소를 사용하여 지리 위치를 찾습니다."
    },
    {
        "id":  "api_1786375143804_9096",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://ip2country.info",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "IP를 국가에 매핑합니다."
    },
    {
        "id":  "api_1786375143803_6109",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://indian-cities-api-nocbegfhqg.now.sh/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "모든 인도 도시를 깔끔한 JSON 형식으로 얻습니다."
    },
    {
        "id":  "api_1786375143803_7832",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.here.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "HERE의 지도 데이터를 기반으로 디지털 맵을 생성하고 사용자화합니다."
    },
    {
        "id":  "api_1786375143802_153",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.google.com/maps/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "구글 지도 데이터를 기반으로 디지털 맵을 만들고 사용자화합니다."
    },
    {
        "id":  "api_1786375143801_6641",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.google.com/earth-engine/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "행성 규모의 환경 데이터 분석을 위한 클라우드 기반 플랫폼"
    },
    {
        "id":  "api_1786375143801_2364",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.geoplugin.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "IP 지리위치정보 및 통화 변환"
    },
    {
        "id":  "api_1786375143800_8659",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.geonames.org/export/web-services.html",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "장소 이름 및 기타 지리적 데이터"
    },
    {
        "id":  "api_1786375143800_7211",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://geojs.io/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "ChatOps 통합을 통한 IP 지오로케이션"
    },
    {
        "id":  "api_1786375143800_6913",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.geodatasource.com/web-service",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "위도 및 경도 좌표를 사용하여 도시 이름을 지오코딩합니다."
    },
    {
        "id":  "api_1786375143799_1079",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://geocode.xyz/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "전 세계 전방/후방 지리적 코드화, 배치 지리적 코드화 및 지구적 특성을 제공합니다."
    },
    {
        "id":  "api_1786375143799_9874",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.geocod.io/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "대량으로 지오코딩/역방향 지오코딩을 처리합니다."
    },
    {
        "id":  "api_1786375143798_2604",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.gouv.fr/api/geoapi.html",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "지오코딩",
        "title":  "프랑스 지리 자료"
    },
    {
        "id":  "api_1786375143792_6021",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://regulationsgov.github.io/developers/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "연방 규칙 제정 과정에 대한 이해를 높이기 위한 연방 규제 자료"
    },
    {
        "id":  "api_1786375143792_1859",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://data.gov.tw/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "대만 정부 오픈 데이터"
    },
    {
        "id":  "api_1786375143791_1819",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://data.gov.ro/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "루마니아 정부 오픈 데이터"
    },
    {
        "id":  "api_1786375143791_7714",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.data.govt.nz/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "뉴질랜드 정부 오픈 데이터"
    },
    {
        "id":  "api_1786375143790_8559",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.dati.gov.it/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "이탈리아 정부 오픈 데이터"
    },
    {
        "id":  "api_1786375143789_8744",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://data.gov.in/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "인도 정부 오픈 데이터"
    },
    {
        "id":  "api_1786375143789_6607",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.data.gouv.fr/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "프랑스 정부 오픈 데이터"
    },
    {
        "id":  "api_1786375143789_1554",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://open.canada.ca/en",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "캐나다 정부 오픈 데이터"
    },
    {
        "id":  "api_1786375143789_3890",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://data.gov.be/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "벨기에 정부 오픈 데이터"
    },
    {
        "id":  "api_1786375143788_5211",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.data.gov.au/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "호주 정부 오픈 데이터"
    },
    {
        "id":  "api_1786375143788_8026",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://ratings.food.gov.uk/open-data/en-GB",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "영국 음식 위생 등급 데이터 API"
    },
    {
        "id":  "api_1786375143787_5075",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.federalregister.gov/reader-aids/developer-resources",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "미국 정부의 데일리 저널"
    },
    {
        "id":  "api_1786375143787_1605",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.open.fec.gov/developers/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "연방 선거의 선거 기부에 대한 정보"
    },
    {
        "id":  "api_1786375143787_6309",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.epa.gov/category/apis/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "미국 환경 보호국에서 제공하는 웹 서비스와 데이터 세트"
    },
    {
        "id":  "api_1786375143786_9287",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://opendata.dc.gov/pages/using-apis",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "범죄, GIS, 재무 데이터 등을 포함한 D.C. 정부 공공 데이터셋"
    },
    {
        "id":  "api_1786375143786_4622",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.data.parliament.uk/developers/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "탄원서, 청구서, MP 투표, 참석 등에 대한 정보를 포함한 실시간 데이터 세트"
    },
    {
        "id":  "api_1786375143786_4600",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.data.gov/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "미국 정부 데이터"
    },
    {
        "id":  "api_1786375143785_5563",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://datausa.io/about/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "미국 공공 데이터"
    },
    {
        "id":  "api_1786375143785_7069",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://data.colorado.gov/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "콜로라도 주립 정부 오픈 데이터"
    },
    {
        "id":  "api_1786375143785_8777",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://codataengine.org/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "콜로라도의 공개 데이터"
    },
    {
        "id":  "api_1786375143785_1865",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://code.gov",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "미국 연방 정부를 위한 오픈 소스 및 코드 공유를 위한 플랫폼"
    },
    {
        "id":  "api_1786375143784_7269",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://opendata.praha.eu/en",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "체코 프라하의 오픈 데이터"
    },
    {
        "id":  "api_1786375143784_1654",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://data.nantesmetropole.fr/pages/home/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "프랑스 낭트의 오픈 데이터"
    },
    {
        "id":  "api_1786375143784_4086",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://data.beta.grandlyon.com/fr/accueil",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "프랑스 리옹의 오픈 데이터"
    },
    {
        "id":  "api_1786375143784_6820",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.census.gov/data/developers/data-sets.html",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "미국 인구조사국에서 인구통계 및 비즈니스에 대한 다양한 API와 데이터 세트를 제공합니다."
    },
    {
        "id":  "api_1786375143783_6166",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://business.usa.gov/developer",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "미국 프로그램, 이벤트, 서비스 등에 대한 권한 있는 정보"
    },
    {
        "id":  "api_1786375143783_9264",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.bclaws.ca/civix/template/complete/api/index.html",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "정부",
        "title":  "브리티시 컬럼비아의 법칙에 접근합니다."
    },
    {
        "id":  "api_1786375143779_6132",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.foaas.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "인물",
        "title":  "**F**uck **O**ff **A**s **A** **S**ervice"
    },
    {
        "id":  "api_1786375143778_9233",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://favqs.com/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "인물",
        "title":  "좋아하는 인용구를 수집, 검색 및 공유할 수 있습니다."
    },
    {
        "id":  "api_1786375143778_3455",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.chucknorris.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "인물",
        "title":  "직접 큐레이션한 척 노리스 농담 JSON API"
    },
    {
        "id":  "api_1786375143778_2595",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://api.adviceslip.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "인물",
        "title":  "임의의 advice slips을 생성합니다."
    },
    {
        "id":  "api_1786375143778_6704",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.vagalume.com.br/docs/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "풍부한 가사와 음악 지식"
    },
    {
        "id":  "api_1786375143777_7546",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.theaudiodb.com/api_guide.php",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "음악"
    },
    {
        "id":  "api_1786375143777_235",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://tastedive.com/read/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "유사한 아티스트 API(영화 및 TV 프로그램에도 적용됩니다)"
    },
    {
        "id":  "api_1786375143777_1784",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://beta.developer.spotify.com/documentation/web-api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "스포티파이의 음악 카탈로그 지정, 사용자 라이브러리 관리, 권장 사항 등을 볼 수 있습니다."
    },
    {
        "id":  "api_1786375143777_1209",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.soundcloud.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "사용자가 소리를 업로드하고 공유합니다."
    },
    {
        "id":  "api_1786375143776_7170",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.songsterr.com/a/wa/api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "기타, 베이스 및 드럼 탭과 코드를 제공합니다."
    },
    {
        "id":  "api_1786375143776_2212",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.songkick.com/developer/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "음악 행사"
    },
    {
        "id":  "api_1786375143776_7795",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://openwhyd.github.io/openwhyd/API",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "스트리밍 트랙의 큐레이션된 재생 목록(YouTube, SoundCloud 등)을 다운로드합니다."
    },
    {
        "id":  "api_1786375143775_7687",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.musixmatch.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "음악"
    },
    {
        "id":  "api_1786375143775_8218",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://music-api.musikki.com/reference",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "음악"
    },
    {
        "id":  "api_1786375143775_2431",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://musicbrainz.org/doc/Development/XML_Web_Service/Version_2",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "음악"
    },
    {
        "id":  "api_1786375143774_9650",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.mixcloud.com/developers/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "음악"
    },
    {
        "id":  "api_1786375143774_5104",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://docs.lyricsovh.apiary.io/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "노래 가사를 검색하는 간단한 API"
    },
    {
        "id":  "api_1786375143773_2161",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.last.fm/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "음악"
    },
    {
        "id":  "api_1786375143773_842",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.kkbox.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "KKBOX 플랫폼에서 음악 라이브러리, 재생 목록, 차트 및 공연을 가져옵니다."
    },
    {
        "id":  "api_1786375143773_7389",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.jamendo.com/v3.0/docs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "음악"
    },
    {
        "id":  "api_1786375143773_6860",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://affiliate.itunes.apple.com/resources/documentation/itunes-store-web-service-search-api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "소프트웨어 제품"
    },
    {
        "id":  "api_1786375143772_1884",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://binaryjazz.us/genrenator-api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "음악 장르 생성기"
    },
    {
        "id":  "api_1786375143772_9542",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://docs.genius.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "풍부한 가사와 음악 지식"
    },
    {
        "id":  "api_1786375143772_8913",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.discogs.com/developers/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "음악"
    },
    {
        "id":  "api_1786375143772_4676",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.deezer.com/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "음악"
    },
    {
        "id":  "api_1786375143771_1636",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://app.swaggerhub.com/apis/Bandsintown/PublicAPI/3.0.0",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "음악 행사"
    },
    {
        "id":  "api_1786375143771_8115",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://aimastering.com/api_docs/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음악",
        "title":  "자동화된 음악 마스터링"
    },
    {
        "id":  "api_1786375143771_1461",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.zomato.com/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음식 \u0026 음료",
        "title":  "음식점을 찾아보세요."
    },
    {
        "id":  "api_1786375143771_8522",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://nypl.github.io/menus-api/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음식 \u0026 음료",
        "title":  "NYPL 역사적 메뉴 모음 NYPL"
    },
    {
        "id":  "api_1786375143770_3481",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.themealdb.com/api.php",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음식 \u0026 음료",
        "title":  "요리 레시피"
    },
    {
        "id":  "api_1786375143770_905",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.thecocktaildb.com/api.php",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음식 \u0026 음료",
        "title":  "칵테일 레시피"
    },
    {
        "id":  "api_1786375143768_8376",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.openbrewerydb.org",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음식 \u0026 음료",
        "title":  "맥주, 사이다, 크래프트 맥주병 가게"
    },
    {
        "id":  "api_1786375143767_9671",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://lcboapi.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음식 \u0026 음료",
        "title":  "알코올"
    },
    {
        "id":  "api_1786375143767_1638",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.edamam.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "음식 \u0026 음료",
        "title":  "레시피 검색"
    },
    {
        "id":  "api_1786375143767_4678",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://libraries.io/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 소스 프로젝트",
        "title":  "오픈 소스 소프트웨어 라이브러리"
    },
    {
        "id":  "api_1786375143766_5297",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://evilinsult.com/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 소스 프로젝트",
        "title":  "악마의 모욕"
    },
    {
        "id":  "api_1786375143766_4401",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.drupal.org/drupalorg/docs/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 소스 프로젝트",
        "title":  "Drupal.org"
    },
    {
        "id":  "api_1786375143765_7259",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://resources.count.ly/docs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 소스 프로젝트",
        "title":  "카우틀리 웹 분석"
    },
    {
        "id":  "api_1786375143765_2231",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.yelp.com/developers/documentation/v3",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "로컬 비즈니스를 찾습니다."
    },
    {
        "id":  "api_1786375143765_1172",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.mediawiki.org/wiki/API:Main_page",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "미디어위키 백과사전"
    },
    {
        "id":  "api_1786375143764_9066",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.wikidata.org/w/api.php?action=help",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "위키미디어 재단에서 공동으로 편집한 기술 자료"
    },
    {
        "id":  "api_1786375143764_45",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://upcdatabase.org/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "전 세계의 150만 개 이상의 바코드 번호"
    },
    {
        "id":  "api_1786375143763_6035",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://data.uio.no/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "오슬로 대학교(노르웨이)의 과정, 강의 동영상, 강좌 등에 대한 자세한 정보"
    },
    {
        "id":  "api_1786375143763_6290",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://github.com/Hipo/university-domains-list",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "대학 이름, 국가 및 도메인"
    },
    {
        "id":  "api_1786375143763_4309",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.teleport.org/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "삶의 질 데이터"
    },
    {
        "id":  "api_1786375143762_5530",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.scoop.it/dev",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "콘텐츠 큐레이션 서비스"
    },
    {
        "id":  "api_1786375143762_8943",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://ridb.recreation.gov/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "레크리에이션 지역, 연방 토지, 유적지, 박물관 및 기타 관광지/자원(미국)"
    },
    {
        "id":  "api_1786375143761_521",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.quandl.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "주식 시장 데이터"
    },
    {
        "id":  "api_1786375143761_2579",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://api.qmeta.net/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "글로벌 서치 엔진"
    },
    {
        "id":  "api_1786375143761_2490",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://api.opencorporates.com/documentation/API-Reference",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "여러 국가의 기업 및 이사들에 대한 데이터"
    },
    {
        "id":  "api_1786375143760_835",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://microlink.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "웹 사이트에서 구조화된 데이터를 추출합니다."
    },
    {
        "id":  "api_1786375143760_6410",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://strains.evanbusse.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "마리화나의 종, 맛과 효과"
    },
    {
        "id":  "api_1786375143759_9211",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.linkpreview.net",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "요청된 URL에 대한 제목, 설명 및 미리보기 이미지가 포함된 JSON 형식의 요약본을 가져옵니다."
    },
    {
        "id":  "api_1786375143759_2632",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://geo.api.gouv.fr/adresse",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "프랑스 정부를 통한 주소 검색"
    },
    {
        "id":  "api_1786375143759_7162",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://fonoapi.freshpixl.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "모바일 기기 설명"
    },
    {
        "id":  "api_1786375143759_3942",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://docs.enigma.com/public/public_v20_api_about",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "가장 광범위한 공용 데이터 목록"
    },
    {
        "id":  "api_1786375143758_8007",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.datakick.org/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "공개 제품 데이터베이스"
    },
    {
        "id":  "api_1786375143758_6398",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developers.civicfeed.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "뉴스 기사 및 공개 데이터셋"
    },
    {
        "id":  "api_1786375143758_4234",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://market.mashape.com/daxeel/celebinfo/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "유명인사 정보"
    },
    {
        "id":  "api_1786375143757_2368",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://carto.com/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "위치 정보 예측"
    },
    {
        "id":  "api_1786375143757_9938",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://callook.info",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "미국 미국 햄 라디오 콜사인"
    },
    {
        "id":  "api_1786375143757_1038",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://datos.arsat.com.ar/developers/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "ARSAT 공공 데이터"
    },
    {
        "id":  "api_1786375143756_8360",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://archive.readme.io/docs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "인터넷 아카이브"
    },
    {
        "id":  "api_1786375143756_5693",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://market.mashape.com/daxeel/abbreviations",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "약어와 의미"
    },
    {
        "id":  "api_1786375143756_7881",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://18f.github.io/API-All-the-X/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "오픈 데이터",
        "title":  "비공식 미국 연방정부 API"
    },
    {
        "id":  "api_1786375143755_2975",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.rijksmuseum.nl/en/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "예술 \u0026 디자인",
        "title":  "예술"
    },
    {
        "id":  "api_1786375143852_3666",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.cnb.cz/cs/financni_trhy/devizovy_trh/kurzy_devizoveho_trhu/denni_kurz.xml",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "환전소",
        "title":  "교환비율 모음"
    },
    {
        "id":  "api_1786375143852_8576",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://currencylayer.com/documentation",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "환전소",
        "title":  "교환비율과 통화변환"
    },
    {
        "id":  "api_1786375143851_9528",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://1forge.com/forex-data-api/api-documentation",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "환전소",
        "title":  "외환시장 데이터"
    },
    {
        "id":  "api_1786375143854_6025",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://ratesapi.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "환전소",
        "title":  "무료 교환비율과 역사적비율"
    },
    {
        "id":  "api_1786375143853_6551",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.frankfurter.app/docs",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "환전소",
        "title":  "교환비율, 통화변환과 시계열"
    },
    {
        "id":  "api_1786375143853_4459",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://fixer.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "환전소",
        "title":  "교환비율과 통화변환"
    },
    {
        "id":  "api_1786375143853_3963",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://exchangeratesapi.io",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "환전소",
        "title":  "통화변환과 교환비율"
    },
    {
        "id":  "api_1786375143852_9996",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.exchangerate-api.com",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "환전소",
        "title":  "무료 통화변환"
    },
    {
        "id":  "api_1786375143851_4527",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://carbon-intensity.github.io/api-definitions/#carbon-intensity-api-v1-0-0",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "환경",
        "title":  "National Grid에서 개발한 영국 공식 탄소 집약도 API"
    },
    {
        "id":  "api_1786375143851_9342",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://developer.nrel.gov/docs/solar/pvwatts/v6/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "환경",
        "title":  "에너지 생산 광전(PV) 에너지 시스템"
    },
    {
        "id":  "api_1786375143850_6036",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "http://www.pm25.in/api_doc",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "환경",
        "title":  "중국의 공기 질"
    },
    {
        "id":  "api_1786375143850_324",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://docs.openaq.org/",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "환경",
        "title":  "공개 공기 질 데이터"
    },
    {
        "id":  "api_1786375143850_5348",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://www.corrently.de/hintergrund/gruenstromindex/index.html",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "환경",
        "title":  "독일의 녹색 전력 지수(Grünstromindex/GSI)."
    },
    {
        "id":  "api_1786375143849_3355",
        "docsUrl":  "",
        "tags":  [

                 ],
        "serviceUrl":  "https://airvisual.com/api",
        "createdAt":  "2026-08-20T15:28:58.970127+00:00",
        "category":  "환경",
        "title":  "공기 질과 날씨 데이터"
    }
];