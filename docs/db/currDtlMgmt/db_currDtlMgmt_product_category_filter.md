# DB 설계 문서 — currDtlMgmt-list 제품카테고리 검색 (페이지 전용 우회)

## 1. 개요

| 항목 | 내용 |
|------|------|
| 대상 화면 | `currDtlMgmt-list` (Curriculum 상세 관리 / Session 관리) |
| 목적 | "제품 카테고리"(depth1~3) 검색필드가 구조적으로 동작 불가능한 문제를 이 화면 전용 쿼리로 우회 |
| 신규 테이블 | 없음 |
| 신규 컬럼 | 없음 |
| 재사용 데이터 | `page_data.data_json`의 기존 컬럼(테이블 스키마 변경 아님, JSONB 내부 키) |

이 작업은 테이블/컬럼을 추가하지 않는다. 기존에 저장되어 있는 JSONB 데이터를 새로운 쿼리 경로로 조회하는 것뿐이다.

---

## 2. 재사용하는 기존 데이터 구조

### 2-1. `page_data` (`data_slug = 'currDtlMgmt-data'`)
```json
{
  "power_list": [611, 609, 605],       // category-data의 id 배열 (Power 관련 제품)
  "automation_list": [2209, 2207, ...] // category-data의 id 배열 (Automation 관련 제품)
}
```
- `power_list`/`automation_list`는 이 화면의 검색 대상 자신(`currDtlMgmt-data`)이 들고 있는 JSONB 배열이다.
- 배열 원소는 `category-data`의 `id`(leaf 레벨, depth2/3 등)를 가리킨다.

### 2-2. `page_data` (`data_slug = 'category-data'`)
```json
{ "id": 611, "category": { "depth": "2", "parentId": "573", "title": "Smart Factory" } }
```
- 카테고리는 `parentId`로 트리를 구성한다.
- 사용자가 depth1(예: "Software")만 선택하면, 그 하위 depth2/3 전체가 검색 대상이어야 한다 → **부모→자식 방향 재귀 조회 필요**.

### 2-3. 왜 기존 `slug_relation` FILTER로 안 되는가 (재확인)
- `slug_relation`의 FILTER 결과는 최종적으로 `page_data.id IN (...)`로 쓰이는데, category-data에서 얻을 수 있는 값은 category-data/product-data의 id뿐이고 `currDtlMgmt-data`의 id는 절대 얻을 수 없다.
- 실제 연결은 `currDtlMgmt-data.power_list`가 category-data id **배열**을 담는 구조라, 단일 값 매칭 기반인 FILTER 엔진으로는 표현이 안 된다.
- FO(`FoTrainingService.java:188-199`)도 동일한 문제를 겪어 전용 네이티브 쿼리로 우회한 전례가 있다 — 이번 작업은 그 패턴을 BO 화면에 재사용한다.

---

## 3. 신규 쿼리 설계 (네이티브, 재귀 CTE)

```sql
WITH RECURSIVE descendant_categories AS (
    SELECT id FROM page_data
     WHERE data_slug = 'category-data' AND id = :selectedCategoryId
    UNION ALL
    SELECT p.id FROM page_data p
     JOIN descendant_categories d
       ON p.data_slug = 'category-data'
      AND (p.data_json->'category'->>'parentId')::bigint = d.id
)
SELECT id FROM page_data
 WHERE data_slug = 'currDtlMgmt-data'
   AND (
        EXISTS (SELECT 1 FROM jsonb_array_elements_text(data_json->'power_list') v
                 WHERE v ~ '^[0-9]+$' AND v::bigint IN (SELECT id FROM descendant_categories))
     OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(data_json->'automation_list') v
                 WHERE v ~ '^[0-9]+$' AND v::bigint IN (SELECT id FROM descendant_categories))
   );
```
- `:selectedCategoryId` — 사용자가 CategoryField(depth1~3)에서 선택한 마지막 depth의 category-data id (FE가 이미 보내고 있는 값, 신규 파라미터 아님).
- 자기 자신(선택한 노드) + 모든 하위 노드를 재귀로 모아 배열 포함 여부를 검사한다.

---

## 4. 영향도

| 항목 | 내용 |
|------|------|
| 신규 테이블/컬럼 | 없음 |
| 기존 테이블 변경 | 없음 (재귀 CTE는 조회 전용) |
| slug_relation 데이터 변경 | 없음 (id=4는 그대로 두되, 이 화면에서는 사용 안 함) |
| 영향 범위 | `currDtlMgmt-data` 슬러그 검색 요청에서만 분기 — 다른 화면의 카테고리 검색(FILTER 엔진)은 그대로 유지, 회귀 위험 없음 |
