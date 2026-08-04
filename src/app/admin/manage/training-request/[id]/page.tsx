"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import PageLayout from "@/components/layout/page-layout";
import { GridCell } from "@/components/layout/grid-cell";
import { WidgetRenderer } from "@/app/admin/templates/make/_shared/components/renderer";
import type { SpaceWidget } from "@/app/admin/templates/make/_shared/components/renderer";
import type { FormWidget } from "@/app/admin/templates/make/_shared/components/builder/FormBuilder";
import { useCodeStore } from "@/store/use-code-store";
import { useI18n } from "@/hooks/use-i18n";
import api from "@/lib/api";

/* 목록 경로 — router.back()은 목록을 거치지 않고 진입(새로고침/URL 직접 입력)한 경우 엉뚱한 화면으로 되돌아가므로 명시 이동한다 */
const LIST_PATH = "/admin/manage/training-request";

/* ── Training Request(비정기 교육 신청) 상세 타입 — bo-api TrainingRequestDetailResponse와 1:1 대응 ── */
interface TrainingRequestDetail {
  id: number;
  trainingTrack: string | null;
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

interface TrainingRegistrationDetail {
  id: number;
  curriculumId: number | null;
  sessionId: number | null;
  trainingScheduleType: string;
  trainingType: string | null;
  trainingCourse: string | null;
  curriculumTitle: string | null;
  title: string | null;
  trainingDateFrom: string | null;
  trainingDateTo: string | null;
  createdAt: string;
  email: string;
  applicant: string;
  jobTitle: string | null;
  phone: string | null;
  companyName: string | null;
  eventDate: string | null;
  streetAddress: string | null;
  address2: string | null;
  apartment: string | null;
  city: string | null;
  stateProvince: string | null;
  zipCode: string | null;
  typeOfBusiness: string | null;
  privacyConsentFlag: boolean | null;
  createdIp: string | null;
}

function joinOrDash(values: string[] | null | undefined): string {
  return values && values.length > 0 ? values.join(", ") : "-";
}

function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return "-";
  if (!start) return end as string;
  if (!end) return start;
  return start === end ? start : `${start} ~ ${end}`;
}

export default function TrainingRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const scheduleType = searchParams.get("type") ?? "02";

  const { groups: codeGroups, fetchGroups } = useCodeStore();
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    const loadRegular = async () => {
      const res = await api.get<TrainingRegistrationDetail>(`/training-registrations/${id}`);
      const d = res.data;
      setFormValues({
        trainingCourse: d.trainingCourse ?? "-",
        trainingType: d.trainingType ?? "-",
        curriculumTitle: d.curriculumTitle ?? "-",
        trainingDate: formatDateRange(d.trainingDateFrom, d.trainingDateTo),
        applicant: d.applicant,
        email: d.email,
        jobTitle: d.jobTitle ?? "-",
        phone: d.phone ?? "-",
        companyName: d.companyName ?? "-",
        streetAddress: d.streetAddress ?? "-",
        apartment: d.apartment ?? "-",
        city: d.city ?? "-",
        stateProvince: d.stateProvince ?? "-",
        zipCode: d.zipCode ?? "-",
        typeOfBusiness: d.typeOfBusiness ?? "-",
      });
    };

    const loadIrregular = async () => {
      const res = await api.get<TrainingRequestDetail>(`/training-requests/${id}`);
      const d = res.data;
      setFormValues({
        trainingScheduleType: "02",
        trainingTrack: d.trainingTrack ?? "-",
        firstName: d.firstName,
        lastName: d.lastName ?? "-",
        company: d.company,
        streetAddress: d.streetAddress,
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
        sessionDate: formatDateRange(d.scheduleStart, d.scheduleEnd),
        studentCount: d.studentCount,
        trainingFormat: d.trainingFormat,
        locationName: d.locationName ?? "-",
        locationStreetAddress: d.locationStreetAddress ?? "-",
        locationCity: d.locationCity ?? "-",
        locationState: d.locationState ?? "-",
        locationZip: d.locationZip ?? "-",
        contactPerson: d.contactPerson ?? "-",
        contactDetails: d.contactDetails ?? "-",
        selectedProductNames: joinOrDash(d.selectedProductNames),
        jobTitles: joinOrDash(d.jobTitles),
        studentInvolvement: joinOrDash(d.studentInvolvement),
        vfdUnderstandingTopics: joinOrDash(d.vfdUnderstandingTopics),
        comments: d.comments ?? "-",
      });
    };

    const load = async () => {
      try {
        if (scheduleType === "01") {
          await loadRegular();
        } else {
          await loadIrregular();
        }
      } catch {
        router.push(LIST_PATH);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, scheduleType, router]);

  const REGULAR_FORM_WIDGET: FormWidget = useMemo(
    () => ({
      type: "form",
      widgetId: "training-registration-form",
      contentKey: "trainingRegistrationForm",
      showBorder: true,
      fields: [
        {
          id: "trainingCourse",
          type: "input",
          label: "",
          labelMsgKey: "training.label.applicationTraining",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "trainingCourse",
          readonly: true,
          codeGroupCode: "TRAININGCOURSE",
          displayAs: "text",
        },
        {
          id: "trainingType",
          type: "input",
          label: "",
          labelMsgKey: "common.label.trainingType",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "trainingType",
          readonly: true,
          codeGroupCode: "TRAININGTYPE",
          displayAs: "text",
        },
        { id: "temp1", type: "hidden", label: "", colSpan: 1, rowSpan: 1 },
        {
          id: "curriculumTitle",
          type: "input",
          label: "",
          labelMsgKey: "taraining.lable.applicationCourse",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "curriculumTitle",
          readonly: true,
        },
        {
          id: "trainingDate",
          type: "input",
          label: "",
          labelMsgKey: "training.label.trainingDate",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "trainingDate",
          readonly: true,
        },
        { id: "temp2", type: "hidden", label: "", colSpan: 1, rowSpan: 1 },
        {
          id: "applicant",
          type: "input",
          label: "",
          labelMsgKey: "training.label.studentName",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "applicant",
          readonly: true,
        },
        {
          id: "email",
          type: "input",
          label: "",
          labelMsgKey: "training.label.eailAddress",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "email",
          readonly: true,
        },
        { id: "temp3", type: "hidden", label: "", colSpan: 1, rowSpan: 1 },
        {
          id: "jobTitle",
          type: "input",
          label: "",
          labelMsgKey: "common.label.jobTitle",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "jobTitle",
          readonly: true,
        },
        {
          id: "phone",
          type: "input",
          label: "",
          labelMsgKey: "common.label.phone",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "phone",
          readonly: true,
        },
        { id: "temp4", type: "hidden", label: "", colSpan: 1, rowSpan: 1 },
        {
          id: "companyName",
          type: "input",
          label: "",
          labelMsgKey: "common.label.company",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "companyName",
          readonly: true,
        },
        {
          id: "streetAddress",
          type: "input",
          label: "",
          labelMsgKey: "common.label.streetAddress",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "streetAddress",
          readonly: true,
        },
        { id: "temp5", type: "hidden", label: "", colSpan: 1, rowSpan: 1 },
        {
          id: "apartment",
          type: "input",
          label: "",
          labelMsgKey: "training.label.addresDeail",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "apartment",
          readonly: true,
        },
        {
          id: "city",
          type: "input",
          label: "",
          labelMsgKey: "common.label.city",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "city",
          readonly: true,
        },
        { id: "temp6", type: "hidden", label: "", colSpan: 1, rowSpan: 1 },
        {
          id: "stateProvince",
          type: "input",
          label: "",
          labelMsgKey: "common.label.stateProvince",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "stateProvince",
          readonly: true,
        },
        {
          id: "zipCode",
          type: "input",
          label: "",
          labelMsgKey: "common.label.zipCode",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "zipCode",
          readonly: true,
        },
        { id: "temp7", type: "hidden", label: "", colSpan: 1, rowSpan: 1 },
        {
          id: "typeOfBusiness",
          type: "input",
          label: "",
          labelMsgKey: "common.label.businessType",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "typeOfBusiness",
          readonly: true,
          codeGroupCode: "BUSINESSTYPE",
          displayAs: "text",
        },
      ],
    }),
    []
  );

  const IRREGULAR_FORM_WIDGET: FormWidget = useMemo(
    () => ({
      type: "form",
      widgetId: "training-request-form",
      contentKey: "trainingRequestForm",
      showBorder: true,
      fields: [
        {
          id: "trainingScheduleType",
          type: "input",
          label: "",
          labelMsgKey: "common.label.gubun",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "trainingScheduleType",
          readonly: true,
          codeGroupCode: "TRAININGSCHEDULETYPE",
          displayAs: "text",
        },
        {
          id: "trainingTrack",
          type: "input",
          label: "",
          labelMsgKey: "training.label.applicationTraining",
          data: "trainingTrack='engineering'?'Engineering Training':trainingTrack='sales'?'Sales Training':trainingTrack='service'?'Service Training':trainingTrack",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "trainingTrack",
          readonly: true,
        },
        { id: "temp1", type: "hidden", label: "", colSpan: 1, rowSpan: 1 },
        {
          id: "firstName",
          type: "input",
          label: "",
          labelMsgKey: "training.label.firstName",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "firstName",
          readonly: true,
        },
        {
          id: "lastName",
          type: "input",
          label: "",
          labelMsgKey: "training.label.lastName",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "lastName",
          readonly: true,
        },
        { id: "temp2", type: "hidden", label: "", colSpan: 1, rowSpan: 1 },
        {
          id: "company",
          type: "input",
          label: "",
          labelMsgKey: "common.label.company",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "company",
          readonly: true,
        },
        {
          id: "streetAddress",
          type: "input",
          label: "",
          labelMsgKey: "common.label.streetAddress",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "streetAddress",
          readonly: true,
        },
        { id: "temp3", type: "hidden", label: "", colSpan: 1, rowSpan: 1 },
        {
          id: "city",
          type: "input",
          label: "",
          labelMsgKey: "common.label.city",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "city",
          readonly: true,
        },
        {
          id: "state",
          type: "input",
          label: "",
          labelMsgKey: "common.label.stateProvince",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "state",
          readonly: true,
        },
        { id: "temp4", type: "hidden", label: "", colSpan: 1, rowSpan: 1 },
        {
          id: "zip",
          type: "input",
          label: "",
          labelMsgKey: "common.label.zipCode",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "zip",
          readonly: true,
        },
        {
          id: "phone",
          type: "input",
          label: "",
          labelMsgKey: "common.label.phone",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "phone",
          readonly: true,
        },
        { id: "temp5", type: "hidden", label: "", colSpan: 1, rowSpan: 1 },
        {
          id: "email",
          type: "input",
          label: "",
          labelMsgKey: "training.label.eailAddress",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "email",
          readonly: true,
        },
        {
          id: "title",
          type: "input",
          label: "",
          labelMsgKey: "training.label.title",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "title",
          readonly: true,
        },
        { id: "temp6", type: "hidden", label: "", colSpan: 1, rowSpan: 1 },
        {
          id: "cellPhone",
          type: "input",
          label: "",
          labelMsgKey: "common.label.cellPhone",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "cellPhone",
          readonly: true,
        },
        {
          id: "salesContact",
          type: "input",
          label: "",
          labelMsgKey: "training.label.salesContact",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "salesContact",
          readonly: true,
        },
        { id: "temp7", type: "hidden", label: "", colSpan: 1, rowSpan: 1 },
        {
          id: "sessionCount",
          type: "input",
          label: "",
          labelMsgKey: "training.label.numberOfTrainingSessions",
          description: "How many training sessions are you interested in holding?에 등록된 내용입니다.",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "sessionCount",
          readonly: true,
        },
        {
          id: "sessionDays",
          type: "input",
          label: "",
          labelMsgKey: "training.label.sessionDuration",
          description: "Each session will consist of how many days?에 등록된 내용입니다.",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "sessionDays",
          readonly: true,
        },
        { id: "temp8", type: "hidden", label: "", colSpan: 1, rowSpan: 1 },
        {
          id: "sessionDate",
          type: "input",
          label: "",
          labelMsgKey: "training.label.trainingSessionDate",
          description: "What date(s) would you like to schedule the training session(s)?에 등록된 내용입니다.",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "sessionDate",
          readonly: true,
        },
        {
          id: "studentCount",
          type: "input",
          label: "",
          labelMsgKey: "training.label.attendeesPerSession",
          description: "How many students will be in attendance for each session?에 등록된 내용입니다.",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "studentCount",
          readonly: true,
        },
        { id: "temp9", type: "hidden", label: "", colSpan: 1, rowSpan: 1 },
        {
          id: "trainingFormat",
          type: "input",
          label: "",
          labelMsgKey: "common.label.trainingType",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "trainingFormat",
          readonly: true,
        },
        {
          id: "locationName",
          type: "input",
          label: "",
          labelMsgKey: "training.label.trainingLocation",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "locationName",
          readonly: true,
          hideCondition: "trainingFormat=Virtual",
        },
        { id: "temp10", type: "hidden", label: "", colSpan: 1, rowSpan: 1 },
        {
          id: "locationStreetAddress",
          type: "input",
          label: "",
          labelMsgKey: "common.label.streetAddress",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "locationStreetAddress",
          readonly: true,
          hideCondition: "trainingFormat=Virtual",
        },
        {
          id: "locationCity",
          type: "input",
          label: "",
          labelMsgKey: "common.label.city",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "locationCity",
          readonly: true,
          hideCondition: "trainingFormat=Virtual",
        },
        { id: "temp11", type: "hidden", label: "", colSpan: 1, rowSpan: 1 },
        {
          id: "locationState",
          type: "input",
          label: "",
          labelMsgKey: "common.label.stateProvince",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "locationState",
          readonly: true,
          hideCondition: "trainingFormat=Virtual",
        },
        {
          id: "locationZip",
          type: "input",
          label: "",
          labelMsgKey: "common.label.zipCode",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "locationZip",
          readonly: true,
          hideCondition: "trainingFormat=Virtual",
        },
        { id: "temp12", type: "hidden", label: "", colSpan: 1, rowSpan: 1 },
        {
          id: "contactPerson",
          type: "input",
          label: "",
          labelMsgKey: "training.label.onSiteContact",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "contactPerson",
          readonly: true,
          hideCondition: "trainingFormat=Virtual",
        },
        {
          id: "contactDetails",
          type: "input",
          label: "",
          labelMsgKey: "training.label.contactDetails",
          colSpan: 4,
          rowSpan: 1,
          fieldKey: "contactDetails",
          readonly: true,
          hideCondition: "trainingFormat=Virtual",
        },
        { id: "temp13", type: "hidden", label: "", colSpan: 1, rowSpan: 1 },
        {
          id: "selectedProductNames",
          type: "input",
          label: "",
          labelMsgKey: "training.label.trainingProducts",
          colSpan: 8,
          rowSpan: 1,
          fieldKey: "selectedProductNames",
          readonly: true,
        },
        { id: "temp14", type: "hidden", label: "", colSpan: 4, rowSpan: 1 },
        {
          id: "jobTitles",
          type: "input",
          label: "",
          labelMsgKey: "training.label.studentJobTitle",
          colSpan: 8,
          rowSpan: 1,
          fieldKey: "jobTitles",
          readonly: true,
          hideCondition: "trainingTrack!=engineering",
        },
        {
          id: "temp15",
          type: "hidden",
          label: "",
          colSpan: 4,
          rowSpan: 1,
          hideCondition: "trainingTrack!=engineering",
        },
        {
          id: "studentInvolvement",
          type: "input",
          label: "",
          labelMsgKey: "training.label.areaOfInvolvement",
          description: "Are the students involved with any of the following?에 선택된 항목입니다.",
          colSpan: 8,
          rowSpan: 1,
          fieldKey: "studentInvolvement",
          readonly: true,
          hideCondition: "trainingTrack!=engineering",
        },
        {
          id: "temp16",
          type: "hidden",
          label: "",
          colSpan: 4,
          rowSpan: 1,
          hideCondition: "trainingTrack!=engineering",
        },
        {
          id: "vfdUnderstandingTopics",
          type: "input",
          label: "",
          labelMsgKey: "training.label.studentProductKnowledgeLevel",
          colSpan: 8,
          rowSpan: 1,
          fieldKey: "vfdUnderstandingTopics",
          readonly: true,
          hideCondition: "trainingTrack!=engineering",
        },
        {
          id: "temp17",
          type: "hidden",
          label: "",
          colSpan: 4,
          rowSpan: 1,
          hideCondition: "trainingTrack!=engineering",
        },
        {
          id: "comments",
          type: "textarea",
          label: "",
          labelMsgKey: "training.label.certificationNote",
          colSpan: 8,
          rowSpan: 2,
          fieldKey: "comments",
          readonly: true,
        },
        { id: "temp18", type: "hidden", label: "", colSpan: 4, rowSpan: 1 },
      ],
    }),
    []
  );

  const SPACE_WIDGET: SpaceWidget = useMemo(
    () => ({
      type: "space",
      widgetId: "training-request-detail-space",
      align: "left",
      showBorder: false,
      items: [
        {
          id: "s1",
          type: "action-button",
          label: "목록",
          labelMsgKey: "common.label.list",
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
    <PageLayout mode="live" title={t("training.label.trinApplHisDetail")}>
      {scheduleType === "01" ? (
        <GridCell colSpan={12} rowSpan={8}>
          <WidgetRenderer
            mode="live"
            widget={REGULAR_FORM_WIDGET}
            contentColSpan={12}
            formValues={formValues}
            onFormValuesChange={() => {}}
            codeGroups={codeGroups}
          />
        </GridCell>
      ) : (
        <GridCell colSpan={12} rowSpan={19}>
          <WidgetRenderer
            mode="live"
            widget={IRREGULAR_FORM_WIDGET}
            contentColSpan={12}
            formValues={formValues}
            onFormValuesChange={() => {}}
            codeGroups={codeGroups}
          />
        </GridCell>
      )}

      <GridCell colSpan={12} rowSpan={1}>
        <WidgetRenderer mode="live" widget={SPACE_WIDGET} contentColSpan={12} onClose={() => router.push(LIST_PATH)} />
      </GridCell>
    </PageLayout>
  );
}
