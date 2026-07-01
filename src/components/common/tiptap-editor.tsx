'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import TiptapUnderline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import api from '@/lib/api';
import {
  Bold,
  Italic,
  Strikethrough,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Minus,
  Table as TableIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Highlighter,
  Palette,
  Indent,
  Outdent,
  SquarePlay as YoutubeIcon,
  X,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Props 인터페이스 — wysiwyg-editor.tsx와 동일하게 유지
───────────────────────────────────────────── */
interface TiptapEditorProps {
  initialValue?: string;
  onChange?: (value: string) => void;
  height?: string;
}

/* ─────────────────────────────────────────────
   이미지 삽입 팝업 컴포넌트
   — URL 직접 입력과 파일 업로드 두 가지 방식 지원
───────────────────────────────────────────── */
interface ImageDialogProps {
  onInsert: (src: string, alt?: string) => void;
  onClose: () => void;
}

function ImageDialog({ onInsert, onClose }: ImageDialogProps) {
  /* 탭 상태: 'url' | 'file' */
  const [tab, setTab] = useState<'url' | 'file'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [altInput, setAltInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* URL 방식으로 이미지 삽입 */
  const handleUrlInsert = () => {
    if (!urlInput.trim()) return;
    onInsert(urlInput.trim(), altInput.trim() || undefined);
  };

  /* 파일 업로드 후 Blob URL 생성하여 삽입 */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      /* 이미지 파일 업로드 API 호출 */
      const formData = new FormData();
      formData.append('file', file);
      formData.append('templateSlug', '');
      formData.append('fieldKey', 'editor-image');

      const uploadRes = await api.post<{ id: number }>('/page-files/upload', formData, {
        transformRequest: (data: FormData, headers: { delete?: (k: string) => void }) => {
          if (headers?.delete) headers.delete('Content-Type');
          return data;
        },
      });
      const fileId = uploadRes.data.id;

      /* 업로드된 파일을 Blob으로 받아 Object URL 생성 */
      const blobRes = await api.get(`/page-files/${fileId}`, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(blobRes.data as Blob);

      onInsert(objectUrl, file.name);
    } catch {
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
      /* 같은 파일 재선택 가능하도록 input 초기화 */
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* 탭 버튼 클래스 */
  const tabCls = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-slate-900 text-slate-900'
        : 'border-transparent text-slate-500 hover:text-slate-700'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[440px] overflow-hidden">
        {/* 팝업 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <span className="text-sm font-semibold text-slate-800">이미지 삽입</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 탭 선택 */}
        <div className="flex border-b border-slate-200">
          <button type="button" className={tabCls(tab === 'url')} onClick={() => setTab('url')}>
            URL 입력
          </button>
          <button type="button" className={tabCls(tab === 'file')} onClick={() => setTab('file')}>
            파일 업로드
          </button>
        </div>

        {/* 탭 내용 */}
        <div className="p-4 space-y-3">
          {tab === 'url' ? (
            <>
              <div>
                <label className="block text-xs text-slate-500 mb-1">이미지 URL</label>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlInsert()}
                  placeholder="https://example.com/image.png"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">대체 텍스트 (선택)</label>
                <input
                  type="text"
                  value={altInput}
                  onChange={(e) => setAltInput(e.target.value)}
                  placeholder="이미지 설명"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleUrlInsert}
                  disabled={!urlInput.trim()}
                  className="px-3 py-1.5 text-sm bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  삽입
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs text-slate-500 mb-2">이미지 파일 선택</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full border-2 border-dashed border-slate-300 rounded py-8 text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 disabled:opacity-50 transition-colors"
                >
                  {isUploading ? '업로드 중...' : '클릭하여 이미지 선택'}
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  닫기
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   링크 삽입 팝업 컴포넌트
───────────────────────────────────────────── */
interface LinkDialogProps {
  currentHref: string;
  onInsert: (href: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

function LinkDialog({ currentHref, onInsert, onRemove, onClose }: LinkDialogProps) {
  const [hrefInput, setHrefInput] = useState(currentHref);

  const handleInsert = () => {
    if (!hrefInput.trim()) return;
    onInsert(hrefInput.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[400px] overflow-hidden">
        {/* 팝업 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <span className="text-sm font-semibold text-slate-800">링크 삽입</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">URL</label>
            <input
              type="text"
              value={hrefInput}
              onChange={(e) => setHrefInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInsert()}
              placeholder="https://example.com"
              className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
              autoFocus
            />
          </div>
          <div className="flex justify-between gap-2 pt-1">
            {/* 링크가 있는 경우에만 제거 버튼 표시 */}
            {currentHref && (
              <button
                type="button"
                onClick={onRemove}
                className="px-3 py-1.5 text-sm border border-red-300 rounded text-red-600 hover:bg-red-50 transition-colors"
              >
                링크 제거
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded text-slate-700 hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleInsert}
                disabled={!hrefInput.trim()}
                className="px-3 py-1.5 text-sm bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                삽입
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   툴바 버튼 공통 컴포넌트
───────────────────────────────────────────── */
interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active = false, disabled = false, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center w-7 h-7 rounded text-sm transition-colors !m-0 !border-0 !p-0 !bg-transparent
        ${active
          ? 'bg-slate-200 text-slate-900'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }
        ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
      `}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────
   툴바 그룹 구분선
───────────────────────────────────────────── */
function ToolbarDivider() {
  return <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />;
}

/* ─────────────────────────────────────────────
   에디터 툴바 컴포넌트
───────────────────────────────────────────── */
interface EditorToolbarProps {
  editor: ReturnType<typeof useEditor>;
  onImageOpen: () => void;
  onLinkOpen: () => void;
}

function EditorToolbar({ editor, onImageOpen, onLinkOpen }: EditorToolbarProps) {
  if (!editor) return null;

  /* 현재 Heading 레벨 계산 */
  const currentHeadingValue = (() => {
    for (let level = 1; level <= 6; level++) {
      if (editor.isActive('heading', { level })) return `h${level}`;
    }
    return 'paragraph';
  })();

  /* Heading 드롭다운 변경 핸들러 */
  const handleHeadingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'paragraph') {
      editor.chain().focus().setParagraph().run();
    } else {
      const level = parseInt(val.replace('h', '')) as 1 | 2 | 3 | 4 | 5 | 6;
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  /* 3x3 헤더 포함 테이블 삽입 */
  const handleInsertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  /* 유튜브 URL 입력 후 임베드 삽입 */
  const handleYoutube = () => {
    // eslint-disable-next-line no-alert
    const url = window.prompt('유튜브 URL을 입력하세요:');
    if (!url) return;
    editor.chain().focus().setYoutubeVideo({ src: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50">

      {/* ── 그룹1: Heading 드롭다운, Bold, Italic, Strike, Underline ── */}
      <select
        value={currentHeadingValue}
        onChange={handleHeadingChange}
        className="h-7 text-xs border border-slate-300 rounded px-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer mr-0.5"
        title="제목 스타일"
      >
        <option value="paragraph">본문</option>
        <option value="h1">H1</option>
        <option value="h2">H2</option>
        <option value="h3">H3</option>
        <option value="h4">H4</option>
        <option value="h5">H5</option>
        <option value="h6">H6</option>
      </select>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="굵게 (Ctrl+B)"
      >
        <Bold size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="기울임 (Ctrl+I)"
      >
        <Italic size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        title="취소선"
      >
        <Strikethrough size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="밑줄 (Ctrl+U)"
      >
        <UnderlineIcon size={14} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* ── 그룹2: 수평선 ── */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="수평선 삽입"
      >
        <Minus size={14} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* ── 그룹3: 글머리 목록, 번호 목록, 들여쓰기, 내어쓰기 ── */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="글머리 목록"
      >
        <List size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="번호 목록"
      >
        <ListOrdered size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
        disabled={!editor.can().sinkListItem('listItem')}
        title="들여쓰기"
      >
        <Indent size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().liftListItem('listItem').run()}
        disabled={!editor.can().liftListItem('listItem')}
        title="내어쓰기"
      >
        <Outdent size={14} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* ── 그룹4: 테이블, 이미지, 링크 ── */}
      <ToolbarButton onClick={handleInsertTable} title="테이블 삽입 (3×3)">
        <TableIcon size={14} />
      </ToolbarButton>

      <ToolbarButton onClick={onImageOpen} title="이미지 삽입">
        <ImageIcon size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={onLinkOpen}
        active={editor.isActive('link')}
        title="링크 삽입"
      >
        <LinkIcon size={14} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* ── 그룹6: 형광펜, 텍스트 정렬, 글자 색상, 위첨자, 아래첨자 ── */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        active={editor.isActive('highlight')}
        title="형광펜"
      >
        <Highlighter size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        active={editor.isActive({ textAlign: 'left' })}
        title="왼쪽 정렬"
      >
        <AlignLeft size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        active={editor.isActive({ textAlign: 'center' })}
        title="가운데 정렬"
      >
        <AlignCenter size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        active={editor.isActive({ textAlign: 'right' })}
        title="오른쪽 정렬"
      >
        <AlignRight size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        active={editor.isActive({ textAlign: 'justify' })}
        title="양쪽 정렬"
      >
        <AlignJustify size={14} />
      </ToolbarButton>

      {/* 글자 색상 — input[type=color] 위에 아이콘 레이블 오버레이 */}
      <label
        title="글자 색상"
        className="relative inline-flex items-center justify-center w-7 h-7 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors"
      >
        <Palette size={14} />
        <input
          type="color"
          className="absolute opacity-0 w-px h-px pointer-events-none"
          onChange={(e) => {
            editor.chain().focus().setColor(e.target.value).run();
          }}
        />
      </label>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        active={editor.isActive('superscript')}
        title="위첨자"
      >
        <SuperscriptIcon size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        active={editor.isActive('subscript')}
        title="아래첨자"
      >
        <SubscriptIcon size={14} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* ── 그룹7: 유튜브 임베드 ── */}
      <ToolbarButton onClick={handleYoutube} title="유튜브 영상 삽입">
        <YoutubeIcon size={14} />
      </ToolbarButton>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TipTap 에디터 메인 컴포넌트
   wysiwyg-editor.tsx와 동일한 Props 인터페이스를 유지하며
   과도기 공존 방식으로 사용됨
───────────────────────────────────────────── */
export default function TiptapEditor({
  initialValue = '',
  onChange,
  height = '400px',
}: TiptapEditorProps) {
  /* 마운트 직후 초기 onUpdate 차단용 */
  const isReadyRef = useRef(false);
  /* 사용자가 직접 수정한 이후 외부 initialValue 덮어쓰기 차단용 */
  const hasUserEditedRef = useRef(false);
  /* setContent 프로그래매틱 호출 중 onUpdate 차단용 */
  const isProgrammaticSetRef = useRef(false);

  /* 이미지 팝업 표시 여부 */
  const [showImageDialog, setShowImageDialog] = useState(false);
  /* 링크 팝업 표시 여부 */
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapUnderline,
      Image.configure({ inline: false }),
      Youtube.configure({ width: 640, height: 480 }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Superscript,
      Subscript,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({ openOnClick: false }),
    ],
    content: initialValue,
    onUpdate: ({ editor: updatedEditor }) => {
      /* 마운트 직후 또는 프로그래매틱 setContent 호출 중이면 무시 */
      if (!isReadyRef.current || isProgrammaticSetRef.current) return;
      hasUserEditedRef.current = true;
      onChange?.(updatedEditor.getHTML());
    },
  });

  /* 다음 tick 이후부터 onChange 허용 */
  useEffect(() => {
    const id = setTimeout(() => {
      isReadyRef.current = true;
    }, 0);
    return () => clearTimeout(id);
  }, []);

  /* DB 데이터 로드 시 에디터에 반영 — 사용자가 직접 수정하기 전까지만 */
  useEffect(() => {
    if (!initialValue || !editor || hasUserEditedRef.current) return;
    /* setContent가 onUpdate를 트리거할 수 있으므로 호출 전후에 차단 플래그 설정 */
    isProgrammaticSetRef.current = true;
    editor.commands.setContent(initialValue, false);
    setTimeout(() => {
      isProgrammaticSetRef.current = false;
    }, 0);
  }, [initialValue, editor]);

  /* 이미지 삽입 처리 */
  const handleImageInsert = useCallback(
    (src: string, alt?: string) => {
      editor?.chain().focus().setImage({ src, alt: alt ?? '' }).run();
      setShowImageDialog(false);
    },
    [editor],
  );

  /* 링크 삽입 처리 */
  const handleLinkInsert = useCallback(
    (href: string) => {
      editor?.chain().focus().setLink({ href, target: '_blank' }).run();
      setShowLinkDialog(false);
    },
    [editor],
  );

  /* 링크 제거 처리 */
  const handleLinkRemove = useCallback(() => {
    editor?.chain().focus().unsetLink().run();
    setShowLinkDialog(false);
  }, [editor]);

  /* 현재 커서 위치의 링크 href (팝업 초기값) */
  const currentLinkHref: string = editor?.getAttributes('link').href ?? '';

  return (
    /* height = 툴바 포함 전체 높이 (TOAST UI와 동일한 방식) */
    <div className="w-full border border-slate-300 rounded overflow-hidden bg-white flex flex-col" style={{ height }}>

      {/* 에디터 툴바 — 자연 높이 사용 */}
      <EditorToolbar
        editor={editor}
        onImageOpen={() => setShowImageDialog(true)}
        onLinkOpen={() => setShowLinkDialog(true)}
      />

      {/* 에디터 콘텐츠 영역 — 남은 공간 채움 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
        {/* @tailwindcss/typography 미설치로 prose 미사용 — ProseMirror 기본 스타일로 동작 */}
        <EditorContent
          editor={editor}
          className="min-h-full [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-full"
        />
      </div>

      {/* 이미지 삽입 팝업 */}
      {showImageDialog && (
        <ImageDialog
          onInsert={handleImageInsert}
          onClose={() => setShowImageDialog(false)}
        />
      )}

      {/* 링크 삽입 팝업 */}
      {showLinkDialog && (
        <LinkDialog
          currentHref={currentLinkHref}
          onInsert={handleLinkInsert}
          onRemove={handleLinkRemove}
          onClose={() => setShowLinkDialog(false)}
        />
      )}
    </div>
  );
}
