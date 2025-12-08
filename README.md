# 인스타 언팔 분석 웹

이 프로젝트는 인스타그램 JSON 데이터를 업로드하면 내가 팔로우하지만 나를 팔로우하지 않는 계정을 분석해서 보여주는 간단한 React 웹입니다.

## 사용 방법

1. 프로젝트 루트에 `index.html`에서 `<div id="root"></div>`가 있어야 합니다. 번들 환경이 이미 있다면 `main.jsx`를 앱 엔트리로 사용하세요.
2. 페이지에서 JSON 파일을 업로드하면 자동으로 팔로워/팔로잉을 인식합니다.
	- 지원 키: `followers`, `following`, `relationships_followers`, `relationships_following`, `followers_list`, `following_list`
	- 항목은 `username` 또는 `string_list_data[0].value`에서 사용자명을 추출합니다.
3. 결과 영역에서
	- 나만 팔로우 중(맞팔 아님) 계정 목록과 총 개수를 확인
	- 맞팔로우 계정 목록과 총 개수를 확인
	- 각 목록을 `.txt`로 다운로드 가능

## 개발/실행

Vite 등 모던 번들러를 쓰는 경우 예시:

```powershell
npm init vite@latest insta-unfollow-web -- --template react; cd insta-unfollow-web
npm install
```

그 후 `src/main.jsx` 내용을 이 리포지토리의 `main.jsx`를 참고하여 붙여넣고, `index.html`에 `<div id="root"></div>`가 있는지 확인하세요.

개발 서버 실행:

```powershell
npm run dev
```

프로덕션 빌드:

```powershell
npm run build
```

## 데이터 준비 팁

인스타그램에서 데이터 내보내기를 JSON으로 받으면, 해당 파일을 그대로 업로드하세요. 여러 파일로 나뉘어져 있다면 팔로워/팔로잉이 함께 들어있는 JSON을 선택해 주세요.
