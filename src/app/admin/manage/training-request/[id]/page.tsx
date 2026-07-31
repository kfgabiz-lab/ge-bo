"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import PageLayout from "@/components/layout/page-layout";
import { GridCell } from "@/components/layout/grid-cell";
import { WidgetRenderer } from "@/app/admin/templates/make/_shared/components/renderer";
import type { SpaceWidget } from "@/app/admin/templates/make/_shared/components/renderer";
import type { FormWidget } from "@/app/admin/templates/make/_shared/components/builder/FormBuilder";
import { formatIsoDateTime } from "@/app/admin/templates/make/_shared/utils";
import api from "@/lib/api";

/* 목록 경로 — router.back()은 목록을 거치지 않고 진입(새로고침/URL 직접 입력)한 경우 엉뚱한 화면으로 되돌아가므로 명시 이동한다 */
const LIST_PATH = "/admin/manage/training-request";

/* ── Training Request(비정기 교육 신청) 상세 타입 — bo-api TrainingRequestDetailResponse와 1:1 대응 ── */
interface TrainingRequestDetail {
  id: number;
  trainingTrack: string | null;
  curriculumTitle: string | null;
  sessionTitle: string | null;
  firstName: string;
  lastName: string | null;
  company: string;
  streetAddress: string;
  address2: string | null;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  title: string | null;
  cellPhone: string | null;
  salesContact: string | null;
  sessionCount: string;
  sessionDays: string;
  scheduleStart: string;
  scheduleEnd: string;
  studentCount: string;
  trainingFormat: string;
  locationName: string | null;
  locationStreetAddress: string | null;
  locationAddress2: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationZip: string | null;
  contactPerson: string | null;
  contactDetails: string | null;
  selectedProductNames: string[];
  jobTitles: string[] | null;
  studentInvolvement: string[] | null;
  vfdUnderstanding: string | null;
  vfdUnderstandingTopics: string[] | null;
  comments: string | null;
  consentChecked: boolean;
  createdIp: string | null;
  createdAt: string;
}

function joinOrDash(values: string[] | null | undefined): string {
  return values && values.length > 0 ? values.join(", ") : "-";
}

export default function TrainingRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<TrainingRequestDetail>(`/training-requests/${id}`);
        const d = res.data;
        setFormValues({
          createdAt: formatIsoDateTime(d.createdAt),
          trainingTrack: d.trainingTrack ?? "-",
          curriculumTitle: d.curriculumTitle ?? "-",
          sessionTitle: d.sessionTitle ?? "-",
          firstName: d.firstName,
          lastName: d.lastName ?? "-",
          company: d.company,
          streetAddress: d.streetAddress,
          address2: d.address2 ?? "-",
          city: d.city,
          state: d.state,
          zip: d.zip,
          phone: d.phone,
          email: d.email,
          title: d.title ?? "-",
          cellPhone: d.cellPhone ?? "-",
          salesContact: d.salesContact ?? "-",
          sessionCount: d.sessionCount,
          sessionDays: d.sessionDays,
          scheduleStart: d.scheduleStart,
          scheduleEnd: d.scheduleEnd,
          studentCount: d.studentCount,
          trainingFormat: d.trainingFormat,
          locationName: d.locationName ?? "-",
          locationStreetAddress: d.locationStreetAddress ?? "-",
          locationAddress2: d.locationAddress2 ?? "-",
          locationCity: d.locationCity ?? "-",
          locationState: d.locationState ?? "-",
          locationZip: d.locationZip ?? "-",
          contactPerson: d.contactPerson ?? "-",
          contactDetails: d.contactDetails ?? "-",
          selectedProductNames: joinOrDash(d.selectedProductNames),
          jobTitles: joinOrDash(d.jobTitles),
          studentInvolvement: joinOrDash(d.studentInvolvement),
          vfdUnderstanding: d.vfdUnderstanding ?? "-",
          vfdUnderstandingTopics: joinOrDash(d.vfdUnderstandingTopics),
          comments: d.comments ?? "-",
          consentChecked: d.consentChecked ? "동의" : "미동의",
          createdIp: d.createdIp ?? "-",
        });
      } catch {
        router.push(LIST_PATH);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, router]);

  /* Step1: 기본 정보 */
  const STEP1_FORM_WIDGET: FormWidget = useMemo(
    () => ({
      type: "form",
      widgetId: "training-request-step1-form",
      contentKey: "trainingRequestStep1Form",
      title: "Basic Information",
      showBorder: true,
      fields: [
        {
          id: "createdAt",
          type: "input",
          label: "접수일시",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "createdAt",
          readonly: true,
        },
        {
          id: "trainingTrack",
          type: "input",
          label: "교육 트랙",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "trainingTrack",
          readonly: true,
        },
        {
          id: "curriculumTitle",
          type: "input",
          label: "Course명",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "curriculumTitle",
          readonly: true,
        },
        {
          id: "sessionTitle",
          type: "input",
          label: "제목",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "sessionTitle",
          readonly: true,
        },
        {
          id: "firstName",
          type: "input",
          label: "이름",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "firstName",
          readonly: true,
        },
        { id: "lastName", type: "input", label: "성", colSpan: 6, rowSpan: 1, fieldKey: "lastName", readonly: true },
        { id: "company", type: "input", label: "회사명", colSpan: 6, rowSpan: 1, fieldKey: "company", readonly: true },
        { id: "title", type: "input", label: "직함", colSpan: 6, rowSpan: 1, fieldKey: "title", readonly: true },
        {
          id: "streetAddress",
          type: "input",
          label: "도로명 주소",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "streetAddress",
          readonly: true,
        },
        {
          id: "address2",
          type: "input",
          label: "상세 주소",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "address2",
          readonly: true,
        },
        { id: "city", type: "input", label: "도시", colSpan: 4, rowSpan: 1, fieldKey: "city", readonly: true },
        { id: "state", type: "input", label: "주/도", colSpan: 4, rowSpan: 1, fieldKey: "state", readonly: true },
        { id: "zip", type: "input", label: "우편번호", colSpan: 4, rowSpan: 1, fieldKey: "zip", readonly: true },
        { id: "phone", type: "input", label: "전화번호", colSpan: 6, rowSpan: 1, fieldKey: "phone", readonly: true },
        { id: "email", type: "input", label: "이메일", colSpan: 6, rowSpan: 1, fieldKey: "email", readonly: true },
        {
          id: "cellPhone",
          type: "input",
          label: "휴대전화",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "cellPhone",
          readonly: true,
        },
        {
          id: "salesContact",
          type: "input",
          label: "담당 영업사원 연락처",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "salesContact",
          readonly: true,
        },
      ],
    }),
    []
  );

  /* Step2: 희망 교육 일정 */
  const STEP2_FORM_WIDGET: FormWidget = useMemo(
    () => ({
      type: "form",
      widgetId: "training-request-step2-form",
      contentKey: "trainingRequestStep2Form",
      title: "Requested Date(s) of Training",
      showBorder: true,
      fields: [
        {
          id: "sessionCount",
          type: "input",
          label: "요청 교육 횟수",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "sessionCount",
          readonly: true,
        },
        {
          id: "sessionDays",
          type: "input",
          label: "교육 기간(일수)",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "sessionDays",
          readonly: true,
        },
        {
          id: "studentCount",
          type: "input",
          label: "참가 예정 인원",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "studentCount",
          readonly: true,
        },
        {
          id: "scheduleStart",
          type: "input",
          label: "희망 시작일",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "scheduleStart",
          readonly: true,
        },
        {
          id: "scheduleEnd",
          type: "input",
          label: "희망 종료일",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "scheduleEnd",
          readonly: true,
        },
      ],
    }),
    []
  );

  /* Step3: 교육 장소 */
  const STEP3_FORM_WIDGET: FormWidget = useMemo(
    () => ({
      type: "form",
      widgetId: "training-request-step3-form",
      contentKey: "trainingRequestStep3Form",
      title: "Training Class Location",
      showBorder: true,
      fields: [
        {
          id: "trainingFormat",
          type: "input",
          label: "교육 형태",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "trainingFormat",
          readonly: true,
        },
        {
          id: "locationName",
          type: "input",
          label: "교육 장소명",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "locationName",
          readonly: true,
        },
        {
          id: "locationStreetAddress",
          type: "input",
          label: "장소 도로명 주소",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "locationStreetAddress",
          readonly: true,
        },
        {
          id: "locationAddress2",
          type: "input",
          label: "장소 상세 주소",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "locationAddress2",
          readonly: true,
        },
        {
          id: "locationCity",
          type: "input",
          label: "장소 도시",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "locationCity",
          readonly: true,
        },
        {
          id: "locationState",
          type: "input",
          label: "장소 주/도",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "locationState",
          readonly: true,
        },
        {
          id: "locationZip",
          type: "input",
          label: "장소 우편번호",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "locationZip",
          readonly: true,
        },
        {
          id: "contactPerson",
          type: "input",
          label: "현장 담당자",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "contactPerson",
          readonly: true,
        },
        {
          id: "contactDetails",
          type: "input",
          label: "현장 담당자 연락처/비고",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "contactDetails",
          readonly: true,
        },
      ],
    }),
    []
  );

  /* Step4: 교육 상세(제품/설문) */
  const STEP4_FORM_WIDGET: FormWidget = useMemo(
    () => ({
      type: "form",
      widgetId: "training-request-step4-form",
      contentKey: "trainingRequestStep4Form",
      title: "Training Class Details",
      showBorder: true,
      fields: [
        {
          id: "selectedProductNames",
          type: "input",
          label: "선택 제품",
          colSpan: 12,
          rowSpan: 1,
          fieldKey: "selectedProductNames",
          readonly: true,
        },
        {
          id: "jobTitles",
          type: "input",
          label: "수강자 직무",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "jobTitles",
          readonly: true,
        },
        {
          id: "studentInvolvement",
          type: "input",
          label: "수강자 업무 관여도",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "studentInvolvement",
          readonly: true,
        },
        {
          id: "vfdUnderstanding",
          type: "input",
          label: "VFD 이해도",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "vfdUnderstanding",
          readonly: true,
        },
        {
          id: "vfdUnderstandingTopics",
          type: "input",
          label: "VFD 이해 희망 주제",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "vfdUnderstandingTopics",
          readonly: true,
        },
        {
          id: "comments",
          type: "textarea",
          label: "의견/질문",
          colSpan: 12,
          rowSpan: 2,
          fieldKey: "comments",
          readonly: true,
          placeholder: "",
        },
        {
          id: "consentChecked",
          type: "input",
          label: "개인정보 수집·이용 동의",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "consentChecked",
          readonly: true,
        },
        {
          id: "createdIp",
          type: "input",
          label: "요청자 IP",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "createdIp",
          readonly: true,
        },
      ],
    }),
    []
  );

  const SPACE_WIDGET: SpaceWidget = useMemo(
    () => ({
      type: "space",
      widgetId: "training-request-detail-space",
      align: "right",
      showBorder: false,
      items: [
        {
          id: "s1",
          type: "action-button",
          label: "목록으로",
          colSpan: 1,
          color: "gray",
          connType: "close",
        },
      ],
    }),
    []
  );

  if (loading) return null;

  return (
    <PageLayout mode="live">
      <GridCell colSpan={12} rowSpan={9}>
        <WidgetRenderer
          mode="live"
          widget={STEP1_FORM_WIDGET}
          contentColSpan={12}
          formValues={formValues}
          onFormValuesChange={() => {}}
        />
      </GridCell>
      <GridCell colSpan={12} rowSpan={3}>
        <WidgetRenderer
          mode="live"
          widget={STEP2_FORM_WIDGET}
          contentColSpan={12}
          formValues={formValues}
          onFormValuesChange={() => {}}
        />
      </GridCell>
      <GridCell colSpan={12} rowSpan={5}>
        <WidgetRenderer
          mode="live"
          widget={STEP3_FORM_WIDGET}
          contentColSpan={12}
          formValues={formValues}
          onFormValuesChange={() => {}}
        />
      </GridCell>
      <GridCell colSpan={12} rowSpan={7}>
        <WidgetRenderer
          mode="live"
          widget={STEP4_FORM_WIDGET}
          contentColSpan={12}
          formValues={formValues}
          onFormValuesChange={() => {}}
        />
      </GridCell>

      <GridCell colSpan={12} rowSpan={1}>
        <WidgetRenderer mode="live" widget={SPACE_WIDGET} contentColSpan={12} onClose={() => router.push(LIST_PATH)} />
      </GridCell>
    </PageLayout>
  );
}
