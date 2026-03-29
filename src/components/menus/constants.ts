/* ── 메뉴 관리 공통 상수 ── */

/** 아이콘 프리셋 목록 */
export const MENU_ICON_LIST = [
    'Settings', 'Users', 'Shield', 'Menu', 'Wand2', 'Monitor',
    'Home', 'Info', 'FileText', 'Folder', 'Database', 'Layout',
    'BarChart', 'Bell', 'Calendar', 'Mail', 'Search', 'Star',
    'LayoutDashboard', 'Image', 'MessageSquare', 'SwatchBook',
    'Palette', 'List', 'PanelRight', 'ChevronRight',
] as const;

/** Validation 정규식 */
export const NAME_REGEX = /^[가-힣a-zA-Z0-9\s\-_()]{1,50}$/;
export const URL_REGEX = /^\/[a-zA-Z0-9\-_/]*$/;
export const XSS_CHARS = /[<>"']/;

/** Validation 에러 메시지 */
export const ERROR_MESSAGES = {
    NAME_REQUIRED: '메뉴명을 입력해주세요.',
    NAME_XSS: '메뉴명에 <, >, ", \' 문자는 사용할 수 없습니다.',
    NAME_PATTERN: '메뉴명은 한글, 영문, 숫자, 공백, -, _, ()만 사용 가능합니다.',
    URL_REQUIRED_CHILD: '하위 메뉴는 URL을 입력해야 합니다.',
    URL_XSS: 'URL에 <, >, ", \' 문자는 사용할 수 없습니다.',
    URL_START_SLASH: 'URL은 /로 시작해야 합니다.',
    URL_DOUBLE_SLASH: 'URL에 연속 슬래시(//)는 사용할 수 없습니다.',
    URL_PATTERN: 'URL은 영문, 숫자, -, _, /만 사용 가능합니다.',
    SORT_REQUIRED: '정렬 순서를 입력해주세요.',
    SORT_INTEGER: '정렬 순서는 정수만 입력 가능합니다.',
    SORT_MIN: '정렬 순서는 1 이상이어야 합니다.',
    SORT_MAX: '정렬 순서는 999 이하여야 합니다.',
} as const;
