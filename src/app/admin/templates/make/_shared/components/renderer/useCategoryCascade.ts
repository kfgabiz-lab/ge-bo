"use client";

/**
 * useCategoryCascade — CategorySearchField 캐스케이딩 로드/선택 로직 훅
 *
 * 상위 depth를 먼저 고르면 하위 depth 옵션이 로드되는 정방향 캐스케이딩만 지원한다.
 * 화면에 노출할 depth는 field.activeDepths(없으면 field.maxDepth로부터 파생)로 결정하며,
 * 배열의 각 위치(idx)는 activeDepths[idx](실제 depth 번호)에 대응한다.
 *
 * 옵션 사전필터(optionFilterDepth 등)가 설정된 경우, 마운트 시 1회 "depth별 허용 value 집합"을
 * 미리 계산해두고(computeOptionPreFilter) 각 depth 옵션을 로드할 때마다 그 집합과 교집합해서
 * 최종 옵션으로 보여준다. 설정이 없으면 기존과 동일하게 전체 옵션을 그대로 보여준다.
 *
 * 사용법:
 *   const { depthValues, depthOptions, depthLoading, disabledDepths, handleSelect }
 *     = useCategoryCascade({ mode, field, onChange });
 */

import { useState, useCallback, useEffect, useRef } from "react";
import api from "@/lib/api";
import { resolveAccessor, evalConditionExpr } from "../../utils";
import type { SearchFieldConfig } from "../../types";
import type { RendererMode } from "./types";

/** depth selectbox 옵션 1건 */
export interface CategoryItem {
  value: string;
  text: string;
  /** 이 항목의 부모 id — parentField 경로로 추출 (지정하지 않으면 undefined) */
  parentId?: string;
}

interface UseCategoryCascadeParams {
  mode: RendererMode;
  field: SearchFieldConfig;
  onChange?: (v: string) => void;
}

interface UseCategoryCascadeResult {
  /** depth별 현재 선택 값 */
  depthValues: string[];
  /** depth별 selectbox 옵션 목록 */
  depthOptions: CategoryItem[][];
  /** depth별 API 로딩 상태 */
  depthLoading: boolean[];
  /** true면 해당 depth는 상위 미선택으로 비활성 */
  disabledDepths: boolean[];
  /** true면 옵션 사전필터 설정 누락(상위 부모 ID 경로 미입력)으로 이 depth의 옵션이 항상 0건이 되는 상태 —
   *  실제 데이터가 없어서가 아니라 빌더 설정 오류라는 것을 화면에서 구분할 수 있게 별도로 내려준다 */
  configErrorDepths: boolean[];
  /** depth selectbox 선택 처리 (idx: activeDepths 배열의 0-based 위치) */
  handleSelect: (idx: number, value: string) => void;
}

/**
 * depth 목록 조회 + CategoryItem 매핑 공용 헬퍼.
 * parentValue를 주면 eq_parentId로 필터하고, 주지 않으면 depth 전체를 가져온다.
 */
async function fetchDepthItems(params: {
  dbSlug: string;
  depth: number;
  parentValue?: string | null;
  valueField: string;
  textField: string;
  filterExpr?: string;
  /** 지정 시 각 item의 부모 id를 이 경로로 함께 추출 (옵션 사전필터의 상향 교집합 매핑용) */
  parentField?: string;
  /** 지정 시 size 파라미터로 전달 — BE 기본 페이지 크기(20건)를 넘는 전체 목록이 필요할 때만 사용.
   *  depthFilters/옵션 사전필터(클라이언트 필터)는 응답에 실제로 담긴 건만 걸러낼 수 있으므로,
   *  서버가 페이지네이션으로 잘라내기 전에 depth 전체를 한 번에 받아와야 할 때 지정한다.
   *  일반 정방향 로드는 이 값을 넘기지 않아 기존 기본 20건 동작을 그대로 유지한다. */
  size?: number;
}): Promise<CategoryItem[]> {
  const { dbSlug, depth, parentValue, valueField, textField, filterExpr, parentField, size } = params;

  const reqParams: Record<string, string> = { eq_depth: String(depth) };
  if (parentValue) reqParams.eq_parentId = parentValue;
  if (size) reqParams.size = String(size);

  const res = await api.get(`/page-data/${dbSlug}`, { params: reqParams });
  const rawItems = (res.data?.content ?? []) as unknown[];

  /* depthFilters/옵션 사전필터 지정 시 raw item(dataJson) 단계에서 먼저 필터 — evalConditionExpr 공통함수 재사용
       (_fetchedRel{id}도 서버가 dataJson 최상위에 병합해 내려주므로 동일하게 resolveAccessor로 접근 가능) */
  const filteredItems = filterExpr
    ? rawItems.filter((item) => {
        const dataJson = (item as { dataJson?: Record<string, unknown> }).dataJson ?? {};
        return evalConditionExpr(filterExpr, (key) => {
          const v = resolveAccessor(dataJson, key);
          return v != null ? String(v) : undefined;
        });
      })
    : rawItems;

  return filteredItems.map((item) => {
    const raw = item as { id: number; dataJson?: Record<string, unknown> };
    const dataJson = raw.dataJson ?? {};
    const resolvedValue = resolveAccessor(dataJson, valueField);
    const value = String(resolvedValue != null ? resolvedValue : (raw.id ?? ""));
    /* Text 경로가 비어있거나(resolveAccessor(dataJson, '') → undefined) 실제 값이 빈 문자열이면
           value로 대체 — Value는 || 'id' + raw.id 폴백이 있어 항상 채워지는데 Text만 폴백이 없어서
           옵션 자체는 로드되는데 라벨만 빈 문자열로 보이는 비대칭 버그를 막는다(최소한 id라도 보이게) */
    const resolvedText = resolveAccessor(dataJson, textField);
    const text = resolvedText != null && String(resolvedText) !== "" ? String(resolvedText) : value;
    const parentIdRaw = parentField ? resolveAccessor(dataJson, parentField) : undefined;
    return { value, text, parentId: parentIdRaw != null ? String(parentIdRaw) : undefined };
  });
}

export function useCategoryCascade({ mode, field, onChange }: UseCategoryCascadeParams): UseCategoryCascadeResult {
  const isPreview = mode === "preview";

  /* 화면에 노출할 depth 번호 배열 — 미설정 시(레거시 데이터) maxDepth로부터 [1..maxDepth] 파생 (하위호환) */
  const activeDepths = field.activeDepths ?? Array.from({ length: field.maxDepth ?? 1 }, (_, i) => i + 1);
  const depthCount = activeDepths.length;

  /* ── 배열 참조가 매 렌더마다 바뀌므로 ref로 최신값 유지 ── */
  const activeDepthsRef = useRef(activeDepths);
  const depthValueFieldsRef = useRef(field.depthValueFields ?? []);
  const depthTextFieldsRef = useRef(field.depthTextFields ?? []);
  const depthFiltersRef = useRef(field.depthFilters ?? []);
  const depthParentFieldsRef = useRef(field.depthParentFields ?? []);
  activeDepthsRef.current = activeDepths;
  depthValueFieldsRef.current = field.depthValueFields ?? [];
  depthTextFieldsRef.current = field.depthTextFields ?? [];
  depthFiltersRef.current = field.depthFilters ?? [];
  depthParentFieldsRef.current = field.depthParentFields ?? [];

  /* 옵션 사전필터로 계산된 "depth별 허용 value 집합" — 설정이 없거나 계산 전이면 null(=제한 없음) */
  const allowedSetsRef = useRef<(Set<string> | null)[]>(Array(depthCount).fill(null));

  const [depthValues, setDepthValues] = useState<string[]>(Array(depthCount).fill(""));
  const [depthOptions, setDepthOptions] = useState<CategoryItem[][]>(Array(depthCount).fill([]));
  const [depthLoading, setDepthLoading] = useState<boolean[]>(Array(depthCount).fill(false));
  /* 옵션 사전필터 설정 누락(상위 부모 ID 경로 미입력)으로 이 depth가 항상 0건이 되는 상태 — 화면 안내용 */
  const [configErrorDepths, setConfigErrorDepths] = useState<boolean[]>(Array(depthCount).fill(false));

  /* ══════════════════════════════════════════ */
  /*  옵션 사전필터 — 마운트 시 1회, depth별 허용 value 집합 계산  */
  /* ══════════════════════════════════════════ */

  /**
   * optionFilterDepth 레코드 전량을 조회해 optionFilterExpr로 걸러낸 뒤,
   * 최심 가시 depth부터 depthParentFields를 타고 위로 올라가며 depth별 허용 집합을 좁혀간다.
   * - optionFilterDepth === 최심 가시 depth: 필터 통과 레코드 자기 자신의 value로 제한
   * - optionFilterDepth >  최심 가시 depth(1단계 더 깊은 리프 등): optionFilterParentField로
   *   추출한 부모 id를 최심 가시 depth의 허용 집합으로 사용
   *
   * ⚠ 설정 누락 방어: optionFilterParentField(리프 필터일 때) 또는 depthParentFields[idx+1](상향 매핑 단계)이
   * 비어 있으면 허용 집합이 "데이터가 없어서"가 아니라 "설정이 빠져서" 항상 빈 Set이 되어버린다. 이 경우 API를
   * 호출해봐야 결과가 결정적으로 비므로 호출을 건너뛰고, console.warn + configErrorDepths로 화면에 원인을 알린다.
   */
  const computeOptionPreFilter = useCallback(async () => {
    const dbSlug = field.dbSlug;
    const filterDepth = field.optionFilterDepth;
    if (!dbSlug || filterDepth == null) return;

    const depths = activeDepthsRef.current;
    const deepestIdx = depths.length - 1;
    const deepestDepthNum = depths[deepestIdx];
    const configErrorIdx: boolean[] = Array(depths.length).fill(false);

    /* 1. 필터 depth 전량 조회 + optionFilterExpr로 필터링 (fetchDepthItems의 filterExpr 재사용)
              — 필터 depth가 최심 가시 depth보다 깊은 리프 필터인데 optionFilterParentField가 비어 있으면
                모든 item.parentId가 undefined가 되어 최심 가시 depth 허용 집합이 항상 빈 Set이 된다 */
    let allowed = new Set<string>();
    if (filterDepth !== deepestDepthNum && !field.optionFilterParentField) {
      console.warn(
        `[CategoryField] 옵션 사전필터: 필터 depth(${filterDepth})가 최심 가시 depth(${deepestDepthNum})보다 깊은데 ` +
          `"부모 ID 경로"(optionFilterParentField)가 비어 있어 depth ${deepestDepthNum} 옵션이 전부 0건이 됩니다. ` +
          `빌더의 옵션 사전필터 설정에서 부모 ID 경로를 입력하세요.`
      );
      configErrorIdx[deepestIdx] = true;
    } else {
      const filterMatches = await fetchDepthItems({
        dbSlug,
        depth: filterDepth,
        parentValue: null,
        valueField: filterDepth === deepestDepthNum ? depthValueFieldsRef.current[deepestIdx] || "id" : "id",
        textField: "",
        filterExpr: field.optionFilterExpr,
        parentField: field.optionFilterParentField,
        size: 9999,
      });
      /* 2. 최심 가시 depth의 허용 집합 확보 */
      if (filterDepth === deepestDepthNum) {
        filterMatches.forEach((it) => allowed.add(it.value));
      } else {
        filterMatches.forEach((it) => {
          if (it.parentId) allowed.add(it.parentId);
        });
      }
    }
    const nextSets: (Set<string> | null)[] = Array(depths.length).fill(null);
    nextSets[deepestIdx] = allowed;

    /* 3. 상위 가시 depth로 순차 상향 매핑 — 각 depth의 depthParentFields로 부모 id를 추출해 좁혀간다.
              depthParentFields[idx+1]이 비어 있으면 climbItems의 parentId가 전부 undefined가 되어 결과가
              결정적으로 빈 Set이 되므로, 호출 자체를 건너뛰고 원인을 명확히 알린다.
              한 번 깨지면(broken) 그 위 depth들도 전부 같은 원인으로 0건이 되므로 설정 오류 표시를 함께 물려준다 */
    let broken = configErrorIdx[deepestIdx];
    for (let idx = deepestIdx - 1; idx >= 0; idx--) {
      const parentField = depthParentFieldsRef.current[idx + 1];
      if (!parentField) {
        console.warn(
          `[CategoryField] 옵션 사전필터: depth ${depths[idx + 1]}의 "상위 부모 ID 경로"가 비어 있어 ` +
            `depth ${depths[idx]} 옵션이 전부 0건이 됩니다. depthParentFields[${idx + 1}]를 설정하세요.`
        );
        configErrorIdx[idx] = true;
        broken = true;
        allowed = new Set<string>();
        nextSets[idx] = allowed;
        continue;
      }
      if (broken) configErrorIdx[idx] = true; // 하위 depth가 이미 깨져 있어 이 depth도 같은 원인으로 0건 — 표시만 물려받고 조회는 그대로 진행
      const climbItems = await fetchDepthItems({
        dbSlug,
        depth: depths[idx + 1],
        parentValue: null,
        valueField: depthValueFieldsRef.current[idx + 1] || "id",
        textField: "",
        parentField,
        size: 9999,
      });
      const nextAllowed = new Set<string>();
      climbItems.forEach((it) => {
        if (allowed.has(it.value) && it.parentId) nextAllowed.add(it.parentId);
      });
      allowed = nextAllowed;
      nextSets[idx] = allowed;
    }

    allowedSetsRef.current = nextSets;
    setConfigErrorDepths(configErrorIdx);
  }, [field.dbSlug, field.optionFilterDepth, field.optionFilterExpr, field.optionFilterParentField]);

  /* ══════════════════════════════════════════ */
  /*  정방향 캐스케이딩 — 상위 선택 시 하위 depth 로드  */
  /* ══════════════════════════════════════════ */

  const loadDepthOptions = useCallback(
    async (idx: number, parentValue: string | null) => {
      if (!field.dbSlug) return;
      const depth = activeDepthsRef.current[idx];
      /* Text 경로 미설정 경고 — 옵션 자체는 정상 로드되지만(캐스케이드 정상) 라벨이 value로 대체 표시되어
           "안 보이는 것처럼" 오인되기 쉬우므로, 원인을 바로 알 수 있게 콘솔에 남긴다(화면 placeholder까지
           바꾸지는 않음 — 데이터 자체는 정상이라 configErrorDepths류의 "설정 오류" 표시는 과함) */
      if (!depthTextFieldsRef.current[idx]) {
        console.warn(
          `[CategoryField] depth ${depth}의 "Text" 경로가 비어 있어 옵션 라벨이 값(id 등)으로 대체 표시됩니다. ` +
            `depthTextFields[${idx}]를 설정하세요.`
        );
      }
      setDepthLoading((prev) => {
        const next = [...prev];
        next[idx] = true;
        return next;
      });
      try {
        const items = await fetchDepthItems({
          dbSlug: field.dbSlug,
          depth,
          parentValue,
          valueField: depthValueFieldsRef.current[idx] || "id",
          textField: depthTextFieldsRef.current[idx] || "",
          filterExpr: depthFiltersRef.current[idx],
        });
        /* 옵션 사전필터 허용 집합과 교집합 — 설정 없으면 allowedSetsRef.current[idx]가 null이라 전체 통과 */
        const allowedSet = allowedSetsRef.current[idx];
        const finalItems = allowedSet ? items.filter((it) => allowedSet.has(it.value)) : items;
        setDepthOptions((prev) => {
          const next = [...prev];
          next[idx] = finalItems;
          return next;
        });
      } catch {
        /* 오류 시 빈 목록 유지 */
      } finally {
        setDepthLoading((prev) => {
          const next = [...prev];
          next[idx] = false;
          return next;
        });
      }
    },
    [field.dbSlug]
  ); // dbSlug만 의존 — 배열 ref로 최신값 접근하여 무한루프 방지

  /* 마운트 시(live 모드) — 옵션 사전필터가 있으면 허용 집합을 먼저 계산한 뒤 첫 depth 로드 */
  useEffect(() => {
    if (isPreview) return;
    let cancelled = false;
    (async () => {
      if (field.optionFilterDepth != null) {
        await computeOptionPreFilter();
      }
      if (!cancelled) loadDepthOptions(0, null);
    })();
    return () => {
      cancelled = true;
    };
  }, [isPreview, field.optionFilterDepth, computeOptionPreFilter, loadDepthOptions]);

  /**
   * depth selectbox 선택 처리 — idx는 activeDepths 배열의 0-based 위치.
   * 하위 depth 선택값·옵션을 초기화하고, 다음 depth가 있으면 그 옵션을 로드한다.
   */
  const handleSelect = useCallback(
    (idx: number, selectedValue: string) => {
      setDepthValues((prev) => {
        const next = [...prev];
        next[idx] = selectedValue;
        for (let i = idx + 1; i < depthCount; i++) next[i] = "";
        return next;
      });
      setDepthOptions((prev) => {
        const next = [...prev];
        for (let i = idx + 1; i < depthCount; i++) next[i] = [];
        return next;
      });
      onChange?.(selectedValue);
      if (selectedValue && idx < depthCount - 1) {
        loadDepthOptions(idx + 1, selectedValue);
      }
    },
    [depthCount, onChange, loadDepthOptions]
  );

  /* 상위 depth 미선택 시 하위 depth는 비활성 */
  const disabledDepths = Array.from({ length: depthCount }, (_, i) => i > 0 && !depthValues[i - 1]);

  return { depthValues, depthOptions, depthLoading, disabledDepths, configErrorDepths, handleSelect };
}
