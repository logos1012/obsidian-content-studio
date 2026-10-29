# 콘텐츠 스튜디오 — 디자인 레퍼런스 조사 (PRD FR-9.1·9.6, FR-10, D-2·D-4·D-7)

- 작성: 2026-10-30 / 대상: 시안 에이전트, Jake 검토용
- 규칙: 저작권 있는 이미지는 저장소에 복사하지 않았다. 링크와 설명만 적었다.
- **검증 수준 표기**: ✅ = 이 조사에서 직접 열람·확인, 🔎 = 검색 결과에서 확인(내용 일부만 봄), ⚠ = 확인하지 못함(Jake가 직접 열어 볼 것).
- 솔직한 한계: 웹 검색 도구가 Pinterest 개별 핀을 반환하지 않았다. 아래 Pinterest 링크는 **검색 결과 페이지 주소**이며 개별 핀은 검증하지 않았다(⚠). 대신 같은 무드를 설명하는 기사·상품·웹앱 페이지를 근거로 삼았다. 이미지 무드보드가 필요하면 Jake가 Pinterest에서 아래 검색어로 5~10장을 골라 주면 D-2(e)·D-4 비교 자료와 함께 쓸 수 있다.

---

## (a) 한 장 요약

### 추천 무드 — 「늦은 밤, 스탠드 아래 원고 책상」

배경 전체를 한 장의 따뜻한 종이 위 책상으로 보되, **장식은 판(코르크)과 포스트잇·붉은 실 세 가지에만 쓴다.** 목록·대화·후킹·얼개 화면은 Mylog의 핀보드처럼 크림색 종이 위의 가는 선(1px)과 넉넉한 여백으로 조용하게 두고, 질감(종이 결, 코르크 입자)은 바탕에만 5% 안팎으로 깐다. 손글씨는 포스트잇과 「현재 질문」 한 줄에만 쓰고, 나머지 글은 Pretendard로 읽기 좋게 둔다. 포인트 색은 하나(붉은 실의 벽돌 빨강)만 쓴다. Mylog의 주황(#e2703a)을 그대로 쓰지 않고 실·핀 색으로 쓸 **빨강 계열**로 분리해 같은 회사 제품처럼 보이지 않게 한다. 오브제는 한 화면 4종 이하(D-2c): 종이, 코르크, 포스트잇, 붉은 실/핀 + (선택) 만년필 일러스트 1개.

### 라이트 — 낮의 종이 책상

| 역할 | 후보 hex | 메모 |
|---|---|---|
| 앱 바탕(책상 종이) | `#F6F1E9` | Mylog 핀보드 `--pb-bg` 와 같은 계열. 한 단계 다르게 가려면 `#F3EDE2` |
| 카드/입력 면 | `#FFFDF9` | 입력·읽기 영역은 항상 이 면 위(장식 겹침 금지, D-2b) |
| 가라앉은 면 | `#EFE8DC` | 보관함, 비활성 |
| 선 / 강한 선 | `rgba(43,38,33,.08)` / `.14` | 기본 선 1px, 강조 1.5px |
| 글자 | `#2B2621` / 보조 `#6F665C` / 흐림 `#A39A8E` | 보조 `#6F665C` on `#FFFDF9` ≈ 5.3:1 (4.5:1 통과 예상, 시안에서 실측) |
| 코르크판 | 바탕 `#C9A878`, 입자 `#B8955F`·`#D9BE94` | 판 가장자리에 `#8A6A43` 1.5px 프레임 정도. 질감은 SVG noise 4~6% |
| 포스트잇 4색 | 노랑 `#FFE79A`, 분홍 `#FFC9C0`, 하늘 `#CFE3F2`, 연두 `#D9E8B8` | 글자 `#2B2621`로 대비 10:1 이상. 상태: 고정=핀 표시, 버림=보관함 |
| 붉은 실/핀 | `#B83A32` (실), 핀 `#8F2A24` | 실 두께 1.5~2px, 처짐 곡선 |
| 포커스 링 | `#B83A32` 2px + 2px 간격 | 두 테마 공통 |
| 경고/오류 | `#A35A00` on `#FFF3DF` | Mylog `--ml-warn` 계열 |

질감 방향: 종이 결(미세 noise, 세로 섬유), 코르크 입자, 포스트잇 아래쪽 약한 말림 그림자(`0 1px 2px rgba(60,42,25,.12), 0 8px 18px -10px rgba(60,42,25,.28)`). 그림자는 포스트잇·모달에만, 일반 카드는 선만.

### 다크 — 스탠드 불빛 아래의 밤 책상

| 역할 | 후보 hex | 메모 |
|---|---|---|
| 앱 바탕 | `#141312` | Mylog 다크 `--pb-bg` 와 같은 계열(거의 무채 + 아주 약한 온기) |
| 카드/입력 면 | `#1D1C1A` | 가라앉은 면 `#262422` |
| 선 | `rgba(255,255,255,.07)` / `.10` | 1px |
| 글자 | `#EDEAE5` / 보조 `#9A958E` / 흐림 `#6B6761` | 보조 on 카드 ≈ 5.6:1 (실측 필요) |
| 코르크판 | 바탕 `#4A3B2A`, 입자 `#3C2F21`·`#5A4733`, 프레임 `#2A2118` | 라이트의 코르크를 어둡게 눌러 같은 재료로 보이게 |
| 포스트잇 4색(밤 종이) | 노랑 `#E9CF7A`, 분홍 `#E3A9A0`, 하늘 `#A9C3D6`, 연두 `#BBCD97` | 포스트잇은 다크에서도 **밝은 종이**로 둔다(스탠드에 비친 종이). 글자 `#2B2621`, 대비 8:1 이상. 밝기만 8~10% 낮춤 |
| 붉은 실/핀 | `#E0675C`, 핀 `#C04A40` | 실이 어두운 코르크 위에서도 읽힘 |
| 스탠드 빛 | 판 한쪽 모서리에 `radial-gradient(rgba(240,170,100,.10), transparent 60%)` | 분위기용 1개만. 텍스트 영역 위엔 올리지 않음 |
| 포커스 링 | `#E0675C` 2px | |

공통: 간격 4px 기준(4·8·12·16·24·32), 선 굵기 1px / 1.5px 두 가지, 반경 4·8·14px 세 가지. (D-2d에 그대로 명시할 후보)

---

## (b) 주제별 레퍼런스

### 1. 작가의 작업 공간·오브제

| 링크 | 설명 | 가져올 점 / 버릴 점 |
|---|---|---|
| 🔎 [Ferris Wheel Press — How Desk Aesthetics Influence Writing Motivation](https://ferriswheelpress.com/blogs/ferris-wheel-press-blog/how-desk-aesthetics-influence-writing-motivation) | 노트·만년필·잉크병·종이 질감이 글쓰기 동기에 주는 영향 | 가져올 점: "도구가 눈에 보이되 손 닿는 곳" 원칙 → 입력창 옆에 도구(건너뛰기 등)를 둠. 버릴 점: 오브제 나열식 장식 |
| 🔎 [The Journal Shop — writing desk setup](https://www.thejournalshop.com/blogs/guides/writing-desk-setup) | 램프는 위가 아니라 비스듬히 비추라, 따뜻한 빛, 나무·가죽 | 가져올 점: 다크 테마의 한쪽 모서리 스탠드 빛 한 점. 버릴 점: 가죽·나무 질감을 UI 면에 깔기 |
| 🔎 [Montblanc — The Desk](https://www.montblanc.com/en-ae/discover/features/the-desk) | 필기구 브랜드가 보여 주는 책상 연출 | 가져올 점: 넓은 여백 속 소수의 오브제. 버릴 점: 고급 브랜드 금장·가죽 연출 |
| 🔎 [마리끌레르 코리아 — 책상 소품 큐레이션](https://www.marieclairekorea.com/?p=166637) | 황동 연필깎이, 가죽 연필 캡, 문진, 마스킹 테이프 | 가져올 점: 마스킹 테이프로 포스트잇을 붙이는 대체 연출(핀과 선택지). 버릴 점: 소품 다수 나열 |
| 🔎 [브런치 — 디지털 대신 연필·종이, 책상 위 아날로그 바람](https://brunch.co.kr/@nabiyah/283) | 만년필·종이 다이어리가 다시 팔린다는 국내 기사 | 가져올 점: "손으로 쓰는 느낌"이 제품 약속이라는 근거. 이미지 아님 |
| ⚠ Pinterest 검색(개별 핀 미검증) — [writer desk aesthetic](https://www.pinterest.com/search/pins/?q=writer%20desk%20aesthetic) · [fountain pen notebook flatlay](https://www.pinterest.com/search/pins/?q=fountain%20pen%20notebook%20flatlay) · [원고지 만년필](https://www.pinterest.com/search/pins/?q=%EC%9B%90%EA%B3%A0%EC%A7%80%20%EB%A7%8C%EB%85%84%ED%95%84) · [typewriter desk dark academia](https://www.pinterest.com/search/pins/?q=typewriter%20desk%20dark%20academia) | 이미지 무드 확인용 검색 | 볼 것: 크림·갈색 팔레트, 위에서 내려다본 플랫레이, 오브제 2~3개. 피할 것: 빈티지 소품 과밀, 세피아 필터 |

### 2. 코르크판·포스트잇·붉은 실

| 링크 | 설명 | 가져올 점 / 버릴 점 |
|---|---|---|
| ✅ [Detective Board (웹앱)](https://www.detectiveboard.it.com/) | 무한 코르크 작업면, 줌·팬, 카드 두 장을 붉은 실로 연결, 실은 중력으로 처짐 | 가져올 점: 처지는 곡선 실, 줌·팬 → FR-3.12(50장·480px)의 해법 후보. 버릴 점: 「CONFIDENTIAL」류 수사극 연출, 사진 중심 카드 |
| 🔎 [Adobe Stock — 코르크판 + 메모 + 붉은 실 사진](https://stock.adobe.com/images/corkboard-with-pinned-notes-map-photo-and-string-connections/1662795703) | 실제 보드 사진(참고만, 저장 금지) | 가져올 점: 핀 머리에서 실이 시작되는 위치, 메모가 약간 기울어진 각도(±2°). 버릴 점: 사진·지도 혼합 |
| 🔎 [Adobe Stock — 수사 보드 클로즈업](https://stock.adobe.com/images/close-up-shot-of-investigation-board-detective-board-with-map-of-crime-scene-pinned-note-with-man-face-and-red-thread-connecting-clue-proofs/700235711) | 붉은 실이 한 점에 모이는 구도 | 가져올 점: 실이 핀에서 핀으로 이어지는 시각 문법. 버릴 점: 얼굴 사진 |
| 🔎 [WNYC Decoder Ring — The Red String Board Conspiracy](https://wnyc.org/story/decoder-ring--the-red-string-board-conspiracy/) | 붉은 실 보드의 문화적 기원 해설 | 가져올 점: 실 = "연관성 발견"이라는 의미 부여 → 안내 문구 톤. 버릴 점: 음모론 이미지 |
| 🔎 [DIY 미니어처 수사 보드](https://portraits-by-nc.com/blogs/miniatures-by-nc/diy-miniature-crime-board-a-detective-inspired-craft-project) | 손글씨 메모·화살표·붉은 실 재료 | 가져올 점: 화살표·밑줄 같은 손그림 요소는 포스트잇 안에만. |
| ⚠ Pinterest 검색 — [cork board sticky notes aesthetic](https://www.pinterest.com/search/pins/?q=cork%20board%20sticky%20notes%20aesthetic) · [red string board](https://www.pinterest.com/search/pins/?q=red%20string%20board) · [handwritten sticky note](https://www.pinterest.com/search/pins/?q=handwritten%20sticky%20note%20korean) | 이미지 무드 | 볼 것: 포스트잇 기울기·그림자·테이프. 피할 것: 형광 파스텔 과다, 반짝이는 핀 |

### 3. 아날로그 질감인데 복잡하지 않은 사례

| 링크 | 설명 | 가져올 점 / 버릴 점 |
|---|---|---|
| ✅ **Mylog 핀보드** (로컬 `…/MyLogs/MyLogs/.obsidian/plugins/mylogs/styles.css` 940행~) | 크림 종이 `#F6F1E9`, 카드 `#FFFDF9`, 잉크 `#2B2621`, 선 8%/14% 알파, 14·8px 반경, 2단 부드러운 그림자, Pretendard | **마감 수준만** 가져온다(여백·타이포·선). 그대로 베끼지 않음: 주황 태양 모티프·해 일러스트 제외 |
| ✅ **Mylog 공통 토큰** (같은 파일 38~81행) | `--ml-radius:6px`, 본문 13.5px, 선 `color-mix(text 8%/16%)`, 그림자 `none`, 포커스 `0 0 0 3px accent-soft`, 다크는 포인트 색만 밝게 | 가져올 점: "그림자 없이 선으로 구획, 포커스만 후광". 이 규율이 장식 절제의 핵심 |
| 🔎 [Macworld — Notebook 4 리뷰](https://www.macworld.com/article/223957/notebook-4-review-notetaking-mac-app-gets-an-updated-streamlined-interface.html) | 스프링 장식을 버리고 부드러운 모서리 + 종이·포스트잇만 남김 | 가져올 점: "질감은 남기고 장식(스프링·가죽 박음질)은 버린다". 버릴 점: 구형 mac 스타일 |
| 🔎 [Lenovo — skeuomorphism 개요](https://www.lenovo.com/us/en/glossary/what-is-skeuomorphism/) | 실물 모사와 플랫 혼합이 균형이라는 일반 원칙 | 가져올 점: 혼합 원칙 근거 문장. |
| 🔎 [Dribbble — Realistic UI 컬렉션](https://dribbble.com/jordanrounds/collections/38141-Realistic-UI) · [Skeuomorphic design 컬렉션](https://dribbble.com/arminb/collections/1712084-Skeuomorphic-design) | 종이 질감 플래너·노트 UI 모음(개별 샷 미열람) | 볼 것: 종이 질감이 바탕에만 있고 텍스트 영역은 평평한 사례. 피할 것: 2012식 가죽·스티치·광택 |

---

## (c) 글꼴 후보 표와 라이선스 확인 기록 (PRD 기준 52)

**1차 근거**: `google/fonts` 저장소의 각 글꼴 `OFL.txt`와 `METADATA.pb`(`license: "OFL"`)를 GitHub API로 직접 열람(2026-10-30). 파일 용량은 같은 저장소 `ofl/<폴더>/` 항목 크기. OFL 1.1은 **사용·복제·번들·재배포·상업 사용 허용, 글꼴 단독 판매 금지, 라이선스 문구 동봉** 조건이다(OFL 원문은 각 `OFL.txt`에 있음).

| # | 글꼴 | 배포처(원본 확인 URL) | 라이선스 / 근거 | 상업·재배포·번들 | 용량(원본 TTF) | 한글 자형 인상 |
|---|---|---|---|---|---|---|
| 1 | **Gaegu(개구)** — JIKJI SOFT | https://fonts.google.com/specimen/Gaegu · 파일 https://github.com/google/fonts/tree/main/ofl/gaegu | OFL 1.1 — "Copyright 2018 The Gaegu Project Authors … licensed under the SIL OFL 1.1" ([OFL.txt](https://github.com/google/fonts/blob/main/ofl/gaegu/OFL.txt)), `license: "OFL"` | 가능. **Reserved Font Name 없음**(저작권 행에 RFN 문구 없음) → 서브셋 가능 | Regular 3.17MB, Light 3.21MB, Bold 2.96MB | 밝고 둥근 펜글씨, 획 굵기 균일, 아이 같은 친근함. 두께 3종이라 포스트잇 제목/본문 구분 가능 |
| 2 | **Hi Melody(하이멜로디)** — YoonDesign | https://fonts.google.com/specimen/Hi+Melody · 파일 https://github.com/google/fonts/tree/main/ofl/himelody | OFL 1.1 — "Copyright (c) YoonDesign Inc. All Rights Reserved. This Font Software is licensed under the SIL OFL 1.1" ([OFL.txt](https://github.com/google/fonts/blob/main/ofl/himelody/OFL.txt)) | 가능. RFN 없음. ⚠ "All Rights Reserved" 문구가 OFL 고지와 같이 있어 일부 사이트가 헷갈려 하나, 파일 헤더가 OFL 1.1 적용을 명시 | 12.6MB (서브셋 필수) | 가늘고 리듬감 있는 필기, 길게 눌린 자형. 가장 "메모" 같지만 용량 큼 |
| 3 | **Nanum Pen Script(나눔손글씨 펜)** — NHN/네이버, Sandoll | https://fonts.google.com/specimen/Nanum+Pen+Script · 파일 https://github.com/google/fonts/tree/main/ofl/nanumpenscript | OFL 1.1 — "Copyright (c) 2010, NHN Corporation … with Reserved Font Name … NanumPen, Naver NanumPen" ([OFL.txt](https://github.com/google/fonts/blob/main/ofl/nanumpenscript/OFL.txt)) | 가능. **⚠ RFN 있음** → 원본 **그대로(무수정)** 번들해야 한다. 서브셋·수정하면 이름을 바꿔야 함(OFL 조건). 파일 이름 변경 부담 때문에 번들 시 비추천 | 3.20MB | 얇고 빠른 펜 흘림, 세로로 긴 자형, 가장 "작가 메모" 인상. 작은 크기에서 가독성 낮음(16px에서 확인 필요) |
| 4 | **Poor Story(푸어스토리)** — Yoon Design | https://fonts.google.com/specimen/Poor+Story · 파일 https://github.com/google/fonts/tree/main/ofl/poorstory | OFL 1.1 (헤더 동일 형식, [OFL.txt](https://github.com/google/fonts/blob/main/ofl/poorstory/OFL.txt)) | 가능. RFN 없음 | 3.97MB | 둥글고 단정한 손글씨, 읽기 쉬움, 가장 안전한 가독성. 포스트잇 본문 후보 |
| 5 | **Gamja Flower(감자꽃)** — YoonDesign | https://fonts.google.com/specimen/Gamja+Flower · 파일 https://github.com/google/fonts/tree/main/ofl/gamjaflower | OFL 1.1 ([OFL.txt](https://github.com/google/fonts/blob/main/ofl/gamjaflower/OFL.txt)) | 가능. RFN 없음 | 12.6MB (서브셋 필요) | 가늘고 귀여운 필기. Hi Melody와 인상 비슷하나 더 동글 |

나눔손글씨에 대한 네이버 공식 안내 페이지(hangeul.naver.com)는 이 환경에서 열리지 않아(⚠ WebFetch 차단) **공식 사이트 원문은 확인하지 못했다.** 대신 Google Fonts 저장소의 OFL.txt를 1차 근거로 삼았다. 네이버 원문 재게시본(산돌구름·웹툰 자료 페이지)도 상업·번들·재배포 허용으로 일치했으나 2차 자료이므로 근거로 쓰지 않았다.

**제외한 후보**: 나눔손글씨 붓(Nanum Brush Script, OFL이나 RFN 동일·붓 자형이라 본문에 부적합), 클로바 나눔손글씨 **개별 서체**(네이버 자체 라이선스 문서 경로이며 이 조사에서 원문을 못 열었음 → 불분명하므로 제외, PRD 요구).

**권고(번들 우선순위)**: ① **Gaegu**(OFL·RFN 없음·3종 굵기·3MB, 서브셋 가능) → ② **Poor Story**(가독성) → ③ Nanum Pen Script(인상은 가장 작가 같으나 RFN 때문에 무수정 번들만 가능) . Hi Melody·Gamja Flower는 12MB 이상이라 서브셋 도구가 있어야 한다. 번들 시 `OFL.txt` 전문을 플러그인 배포물에 동봉하고(OFL 조건), 글꼴 파일 단독 판매는 하지 않는다. 시안 에이전트는 최종 글꼴 선택 전 16px 이상에서 실제 한글 문구 렌더링(예: 「퇴근길의 작은 친절이 하루를 바꾼다」)으로 비교해 기록한다.

---

## (d) 비모방 목록 (D-4 비교 확인용)

비교 대상: ① Writing Workbench(글결 0.1.6, Vault 설치본 `.obsidian/plugins/writing-workbench/` — `styles.css`와 `manifest.json` 열람), ② 기존 저장소 `logos1012/obsidian-content-studio` (README·`docs`·파일 구조 열람. 이 저장소는 글결을 "흡수"했다고 README에 적혀 있음). **실제 화면 캡처는 보지 못했다(⚠)** — D-4(a)의 캡처 5장+5장은 Jake가 제공해야 하며, 아래는 CSS·구조에서 읽은 레이아웃이다.

| 구분 | 글결/기존 저장소에서 읽은 구조 | 시안이 피할 것 |
|---|---|---|
| 레이아웃 | `ww-columns`: **3열 그리드**(메모 24fr · 초안 40fr · AI 36fr) + 열 사이 10px 드래그 분할선, 800px 미만이면 세로 쌓기 | 3열 고정 패널·드래그 분할선. 시안은 "한 번에 한 작업면"(목록 → 대화 → 판 → 얼개) 단일 캔버스 + 단계 이동 |
| 대화 | `ww-conversation` + `ww-composer` + `ww-message`(질문/답 누적), AI 열이 항상 오른쪽 상주 | 오른쪽 AI 채팅 사이드바, 말풍선/메시지 목록 누적 (D-1a). 현재 질문 1개 + 조각 카드가 중심 |
| 컴포넌트 | `ww-finding`, `ww-revision`, `ww-accept`, `ww-diff-label`, `ww-draft-highlight` — **문장별 수락/거절 + 하이라이트 diff** | 수락/거절 버튼 행, 인라인 diff·하이라이트 검토 UI(이 제품은 2단계 범위 밖) |
| 보조 영역 | `ww-linkedin-*` LinkedIn 피드 목업(`ww-linkedin-screen/post/nav`) | 채널 미리보기 목업 |
| 상단/하단 | `ww-toolbar`, `ww-statusbar`, `ww-activity`(경과 시간 줄) | 툴바+상태바 2단 프레임. 상태는 화면 안 맥락 문구로 |
| 흐름 | 메모(`ww-memo-*`)·`ww-materials`·`ww-outline`·`ww-interview-guide`를 **한 화면 안 패널 토글**로 이동 | 패널 토글 중심 네비게이션. 시안은 단계별 화면 전환(FR-9.2의 "다음 행동" 버튼) |
| 시각 | Obsidian 기본 변수(`--background-primary`, `--interactive-accent` 파랑 `#536b9f`) 위주의 **플랫 UI**, 장식 거의 없음 | 기본 Obsidian 회색 패널 느낌, 파란 포인트. 시안은 종이·코르크·붉은 실로 정체성 분리 |
| 기존 저장소 | 글결 CSS·구성을 그대로 흡수(README: "글결 0.1.6을 흡수"), 콘텐츠 보드는 Bases 테이블 뷰, 채널 노트 생성 흐름 | 채널별 콘텐츠 DB/상태 테이블(drafting→published) 느낌의 목록, "아이디어에서 채널 콘텐츠 만들기" 흐름. 시안의 목록은 **아이디어 카드**(메시지 문장 중심)로 |

**D-4 기록 템플릿(시안별로 채움)**: 레이아웃(패널 배치) 다르다/비슷하다 · 주요 컴포넌트 다르다/비슷하다 · 상호작용 흐름 다르다/비슷하다 · "비슷하다"면 이유와 바꾼 내용.

**특히 위험한 유사점(검토 우선)**: 3열, 우측 AI 패널, 말풍선 대화, 수락/거절 diff, 화면 상단 모드 탭, Obsidian 기본 색.

---

## (e) 시안 에이전트에게 주는 지침 (10줄 이내)

1. 한 화면 장식 오브제는 4종 이하: 종이·코르크·포스트잇·붉은 실/핀(+선택 필기구 1). 입력·읽기 영역 위에는 장식을 올리지 않는다.
2. 마감은 Mylog 규율: 그림자 없이 1px 선(알파 8%/14%), 넉넉한 여백, 간격 4px 단위, 반경 4·8·14px, 포커스만 후광.
3. 팔레트는 (a)의 라이트/다크 후보를 쓰고 포인트 색은 붉은 실 하나. Mylog의 주황 태양 모티프는 쓰지 않는다.
4. 포스트잇 글씨는 번들 필기체(Gaegu 우선), 16px 이상, 글자색 `#2B2621`, 바탕과 4.5:1 이상. 본문 UI는 Pretendard 14px 이상. 다크에서도 포스트잇은 밝은 종이로 둔다.
5. 화면은 단일 작업면 + 단계 이동. 3열·우측 AI 패널·말풍선·수락/거절 diff는 쓰지 않는다((d) 참조).
6. 역추적 화면: 현재 질문 한 줄(필기체)을 가장 크게, 조각은 같은 화면에 카드로, 입력 옆에 「건너뛰기」「이야기 정리하고 다음으로」.
7. 코르크판은 카드 8장 이상과 처진 붉은 실을 그리고, 50장·480px 접근은 줌·팬 + 목록/미니맵 중 하나로 보여 준다.
8. 모든 상태(D-5)마다 다음 행동 문구와 버튼을 시안에 넣는다. 모든 UI 문구는 한국어.
9. 라이트·다크 쌍으로 만들고 같은 분위기(종이/코르크/포스트잇이 밝은 종이로 유지)를 보인다. 선택·포커스·비활성이 두 테마에서 구분되게 한다.
10. 시안마다 D-4 기록(레이아웃·컴포넌트·흐름 다르다/비슷하다)과 사용한 간격·선·글꼴 값을 시안 설명에 적는다.

---

### 부록: 반영 기록용 출처 목록 (이 문서 작성에 직접 연 자료)

- PRD: `docs/PRD.md` §1, FR-9, FR-10, §10.4
- Mylog 스타일(읽기 전용): `…/MyLogs/MyLogs/.obsidian/plugins/mylogs/styles.css` 38~81, 940~1012행
- Writing Workbench 스타일(읽기 전용): `…/.obsidian/plugins/writing-workbench/styles.css`, `manifest.json`
- 기존 저장소: https://github.com/logos1012/obsidian-content-studio (README, 파일 트리)
- 글꼴: https://github.com/google/fonts/tree/main/ofl (gaegu, himelody, nanumpenscript, poorstory, gamjaflower — `OFL.txt`, `METADATA.pb`)
