import {
    InputField, SelectField, DateField, DateRangeField, RadioField, CheckboxField,
    TextareaField, EditorField, FileField, VideoField, ImageField,
    ActionButtonField, FieldEditValues, FieldEditProps, ColSpanMode
} from './fields';
import { CodeGroupDef, TemplateItem } from '../../types';

interface CommonFieldDispatcherProps {
    type: string;
    values: FieldEditValues;
    onChange: (updates: Partial<FieldEditValues>) => void;
    colSpanMode: ColSpanMode;
    rowSpanConfig?: { min: number; max: number };
    codeGroups: CodeGroupDef[];
    codeGroupsLoading: boolean;
    /* ActionButtonField 전용 */
    pageTemplates?: TemplateItem[];
    formWidgets?: { widgetId: string; contentKey: string; connectedSlug?: string }[];
}

/**
 * CommonFieldDispatcher — 빌더 유형을 가리지 않는 전역 필드 설정 디스패처
 *
 * List 빌더(검색 필드), Layer 빌더(폼 필드), Widget 빌더(공간 영역 아이템) 등
 * 모든 위치에서 개별 필드를 편집할 때 공통으로 사용한다.
 */
export const CommonFieldDispatcher = (props: CommonFieldDispatcherProps) => {
    const { type } = props;

    const fieldProps: FieldEditProps = {
        values: props.values,
        onChange: props.onChange,
        colSpanMode: props.colSpanMode,
        rowSpanConfig: props.rowSpanConfig,
        codeGroups: props.codeGroups,
        codeGroupsLoading: props.codeGroupsLoading,
    };

    switch (type) {
        case 'input':
        case 'text': return <InputField {...fieldProps} />;
        case 'select': return <SelectField {...fieldProps} />;
        case 'date': return <DateField {...fieldProps} />;
        case 'dateRange': return <DateRangeField {...fieldProps} />;
        case 'radio': return <RadioField {...fieldProps} />;
        case 'checkbox': return <CheckboxField {...fieldProps} />;
        case 'textarea': return <TextareaField {...fieldProps} />;
        case 'editor': return <EditorField {...fieldProps} />;
        case 'file': return <FileField {...fieldProps} />;
        case 'image': return <ImageField {...fieldProps} />;
        case 'video': return <VideoField {...fieldProps} />;
        case 'button': return (
            <ActionButtonField
                {...fieldProps}
                pageTemplates={props.pageTemplates ?? []}
                formWidgets={props.formWidgets ?? []}
            />
        );

        default:
            return (
                <div className="p-3 text-center text-[10px] text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                    "{type}" 타입은 지원되지 않거나 설정이 필요 없는 필드입니다.
                </div>
            );
    }
};
