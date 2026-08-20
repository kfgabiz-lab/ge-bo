"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Lock } from "lucide-react";
import { toast } from "sonner";
import { useMessageResourceStore } from "@/store/use-message-resource-store";
import { useI18n } from "@/hooks/use-i18n";

/* ── Zod 스키마 팩토리 — t 주입으로 메시지 다국어 처리 ── */

const buildCreateSchema = (t: (key: string) => string) =>
  z.object({
    key: z
      .string()
      .min(1, t("validation.i18n.keyRequired"))
      .max(255, t("validation.i18n.keyMaxLength"))
      .regex(/^[a-zA-Z0-9.]+$/, t("validation.i18n.keyFormat")),
    ko: z.string().min(1, t("validation.i18n.koreanRequired")).max(500, t("validation.i18n.koreanMaxLength")),
    en: z.string().max(500, t("validation.i18n.englishMaxLength")).optional(),
    resourceType: z.enum(["WORD", "SENTENCE"]),
  });

const buildUpdateSchema = (t: (key: string) => string) =>
  z.object({
    ko: z.string().min(1, t("validation.i18n.koreanRequired")).max(500, t("validation.i18n.koreanMaxLength")),
    en: z.string().max(500, t("validation.i18n.englishMaxLength")).optional(),
    active: z.boolean(),
    resourceType: z.enum(["WORD", "SENTENCE"]),
  });

const createSchema = buildCreateSchema((key) => key);
const updateSchema = buildUpdateSchema((key) => key);

type CreateFormData = z.infer<typeof createSchema>;
type UpdateFormData = z.infer<typeof updateSchema>;

/* ── 컴포넌트 ── */

export const MessageResourceDrawer = () => {
  const { isDrawerOpen, closeDrawer, selectedItem, createItem, updateItem, isLoading, refetch } =
    useMessageResourceStore();
  const { t } = useI18n();

  /* 수정 모드 여부 */
  const isEdit = !!selectedItem;

  /* 등록 폼 */
  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(buildCreateSchema(t)),
    defaultValues: { key: "", ko: "", en: "", resourceType: "WORD" },
  });

  /* 수정 폼 */
  const updateForm = useForm<UpdateFormData>({
    resolver: zodResolver(buildUpdateSchema(t)),
    defaultValues: { ko: "", en: "", active: true, resourceType: "WORD" },
  });

  /* Drawer 열릴 때 폼 초기화 */
  useEffect(() => {
    if (isEdit && selectedItem) {
      updateForm.reset({
        ko: selectedItem.ko,
        en: selectedItem.en ?? "",
        active: selectedItem.active,
        resourceType: selectedItem.resourceType ?? "WORD",
      });
    } else {
      createForm.reset({ key: "", ko: "", en: "", resourceType: "WORD" });
    }
  }, [selectedItem, isDrawerOpen]);

  /* validation 실패 시 첫 번째 에러 메시지를 toast로 표시 */
  const onCreateError = (errors: typeof createForm.formState.errors) => {
    const first = Object.values(errors)[0];
    if (first?.message) toast.error(first.message as string);
  };
  const onUpdateError = (errors: typeof updateForm.formState.errors) => {
    const first = Object.values(errors)[0];
    if (first?.message) toast.error(first.message as string);
  };

  /* 등록 제출 */
  const onCreateSubmit = async (data: CreateFormData) => {
    try {
      await createItem({ key: data.key, ko: data.ko, en: data.en, resourceType: data.resourceType });
      refetch();
    } catch {
      /* 오류는 store에서 toast 처리 */
    }
  };

  /* 수정 제출 */
  const onUpdateSubmit = async (data: UpdateFormData) => {
    if (!selectedItem) return;
    try {
      await updateItem(selectedItem.id, {
        ko: data.ko,
        en: data.en,
        active: data.active,
        resourceType: data.resourceType,
      });
      refetch();
    } catch {
      /* 오류는 store에서 toast 처리 */
    }
  };

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={closeDrawer}
      />

      {/* Drawer 본체 */}
      <div className="relative w-[420px] bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-250 border-l border-[#e8eaed]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8eaed]">
          <div>
            <h2 className="text-sm font-bold text-[#111827]">
              {isEdit ? t("i18n.title.editItem") : t("i18n.btn.addItem")}
            </h2>
            <p className="text-sm text-[#9ca3af] mt-0.5">
              {isEdit ? t("i18n.desc.editItem") : t("i18n.desc.createItem")}
            </p>
          </div>
          <button
            onClick={closeDrawer}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f4f5f7] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 바디 — 등록/수정 폼 */}
        {isEdit ? (
          /* 수정 폼 */
          <form
            onSubmit={updateForm.handleSubmit(onUpdateSubmit, onUpdateError)}
            className="flex-1 overflow-y-auto px-5 py-5 space-y-5"
          >
            <section className="space-y-4">
              <p className="text-sm font-semibold text-[#9ca3af] uppercase tracking-widest">
                {t("i18n.label.itemInfo")}
              </p>

              {/* 유형 선택 — 단어 / 문장 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#374151]">
                  {t("common.label.type")} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {(["WORD", "SENTENCE"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateForm.setValue("resourceType", type)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                        updateForm.watch("resourceType") === type
                          ? "border-[#4361ee] bg-[#4361ee]/5 text-[#4361ee]"
                          : "border-[#e2e4e9] text-[#374151] hover:border-[#c4c9d4]"
                      }`}
                    >
                      {type === "WORD" ? t("i18n.type.word") : t("i18n.type.sentence")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Key — 수정 불가 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#374151]">{t("i18n.label.key")}</label>
                <div className="relative">
                  <input
                    value={selectedItem?.key ?? ""}
                    readOnly
                    className="w-full text-sm border border-[#e2e4e9] rounded-lg px-3 py-2 bg-[#f9fafb] text-[#9ca3af] font-mono cursor-not-allowed pr-9"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#d1d5db]" />
                  <p className="text-[11px] text-[#9ca3af] mt-1">{t("i18n.notice.keyReadonly")}</p>
                </div>
              </div>

              {/* 한국어 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#374151]">
                  {t("i18n.label.korean")} <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...updateForm.register("ko")}
                  rows={3}
                  className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4361ee]/15 focus:border-[#4361ee] transition-all resize-none ${updateForm.formState.errors.ko ? "border-red-400 bg-red-50" : "border-[#e2e4e9]"}`}
                />
              </div>

              {/* 영어 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#374151]">{t("i18n.label.english")}</label>
                <textarea
                  {...updateForm.register("en")}
                  rows={3}
                  className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4361ee]/15 focus:border-[#4361ee] transition-all resize-none ${updateForm.formState.errors.en ? "border-red-400 bg-red-50" : "border-[#e2e4e9]"}`}
                />
              </div>

              {/* 사용여부 토글 — 수정 모드에서만 노출 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#374151]">{t("common.label.isActive")}</label>
                <button
                  type="button"
                  onClick={() => updateForm.setValue("active", !updateForm.watch("active"))}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-lg border transition-all ${updateForm.watch("active") ? "border-[#4361ee] bg-[#4361ee]/5" : "border-[#e2e4e9] hover:border-[#c4c9d4]"}`}
                >
                  <span
                    className={`text-xs font-semibold ${updateForm.watch("active") ? "text-[#4361ee]" : "text-[#374151]"}`}
                  >
                    {updateForm.watch("active") ? t("common.status.active") : t("common.status.inactive")}
                  </span>
                  <div
                    className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${updateForm.watch("active") ? "bg-[#4361ee]" : "bg-[#e2e4e9]"}`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${updateForm.watch("active") ? "translate-x-4" : "translate-x-0.5"}`}
                    />
                  </div>
                </button>
              </div>
            </section>
          </form>
        ) : (
          /* 등록 폼 */
          <form
            onSubmit={createForm.handleSubmit(onCreateSubmit, onCreateError)}
            className="flex-1 overflow-y-auto px-5 py-5 space-y-5"
          >
            <section className="space-y-4">
              <p className="text-sm font-semibold text-[#9ca3af] uppercase tracking-widest">
                {t("i18n.label.itemInfo")}
              </p>

              {/* 유형 선택 — 단어 / 문장 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#374151]">
                  {t("common.label.type")} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {(["WORD", "SENTENCE"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => createForm.setValue("resourceType", type)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                        createForm.watch("resourceType") === type
                          ? "border-[#4361ee] bg-[#4361ee]/5 text-[#4361ee]"
                          : "border-[#e2e4e9] text-[#374151] hover:border-[#c4c9d4]"
                      }`}
                    >
                      {type === "WORD" ? t("i18n.type.word") : t("i18n.type.sentence")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Key */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#374151]">
                  {t("i18n.label.key")} <span className="text-red-500">*</span>
                </label>
                <input
                  {...createForm.register("key")}
                  placeholder={t("i18n.placeholder.keyExample")}
                  className={`w-full text-sm border rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-[#4361ee]/15 focus:border-[#4361ee] transition-all ${createForm.formState.errors.key ? "border-red-400 bg-red-50" : "border-[#e2e4e9]"}`}
                />
              </div>

              {/* 한국어 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#374151]">
                  {t("i18n.label.korean")} <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...createForm.register("ko")}
                  rows={3}
                  placeholder={t("i18n.placeholder.koreanInput")}
                  className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4361ee]/15 focus:border-[#4361ee] transition-all resize-none ${createForm.formState.errors.ko ? "border-red-400 bg-red-50" : "border-[#e2e4e9]"}`}
                />
              </div>

              {/* 영어 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#374151]">{t("i18n.label.english")}</label>
                <textarea
                  {...createForm.register("en")}
                  rows={3}
                  placeholder={t("i18n.placeholder.englishInput")}
                  className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4361ee]/15 focus:border-[#4361ee] transition-all resize-none ${createForm.formState.errors.en ? "border-red-400 bg-red-50" : "border-[#e2e4e9]"}`}
                />
              </div>
            </section>
          </form>
        )}

        {/* 푸터 */}
        <div className="px-5 py-4 border-t border-[#e8eaed] flex gap-2.5">
          <button
            type="button"
            onClick={closeDrawer}
            className="flex-1 py-2.5 text-sm font-semibold text-[#374151] border border-[#e2e4e9] rounded-lg hover:bg-[#f4f5f7] transition-all"
          >
            {t("common.btn.cancel")}
          </button>
          <button
            type="button"
            onClick={
              isEdit
                ? updateForm.handleSubmit(onUpdateSubmit, onUpdateError)
                : createForm.handleSubmit(onCreateSubmit, onCreateError)
            }
            disabled={isLoading}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#4361ee] hover:bg-[#3451d1] rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-[#4361ee]/20"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isEdit ? (
              t("common.btn.save")
            ) : (
              t("search.btn.register")
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
