# BE 설계 문서 — currDtlMgmt-list 제품카테고리 검색 (페이지 전용 우회)

## 1. 개요

| 항목 | 내용 |
|------|------|
| 대상 엔드포인트 | `GET /api/v1/page-data/{slug}` (기존 엔드포인트 재사용, 신규 엔드포인트 아님) |
| 대상 슬러그 | `currDtlMgmt-data` |
| 변경 파일 | `PageDataService.java` (기존 파일 수정) |
| 신규 파일 | 없음 |
| 참고 구현 | `FoTrainingService.java:188-199` (동일 문제를 이미 우회한 기존 코드, 패턴만 재사용) |

---

## 2. 현재 동작과 바뀌는 부분

### 현재
검색 요청에 카테고리 필터 파라미터(`rel_4`, relationSlugId=4 기반)가 오면 `resolveFilterRelationIds`(공용 FILTER 엔진)로 넘어가서, `slug_relation.master_slug` 불일치로 인해 **항상 0건**을 반환한다.

### 변경 후
`data_slug == "currDtlMgmt-data"`이고 해당 파라미터가 있으면, 공용 FILTER 엔진으로 넘기기 전에 **전용 분기**로 가로채서 3장의 재귀 쿼리 결과(id 목록)를 `AND id IN (...)` 조건으로 적용한다. 다른 슬러그의 검색 요청은 이 분기를 타지 않으므로 기존 동작에 영향 없음.

---

## 3. 변경 위치 (기존 파일 수정)

`PageDataService.java`의 검색 파라미터 처리 로직(`search()` 메서드, `rel_` 파라미터 파싱 지점) 근처에 아래 분기를 추가한다.

```java
// currDtlMgmt-data 전용 — 제품카테고리(depth1~3) 검색 우회
// slug_relation FILTER 엔진 대상 밖: category-data → power_list/automation_list(배열) 매칭은
// FILTER 엔진(단일값 매칭)으로 표현 불가하므로 이 슬러그에서만 전용 쿼리로 처리한다.
if ("currDtlMgmt-data".equals(dataSlug) && categoryFilterParam != null) {
    List<Long> matchedIds = resolveCurrDtlMgmtIdsByCategoryFilter(categoryFilterParam);
    // matchedIds를 기존 id IN (...) 조건에 병합
}
```

새 private 메서드 `resolveCurrDtlMgmtIdsByCategoryFilter(Long categoryId)`를 추가하여 DB 문서의 재귀 CTE를 `entityManager.createNativeQuery(...)`로 실행하고 id 목록을 반환한다.

---

## 4. 파라미터

| 파라미터 | 출처 | 설명 |
|---|---|---|
| 카테고리 필터 값 | 기존 CategoryField가 이미 보내고 있는 `rel_4` 파라미터 그대로 재사용 | FE 코드 변경 없이 그대로 활용 (신규 파라미터 아님) |

---

## 5. 영향도

| 파일 | 변경 수준 | 이유 |
|------|-----------|------|
| `PageDataService.java` | 기존 파일 일부 수정 | `currDtlMgmt-data` 전용 분기 + private 메서드 1개 추가 |
| 그 외 파일 | 변경 없음 | 신규 엔드포인트/DTO/엔티티 없음 |
| 다른 화면 검색 | 영향 없음 | `data_slug` 값으로 분기하므로 다른 슬러그는 기존 FILTER 엔진 그대로 사용 |
