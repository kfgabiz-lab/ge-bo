# FE 설계 문서 — 홈페이지 관리 페이지

## 1. 개요

| 항목 | 내용 |
|------|------|
| 페이지 URL | `/admin/manage/homepage` |
| 파일 경로 | `src/app/admin/manage/homepage/page.tsx` |
| 접근 권한 | SYSTEM 권한 사용자 전용 (메뉴 is_system=true) |
| 목적 | 홈페이지 기능 on/off 설정 관리 |

---

## 2. 화면 구조

```
┌──────────────────────────────────────────┐
│  홈페이지 관리  (PageLayout 메뉴명 자동)   │
├──────────────────────────────────────────┤
│  GridCell colSpan=12 rowSpan=4           │
│  ┌────────────────────────────────────┐  │
│  │  다국어                     [토글] │  │
│  │  홈페이지 다국어 기능을             │  │
│  │  on/off 설정합니다.               │  │
│  └────────────────────────────────────┘  │
│  GridCell colSpan=12 rowSpan=1           │
│                              [저장]      │
└──────────────────────────────────────────┘
```

---

## 3. 컴포넌트 구조

```
HomepageManagePage (page.tsx)
├── PageLayout (mode="live")          ← 메뉴명 자동 표시
│   ├── GridCell (colSpan=12)         ← 설정 카드 영역
│   │   └── SettingCard × N          ← 설정 항목 카드 (인라인 렌더링)
│   │       └── ToggleSwitch         ← 공통 토글 컴포넌트
│   └── GridCell (colSpan=12)         ← 저장 버튼 영역
│       └── <button> 저장
```

---

## 4. 상태 관리

```typescript
// 설정 key → 현재 on/off 값
const [settings, setSettings] = useState<Record<string, boolean>>({
    isMultilingual: false,
});

// 저장 처리 중 여부
const [isSaving, setIsSaving] = useState(false);
```

---

## 5. API 연동

### 5-1. 설정 조회 (마운트 시)
```
GET /api/v1/homepage-manage
→ 응답값으로 settings 초기화
→ 실패 시 toast.error 표시
```

### 5-2. 설정 저장 (저장 버튼 클릭)
```
PATCH /api/v1/homepage-manage
Body: { isMultilingual: boolean }
→ 성공 시 toast.success('저장되었습니다.')
→ 실패 시 toast.error 표시
```

---

## 6. 설정 항목 목록 (SETTING_ITEMS)

| key | 제목 | 설명 |
|-----|------|------|
| `isMultilingual` | 다국어 | 홈페이지 다국어 기능을 on/off 설정합니다. |

> 향후 설정 항목 추가 시 `SETTING_ITEMS` 배열에만 추가하면 카드가 자동 생성된다.

---

## 7. 신규/수정 파일

| 파일 | 변경 | 설명 |
|------|------|------|
| `src/app/admin/manage/homepage/page.tsx` | 수정 | 퍼블리싱 마크업 → API 연동 완성 |
| `src/components/ui/ToggleSwitch.tsx` | 완료 | 공통 토글 스위치 (퍼블리싱 단계 생성) |

---

## 8. 영향도

| 파일 | 변경 수준 | 이유 |
|------|-----------|------|
| `manage/homepage/page.tsx` | 수정 | API 연동 (GET/PATCH) 추가 |
| `components/ui/ToggleSwitch.tsx` | 완료 | 변경 없음 |
| 기존 파일 | 변경 없음 | 독립 페이지 |
