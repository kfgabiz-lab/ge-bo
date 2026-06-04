/**
 * UUID v7 생성 유틸
 * - 상위 48비트: 밀리초 타임스탬프 (시간 순 정렬 가능)
 * - 하위 74비트: 랜덤값
 * 사용법: generateUuidV7() → "01957f3e-1a2b-7c3d-8e4f-5a6b7c8d9e0f"
 */
export function generateUuidV7(): string {
  const now = Date.now();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // 상위 48비트 = 밀리초 타임스탬프
  bytes[0] = (now / 0x10000000000) & 0xff;
  bytes[1] = (now / 0x100000000) & 0xff;
  bytes[2] = (now / 0x1000000) & 0xff;
  bytes[3] = (now / 0x10000) & 0xff;
  bytes[4] = (now / 0x100) & 0xff;
  bytes[5] = now & 0xff;

  // 버전 7 (4비트)
  bytes[6] = (bytes[6] & 0x0f) | 0x70;

  // 변형 10xx (2비트)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const h = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
