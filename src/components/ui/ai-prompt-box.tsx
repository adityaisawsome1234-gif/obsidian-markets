"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ChangeEvent,
  type KeyboardEvent,
  type DragEvent,
} from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowUp,
  Paperclip,
  Square,
  X,
  StopCircle,
  Mic,
  Globe,
  BrainCog,
  FolderCode,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────────────────────────────────────── */

interface ToggleOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  activeColor: string;
  placeholder: string;
}

interface UploadedFile {
  id: string;
  file: File;
  previewUrl: string | null;
  type: "image" | "file";
}

interface PromptInputContextValue {
  value: string;
  setValue: (val: string) => void;
  files: UploadedFile[];
  addFiles: (files: FileList | File[]) => void;
  removeFile: (id: string) => void;
  activeToggle: string | null;
  setActiveToggle: (id: string | null) => void;
  isRecording: boolean;
  setIsRecording: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
  onSubmit: () => void;
  onStop: () => void;
  placeholder: string;
}

interface PromptInputBoxProps {
  onSubmit?: (value: string, files: UploadedFile[]) => void;
  onStop?: () => void;
  isSubmitting?: boolean;
  className?: string;
  children?: React.ReactNode;
  defaultPlaceholder?: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Context
 * ───────────────────────────────────────────────────────────────────────────── */

const PromptInputContext = createContext<PromptInputContextValue | null>(null);

function usePromptInput(): PromptInputContextValue {
  const ctx = useContext(PromptInputContext);
  if (!ctx) {
    throw new Error("usePromptInput must be used within PromptInputBox");
  }
  return ctx;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Toggle options
 * ───────────────────────────────────────────────────────────────────────────── */

const TOGGLES: ToggleOption[] = [
  {
    id: "search",
    label: "Search",
    icon: <Globe size={14} />,
    activeColor: "#60a5fa",
    placeholder: "Search markets...",
  },
  {
    id: "deep-analysis",
    label: "Deep Analysis",
    icon: <BrainCog size={14} />,
    activeColor: "var(--a2)",
    placeholder: "Run deep analysis...",
  },
  {
    id: "research",
    label: "Research",
    icon: <FolderCode size={14} />,
    activeColor: "#F97316",
    placeholder: "Research mode...",
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
 * Tooltip (inline, lightweight)
 * ───────────────────────────────────────────────────────────────────────────── */

interface InlineTooltipProps {
  content: string;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

function InlineTooltip({ content, children, side = "top" }: InlineTooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className="z-50 bg-s4 text-w2 text-[11px] font-medium px-2.5 py-1.5 rounded-[var(--rad-sm)] border border-[var(--brd2)] shadow-lg animate-in fade-in-0 zoom-in-95"
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-s4" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * ImageViewDialog
 * ───────────────────────────────────────────────────────────────────────────── */

interface ImageViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string | null;
  alt?: string;
}

function ImageViewDialog({ open, onOpenChange, src, alt = "Preview" }: ImageViewDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-8"
              >
                <div className="relative max-w-4xl max-h-[85vh] w-full">
                  <DialogPrimitive.Close className="absolute -top-3 -right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-s3 border border-[var(--brd2)] text-w3 hover:text-w transition-colors cursor-pointer">
                    <X size={14} />
                  </DialogPrimitive.Close>
                  {src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={alt}
                      className="w-full h-full object-contain rounded-[var(--rad)]"
                    />
                  )}
                </div>
                <DialogPrimitive.Title className="sr-only">Image preview</DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">
                  Full-size image preview dialog
                </DialogPrimitive.Description>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * VoiceRecorder
 * ───────────────────────────────────────────────────────────────────────────── */

function VoiceRecorder() {
  const { isRecording, setIsRecording, setValue, value } = usePromptInput();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        // In a real implementation this would call a speech-to-text API
        // For now we simulate a transcription placeholder
        if (chunksRef.current.length > 0) {
          const transcribed = "[Voice input transcribed]";
          setValue(value ? `${value} ${transcribed}` : transcribed);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      console.error("Microphone access denied");
    }
  }, [setIsRecording, setValue, value]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [setIsRecording]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-2">
        <motion.div
          className="w-2 h-2 rounded-full bg-red-500"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        />
        <span className="text-[11px] text-w3 font-mono tabular-nums">
          {formatDuration(duration)}
        </span>
        <InlineTooltip content="Stop recording">
          <button
            type="button"
            onClick={stopRecording}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
          >
            <StopCircle size={14} />
          </button>
        </InlineTooltip>
      </div>
    );
  }

  return (
    <InlineTooltip content="Voice input">
      <button
        type="button"
        onClick={startRecording}
        className="w-7 h-7 flex items-center justify-center rounded-[var(--rad-sm)] text-w4 hover:text-w3 hover:bg-s3 transition-colors cursor-pointer"
      >
        <Mic size={15} />
      </button>
    </InlineTooltip>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Textarea (auto-resizing)
 * ───────────────────────────────────────────────────────────────────────────── */

interface PromptTextareaProps {
  maxRows?: number;
}

function PromptTextarea({ maxRows = 6 }: PromptTextareaProps) {
  const { value, setValue, placeholder, onSubmit, isSubmitting } = usePromptInput();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 22;
    const maxHeight = lineHeight * maxRows;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [maxRows]);

  useEffect(() => {
    resize();
  }, [value, resize]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isSubmitting) {
        onSubmit();
      }
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      rows={1}
      className={cn(
        "w-full resize-none bg-transparent text-[13px] text-w leading-[22px]",
        "placeholder:text-w4 outline-none",
        "scrollbar-thin"
      )}
      style={{ minHeight: 22 }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * File Preview Thumbnails
 * ───────────────────────────────────────────────────────────────────────────── */

function FilePreviewList() {
  const { files, removeFile } = usePromptInput();
  const [viewImage, setViewImage] = useState<string | null>(null);

  if (files.length === 0) return null;

  return (
    <>
      <div className="flex gap-2 flex-wrap px-1 pb-1">
        {files.map((f) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            className="relative group"
          >
            {f.type === "image" && f.previewUrl ? (
              <button
                type="button"
                onClick={() => setViewImage(f.previewUrl)}
                className="w-14 h-14 rounded-[var(--rad-sm)] overflow-hidden border border-[var(--brd2)] cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.previewUrl}
                  alt={f.file.name}
                  className="w-full h-full object-cover"
                />
              </button>
            ) : (
              <div className="w-14 h-14 rounded-[var(--rad-sm)] border border-[var(--brd2)] bg-s3 flex items-center justify-center">
                <span className="text-[9px] text-w4 font-medium uppercase truncate px-1">
                  {f.file.name.split(".").pop()}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => removeFile(f.id)}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-s4 border border-[var(--brd2)] flex items-center justify-center text-w4 hover:text-w3 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <X size={8} />
            </button>
          </motion.div>
        ))}
      </div>

      <ImageViewDialog
        open={!!viewImage}
        onOpenChange={(open) => !open && setViewImage(null)}
        src={viewImage}
      />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Toggle Buttons (Search / Deep Analysis / Research)
 * ───────────────────────────────────────────────────────────────────────────── */

function ToggleButtons() {
  const { activeToggle, setActiveToggle } = usePromptInput();

  return (
    <div className="flex items-center gap-1">
      {TOGGLES.map((toggle) => {
        const isActive = activeToggle === toggle.id;
        return (
          <InlineTooltip key={toggle.id} content={toggle.label}>
            <button
              type="button"
              onClick={() => setActiveToggle(isActive ? null : toggle.id)}
              className={cn(
                "h-7 flex items-center gap-1.5 px-2.5 rounded-full text-[11px] font-medium transition-all duration-200 cursor-pointer border",
                isActive
                  ? "border-transparent text-bg"
                  : "border-[var(--brd)] text-w4 hover:text-w3 hover:border-[var(--brd2)] hover:bg-s3"
              )}
              style={
                isActive
                  ? { backgroundColor: toggle.activeColor, color: "#0b0b0f" }
                  : undefined
              }
            >
              <span
                className="flex items-center"
                style={isActive ? { color: "#0b0b0f" } : undefined}
              >
                {toggle.icon}
              </span>
              <AnimatePresence mode="wait">
                {isActive && (
                  <motion.span
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {toggle.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </InlineTooltip>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Action Bar (bottom row: toggles, attach, voice, submit)
 * ───────────────────────────────────────────────────────────────────────────── */

function ActionBar() {
  const { value, files, isSubmitting, isRecording, onSubmit, onStop } = usePromptInput();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addFiles } = usePromptInput();

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const canSubmit = (value.trim().length > 0 || files.length > 0) && !isRecording;

  return (
    <div className="flex items-center justify-between">
      {/* Left: toggles */}
      <ToggleButtons />

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        {/* Divider */}
        <div className="w-px h-4 bg-[var(--a)] opacity-20 mx-1" />

        {/* Attach */}
        <InlineTooltip content="Attach files">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-7 h-7 flex items-center justify-center rounded-[var(--rad-sm)] text-w4 hover:text-w3 hover:bg-s3 transition-colors cursor-pointer"
          >
            <Paperclip size={15} />
          </button>
        </InlineTooltip>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.csv,.json,.txt,.md,.doc,.docx,.xls,.xlsx"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Voice */}
        <VoiceRecorder />

        {/* Submit / Stop */}
        {isSubmitting ? (
          <InlineTooltip content="Stop generating">
            <button
              type="button"
              onClick={onStop}
              className="w-7 h-7 flex items-center justify-center rounded-[var(--rad-sm)] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
            >
              <Square size={12} />
            </button>
          </InlineTooltip>
        ) : (
          <InlineTooltip content="Send message">
            <button
              type="button"
              onClick={() => canSubmit && onSubmit()}
              disabled={!canSubmit}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-[var(--rad-sm)] transition-all duration-200 cursor-pointer",
                canSubmit
                  ? "bg-w text-bg hover:bg-w/80 shadow-[0_0_12px_rgba(167,139,250,0.15)]"
                  : "bg-s3 text-w5 cursor-not-allowed"
              )}
            >
              <ArrowUp size={14} strokeWidth={2.5} />
            </button>
          </InlineTooltip>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * PromptInputBox (main export)
 * ───────────────────────────────────────────────────────────────────────────── */

export function PromptInputBox({
  onSubmit: onSubmitProp,
  onStop: onStopProp,
  isSubmitting: isSubmittingProp = false,
  className,
  defaultPlaceholder = "Ask Obsidian AI about stocks, markets, options...",
}: PromptInputBoxProps) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [activeToggle, setActiveToggle] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmittingInternal, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isSubmitting = isSubmittingProp || isSubmittingInternal;

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const mapped: UploadedFile[] = arr.map((file) => {
      const isImage = file.type.startsWith("image/");
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: isImage ? URL.createObjectURL(file) : null,
        type: isImage ? "image" : "file",
      };
    });
    setFiles((prev) => [...prev, ...mapped]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (!value.trim() && files.length === 0) return;
    if (onSubmitProp) {
      onSubmitProp(value, files);
    }
    setValue("");
    setFiles([]);
    setActiveToggle(null);
  }, [value, files, onSubmitProp]);

  const handleStop = useCallback(() => {
    if (onStopProp) onStopProp();
    setIsSubmitting(false);
  }, [onStopProp]);

  // Derive placeholder from active toggle
  const placeholder =
    TOGGLES.find((t) => t.id === activeToggle)?.placeholder ?? defaultPlaceholder;

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
    // Only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ctxValue: PromptInputContextValue = {
    value,
    setValue,
    files,
    addFiles,
    removeFile,
    activeToggle,
    setActiveToggle,
    isRecording,
    setIsRecording,
    isSubmitting,
    setIsSubmitting,
    onSubmit: handleSubmit,
    onStop: handleStop,
    placeholder,
  };

  return (
    <PromptInputContext.Provider value={ctxValue}>
      <div
        ref={containerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col gap-2 p-3",
          "bg-s2 border rounded-2xl",
          "shadow-[0_8px_30px_rgba(0,0,0,0.24)]",
          "transition-colors duration-200",
          isDragOver
            ? "border-a/40"
            : "border-[var(--brd2)]",
          className
        )}
      >
        {/* Drag overlay */}
        <AnimatePresence>
          {isDragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-s2/90 border-2 border-dashed border-a/40 pointer-events-none"
            >
              <div className="flex flex-col items-center gap-1.5">
                <Paperclip size={20} className="text-a opacity-60" />
                <span className="text-[12px] text-w3 font-medium">
                  Drop files here
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* File previews */}
        <AnimatePresence>
          <FilePreviewList />
        </AnimatePresence>

        {/* Textarea */}
        <PromptTextarea />

        {/* Action bar */}
        <ActionBar />
      </div>
    </PromptInputContext.Provider>
  );
}
