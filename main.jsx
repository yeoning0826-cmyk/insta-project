import React, { useEffect, useMemo, useState } from "react";
import AdFit from "./AdFit";
import { createRoot } from "react-dom/client";

// ✅ 인스타그램 JSON에서 사용자명 추출 (다양한 형식 지원)
function extractUsernames(json) {
	if (!json) return [];
	
	// 사용자명 정규화 함수
	const normalize = (u) => {
		if (!u || typeof u !== "string") return null;
		let s = u.trim();
		if (s.startsWith("@")) s = s.slice(1);
		return s.toLowerCase();
	};

	const extractFromArray = (arr) => {
		return arr
			.map((item) => {
				// 형식 3: 인스타그램 내보내기 형식 { string_list_data: [{ value: "username" }] }
				if (item?.string_list_data?.[0]?.value) {
					return normalize(item.string_list_data[0].value);
				}
				// 중첩 구조 방어: { data: { string_list_data: [...] } }
				if (item?.data?.string_list_data?.[0]?.value) {
					return normalize(item.data.string_list_data[0].value);
				}
				// 다른 변형: { string_list_data: [{ username: "..." }] }
				if (item?.string_list_data && Array.isArray(item.string_list_data)) {
					const v = item.string_list_data.find((x) => x?.value || x?.username || x?.name || x?.href);
					if (v?.value) return normalize(v.value);
					if (v?.username) return normalize(v.username);
					if (v?.name) return normalize(v.name);
					// href 형식: https://www.instagram.com/_u/<username>
					if (typeof v?.href === "string") {
						const m = v.href.match(/instagram\.com\/_u\/([^/?#]+)/i);
						if (m?.[1]) return normalize(m[1]);
					}
				}
				// following.json 변형: { title: "username" }
				if (item?.title) return normalize(item.title);
				// 형식 2: { username: "user" } 또는 { name: "user" }
				if (item?.username) return normalize(item.username);
				if (item?.name) return normalize(item.name);
				// 형식 1: 문자열 배열 ["user1", "user2"]
				if (typeof item === "string") return normalize(item);
				return null;
			})
			.filter(Boolean);
	};

	// 객체/배열을 재귀적으로 순회하여 string_list_data 값을 수집
	const collectRecursively = (node, acc) => {
		if (!node) return acc;
		if (Array.isArray(node)) {
			acc.push(...extractFromArray(node));
			for (const child of node) collectRecursively(child, acc);
			return acc;
		}
		if (typeof node === "object") {
			// 직접 배열 필드 우선 수집
			for (const key of Object.keys(node)) {
				const val = node[key];
				if (Array.isArray(val)) acc.push(...extractFromArray(val));
			}
			// 재귀 탐색
			for (const key of Object.keys(node)) {
				collectRecursively(node[key], acc);
			}
		}
		return acc;
	};
	
	// 배열 형태인 경우
	if (Array.isArray(json)) {
		return extractFromArray(json);
	}
	
	// 객체 형태인 경우 - 모든 키를 검색하거나 재귀 수집
	if (typeof json === "object") {
		// 우선순위가 높은 키들
		const priorityKeys = [
			"relationships_following",
			"relationships_followers",
			"following",
			"followers",
			"accounts",
			"users"
		];
		
		// 우선순위 키 먼저 확인
		for (const key of priorityKeys) {
			if (Array.isArray(json[key])) {
				return extractFromArray(json[key]);
			}
			// 일부 내보내기에서 키가 객체이고 내부에 배열 필드가 존재
			if (typeof json[key] === "object" && json[key]) {
				// 흔한 내부 배열 키들 시도
				const innerKeys = ["list", "values", "items", "relationships", "string_list", "string_list_data", "accounts"];
				for (const ik of innerKeys) {
					if (Array.isArray(json[key][ik])) {
						return extractFromArray(json[key][ik]);
					}
				}
			}
		}
		
		// 재귀적으로 모든 곳에서 수집하여 반환
		const collected = Array.from(new Set(collectRecursively(json, [])));
		if (collected.length > 0) return collected;
	}
	
	return [];
}

function App() {
	const [followersFile, setFollowersFile] = useState("");
	const [followingFile, setFollowingFile] = useState("");
	const [followers, setFollowers] = useState([]);
	const [following, setFollowing] = useState([]);
	const [error, setError] = useState("");
		// 초기화 함수: 업로드/결과/오류 상태 모두 초기화
		function resetApp() {
			setFollowersFile("");
			setFollowingFile("");
			setFollowers([]);
			setFollowing([]);
			setError("");
		}
	const [galleryImages, setGalleryImages] = useState([]);
	const [galleryError, setGalleryError] = useState("");

	const nonMutualFollowing = useMemo(() => {
		const followerSet = new Set(followers);
		return Array.from(new Set(following))
			.filter((u) => !followerSet.has(u))
			.sort((a, b) => a.localeCompare(b));
	}, [followers, following]);

	const mutuals = useMemo(() => {
		const followerSet = new Set(followers);
		return Array.from(new Set(following))
			.filter((u) => followerSet.has(u))
			.sort((a, b) => a.localeCompare(b));
	}, [followers, following]);

	async function handleFollowersFile(e) {
		setError("");
		const file = e.target.files?.[0];
		if (!file) return;
		setFollowersFile(file.name);
		try {
			const text = await file.text();
			const json = JSON.parse(text);
			const usernames = extractUsernames(json);
			const unique = Array.from(new Set(usernames));
			setFollowers(unique);
			if (unique.length === 0) {
				setError("팔로워 파일에서 사용자명을 찾지 못했습니다. 인스타 JSON 형식을 사용해주세요.");
			}
		} catch (err) {
			setError("올바른 파일인지 확인해 주세요.");
		}
	}

	async function handleFollowingFile(e) {
		setError("");
		const file = e.target.files?.[0];
		if (!file) return;
		setFollowingFile(file.name);
		try {
			const text = await file.text();
			const json = JSON.parse(text);
			const usernames = extractUsernames(json);
			const unique = Array.from(new Set(usernames));
			setFollowing(unique);
			if (unique.length === 0) {
				setError("팔로잉 파일에서 사용자명을 찾지 못했습니다. 인스타 JSON 형식을 사용해주세요.");
			}
		} catch (err) {
			setError("올바른 파일인지 확인해 주세요.");
		}
	}

	// Load gallery images from public/gallery.json
	useEffect(() => {
		(async () => {
			try {
				const res = await fetch("/gallery.json", { cache: "no-store" });
				if (!res.ok) throw new Error("Missing gallery.json");
				const data = await res.json();
				if (Array.isArray(data)) {
					// Expect array of filenames relative to public, e.g., ["photo1.jpg", "album/pic2.png"]
					const imgs = data
						.map((p) => (typeof p === "string" ? p.trim() : null))
						.filter(Boolean);
					setGalleryImages(imgs);
					setGalleryError("");
				} else if (Array.isArray(data.images)) {
					const imgs = data.images
						.map((p) => (typeof p === "string" ? p.trim() : null))
						.filter(Boolean);
					setGalleryImages(imgs);
					setGalleryError("");
				} else {
					setGalleryError("gallery.json 형식은 배열 또는 { images: [] } 이어야 합니다.");
				}
			} catch (err) {
				setGalleryError("public 폴더에 gallery.json 파일을 추가하면 하단에 사진이 표시됩니다.");
			}
		})();
	}, []);

	return (
		<>
			{/* Aurora background effect */}
			<div className="aurora"></div>
			<div className="orb orb-1"></div>
			<div className="orb orb-2"></div>
			<div className="orb orb-3"></div>

			<div className="container">
								<h1 className="title" onClick={resetApp} style={{cursor: 'pointer'}} title="클릭하면 초기화">플라이오</h1>
				<p className="subtitle">
					팔로워와 팔로잉 JSON 파일을 각각 업로드하면, 내가 팔로우하지만 나를 팔로우하지 않는 계정 목록을 보여줍니다.
				</p>

				<div className="uploader-grid">
					<div className="uploader-item">
						<span className="uploader-label">팔로워 파일</span>
						<input id="followers-input" className="file-input" type="file" accept="application/json,.json" onChange={handleFollowersFile} />
						<label htmlFor="followers-input" className="file-label">
							<span className="file-text">followers.json 선택</span>
						</label>
						{followersFile && <span className="file-name">✅ {followersFile}</span>}
						<span className="file-count">{followers.length}명</span>
					</div>

					<div className="uploader-item">
						<span className="uploader-label">팔로잉 파일</span>
						<input id="following-input" className="file-input" type="file" accept="application/json,.json" onChange={handleFollowingFile} />
						<label htmlFor="following-input" className="file-label">
							<span className="file-text">following.json 선택</span>
						</label>
						{followingFile && <span className="file-name">✅ {followingFile}</span>}
						<span className="file-count">{following.length}명</span>
					</div>
				</div>

				{error && (
					<div className="error">
						⚠️ {error}
					</div>
				)}

				<div className="card-grid">
					<section className="card">
						<h2><span className="heading-accent">언팔 후보</span> (나만 팔로우)</h2>
						<div className="count">총 {nonMutualFollowing.length}명</div>
						<div className="list">
							{nonMutualFollowing.length === 0 ? (
								<div className="empty">데이터가 없거나 모두 맞팔로우입니다.</div>
							) : (
								<ul>
									{nonMutualFollowing.map((u) => (
										<li key={u}>{u}</li>
									))}
								</ul>
							)}
						</div>
					</section>

					<section className="card">
						<h2><span className="heading-accent">맞팔로우</span> (서로 팔로우)</h2>
						<div className="count">총 {mutuals.length}명</div>
						<div className="list">
							{mutuals.length === 0 ? (
								<div className="empty">맞팔로우가 없습니다.</div>
							) : (
								<ul>
									{mutuals.map((u) => (
										<li key={u}>{u}</li>
									))}
								</ul>
							)}
						</div>
					</section>
				</div>

				{/* 주의사항을 파일 형식 안내 위로 이동 */}
				<section className="card warning-card">
					<h3>⚠ 주의사항</h3>
					<p>
						인스타그램에서 지원해주는 JSON 파일은 현재 기준이 아니라, 데이터 패키징 시점의 과거 데이터이기 때문에 인스타에서 보이는 최신 팔로워/팔로잉과 차이가 날 수 있습니다.
					</p>
				</section>

				<section className="card info-card">
					<h3>💡 파일 형식 안내</h3>
					<p>
						인스타그램 설정 → 계정 센터 → 내 정보 및 권한 → 내 정보 내보내기 → 내보내기 만들기 → 기기로 내보내기
						→ 정보 맞춤 설정 <code>팔로워 및 팔로잉</code> → 기간 <code>전체 기간</code> → 형태 <code>JSON으로 변경</code> → 
						<code>followers_1.json</code> 파일을 팔로워에, <code>following.json</code> 파일을 팔로잉에 업로드하면 됩니다.
					</p>


				</section>



				<section className="card safety-card">
					<h3>🔒 안전한 사이트입니다.</h3>
					<p>
						이 사이트는 업로드된 파일을 서버로 전송하지 않습니다. 
						모든 분석은 사용자의 브라우저에서만 처리되며, 데이터는 외부로 유출되지 않습니다.
						해킹이나 개인정보 유출의 위험이 없으니 안심하고 사용하세요.
					</p>
				</section>

				{/* Gallery Section */}
				<section className="card gallery">
					<h3>인스타 JSON 파일 다운로드 안내</h3>
					{galleryError && <div className="error">⚠️ {galleryError}</div>}
					<div className="gallery-grid">
						{galleryImages.length === 0 ? (
							<div className="empty">public 폴더에 이미지를 두고, gallery.json에 파일명을 나열하면 여기에 표시됩니다.</div>
						) : (
							galleryImages.map((entry, idx) => {
								const isString = typeof entry === "string";
								const src = isString ? entry : entry.src;
								// 자동 캡션: 파일명/번호 기반으로 간단히 설명 생성
								const defaultCaptionByFile = (name) => {
									const n = (name || "").match(/(\d+)/)?.[1];
									if (n === "1") return "계정 센터 선택";
									if (n === "2") return "내 정보 및 권한 선택";
									if (n === "3") return "내 정보 내보내기 선택";
									if (n === "4") return "내보내기 만들기 선택";
									if (n === "5") return "기기로 내보내기 선택";
									if (n === "6") return "위 양식과 동일하게 파일 설정";
									return "인스타 JSON 다운로드 안내";
								};
								const caption = isString
									? defaultCaptionByFile(src)
									: (entry.caption || entry.title || defaultCaptionByFile(src));
								return (
									<div className="gallery-item" key={src}>
										<img src={`/${src}`} alt={caption || src} loading="lazy" />
										<div className="gallery-caption"><span className="num">{idx + 1}.</span> {caption || src}</div>
									</div>
								);
							})
						)}
					</div>
				</section>
								
								{/* Kakao 광고 영역: 푸터 바로 위에 고정 */}
								<div style={{width: '100%', display: 'flex', justifyContent: 'center', margin: '2rem 0 1rem 0'}}>
								  <ins className="kakao_ad_area"
									style={{display: 'none'}}
									data-ad-unit="DAN-vDhLvIbJvXHBcZOc"
									data-ad-width="160"
									data-ad-height="600"></ins>
								</div>
								<script type="text/javascript" src="//t1.daumcdn.net/kas/static/ba.min.js" async></script>
								{/* Kakao 광고 영역: 푸터 바로 위에 고정 */}
								<div style={{width: '100%', display: 'flex', justifyContent: 'center', margin: '2rem 0 1rem 0'}}>
									<AdFit />
								</div>
								<footer className="footer" style={{textAlign: 'center', margin: '0 auto', width: '100%', padding: '2px 0', fontSize: '0.85rem', color: '#aaa', lineHeight: '1.2'}}>
										© 2025 Re-rank. All rights reserved. | seoyeon
								</footer>
			</div>
		</>
	);
}

// Render if a root element exists; otherwise export for bundlers
const rootEl = document.getElementById("root");
if (rootEl) {
	const root = createRoot(rootEl);
	root.render(<App />);
}

export default App;
