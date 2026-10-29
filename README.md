# 콘텐츠 스튜디오

아이디어 노트 하나에서 LinkedIn·Threads·인스타그램(카드뉴스·릴스)·뉴스레터·쇼츠 콘텐츠를 만들고, 볼트 안에서 콘텐츠 DB처럼 관리하는 Obsidian 데스크톱 플러그인입니다.
글쓰기 작업실은 [글결](https://github.com/logos1012/obsidian-writing-workbench) 0.1.6을 흡수했습니다. 현재 버전은 **0.1.0 개발 빌드**입니다.

## 구조

```
콘텐츠/
├── 콘텐츠 보드.base               ← Bases 테이블 뷰 (전체·작성 중·발행 대기·발행 완료)
└── AI 글쓰기/
    ├── AI 글쓰기.md               ← 아이디어 노트 (type: content-idea)
    ├── AI 글쓰기 - LinkedIn.md     ← 채널 콘텐츠 (type: content-post)
    └── AI 글쓰기 - 인스타 카드뉴스.md
```

채널 콘텐츠의 frontmatter가 콘텐츠 DB의 한 행입니다.

```yaml
type: "content-post"
idea: "[[콘텐츠/AI 글쓰기/AI 글쓰기|AI 글쓰기]]"
channel: "linkedin"   # threads | instagram-card | instagram-reels | newsletter | shorts
status: "drafting"    # drafting | review | ready | scheduled | published | failed
created: "2026-10-29"
scheduled:
published_at:
post_url:
media: []             # S3 URL만 저장. 이미지·영상 파일은 볼트에 넣지 않음
```

## 사용 흐름

1. 명령 팔레트 → **새 아이디어 노트**: 소스 노트 링크와 핵심 아이디어를 적습니다.
2. **아이디어에서 채널 콘텐츠 만들기**: 채널을 고르면 채널 노트가 생기고 작업실이 열립니다. 아이디어 노트 본문은 참고 자료로 자동 추가됩니다.
3. 작업실에서 글감 찾기 → 직접 초안 → AI 검토와 문장별 수락·거절을 반복합니다. 채널마다 다른 기준(길이, 카드 구성, 대본 형식)으로 검토합니다.
4. **원고 저장**은 본문만 바꿉니다. 그 사이 Obsidian에서 바꾼 frontmatter(상태·일정 등)는 그대로 유지됩니다.
5. **콘텐츠 보드 열기**로 상태별 목록을 확인합니다. 보드는 Obsidian 코어 플러그인 **Bases**가 켜져 있어야 합니다.

AI는 맥에 설치·로그인한 Claude Code / Codex CLI를 사용합니다. 설정, 데이터 보관 위치, 보안 경계는 글결과 같습니다([기술 구조](docs/architecture.md)).

## 개발

Node.js 22 이상:

```sh
npm ci
npm run check     # 테스트 + 타입 검사 + 빌드
npm run dev       # 감시 빌드
```

## 배포 (BRAT)

1. `manifest.json`, `package.json`, `versions.json`의 버전을 올립니다.
2. 같은 이름의 태그를 푸시합니다: `git tag 0.1.0 && git push origin 0.1.0`
3. GitHub Actions가 `main.js`, `manifest.json`, `styles.css`를 릴리스에 첨부합니다.
4. Obsidian BRAT → **Add beta plugin** → 이 저장소 주소를 입력합니다. 비공개 저장소라면 BRAT에 Contents 읽기 권한 토큰이 필요합니다.

## 다음 단계

- 발행: LinkedIn·Threads는 Make 웹훅(텍스트), Instagram은 API Gateway → Lambda(텍스트 + 이미지 URL)
- 미디어: S3 Media Uploader 업로드 흐름을 이식해 `media`에 URL 기록
- 발행 큐 뷰: 상태 보드와 발행 버튼, 결과(post_url, published_at) 기록
