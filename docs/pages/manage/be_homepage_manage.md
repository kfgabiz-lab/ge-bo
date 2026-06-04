# BE 설계 문서 — 홈페이지 관리 API

## 1. 개요

| 항목 | 내용 |
|------|------|
| 기능 | 홈페이지 기능 on/off 설정 조회 및 수정 |
| Base URL | `/api/v1/homepage-manage` |
| 접근 권한 | SYSTEM 권한 사용자 전용 |
| 연관 DB | `homepage_manage` 테이블 (단일 row) |

---

## 2. 엔드포인트 목록

| 메서드 | URL | 설명 |
|--------|-----|------|
| GET | `/api/v1/homepage-manage` | 설정 조회 |
| PATCH | `/api/v1/homepage-manage` | 설정 수정 |

---

## 3. GET /api/v1/homepage-manage

### 설명
현재 홈페이지 설정값을 조회한다. row가 없으면 기본값(`isMultilingual=false`)을 반환한다.

### Request
없음

### Response `200 OK`
```json
{
  "isMultilingual": false
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `isMultilingual` | boolean | 다국어 기능 on/off |

---

## 4. PATCH /api/v1/homepage-manage

### 설명
홈페이지 설정값을 수정한다. row가 없으면 새로 생성하고, 있으면 업데이트한다.

### Request Body
```json
{
  "isMultilingual": true
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `isMultilingual` | boolean | Y | 다국어 기능 on/off |

### Response `200 OK`
```json
{
  "isMultilingual": true
}
```

---

## 5. DTO 정의

### HomepageManageResponse
```java
// GET / PATCH 공통 응답
public class HomepageManageResponse {
    private boolean isMultilingual;
}
```

### HomepageManageRequest
```java
// PATCH 요청
public class HomepageManageRequest {
    @NotNull
    private Boolean isMultilingual;
}
```

---

## 6. 엔티티 정의

```java
@Entity
@Table(name = "homepage_manage")
public class HomepageManage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "is_multilingual", nullable = false)
    private boolean isMultilingual = false;

    // Audit 컬럼 4개 (createdBy, createdAt, updatedBy, updatedAt)
}
```

---

## 7. 서비스 로직

### 조회 (GET)
```
1. homepage_manage 테이블에서 id=1 조회
2. row 없으면 → 기본값 응답 (isMultilingual=false)
3. row 있으면 → 해당 값 응답
```

### 수정 (PATCH)
```
1. homepage_manage 테이블에서 id=1 조회
2. row 없으면 → INSERT (기본값 + 요청값 적용)
3. row 있으면 → UPDATE (요청값만 변경)
4. 수정된 값 응답
```

---

## 8. 신규 생성 파일

| 파일 | 경로 |
|------|------|
| `HomepageManage.java` | `entity/HomepageManage.java` |
| `HomepageManageRepository.java` | `repository/HomepageManageRepository.java` |
| `HomepageManageService.java` | `service/HomepageManageService.java` |
| `HomepageManageController.java` | `controller/HomepageManageController.java` |
| `HomepageManageRequest.java` | `dto/HomepageManageRequest.java` |
| `HomepageManageResponse.java` | `dto/HomepageManageResponse.java` |

---

## 9. 영향도

| 파일 | 변경 수준 | 이유 |
|------|-----------|------|
| `HomepageManage.java` | 신규 | 엔티티 |
| `HomepageManageRepository.java` | 신규 | JPA Repository |
| `HomepageManageService.java` | 신규 | 비즈니스 로직 |
| `HomepageManageController.java` | 신규 | REST API |
| `HomepageManageRequest.java` | 신규 | 요청 DTO |
| `HomepageManageResponse.java` | 신규 | 응답 DTO |
| 기존 파일 | 변경 없음 | 독립 기능 |
