"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { uploadFiles } from "@/app/admin/templates/make/_shared/utils";
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
  Code2,
  FileText,
  Eye,
  X,
} from "lucide-react";

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
  const [tab, setTab] = useState<"url" | "file">("url");
  const [urlInput, setUrlInput] = useState("");
  const [altInput, setAltInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* URL 방식으로 이미지 삽입 */
  const handleUrlInsert = () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) return;
    /* blob: 임시 URL은 새로고침 시 깨지므로 직접 입력도 차단 */
    if (/^blob:/i.test(trimmedUrl)) {
      alert("blob: 임시 URL은 사용할 수 없습니다. 이미지를 다시 업로드해주세요.");
      return;
    }
    onInsert(trimmedUrl, altInput.trim() || undefined);
  };

  /* 파일 업로드 후 공개 엔드포인트 src로 삽입 (blob 임시 URL 사용하지 않음) */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      /* 공통 업로드 함수(utils.ts uploadFiles) 재사용 — id 배열 첫 번째 값으로 공개 엔드포인트 src 조립 */
      const [fileId] = await uploadFiles([file], "", "editor-image");
      onInsert(`/api/v1/fo/page-files/${fileId}`, file.name);
    } catch {
      alert("이미지 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
      /* 같은 파일 재선택 가능하도록 input 초기화 */
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* 탭 버튼 클래스 */
  const tabCls = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[440px] overflow-hidden">
        {/* 팝업 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <span className="text-sm font-semibold text-slate-800">이미지 삽입</span>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* 탭 선택 */}
        <div className="flex border-b border-slate-200">
          <button type="button" className={tabCls(tab === "url")} onClick={() => setTab("url")}>
            URL 입력
          </button>
          <button type="button" className={tabCls(tab === "file")} onClick={() => setTab("file")}>
            파일 업로드
          </button>
        </div>

        {/* 탭 내용 */}
        <div className="p-4 space-y-3">
          {tab === "url" ? (
            <>
              <div>
                <label className="block text-xs text-slate-500 mb-1">이미지 URL</label>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUrlInsert()}
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
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full border-2 border-dashed border-slate-300 rounded py-8 text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 disabled:opacity-50 transition-colors"
                >
                  {isUploading ? "업로드 중..." : "클릭하여 이미지 선택"}
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
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
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
              onKeyDown={(e) => e.key === "Enter" && handleInsert()}
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
        ${active ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}
        ${disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "cursor-pointer"}
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
   미리보기 패널 컴포넌트
   — 현재 활성 모드(텍스트 모드/소스뷰/에디터)의 값을 그대로 렌더링만 하는
     수동적 미리보기. 파싱·수정 없음, Tiptap 스키마를 거치지 않음
───────────────────────────────────────────── */
interface PreviewPanelProps {
  html: string;
}

function PreviewPanel({ html }: PreviewPanelProps) {
  return (
    <div className="border-t border-slate-200 p-3 bg-slate-50 max-h-64 overflow-y-auto">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">미리보기</p>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   에디터 툴바 컴포넌트
───────────────────────────────────────────── */
interface EditorToolbarProps {
  editor: ReturnType<typeof useEditor>;
  onImageOpen: () => void;
  onLinkOpen: () => void;
  showSourceView: boolean;
  onToggleSourceView: () => void;
  showTextMode: boolean;
  onToggleTextMode: () => void;
  showPreview: boolean;
  onTogglePreview: () => void;
}

function EditorToolbar({
  editor,
  onImageOpen,
  onLinkOpen,
  showSourceView,
  onToggleSourceView,
  showTextMode,
  onToggleTextMode,
  showPreview,
  onTogglePreview,
}: EditorToolbarProps) {
  if (!editor) return null;

  /* 현재 Heading 레벨 계산 */
  const currentHeadingValue = (() => {
    for (let level = 1; level <= 6; level++) {
      if (editor.isActive("heading", { level })) return `h${level}`;
    }
    return "paragraph";
  })();

  /* Heading 드롭다운 변경 핸들러 */
  const handleHeadingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else {
      const level = parseInt(val.replace("h", "")) as 1 | 2 | 3 | 4 | 5 | 6;
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  /* 3x3 헤더 포함 테이블 삽입 */
  const handleInsertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  /* 유튜브 URL 입력 후 임베드 삽입 */
  const handleYoutube = () => {
    const url = window.prompt("유튜브 URL을 입력하세요:");
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
        active={editor.isActive("bold")}
        title="굵게 (Ctrl+B)"
      >
        <Bold size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="기울임 (Ctrl+I)"
      >
        <Italic size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="취소선"
      >
        <Strikethrough size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="밑줄 (Ctrl+U)"
      >
        <UnderlineIcon size={14} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* ── 그룹2: 수평선 ── */}
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="수평선 삽입">
        <Minus size={14} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* ── 그룹3: 글머리 목록, 번호 목록, 들여쓰기, 내어쓰기 ── */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="글머리 목록"
      >
        <List size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="번호 목록"
      >
        <ListOrdered size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
        disabled={!editor.can().sinkListItem("listItem")}
        title="들여쓰기"
      >
        <Indent size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().liftListItem("listItem").run()}
        disabled={!editor.can().liftListItem("listItem")}
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

      <ToolbarButton onClick={onLinkOpen} active={editor.isActive("link")} title="링크 삽입">
        <LinkIcon size={14} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* ── 그룹6: 형광펜, 텍스트 정렬, 글자 색상, 위첨자, 아래첨자 ── */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        active={editor.isActive("highlight")}
        title="형광펜"
      >
        <Highlighter size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="왼쪽 정렬"
      >
        <AlignLeft size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="가운데 정렬"
      >
        <AlignCenter size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="오른쪽 정렬"
      >
        <AlignRight size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        active={editor.isActive({ textAlign: "justify" })}
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
        active={editor.isActive("superscript")}
        title="위첨자"
      >
        <SuperscriptIcon size={14} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        active={editor.isActive("subscript")}
        title="아래첨자"
      >
        <SubscriptIcon size={14} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* ── 그룹7: 유튜브 임베드 ── */}
      <ToolbarButton onClick={handleYoutube} title="유튜브 영상 삽입">
        <YoutubeIcon size={14} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* ── 그룹8: HTML 소스뷰, 텍스트 모드, 미리보기 토글 ── */}
      <ToolbarButton onClick={onToggleSourceView} active={showSourceView} title="HTML 소스 보기">
        <Code2 size={14} />
      </ToolbarButton>

      <ToolbarButton onClick={onToggleTextMode} active={showTextMode} title="텍스트 모드">
        <FileText size={14} />
      </ToolbarButton>

      <ToolbarButton onClick={onTogglePreview} active={showPreview} title="미리보기">
        <Eye size={14} />
      </ToolbarButton>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TipTap 에디터 메인 컴포넌트
   wysiwyg-editor.tsx와 동일한 Props 인터페이스를 유지하며
   과도기 공존 방식으로 사용됨
───────────────────────────────────────────── */
export default function TiptapEditor({ initialValue = "", onChange, height = "400px" }: TiptapEditorProps) {
  /* 마운트 직후 초기 onUpdate 차단용 */
  const isReadyRef = useRef(false);
  /* 사용자가 직접 수정한 이후 외부 initialValue 덮어쓰기 차단용 */
  const hasUserEditedRef = useRef(false);
  /* setContent 프로그래매틱 호출 중 onUpdate 차단용 */
  const isProgrammaticSetRef = useRef(false);
  /* 현재 "진짜 원본" 값 추적 — DB에 저장된 원본 그대로. 텍스트 모드 진입 시 이 값을 시드로 사용 */
  const lastCommittedValueRef = useRef(initialValue);

  /* 이미지 팝업 표시 여부 */
  const [showImageDialog, setShowImageDialog] = useState(false);
  /* 링크 팝업 표시 여부 */
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  /* HTML 소스뷰 표시 여부 */
  const [showSourceView, setShowSourceView] = useState(false);
  /* 소스뷰 textarea 편집 값 */
  const [sourceValue, setSourceValue] = useState("");
  /* 텍스트 모드 표시 여부 — Tiptap 파싱을 거치지 않고 원본 값을 그대로 편집 */
  const [showTextMode, setShowTextMode] = useState(false);
  /* 텍스트 모드 textarea 편집 값 */
  const [textValue, setTextValue] = useState("");
  /* 미리보기 패널 표시 여부 — 현재 활성 모드의 값을 하단에 인라인으로 렌더링 */
  const [showPreview, setShowPreview] = useState(false);

  const editor = useEditor({
    extensions: [
      /* StarterKit이 Underline·Link를 기본 포함하므로 별도 확장 등록 대신
         StarterKit 내장 옵션(link)으로 openOnClick 설정을 적용한다 (중복 확장 방지) */
      StarterKit.configure({ link: { openOnClick: false } }),
      Image.configure({ inline: false }),
      Youtube.configure({ width: 640, height: 480 }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Superscript,
      Subscript,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialValue,
    onUpdate: ({ editor: updatedEditor }) => {
      /* 마운트 직후 또는 프로그래매틱 setContent 호출 중이면 무시 */
      if (!isReadyRef.current || isProgrammaticSetRef.current) return;
      hasUserEditedRef.current = true;
      const html = updatedEditor.getHTML();
      lastCommittedValueRef.current = html;
      onChange?.(html);
    },
    editorProps: {
      /* 이미지 파일 드래그&드롭 시 업로드 후 드롭 위치에 삽입 (Tiptap 표준 handleDrop 패턴) */
      handleDrop: (view, event, _slice, moved) => {
        /* 에디터 내부 컨텐츠를 드래그하여 위치만 옮기는 경우는 기본 동작 유지 */
        if (moved) return false;
        /* 소스뷰 또는 텍스트 모드가 켜져 있는 동안은 드롭을 무시 */
        if (showSourceView || showTextMode) return false;

        const file = event.dataTransfer?.files?.[0];
        if (!file || !file.type.startsWith("image/")) return false;

        /* 브라우저 기본 동작(새 탭에서 파일 열기 등) 차단 */
        event.preventDefault();

        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        const insertPos = coords?.pos ?? view.state.selection.from;

        /* 공통 업로드 함수(utils.ts uploadFiles) 재사용 — id 배열 첫 번째 값으로 공개 엔드포인트 src 조립 */
        uploadFiles([file], "", "editor-image")
          .then(([fileId]) => {
            const src = `/api/v1/fo/page-files/${fileId}`;
            const node = view.state.schema.nodes.image.create({ src, alt: file.name });
            const transaction = view.state.tr.insert(insertPos, node);
            view.dispatch(transaction);
          })
          .catch(() => {
            alert("이미지 업로드에 실패했습니다.");
          });

        return true;
      },
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
    editor.commands.setContent(initialValue, { emitUpdate: false });
    /* 비동기로 늦게 도착한 initialValue도 "진짜 원본"으로 갱신 — 텍스트모드 시드 유실 방지 */
    lastCommittedValueRef.current = initialValue;
    setTimeout(() => {
      isProgrammaticSetRef.current = false;
    }, 0);
  }, [initialValue, editor]);

  /* 이미지 삽입 처리 */
  const handleImageInsert = useCallback(
    (src: string, alt?: string) => {
      editor
        ?.chain()
        .focus()
        .setImage({ src, alt: alt ?? "" })
        .run();
      setShowImageDialog(false);
    },
    [editor]
  );

  /* 링크 삽입 처리 */
  const handleLinkInsert = useCallback(
    (href: string) => {
      editor?.chain().focus().setLink({ href, target: "_blank" }).run();
      setShowLinkDialog(false);
    },
    [editor]
  );

  /* 링크 제거 처리 */
  const handleLinkRemove = useCallback(() => {
    editor?.chain().focus().unsetLink().run();
    setShowLinkDialog(false);
  }, [editor]);

  /* 현재 커서 위치의 링크 href (팝업 초기값) */
  const currentLinkHref: string = editor?.getAttributes("link").href ?? "";

  /* HTML 소스뷰 토글 — 켤 때는 현재 에디터 HTML을 textarea 초기값으로 세팅 */
  const handleToggleSourceView = useCallback(() => {
    if (!editor) return;
    if (!showSourceView) {
      /* 텍스트 모드에서 직접 전환하는 경우 editor.getHTML()은 텍스트모드 진입 이전의 stale 값이므로,
         텍스트모드에서 이미 커밋된 lastCommittedValueRef(진짜 원본)로 시드해 편집분 유실을 방지 */
      setSourceValue(showTextMode ? lastCommittedValueRef.current : editor.getHTML());
      /* 텍스트 모드와 동시 활성화 방지 */
      setShowTextMode(false);
    }
    setShowSourceView((prev) => !prev);
  }, [editor, showSourceView, showTextMode]);

  /* 소스뷰 취소 — 편집 중이던 textarea 값을 버리고 WYSIWYG로 복귀 */
  const handleCancelSourceView = useCallback(() => {
    setShowSourceView(false);
  }, []);

  /* 소스뷰 적용 — blob 임시 URL 검증 후 에디터 내용에 반영 */
  const handleApplySourceView = useCallback(() => {
    if (!editor) return;

    /* blob: 임시 URL은 새로고침 시 깨지므로 저장 차단 (따옴표 유무 상관없이 매칭) */
    if (/src\s*=\s*["']?blob:/i.test(sourceValue)) {
      alert("blob: 임시 URL은 저장할 수 없습니다. 이미지를 다시 업로드해주세요.");
      return;
    }

    /* setContent가 onUpdate를 트리거할 수 있으므로 호출 전후에 차단 플래그 설정 */
    isProgrammaticSetRef.current = true;
    editor.commands.setContent(sourceValue, { emitUpdate: false });
    setTimeout(() => {
      isProgrammaticSetRef.current = false;
    }, 0);

    /* 사용자가 명시적으로 적용한 변경이므로 외부 onChange 직접 호출 및 편집 플래그 갱신 */
    hasUserEditedRef.current = true;
    lastCommittedValueRef.current = sourceValue;
    onChange?.(sourceValue);

    setShowSourceView(false);
  }, [editor, sourceValue, onChange]);

  /* 텍스트 모드 입력 — 즉시 반영, Tiptap 파싱 전혀 거치지 않음(위험 차단 핵심) */
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.target.value;
      setTextValue(v);
      lastCommittedValueRef.current = v;
      hasUserEditedRef.current = true;
      onChange?.(v);
    },
    [onChange]
  );

  /* 텍스트 모드 토글 — 켤 때 lastCommittedValueRef(진짜 원본)로 시드, editor.getHTML() 사용 금지 */
  const handleToggleTextMode = useCallback(() => {
    if (!showTextMode) {
      setTextValue(lastCommittedValueRef.current);
      /* 소스뷰와 동시 활성화 방지 */
      setShowSourceView(false);
    } else if (editor) {
      /* WYSIWYG로 복귀 — 기존 isProgrammaticSetRef 가드 패턴 그대로 재사용 */
      isProgrammaticSetRef.current = true;
      editor.commands.setContent(lastCommittedValueRef.current, { emitUpdate: false });
      setTimeout(() => {
        isProgrammaticSetRef.current = false;
      }, 0);
    }
    setShowTextMode((prev) => !prev);
  }, [editor, showTextMode]);

  /* 미리보기 패널 토글 */
  const handleTogglePreview = useCallback(() => {
    setShowPreview((prev) => !prev);
  }, []);

  /* 미리보기에 렌더링할 현재 활성 모드 값 — 텍스트 모드 > 소스뷰 > 에디터 순으로 우선 */
  const previewHtml = showTextMode ? textValue : showSourceView ? sourceValue : (editor?.getHTML() ?? "");

  return (
    /* height = 툴바 포함 전체 높이 (TOAST UI와 동일한 방식) */
    <div className="w-full border border-slate-300 rounded overflow-hidden bg-white flex flex-col" style={{ height }}>
      {/* 에디터 툴바 — 자연 높이 사용 */}
      <EditorToolbar
        editor={editor}
        onImageOpen={() => setShowImageDialog(true)}
        onLinkOpen={() => setShowLinkDialog(true)}
        showSourceView={showSourceView}
        onToggleSourceView={handleToggleSourceView}
        showTextMode={showTextMode}
        onToggleTextMode={handleToggleTextMode}
        showPreview={showPreview}
        onTogglePreview={handleTogglePreview}
      />

      {/* 에디터 콘텐츠 영역 — 남은 공간 채움 (퍼센트 min-height 체이닝 대신 flex 패턴으로 통일) */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0 flex flex-col">
        {showTextMode ? (
          /* 텍스트 모드 — DB 원본 값을 그대로 편집, Tiptap 파싱 전혀 거치지 않음 */
          <textarea
            value={textValue}
            onChange={handleTextChange}
            spellCheck={false}
            className="flex-1 w-full border border-slate-300 rounded p-2 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
          />
        ) : showSourceView ? (
          /* HTML 소스뷰 — textarea로 직접 HTML 편집 */
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            <textarea
              value={sourceValue}
              onChange={(e) => setSourceValue(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full border border-slate-300 rounded p-2 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
            />
            <div className="flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCancelSourceView}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded text-slate-700 hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleApplySourceView}
                className="px-3 py-1.5 text-sm bg-slate-900 text-white rounded hover:bg-slate-700 transition-colors"
              >
                적용
              </button>
            </div>
          </div>
        ) : (
          /* @tailwindcss/typography 미설치로 prose 미사용 — ProseMirror 기본 스타일로 동작 */
          <EditorContent
            editor={editor}
            className="flex-1 flex flex-col [&_.ProseMirror]:outline-none [&_.ProseMirror]:flex-1"
          />
        )}
      </div>

      {/* 미리보기 패널 — 하단에 인라인으로 펼쳐지는 패널(모달 아님) */}
      {showPreview && <PreviewPanel html={previewHtml} />}

      {/* 이미지 삽입 팝업 */}
      {showImageDialog && <ImageDialog onInsert={handleImageInsert} onClose={() => setShowImageDialog(false)} />}

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
