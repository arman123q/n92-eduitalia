"use client";

import { useEffect, useReducer, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Heading2, Heading3,
  List, ListOrdered, Quote, Link2, Link2Off, ImagePlus, Table as TableIcon,
  Minus, Undo2, Redo2, Upload,
} from "lucide-react";

/**
 * Rich-text editor for blog articles (Tiptap / ProseMirror).
 * Headings, paragraphs, bold/italic/underline/strike, lists,
 * blockquotes, links, images and tables. Pasting formatted content
 * keeps its structure (ProseMirror paste rules). Output is HTML,
 * which the caller sanitises with DOMPurify before saving.
 */
export default function RichTextEditor({
  initialHtml,
  onChange,
  onImageUpload,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
  onImageUpload?: (file: File) => Promise<string | null>;
}) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialHtml || "<p></p>",
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
    editorProps: { attributes: { class: "tiptap article-body" } },
  });

  useEffect(() => {
    if (!editor) return;
    editor.on("transaction", force);
    return () => {
      editor.off("transaction", force);
    };
  }, [editor]);

  if (!editor) return <div className="rounded-xl border border-[#103f35]/20 bg-white p-4 text-sm text-[#202824]/50">Loading editor…</div>;

  const btn = (active: boolean) =>
    `rounded-lg p-2 transition-colors ${active ? "bg-[#103f35] text-white" : "text-[#103f35] hover:bg-[#103f35]/10"}`;

  const setLink = () => {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("Link URL (https://…)");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const addImageByUrl = () => {
    const url = window.prompt("Image URL (https://…)");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const handleUpload = async (file: File) => {
    if (!onImageUpload) return;
    const url = await onImageUpload(file);
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#103f35]/25 bg-white">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[#103f35]/12 bg-[#faf9f5] px-2 py-1.5">
        <button type="button" title="Heading 2" aria-label="Heading 2" className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={17} /></button>
        <button type="button" title="Heading 3" aria-label="Heading 3" className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={17} /></button>
        <span className="mx-1 h-5 w-px bg-[#103f35]/15" />
        <button type="button" title="Bold" aria-label="Bold" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={17} /></button>
        <button type="button" title="Italic" aria-label="Italic" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={17} /></button>
        <button type="button" title="Underline" aria-label="Underline" className={btn(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={17} /></button>
        <button type="button" title="Strikethrough" aria-label="Strikethrough" className={btn(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={17} /></button>
        <span className="mx-1 h-5 w-px bg-[#103f35]/15" />
        <button type="button" title="Bullet list" aria-label="Bullet list" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={17} /></button>
        <button type="button" title="Numbered list" aria-label="Numbered list" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={17} /></button>
        <button type="button" title="Quote" aria-label="Quote" className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={17} /></button>
        <span className="mx-1 h-5 w-px bg-[#103f35]/15" />
        <button type="button" title={editor.isActive("link") ? "Remove link" : "Add link"} aria-label="Link" className={btn(editor.isActive("link"))} onClick={setLink}>{editor.isActive("link") ? <Link2Off size={17} /> : <Link2 size={17} />}</button>
        <button type="button" title="Insert image by URL" aria-label="Insert image by URL" className={btn(false)} onClick={addImageByUrl}><ImagePlus size={17} /></button>
        {onImageUpload && (
          <>
            <button type="button" title="Upload image" aria-label="Upload image" className={btn(false)} onClick={() => fileRef.current?.click()}><Upload size={17} /></button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); e.target.value = ""; }} />
          </>
        )}
        <button type="button" title="Insert table (3×3)" aria-label="Insert table" className={btn(false)} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon size={17} /></button>
        <button type="button" title="Horizontal line" aria-label="Horizontal line" className={btn(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={17} /></button>
        <span className="mx-1 h-5 w-px bg-[#103f35]/15" />
        <button type="button" title="Undo" aria-label="Undo" className={btn(false)} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={17} /></button>
        <button type="button" title="Redo" aria-label="Redo" className={btn(false)} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={17} /></button>
      </div>
      <EditorContent editor={editor} className="max-h-[560px] overflow-y-auto px-4 py-3" />
    </div>
  );
}
