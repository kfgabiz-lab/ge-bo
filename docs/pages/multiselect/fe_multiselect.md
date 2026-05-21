# FE 설계 문서 — MultiSelect 컨텐츠 컴포넌트

## 1. 개요

| 항목 | 내용 |
|------|------|
| 컴포넌트 유형 | 컨텐츠 컴포넌트 (Form/SubList과 동일 계층) |
| 위젯 타입 | `type: 'multiselect'` |
| 저장 방식 | action-button `connectedContentWidgetIds` 연결 → ID 배열 저장 |
| 옵션 출처 | 빌더에서 지정한 `sourceSlug`에서 전체 로드 (페이징 없음) |

---

## 2. 위젯 타입 정의

```typescript
// renderer/types.ts
interface MultiSelectWidget {
    type: 'multiselect';
    widgetId: string;
    contentKey: string;       // dataJson 저장 키 (예: "assignedUsers")
    connectedSlug?: string;   // 저장 대상 slug (action-button 연결용)
    sourceSlug: string;       // 옵션 목록을 가져올 slug
    labelFields: string;      // 표시 필드 — 쉼표 구분, ' > '로 연결 (예: "name,dept")
    valueField?: string;      // 저장 ID 필드 키 (기본: 'id')
    placeholder?: string;
    title?: string;
    showBorder?: boolean;
}
```

---

## 3. 저장 데이터 구조

```json
{
  "dataJson": {
    "{contentKey}": [1, 5, 12]
  }
}
```

- `contentKey`가 `"assignedUsers"`이면 → `"assignedUsers": [1, 5, 12]`
- 선택 없으면 → `"assignedUsers": []`

---

## 4. UI 동작

### 4-1. 드롭다운 열기/닫기
- 토글 버튼 클릭 → 드롭다운 열림
- 드롭다운 외부 클릭 → 드롭다운 닫힘 (선택 유지)
- 선택 중 드롭다운 닫히지 않음 (체크박스 클릭 후 드롭다운 유지)

### 4-2. 자동완성 필터링
- 드롭다운 내 검색 입력 → `labelFields` 기준 실시간 필터링
- 검색어 지우면 전체 목록 복원

### 4-3. 체크박스 선택
- 체크 → `selectedIds`에 해당 `id` 추가
- 해제 → `selectedIds`에서 해당 `id` 제거
- 이미 체크된 항목은 드롭다운 재오픈 시에도 체크 상태 유지

### 4-4. 하단 선택 목록
- 선택된 항목을 한 줄씩 세로 나열
- 각 행: `[표시 텍스트]` ── `[× 버튼]`
- × 클릭 → 해당 항목 선택 해제 + 드롭다운 체크 동기화

### 4-5. 토글 버튼 표시
- 선택 없음: placeholder 표시
- 선택 있음: `N개 선택됨` 표시

---

## 5. 신규 생성 파일

### `MultiSelectRenderer.tsx`
**경로:** `src/app/admin/templates/make/_shared/components/renderer/MultiSelectRenderer.tsx`

**역할:** preview/live 모드 UI 렌더링

| 모드 | 동작 |
|------|------|
| preview | 하드코딩 샘플 데이터, 드롭다운 인라인 표시, 인터랙션 비활성 |
| live | sourceSlug API 호출, 선택값 관리, onChange 콜백 |

**Props:**
```typescript
interface MultiSelectRendererProps {
    mode: RendererMode;
    widget: MultiSelectWidget;
    selectedIds?: number[];           // live: 외부에서 주입되는 선택 ID 배열
    onChange?: (ids: number[]) => void; // live: 선택 변경 콜백
}
```

**내부 상태:**
| 상태 | 타입 | 설명 |
|------|------|------|
| `options` | `OptionItem[]` | 드롭다운 전체 옵션 목록 |
| `selected` | `number[]` | 현재 선택된 ID 배열 |
| `search` | `string` | 드롭다운 내 검색어 |
| `isOpen` | `boolean` | 드롭다운 열림 여부 |

---

### `MultiSelectBuilder.tsx`
**경로:** `src/app/admin/templates/make/_shared/components/builder/MultiSelectBuilder.tsx`

**역할:** 빌더에서 MultiSelect 위젯 설정 패널

**설정 항목:**

| 필드 | UI | 설명 |
|------|----|------|
| widgetId | input (자동생성) | 위젯 고유 ID |
| title | input | 상단 타이틀 |
| contentKey | input | dataJson 저장 키 (영문) |
| sourceSlug | 드롭다운 | 옵션 출처 slug (현재 페이지 내 사용 중인 slug 목록에서 선택) |
| labelFields | input | 표시 필드 (쉼표 구분, 예: name,dept) |
| valueField | input | ID 필드 키 (기본: id) |
| placeholder | input | 토글 버튼 placeholder |
| showBorder | toggle | 테두리 표시 여부 |

---

## 6. 수정 파일

### `renderer/types.ts`
- `MultiSelectWidget` 인터페이스 추가 ✅ (퍼블리싱 단계에서 완료)
- `AnyWidget` union에 추가 ✅

### `renderer/index.ts`
- `MultiSelectRenderer`, `MultiSelectWidget` export 추가 ✅

### `renderer/WidgetRenderer.tsx`
- `widget.type === 'multiselect'` 분기 추가 ✅
- `MultiSelectRenderer` import 추가 ✅

### `builder/CommonBuilderDispatcher.tsx`
- `multiselect` 타입 → `MultiSelectBuilder` 렌더링 분기 추가

### `widgetSub/[slug]/page.tsx`
- `handleContentAction` — multiselect 위젯 선택값 수집 후 contentKey로 저장
- 수정 모드 복원 — `dataJson[contentKey]`에서 ID 배열 읽어 `multiSelectValuesMap` 복원

---

## 7. 상태 관리 (widgetSub 페이지)

**신규 상태:**
```typescript
// widgetId → 선택된 ID 배열
const [multiSelectValuesMap, setMultiSelectValuesMap] =
    useState<Record<string, number[]>>({});
```

**저장 흐름 (handleContentAction):**
```
1. flatWidgets에서 type === 'multiselect' 추출
2. 각 위젯의 widgetId → multiSelectValuesMap[widgetId] 로 선택 ID 배열 수집
3. connectedSlug별로 그룹핑
4. dataJson에 { [contentKey]: [id1, id2, ...] } 포함하여 저장
```

**복원 흐름 (수정 모드):**
```
1. dataJson[contentKey] 값이 number[] 이면 → setMultiSelectValuesMap 업데이트
2. WidgetRenderer로 selectedIds 전달
```

---

## 8. WidgetRenderer live 모드 props 추가

```typescript
// WidgetRenderer props 추가
multiSelectValuesMap?: Record<string, number[]>;
onMultiSelectChange?: (widgetId: string, ids: number[]) => void;

// multiselect 분기
if (widget.type === 'multiselect') {
    return (
        <MultiSelectRenderer
            mode={mode}
            widget={widget}
            selectedIds={multiSelectValuesMap?.[widget.widgetId] ?? []}
            onChange={ids => onMultiSelectChange?.(widget.widgetId, ids)}
        />
    );
}
```

---

## 9. 영향도

| 파일 | 변경 수준 | 이유 |
|------|-----------|------|
| `renderer/types.ts` | 추가 ✅ | 타입 정의 |
| `renderer/index.ts` | 추가 ✅ | export |
| `renderer/MultiSelectRenderer.tsx` | 신규 ✅ | 렌더러 |
| `renderer/WidgetRenderer.tsx` | 소규모 수정 ✅ | 분기 추가 |
| `builder/MultiSelectBuilder.tsx` | 신규 | 빌더 설정 패널 |
| `builder/CommonBuilderDispatcher.tsx` | 소규모 수정 | 분기 추가 |
| `widgetSub/[slug]/page.tsx` | 중간 수정 | 상태 추가, 저장/복원 로직 |
| 기존 Form/SubList/Table 렌더러 | 변경 없음 | 독립 컴포넌트 |
