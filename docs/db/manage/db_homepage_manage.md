# DB 설계 문서 — homepage_manage

## 1. 개요

| 항목 | 내용 |
|------|------|
| 테이블명 | `homepage_manage` |
| 목적 | 홈페이지 기능 on/off 시스템 설정 관리 |
| 운영 방식 | 단일 row (전체 시스템 공통 설정) |
| 관련 메뉴 | SYSTEM > Manage > 홈페이지 관리 |

---

## 2. 테이블 정의

```sql
CREATE TABLE homepage_manage (
    id               BIGINT          NOT NULL AUTO_INCREMENT,
    is_multilingual  BOOLEAN         NOT NULL DEFAULT FALSE,
    created_by       VARCHAR(100)    NOT NULL,
    created_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by       VARCHAR(100)    NOT NULL,
    updated_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
```

---

## 3. 컬럼 설명

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | BIGINT | NOT NULL | AUTO_INCREMENT | PK |
| `is_multilingual` | BOOLEAN | NOT NULL | FALSE | 다국어 기능 on/off |
| `created_by` | VARCHAR(100) | NOT NULL | — | 생성자 (Audit) |
| `created_at` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 생성일시 (Audit) |
| `updated_by` | VARCHAR(100) | NOT NULL | — | 수정자 (Audit) |
| `updated_at` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 수정일시 (Audit) |

---

## 4. 특이사항

- **단일 row 운영**: 이 테이블은 항상 row 1개만 유지한다.
  - 애플리케이션 부팅 시 row가 없으면 기본값(`is_multilingual=false`)으로 자동 초기화.
  - 설정 수정 시 INSERT가 아닌 UPDATE(`id=1`)로 처리.
- site_id 없음: 특정 사이트에 종속되지 않는 전체 시스템 설정이다.

---

## 5. 초기 데이터 SQL

```sql
-- 부팅 시 row가 없을 경우 1회만 삽입
INSERT INTO homepage_manage (is_multilingual, created_by, updated_by)
SELECT FALSE, 'SYSTEM', 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM homepage_manage);
```

---

## 6. 영향도

| 항목 | 내용 |
|------|------|
| 신규 테이블 | `homepage_manage` |
| 기존 테이블 변경 | 없음 |
| 연관 엔티티 | `HomepageManage.java` (신규) |
