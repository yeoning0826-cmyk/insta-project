import { useEffect } from "react";

export default function AdFit() {
  useEffect(() => {
    if (document.querySelector('script[src*="ba.min.js"]')) return;
    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/kas/static/ba.min.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <ins
      className="kakao_ad_area"
      style={{ display: "none" }}
      data-ad-unit="DAN-vDhLvIbJvXHBcZOc"
      data-ad-width="320"
      data-ad-height="100"
    />
  );
}
