/**
 * 빌더 필드 컴포넌트 모음
 *
 * 사용법:
 *   // SearchField / FormField 계열
 *   import { InputField, SelectField, ... } from './_shared/components/builder/fields';
 *   import type { FieldEditProps, FieldEditValues, ColSpanMode } from './_shared/components/builder/fields';
 *
 *   // TableColumn 계열 (TableBuilder 전용)
 *   import { ColumnBaseField, BadgeOptionsField, TextCodeGroupField, BooleanTextField, ActionsField } from './_shared/components/builder/fields';
 *   import type { ColEditProps } from './_shared/components/builder/fields';
 */

/* ── SearchField / FormField 계열 ── */
export { InputField } from './InputField';
export { SelectField } from './SelectField';
export { DateField } from './DateField';
export { DateRangeField } from './DateRangeField';
export { RadioField } from './RadioField';
export { CheckboxField } from './CheckboxField';
export { ButtonField } from './ButtonField';
export { TextareaField } from './TextareaField';
export { FormTextareaField } from './FormTextareaField';
export { EditorField } from './EditorField';
export { FileField } from './FileField';
export { ImageField } from './ImageField';
export { VideoField } from './VideoField';
export { MediaField } from './MediaField';
export { TimeField } from './TimeField';
export { ColorField } from './ColorField';
export { ActionButtonField } from './ActionButtonField';
export type { ActionButtonFieldProps } from './ActionButtonField';
export { SlugSelectField } from './SlugSelectField';
export type { SlugOption } from './SlugSelectField';
export { CategoryField } from './CategoryField';
export { DateRangeStatusSearchField } from './DateRangeStatusSearchField';
export type { FieldEditProps, FieldEditValues, ColSpanMode } from './types';

/* ── TableColumn 계열 ── */
export { ColumnBaseField } from './ColumnBaseField';
export { BadgeOptionsField } from './BadgeOptionsField';
export { TextCodeGroupField } from './TextCodeGroupField';
export { BooleanTextField } from './BooleanTextField';
export { ActionsField } from './ActionsField';
export { DateRangeStatusColumnField } from './DateRangeStatusColumnField';
export { InlineEditField } from './InlineEditField';
export type { ColEditProps } from './col-types';
export { CUSTOM_ACTION_COLORS, PRESET_COLORS } from './col-types';

/* ── MultiSelect 추가 필드 계열 (simple 버전 — colSpan/validation 제거) ── */
export { ExtraSimpleInputField }  from './ExtraSimpleInputField';
export { ExtraSimpleSelectField } from './ExtraSimpleSelectField';
export type { ExtraSimpleInputFieldValues }  from './ExtraSimpleInputField';
export type { ExtraSimpleSelectFieldValues } from './ExtraSimpleSelectField';
