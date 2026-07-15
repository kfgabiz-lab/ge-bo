# 정적 페이지 SEO 관리

## 1. 개요

| 항목 | 내용 |
|------|------|
| 기능 | 하드코딩된 정적 페이지의 SEO 정보 조회 및 수정 |
| Base URL | `/api/v1/static-page-seo` |
| 접근 권한 | SYSTEM 권한 사용자 전용 |
| 연관 DB | `static_page_seo` 테이블 |

---

## 2. 엔드포인트 목록

| 메서드 | URL | 설명 |
|--------|-----|------|
| GET | `/api/v1/static-page-seo` | SEO 설정 목록 조회 |
| GET | `/api/v1/static-page-seo/{id}` | SEO 설정 상세 조회 |
| POST | `/api/v1/static-page-seo` | SEO 설정 등록 |
| PATCH | `/api/v1/static-page-seo/{id}` | SEO 설정 수정 |
| DELETE | `/api/v1/static-page-seo/{id}` | SEO 설정 삭제 |

---

## 3. GET /api/v1/static-page-seo

### 설명
등록된 정적 페이지 SEO 설정 목록을 조회한다.

### Request
없음

### Response `200 OK`

```json
[
  {
    "id": 1,
    "pageName": "About Us",
    "pageUrl": "/company/about-us",
    "seoContent": "<title>About LS ELECTRIC</title>\n<meta name=\"description\" content=\"About LS ELECTRIC America\">",
    "useYn": "Y"
  }
]
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | long | SEO 설정 ID |
| `pageName` | string | 관리용 페이지명 |
| `pageUrl` | string | 정적 페이지 URL |
| `seoContent` | string | Head 영역에 적용할 SEO 텍스트 |
| `useYn` | string | 사용 여부 (`Y` / `N`) |

---

## 4. GET /api/v1/static-page-seo/{id}

### 설명
SEO 설정 ID를 기준으로 상세 정보를 조회한다.

### Response `200 OK`

```json
{
  "id": 1,
  "pageName": "About Us",
  "pageUrl": "/company/about-us",
  "seoContent": "<title>About LS ELECTRIC</title>\n<meta name=\"description\" content=\"About LS ELECTRIC America\">",
  "useYn": "Y"
}
```

---

## 5. POST /api/v1/static-page-seo

### 설명
정적 페이지의 SEO 설정을 신규 등록한다.

### Request Body

```json
{
  "pageName": "About Us",
  "pageUrl": "/company/about-us",
  "seoContent": "<title>About LS ELECTRIC</title>\n<meta name=\"description\" content=\"About LS ELECTRIC America\">",
  "useYn": "Y"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `pageName` | string | Y | 관리용 페이지명 |
| `pageUrl` | string | Y | 정적 페이지 URL |
| `seoContent` | string | Y | SEO 태그 또는 SEO 텍스트 |
| `useYn` | string | Y | 사용 여부 (`Y` / `N`) |

### Response `201 Created`

```json
{
  "id": 1,
  "pageName": "About Us",
  "pageUrl": "/company/about-us",
  "seoContent": "<title>About LS ELECTRIC</title>\n<meta name=\"description\" content=\"About LS ELECTRIC America\">",
  "useYn": "Y"
}
```

---

## 6. PATCH /api/v1/static-page-seo/{id}

### 설명
등록된 정적 페이지 SEO 설정을 수정한다.

### Request Body

```json
{
  "pageName": "About LS ELECTRIC",
  "pageUrl": "/company/about-us",
  "seoContent": "<title>About LS ELECTRIC America</title>\n<meta name=\"description\" content=\"Learn more about LS ELECTRIC America\">",
  "useYn": "Y"
}
```

### Response `200 OK`

```json
{
  "id": 1,
  "pageName": "About LS ELECTRIC",
  "pageUrl": "/company/about-us",
  "seoContent": "<title>About LS ELECTRIC America</title>\n<meta name=\"description\" content=\"Learn more about LS ELECTRIC America\">",
  "useYn": "Y"
}
```

---

## 7. DELETE /api/v1/static-page-seo/{id}

### 설명
등록된 정적 페이지 SEO 설정을 삭제한다.

### Response `204 No Content`

---

## 8. DTO 정의

### StaticPageSeoRequest

```java
public class StaticPageSeoRequest {

    @NotBlank
    private String pageName;

    @NotBlank
    private String pageUrl;

    @NotBlank
    private String seoContent;

    @NotBlank
    @Pattern(regexp = "Y|N")
    private String useYn;
}
```

### StaticPageSeoResponse

```java
public class StaticPageSeoResponse {

    private Long id;
    private String pageName;
    private String pageUrl;
    private String seoContent;
    private String useYn;
}
```

---

## 9. 엔티티 정의

```java
@Entity
@Table(
    name = "static_page_seo",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_static_page_seo_page_url",
            columnNames = "page_url"
        )
    }
)
public class StaticPageSeo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "page_name", nullable = false, length = 200)
    private String pageName;

    @Column(name = "page_url", nullable = false, length = 500)
    private String pageUrl;

    @Lob
    @Column(name = "seo_content", nullable = false)
    private String seoContent;

    @Column(name = "use_yn", nullable = false, length = 1)
    private String useYn = "Y";

    // Audit 컬럼 4개 (createdBy, createdAt, updatedBy, updatedAt)
}
```

---

## 10. 서비스 로직

### 목록 조회

```text
1. static_page_seo 테이블 전체 조회
2. ID 또는 페이지명 기준 정렬
3. 목록 응답
```

### 상세 조회

```text
1. 요청 ID로 static_page_seo 조회
2. 데이터가 없으면 404 응답
3. 조회 결과 응답
```

### 등록

```text
1. 요청값 필수 여부 확인
2. 동일한 pageUrl 존재 여부 확인
3. 중복 URL이면 409 응답
4. 신규 데이터 INSERT
5. 등록 결과 응답
```

### 수정

```text
1. 요청 ID로 데이터 조회
2. 데이터가 없으면 404 응답
3. pageUrl 변경 시 중복 여부 확인
4. 요청값으로 UPDATE
5. 수정 결과 응답
```

### 삭제

```text
1. 요청 ID로 데이터 조회
2. 데이터가 없으면 404 응답
3. 데이터 DELETE
4. 204 응답
```

---

## 11. 프론트 적용 방식

```text
1. 현재 요청 URL을 기준으로 SEO 설정 API 조회
2. pageUrl이 일치하고 useYn=Y인 데이터 확인
3. seoContent 값을 페이지 Head 영역에 적용
4. 데이터가 없거나 비활성 상태이면 소스의 기본 SEO 사용
```

> `seoContent`를 HTML로 직접 적용하는 경우 `<script>` 태그 등 위험한 태그는 저장 또는 출력 단계에서 제한해야 한다.

---

## 12. 신규 생성 파일

| 파일 | 경로 |
|------|------|
| `StaticPageSeo.java` | `entity/StaticPageSeo.java` |
| `StaticPageSeoRepository.java` | `repository/StaticPageSeoRepository.java` |
| `StaticPageSeoService.java` | `service/StaticPageSeoService.java` |
| `StaticPageSeoController.java` | `controller/StaticPageSeoController.java` |
| `StaticPageSeoRequest.java` | `dto/StaticPageSeoRequest.java` |
| `StaticPageSeoResponse.java` | `dto/StaticPageSeoResponse.java` |

---

## 13. 영향도

| 파일 | 변경 수준 | 이유 |
|------|-----------|------|
| `StaticPageSeo.java` | 신규 | 엔티티 |
| `StaticPageSeoRepository.java` | 신규 | JPA Repository |
| `StaticPageSeoService.java` | 신규 | 비즈니스 로직 |
| `StaticPageSeoController.java` | 신규 | REST API |
| `StaticPageSeoRequest.java` | 신규 | 요청 DTO |
| `StaticPageSeoResponse.java` | 신규 | 응답 DTO |
| 정적 페이지 Metadata 처리 영역 | 수정 | URL 기준 SEO 정보 적용 |
| 기존 게시물 SEO 기능 | 변경 없음 | 독립 기능 |
