/**
 * 파일 업로드 허용 확장자 프리셋 (단일 출처)
 *
 * FieldRenderer, ImageField, VideoField, MediaField 등 모두 여기서 import하여 사용.
 * 확장자 추가/제거 시 이 파일만 수정하면 전체 반영된다.
 *
 * @example
 * import { FILE_TYPE_PRESETS } from '../../constants';
 * const accept = FILE_TYPE_PRESETS.image; // '.jpg,.jpeg,...'
 */
export const FILE_TYPE_PRESETS = {
    /** 문서 형식 */
    doc:   '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.hwp',
    /** 이미지 형식 */
    image: '.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp',
    /** 동영상 형식 */
    video: '.mp4,.mov,.avi,.mkv,.webm,.wmv,.flv,.m4v',
} as const;

/**
 * FILE_TYPE_PRESETS 를 사람이 읽기 쉬운 텍스트로 변환
 * (빌더 UI의 "허용 형식" 안내 텍스트용)
 *
 * @example
 * FILE_TYPE_LABELS.image // 'jpg, jpeg, png, gif, webp, svg, bmp'
 */
/**
 * 파일 업로드를 사용하는 필드 타입 목록 (단일 출처)
 *
 * 새 파일 타입 추가 시 이 배열만 수정하면 utils.ts, page.tsx 전체 반영.
 *
 * @example
 * FILE_FIELD_TYPES.includes(f.type) // true면 파일 업로드 필드
 */
export const FILE_FIELD_TYPES = ['file', 'image', 'video', 'media'] as const;
export type FileFieldType = typeof FILE_FIELD_TYPES[number];

export const FILE_TYPE_LABELS: Record<keyof typeof FILE_TYPE_PRESETS, string> = {
    doc:   FILE_TYPE_PRESETS.doc.replace(/\./g, '').replace(/,/g, ', '),
    image: FILE_TYPE_PRESETS.image.replace(/\./g, '').replace(/,/g, ', '),
    video: FILE_TYPE_PRESETS.video.replace(/\./g, '').replace(/,/g, ', '),
};
