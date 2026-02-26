import { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { Loader2 } from "lucide-react";
import "./EditorToolbar.scss";

interface EditorToolbarProps {
  editor: Editor | null;
  onImageClick: () => void;
  imageUploading: boolean;
}

function ToolbarBtn({
  onClick,
  active,
  disabled,
  title,
  wide,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`mag-toolbar__btn${active ? " mag-toolbar__btn--active" : ""}${wide ? " mag-toolbar__btn--wide" : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mag-toolbar__divider" />;
}

export default function EditorToolbar({
  editor,
  onImageClick,
  imageUploading,
}: EditorToolbarProps) {
  const [isImgActive, setIsImgActive] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | undefined>(undefined);
  const [imgStoredWidth, setImgStoredWidth] = useState<number | undefined>(undefined);

  const [widthInput, setWidthInput] = useState("");
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);
  const imgPosRef = useRef<number | null>(null);

  const [youtubePopupOpen, setYoutubePopupOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const youtubeInputRef = useRef<HTMLInputElement>(null);

  // selectionUpdate 시 이미지 선택 상태를 state에 반영 → 리렌더 유발
  useEffect(() => {
    if (!editor) return;
    const track = () => {
      const { selection } = editor.state;
      const sel = selection as { node?: { type: { name: string } } } & typeof selection;
      const active = sel.node?.type.name === "image";
      if (active) {
        imgPosRef.current = selection.from;
        setIsImgActive(true);
        setImgSrc(editor.getAttributes("image").src as string | undefined);
        setImgStoredWidth(editor.getAttributes("image").width as number | undefined);
      } else {
        if (editor.isFocused) imgPosRef.current = null;
        setIsImgActive(false);
        setImgSrc(undefined);
        setImgStoredWidth(undefined);
      }
    };
    const handleBlur = () => {
      // 툴바 내부(사이즈 입력란 등)로 포커스가 이동한 경우엔 유지
      setTimeout(() => {
        const focused = document.activeElement;
        const isToolbarFocused = focused?.closest(".mag-toolbar") !== null;
        if (!isToolbarFocused) {
          setIsImgActive(false);
          setImgSrc(undefined);
          setImgStoredWidth(undefined);
        }
      }, 0);
    };

    editor.on("selectionUpdate", track);
    editor.on("blur", handleBlur);
    return () => {
      editor.off("selectionUpdate", track);
      editor.off("blur", handleBlur);
    };
  }, [editor]);

  // TipTap v3 ResizableNodeView는 클릭해도 NodeSelection이 자동으로 안 생김
  // → 클릭 시 명시적으로 setNodeSelection 호출
  useEffect(() => {
    if (!editor) return;

    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const container = target.closest("[data-resize-container]") as HTMLElement | null;
      if (!container) return;

      let foundPos: number | null = null;
      editor.state.doc.descendants((node, pos) => {
        if (foundPos !== null) return false;
        if (node.type.name === "image" && editor.view.nodeDOM(pos) === container) {
          foundPos = pos;
          return false;
        }
      });

      if (foundPos !== null) {
        editor.commands.setNodeSelection(foundPos);
      }
    };

    let editorDom: HTMLElement | null = null;

    const attach = () => {
      editorDom = editor.view.dom as HTMLElement;
      editorDom.addEventListener("click", handleImageClick);
    };

    try {
      attach();
    } catch {
      editor.on("create", attach);
    }

    return () => {
      editor.off("create", attach);
      if (editorDom) {
        try {
          editorDom.removeEventListener("click", handleImageClick);
        } catch {
          // view already destroyed
        }
      }
    };
  }, [editor]);

  useEffect(() => {
    if (!imgSrc) {
      setWidthInput("");
      setNaturalRatio(null);
      return;
    }

    if (imgStoredWidth) {
      setWidthInput(String(imgStoredWidth));
    }

    const imgEl = new Image();
    imgEl.onload = () => {
      setNaturalRatio(imgEl.naturalWidth / imgEl.naturalHeight);
      if (!imgStoredWidth) {
        setWidthInput(String(imgEl.naturalWidth));
      }
    };
    imgEl.src = imgSrc;
  }, [imgSrc]);

  if (!editor) return null;

  const openYoutubePopup = () => {
    setYoutubePopupOpen(true);
    setTimeout(() => youtubeInputRef.current?.focus(), 0);
  };

  const applyYoutube = () => {
    const url = youtubeUrl.trim();
    if (url) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
    setYoutubePopupOpen(false);
    setYoutubeUrl("");
  };

  const applyWidth = () => {
    const w = parseInt(widthInput);
    if (!w || w < 10) return;

    const pos = imgPosRef.current;
    if (pos === null) return;

    const node = editor.state.doc.nodeAt(pos);
    if (!node || node.type.name !== "image") return;

    const h = naturalRatio ? Math.round(w / naturalRatio) : undefined;

    // 1. DOM 스타일 즉시 반영 (ResizableNodeView는 attrs 변경 시 스타일 미업데이트)
    const domNode = editor.view.nodeDOM(pos);
    if (domNode instanceof HTMLElement) {
      const img = domNode.querySelector("img") as HTMLImageElement | null;
      if (img) {
        img.style.width = `${w}px`;
        if (h !== undefined) img.style.height = `${h}px`;
      }
    }

    // 2. node attrs 저장
    const newAttrs: Record<string, unknown> = { ...node.attrs, width: w };
    if (h !== undefined) newAttrs.height = h;
    editor
      .chain()
      .command(({ tr }) => {
        tr.setNodeMarkup(pos, undefined, newAttrs);
        return true;
      })
      .run();
  };

  return (
    <div className="mag-toolbar">
      {/* Heading */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="제목 1"
      >
        <img src="/images/title1.svg" alt="제목 1" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="제목 2"
      >
        <img src="/images/title2.svg" alt="제목 2" />
      </ToolbarBtn>

      <Divider />

      {/* Text formatting */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="굵게"
      >
        <img src="/images/bold.svg" alt="굵게" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="기울임"
      >
        <img src="/images/italic.svg" alt="기울임" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="밑줄"
      >
        <img src="/images/underline.svg" alt="밑줄" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        active={editor.isActive("highlight")}
        title="하이라이트"
      >
        <img src="/images/highlight.svg" alt="하이라이트" />
      </ToolbarBtn>

      <Divider />

      {/* Text alignment */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="왼쪽 정렬"
      >
        <img src="/images/align-left.svg" alt="왼쪽 정렬" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="가운데 정렬"
      >
        <img src="/images/align-center.svg" alt="가운데 정렬" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="오른쪽 정렬"
      >
        <img src="/images/align-right.svg" alt="오른쪽 정렬" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        active={editor.isActive({ textAlign: "justify" })}
        title="양쪽 정렬"
      >
        <img src="/images/align-justify.svg" alt="양쪽 정렬" />
      </ToolbarBtn>

      <Divider />

      {/* Lists */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="목록"
      >
        <img src="/images/list.svg" alt="목록" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="번호 목록"
      >
        <img src="/images/list-number.svg" alt="번호 목록" />
      </ToolbarBtn>

      <Divider />

      {/* Rule & Image */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="구분선"
      >
        <img src="/images/horizontal-line.svg" alt="구분선" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={onImageClick}
        disabled={imageUploading}
        title="이미지 첨부"
      >
        {imageUploading ? (
          <Loader2 size={16} className="mag-toolbar__spinning" />
        ) : (
          <img src="/images/image.svg" alt="이미지 첨부" />
        )}
      </ToolbarBtn>
      <ToolbarBtn
        onClick={openYoutubePopup}
        title="유튜브 임베드"
      >
        <img src="/images/youtube.svg" alt="유튜브" />
      </ToolbarBtn>

      {/* 유튜브 URL 입력 팝업 */}
      {youtubePopupOpen && (
        <div className="mag-toolbar__link-popup">
          <input
            ref={youtubeInputRef}
            className="mag-toolbar__link-input"
            type="url"
            placeholder="YouTube URL"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); applyYoutube(); }
              if (e.key === "Escape") { setYoutubePopupOpen(false); setYoutubeUrl(""); }
            }}
          />
          <button className="mag-toolbar__link-apply" onClick={applyYoutube} title="삽입">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
          <button className="mag-toolbar__link-remove" onClick={() => { setYoutubePopupOpen(false); setYoutubeUrl(""); }} title="취소">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Image size input — 이미지 선택 시에만 표시 */}
      {isImgActive && (
        <>
          <Divider />
          <div className="mag-toolbar__img-size">
            <span className="mag-toolbar__img-size-label">W</span>
            <input
              className="mag-toolbar__img-size-input"
              type="number"
              value={widthInput}
              min={50}
              max={2000}
              title="이미지 너비 (px) — Enter 또는 포커스 해제 시 적용"
              onChange={(e) => setWidthInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyWidth();
                }
              }}
              onBlur={applyWidth}
            />
            <span className="mag-toolbar__img-size-unit">px</span>
          </div>
        </>
      )}
    </div>
  );
}
