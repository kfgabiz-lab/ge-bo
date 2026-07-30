# FE 설계 문서 — currDtlMgmt-list 제품카테고리 검색 (페이지 전용 우회)

## 1. 개요

| 항목 | 내용 |
|------|------|
| 대상 화면 | `currDtlMgmt-list` / Session 관리 |
| FE 코드 변경 | **없음** |

---

## 2. 왜 FE 변경이 없는가

"제품 카테고리" 검색필드(CategoryField, relationSlugId=4)는 이미 선택된 depth의 category-data id를 `rel_4` 파라미터로 보내고 있다 (기존 코드, `utils.ts`의 category 타입 파라미터 처리 로직 그대로).

이번 변경은 **BE가 `data_slug=currDtlMgmt-data`일 때 이 파라미터를 해석하는 방식만** 바꾸는 것이라, FE는 지금 보내던 파라미터를 그대로 보내기만 하면 된다. 빌더 설정(relationSlugId=4, dbSlug=category-data 등)도 그대로 둔다.

---

## 3. 검증 시 확인 포인트

- Session 관리 화면에서 "제품 카테고리" depth1(예: Software)만 선택 → 하위 depth2/3 제품을 가진 세션이 모두 검색되는지
- depth3까지 선택(리프 노드) → 정확히 그 제품을 가진 세션만 검색되는지
- 카테고리 미선택 상태에서 다른 검색조건(카테고리 P/A, 코스명)은 기존대로 정상 동작하는지(회귀 확인)
