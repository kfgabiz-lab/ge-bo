'use client';

/**
 * googlePlaces.ts — Google Places 주소 자동완성 연동 유틸 (저수준 검색 API 전용)
 *
 * WHY: address(주소검색) 필드는 Google이 기본 제공하는 자동완성 드롭다운 위젯(구글 자체 스타일)을
 * 쓰지 않고, 프로젝트 공통 포털 드롭다운 UI(FieldRenderer의 select-autocomplete와 동일한 골격)로
 * 직접 그린다. 이 파일은 그 UI가 사용할 두 가지 저수준 API만 감싼다.
 *   1) searchAddressPredictions — 검색어로 주소 후보 목록 조회
 *   2) getAddressDetail        — 후보 선택 시 정제된 주소 + 위도/경도 조회
 *
 * 스크립트는 페이지 안에 주소검색 필드가 여러 개 있어도 최초 1회만 로드되도록
 * Promise를 모듈 스코프에 캐시해서 재사용한다.
 */

/* @googlemaps/js-api-loader v2 부터는 클래스형 Loader가 deprecated되고,
   setOptions() + importLibrary() 함수형 API로 바뀌었다 (MIGRATION.md 참고) */
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

/** BE application-local.yml의 ls.lse.outApi.googleMapKey 와 동일한 키 (bo/.env.local, bo/.env.development) */
const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';

/** 옵션 설정은 라이브러리를 처음 불러오기 전에 딱 한 번만 호출해야 한다 */
let optionsApplied = false;

/** Places 라이브러리 로드 Promise 캐시 — 페이지 내 최초 1회만 구글 스크립트를 로드한다 */
let placesLibraryPromise: Promise<google.maps.PlacesLibrary> | null = null;

/** Places 라이브러리를 (아직 안 불러왔으면) 로드하고, 이후 호출부터는 캐시된 Promise를 그대로 반환 */
function loadPlacesLibrary(): Promise<google.maps.PlacesLibrary> {
    if (!optionsApplied) {
        setOptions({ key: GOOGLE_MAPS_KEY, v: 'weekly' });
        optionsApplied = true;
    }
    if (!placesLibraryPromise) {
        placesLibraryPromise = importLibrary('places');
    }
    return placesLibraryPromise;
}

/** 주소 후보 1건 — 드롭다운 목록에 표시할 최소 정보 */
export interface AddressPrediction {
    /** 상세정보(위도/경도) 조회 시 사용하는 Google Place ID */
    placeId: string;
    /** 드롭다운에 표시할 전체 주소 텍스트 */
    description: string;
}

/**
 * 검색어로 주소 후보 목록 조회 (저수준 AutocompleteService)
 * @param query 사용자가 입력창에 타이핑한 검색어
 * @param language 검색 결과 언어 — 'ko'(한글) | 'en'(영문, 기본값)
 * @returns 후보 목록 — 키 미설정이거나 검색어가 비어있으면 빈 배열
 */
export async function searchAddressPredictions(query: string, language: 'ko' | 'en' = 'en'): Promise<AddressPrediction[]> {
    const trimmed = query.trim();
    if (!trimmed || !GOOGLE_MAPS_KEY) return [];

    const places = await loadPlacesLibrary();
    const service = new places.AutocompleteService();

    return new Promise(resolve => {
        service.getPlacePredictions({ input: trimmed, language }, (results, status) => {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
                resolve([]);
                return;
            }
            resolve(results.map(r => ({ placeId: r.place_id, description: r.description })));
        });
    });
}

/** 후보 선택 시 조회하는 상세정보 — 정제된 주소 텍스트 + 좌표 */
export interface AddressDetail {
    address: string;
    lat: number;
    lng: number;
}

/**
 * place_id로 상세정보(정제된 주소 + 위도/경도) 조회 (저수준 PlacesService)
 * @param placeId searchAddressPredictions로 받은 후보의 placeId
 * @param language 검색 결과 언어 — 'ko'(한글) | 'en'(영문, 기본값)
 * @returns 상세정보 — 조회 실패 시 null
 */
export async function getAddressDetail(placeId: string, language: 'ko' | 'en' = 'en'): Promise<AddressDetail | null> {
    if (!placeId || !GOOGLE_MAPS_KEY) return null;

    const places = await loadPlacesLibrary();
    /* PlacesService는 지도 또는 DOM 노드가 필요하다 — 화면에 표시되지 않는 더미 div로 대체(공식 권장 방식) */
    const dummyDiv = document.createElement('div');
    const service = new places.PlacesService(dummyDiv);

    return new Promise(resolve => {
        service.getDetails({ placeId, fields: ['formatted_address', 'geometry'], language }, (place, status) => {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) {
                resolve(null);
                return;
            }
            resolve({
                address: place.formatted_address ?? '',
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
            });
        });
    });
}
