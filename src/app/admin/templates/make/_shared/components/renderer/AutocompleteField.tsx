"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { X } from "lucide-react";
import { inputCls, readonlyFieldCls } from "../../styles";
import { parseOpt, flattenPageDataItem, buildSlugOptRows, debounce } from "../../utils";
import type { SearchFieldConfig } from "../../types";
import api from "@/lib/api";
import { PortalDropdown } from "@/components/ui/portal-dropdown";
import { searchAddressPredictions, getAddressDetail, type AddressPrediction } from "../../utils/googlePlaces";
import { toast } from "sonner";

/**
 * AutocompleteInput — 자동완성 선택 컴포넌트 (live 모드 전용)
 *
 * 텍스트를 입력하면 옵션 목록에서 부분 일치하는 항목을 필터링하여 드롭다운으로 표시한다.
 * 항목 선택 시 해당 value를 onChange로 전달하고, input에는 text(표시 텍스트)를 보여준다.
 *
 * 사용법:
 *   <AutocompleteInput value="ko" onChange={v => setValue(v)} opts={["한국어:ko", "영어:en"]} />
 */
interface AutocompleteInputProps {
  /** 현재 선택된 값 (value 부분, 예: "ko") */
  value: string;
  onChange: (val: string) => void;
  /** "텍스트:값" 형식 옵션 배열 */
  opts: string[];
  placeholder?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  fallbackDisplayText?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  opts,
  placeholder,
  isDisabled,
  isReadOnly,
  fallbackDisplayText,
}: AutocompleteInputProps) {
  const { t } = useI18n();

  /* 옵션 배열을 { text, value } 객체로 변환 */
  const parsedOpts = opts.map((opt) => parseOpt(opt));

  /* value(키값)로 displayText 실시간 계산 — <select value={value}>와 동일 패턴
       value가 외부에서 바뀌어도 state 동기화 없이 즉시 반영됨 */
  const matched = parsedOpts.find((o) => o.value === value);
  const displayText = matched ? t(matched.text) : fallbackDisplayText ? t(fallbackDisplayText) : "";

  /* 사용자 입력 중일 때만 사용하는 필터 텍스트 */
  const [filterText, setFilterText] = useState("");
  /* 드롭다운 열림/닫힘 상태 */
  const [isOpen, setIsOpen] = useState(false);
  /* 래퍼(선택 초기화 버튼 위치 기준) ref */
  const wrapperRef = useRef<HTMLDivElement>(null);
  /* 드롭다운 위치 기준(anchor) — 입력창 */
  const inputRef = useRef<HTMLInputElement>(null);

  /* input에 표시할 텍스트 — 열려있을 때는 필터 텍스트, 닫혔을 때는 displayText */
  const shownText = isOpen ? filterText : displayText;

  /* filterText 기준 옵션 필터링 (대소문자 무관 부분 일치) — isOpen일 때만 의미 있음 */
  const filteredOpts = parsedOpts.filter((opt) => t(opt.text).toLowerCase().includes(filterText.toLowerCase()));

  /* input 변경 핸들러 — 직접 입력 중에는 선택 value를 초기화하고 드롭다운 열기 */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value);
    setIsOpen(true);
    /* 입력 중에는 미선택 상태로 처리 */
    onChange("");
  };

  /* 옵션 항목 선택 핸들러 — isOpen=false가 되면 shownText=displayText로 자동 전환 */
  const handleSelect = (opt: { text: string; value: string }) => {
    onChange(opt.value);
    setIsOpen(false);
  };

  /* 읽기 전용 스타일 */
  const readonlyCls = isReadOnly ? readonlyFieldCls : "";

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        ref={inputRef}
        type="text"
        disabled={isDisabled}
        readOnly={isReadOnly}
        placeholder={placeholder}
        /* 값이 선택된 상태면 오른쪽에 × 버튼 공간 확보 */
        className={`${inputCls}${readonlyCls}${value ? " pr-7" : ""}`}
        value={shownText}
        /* 포커스 시 드롭다운 열기 + 기존 displayText를 필터 초기값으로 설정 */
        onFocus={() => {
          if (!isReadOnly) {
            setFilterText(matched ? displayText : "");
            setIsOpen(true);
          }
        }}
        onChange={isReadOnly ? undefined : handleInputChange}
      />
      {/* 선택값 초기화 버튼 — 값이 선택된 상태이고 비활성/읽기전용이 아닐 때만 표시 */}
      {value && !isDisabled && !isReadOnly && (
        <button
          type="button"
          /* mousedown: input blur보다 먼저 발화하여 클릭 누락 방지 */
          onMouseDown={(e) => {
            e.preventDefault(); // input blur 방지
            onChange("");
            setFilterText("");
            setIsOpen(false);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          tabIndex={-1}
          aria-label={t("common.input.clear")}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {/* 드롭다운 옵션 목록 — Portal(body)로 렌더링하여 부모 overflow에 잘리지 않음 */}
      <PortalDropdown
        open={isOpen && !isReadOnly}
        anchorRef={inputRef}
        onOutsideClick={() => setIsOpen(false)}
        className="bg-white border border-slate-200 rounded-md shadow-lg"
      >
        <ul className="max-h-48 overflow-y-auto py-1">
          {filteredOpts.length > 0 ? (
            filteredOpts.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  /* mousedown: input의 blur보다 먼저 발화하여 클릭 누락 방지 */
                  onMouseDown={() => handleSelect(opt)}
                  className="w-full px-3 py-2 text-sm text-slate-700 text-left hover:bg-slate-50 cursor-pointer"
                >
                  {t(opt.text)}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-slate-400 italic">{t("common.input.no_match")}</li>
          )}
        </ul>
      </PortalDropdown>
    </div>
  );
}

export function findSlugFallbackDisplayText(
  rawRows: Record<string, unknown>[],
  field: SearchFieldConfig,
  value: string
): string | undefined {
  if (!value || rawRows.length === 0) return undefined;
  const row = rawRows.find((r) => String(r[field.optionValueKey ?? ""] ?? "") === value);
  if (!row) return undefined;
  return String(row[field.optionTextKey ?? ""] ?? "");
}

/**
 * useOptionDerivedValues — SLUG 옵션에서 선택된 row의 파생값을 emit하는 공용 훅
 * SlugOptionSelect / SlugAutocompleteInput이 공용으로 사용한다.
 *
 * field.optionDerivedKeys에 명시된 컬럼들을 선택된 row에서 추출해 onDerivedChange로 전달한다.
 * - value === "": 각 파생키에 빈 문자열 emit
 * - rawRows 미로드 상태: emit 하지 않음
 * - lastEmittedRef로 동일한 값 재emit 방지
 */
export function useOptionDerivedValues(
  rawRows: Record<string, unknown>[],
  value: string,
  field: SearchFieldConfig,
  onDerivedChange?: (derived: Record<string, string>) => void
) {
  const lastEmittedRef = useRef<Record<string, string> | null>(null);

  useEffect(() => {
    if (!field.optionDerivedKeys) return;
    const derivedKeys = field.optionDerivedKeys
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (derivedKeys.length === 0) return;

    let derived: Record<string, string>;

    if (value === "") {
      derived = {};
      derivedKeys.forEach((k) => {
        derived[k] = "";
      });
    } else {
      if (rawRows.length === 0) return;
      const row = rawRows.find((r) => String(r[field.optionValueKey ?? ""] ?? "") === value);
      if (!row) return;
      derived = {};
      derivedKeys.forEach((k) => {
        derived[k] = String(row[k] ?? "");
      });
    }

    const prev = lastEmittedRef.current;
    const isSame =
      !!prev &&
      Object.keys(derived).length === Object.keys(prev).length &&
      Object.entries(derived).every(([k, v]) => prev[k] === v);
    if (isSame) return;

    lastEmittedRef.current = derived;
    onDerivedChange?.(derived);
  }, [rawRows, value, field.optionDerivedKeys, field.optionValueKey, onDerivedChange]);
}

/**
 * SlugAutocompleteInput — SLUG API에서 옵션을 fetch하여 AutocompleteInput에 전달
 *
 * optionSlug로 /page-data/{slug} API를 호출하고,
 * optionValueKey / optionTextKey로 옵션 배열("텍스트:값" 형식)을 구성한 뒤
 * AutocompleteInput에 전달하여 자동완성 UI를 제공한다.
 *
 * optionOrderKey / optionOrderDir 지정 시 FE에서 정렬 적용.
 * optionFilter: "$fieldKey" 문법으로 같은 Form/Search 위젯 내 다른 필드의 현재값을 참조할 수 있다.
 */
export function SlugAutocompleteInput({
  field,
  value,
  onChange,
  onDerivedChange,
  isDisabled,
  isReadOnly,
  placeholder,
  rowData,
}: {
  field: SearchFieldConfig;
  value: string;
  onChange?: (v: string) => void;
  onDerivedChange?: (derived: Record<string, string>) => void;
  isDisabled: boolean;
  isReadOnly: boolean;
  placeholder: string;
  rowData?: Record<string, unknown>;
}) {
  /* SLUG API에서 fetch한 원본 행(flatten 결과) — optionFilter 평가는 아래 useMemo에서 별도로 수행 */
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);

  /* optionSlug 변경 시에만 API 재조회 — optionFilter/rowData 변경은 재조회 없이 useMemo에서만 재계산 */
  useEffect(() => {
    if (!field.optionSlug) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 기존 코드, 이번 작업과 무관, 추후 기술부채로 별도 정리 예정
      setRawRows([]);
      return;
    }
    /* fetch 시작 시 먼저 비움 — 비동기 응답 대기 중 이전 slug의 데이터로 새 필터가 적용되는 stale 현상 방지 */

    setRawRows([]);
    api
      .get(`/page-data/${field.optionSlug}`, { params: { size: "9999" } })
      .then((res) => {
        const rows = (res.data?.content ?? []) as { dataJson: Record<string, unknown> }[];
        /* flattenPageDataItem으로 중첩 dataJson → flat key 변환 */
        const flatRows = rows.map((item) => flattenPageDataItem(item as Parameters<typeof flattenPageDataItem>[0]));
        setRawRows(flatRows);
      })
      .catch(() => setRawRows([]));
  }, [field.optionSlug]);

  /* optionFilter 평가(rowData의 $fieldKey 참조 포함) + Value/Text 추출 + 정렬 — 참조 필드 값이 바뀔 때마다 재계산 */
  const slugOptRows = useMemo(
    // eslint-disable-next-line react-hooks/preserve-manual-memoization -- 기존 코드, 이번 작업과 무관, 추후 기술부채로 별도 정리 예정
    () => buildSlugOptRows(rawRows, field, rowData),
    [
      rawRows,
      field.optionValueKey,
      field.optionTextKey,
      field.optionOrderKey,
      field.optionOrderDir,
      field.optionFilter,
      rowData,
    ]
  );
  const slugOpts = slugOptRows.map(({ value: optValue, text }) => `${text}:${optValue}`);

  useOptionDerivedValues(rawRows, value, field, onDerivedChange);

  const hasMatchedOpt = slugOptRows.some((opt) => opt.value === value);
  const fallbackDisplayText = !hasMatchedOpt ? findSlugFallbackDisplayText(rawRows, field, value) : undefined;

  return (
    <AutocompleteInput
      value={value}
      onChange={(v) => onChange?.(v)}
      opts={slugOpts}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      fallbackDisplayText={fallbackDisplayText}
    />
  );
}

/**
 * AddressAutocompleteInput — 주소검색 자동완성 입력 (live 모드 전용)
 *
 * 입력할 때마다(디바운스 300ms) Google Places 저수준 검색 API로 후보를 조회하여
 * 바로 위 AutocompleteInput과 동일한 PortalDropdown 골격으로 목록을 보여준다
 * (preview 단계에서 만든 UI와 동일한 모양을 live에서도 유지하기 위함).
 * 후보 선택 시 상세정보(좌표)까지 조회한 뒤 onAddressSelect(address, lat, lng)를
 * 한 번에 호출한다 — dateRange의 onFromChange/onToChange처럼 여러 값을 동시에
 * 상위로 전달하는 배치 콜백 패턴.
 *
 * 사용법:
 *   <AddressAutocompleteInput value={value} onAddressSelect={(addr, lat, lng) => ...} />
 */
interface AddressAutocompleteInputProps {
  /** 현재 저장된 주소 텍스트 */
  value: string;
  /** 후보 선택 시 주소+위도+경도를 한 번에 전달 */
  onAddressSelect?: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  /** 검색 결과 언어 — 필드 설정 addressLanguage 값을 그대로 전달받는다 (기본: 'en') */
  language: "ko" | "en";
}

export function AddressAutocompleteInput({
  value,
  onAddressSelect,
  placeholder,
  isDisabled,
  isReadOnly,
  language,
}: AddressAutocompleteInputProps) {
  const { t } = useI18n();

  /* 입력창에 보이는 텍스트 — 선택 전에는 타이핑 중인 검색어, 선택 후에는 저장된 주소 */
  const [text, setText] = useState(value);
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  /* 상세정보(좌표) 조회 중에는 중복 클릭 방지 */
  const [isResolving, setIsResolving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* 외부(초기 데이터 복원 등)에서 value가 바뀌면 입력창 텍스트를 동기화 */
  useEffect(() => {
    setText(value);
  }, [value]);

  /* 디바운스된 검색 함수 — 컴포넌트 인스턴스당 한 번만 생성 */
  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        setIsSearching(true);
        const results = await searchAddressPredictions(query, language);
        setPredictions(results);
        setIsSearching(false);
      }, 300),
    [language]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setText(next);
    setIsOpen(true);
    if (next.trim()) {
      debouncedSearch(next);
    } else {
      setPredictions([]);
    }
  };

  /* 후보 선택 → 상세정보(좌표) 조회 후 3값(주소+위도+경도)을 한 번에 상위로 전달 */
  const handleSelect = async (prediction: AddressPrediction) => {
    setIsOpen(false);
    setIsResolving(true);
    const detail = await getAddressDetail(prediction.placeId, language);
    setIsResolving(false);
    if (!detail) {
      toast.error("주소 상세정보를 가져오지 못했습니다.");
      return;
    }
    setText(detail.address);
    onAddressSelect?.(detail.address, detail.lat, detail.lng);
  };

  const readonlyCls = isReadOnly ? readonlyFieldCls : "";

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        disabled={isDisabled}
        readOnly={isReadOnly}
        placeholder={placeholder}
        className={`${inputCls}${readonlyCls}`}
        value={text}
        onFocus={() => {
          if (!isReadOnly) setIsOpen(true);
        }}
        onChange={isReadOnly ? undefined : handleInputChange}
      />
      {/* 드롭다운 옵션 목록 — select autocomplete(AutocompleteInput)와 동일한 PortalDropdown 골격 재사용 */}
      <PortalDropdown
        open={isOpen && !isReadOnly}
        anchorRef={inputRef}
        onOutsideClick={() => setIsOpen(false)}
        className="bg-white border border-slate-200 rounded-md shadow-lg"
      >
        <ul className="max-h-48 overflow-y-auto py-1">
          {isSearching || isResolving ? (
            <li className="px-3 py-2 text-sm text-slate-400 italic">검색 중...</li>
          ) : predictions.length > 0 ? (
            predictions.map((p) => (
              <li key={p.placeId}>
                <button
                  type="button"
                  /* mousedown: input의 blur보다 먼저 발화하여 클릭 누락 방지 */
                  onMouseDown={() => handleSelect(p)}
                  className="w-full px-3 py-2 text-sm text-slate-700 text-left hover:bg-slate-50 cursor-pointer"
                >
                  {p.description}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-slate-400 italic">{t("common.input.no_match")}</li>
          )}
        </ul>
      </PortalDropdown>
    </div>
  );
}
