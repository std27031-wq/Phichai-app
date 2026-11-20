import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Download,
  FileText,
  Search,
  Share2,
  ThumbsUp,
  Upload,
  X,
} from 'lucide-react';
import type {
  EducationLevel,
  KnowledgeResource,
  StudentProfile,
  SubjectCategory,
} from '../types.ts';

interface KnowledgeViewProps {
  resources: KnowledgeResource[];
  currentStudent: StudentProfile;
  onUploadResource: (payload: {
    title: string;
    subject: SubjectCategory;
    level: EducationLevel;
    format: KnowledgeResource['format'];
    summary: string;
    contentBody?: string;
    fileName?: string;
    fileDataBase64?: string;
  }) => Promise<void>;
  onMarkHelpful: (id: string) => Promise<void>;
  onRecordDownload: (id: string) => void;
  openCreateInitially?: boolean;
  onConsumeOpenCreate?: () => void;
}

const SUBJECTS: Array<'ทั้งหมด' | SubjectCategory> = [
  'ทั้งหมด',
  'คณิตศาสตร์',
  'ฟิสิกส์',
  'เคมี',
  'ชีววิทยา',
  'วิทยาศาสตร์',
  'ภาษาอังกฤษ',
  'ภาษาไทย',
  'สังคมศึกษา',
  'วิทยาการคำนวณ',
];

const LEVELS: EducationLevel[] = [
  'ประถมศึกษา',
  'ม.ต้น',
  'ม.ปลาย',
  'เตรียมสอบเข้ามหาวิทยาลัย',
];

export function KnowledgeView({
  resources,
  currentStudent,
  onUploadResource,
  onMarkHelpful,
  onRecordDownload,
  openCreateInitially = false,
  onConsumeOpenCreate,
}: KnowledgeViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<'ทั้งหมด' | SubjectCategory>('ทั้งหมด');
  const [previewItem, setPreviewItem] = useState<KnowledgeResource | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(openCreateInitially);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [votedIds, setVotedIds] = useState<string[]>([]);

  // Upload Form State
  const [uploadMode, setUploadMode] = useState<'compose' | 'file'>('compose');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<SubjectCategory>('ชีววิทยา');
  const [level, setLevel] = useState<EducationLevel>('ม.ปลาย');
  const [summary, setSummary] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    base64: string;
    format: KnowledgeResource['format'];
  } | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (openCreateInitially) {
      setIsUploadOpen(true);
      onConsumeOpenCreate?.();
    }
  }, [openCreateInitially, onConsumeOpenCreate]);

  const filteredResources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return resources.filter((r) => {
      if (selectedSubject !== 'ทั้งหมด' && r.subject !== selectedSubject) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        r.authorName.toLowerCase().includes(q)
      );
    });
  }, [resources, searchQuery, selectedSubject]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('ขนาดไฟล์ต้องไม่เกิน 5 MB');
      return;
    }
    setUploadError('');
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let format: KnowledgeResource['format'] = 'Document';
    if (ext === 'pdf') format = 'PDF';
    else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) format = 'Image';
    else if (['md', 'txt'].includes(ext)) format = 'Markdown/Note';

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedFile({ name: file.name, base64: reader.result, format });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    if (!title.trim() || !summary.trim()) {
      setUploadError('กรุณากรอกหัวข้อและคำอธิบายเนื้อหาโดยย่อ');
      return;
    }
    if (uploadMode === 'file' && !selectedFile) {
      setUploadError('กรุณาเลือกไฟล์ที่ต้องการอัปโหลด');
      return;
    }
    if (uploadMode === 'compose' && !contentBody.trim()) {
      setUploadError('กรุณาพิมพ์เนื้อหาชีทสรุปอย่างน้อย 1 ย่อหน้า');
      return;
    }

    setIsSubmitting(true);
    try {
      await onUploadResource({
        title,
        subject,
        level,
        format: uploadMode === 'file' && selectedFile ? selectedFile.format : 'Markdown/Note',
        summary,
        contentBody: uploadMode === 'compose' ? contentBody : undefined,
        fileName:
          uploadMode === 'file' && selectedFile
            ? selectedFile.name
            : `${title.trim().slice(0, 32).replace(/\s+/g, '-')}.md`,
        fileDataBase64: uploadMode === 'file' && selectedFile ? selectedFile.base64 : undefined,
      });
      setTitle('');
      setSummary('');
      setContentBody('');
      setSelectedFile(null);
      setIsUploadOpen(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'ไม่สามารถอัปโหลดชีทสรุปได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = (item: KnowledgeResource) => {
    onRecordDownload(item.id);
    const link = document.createElement('a');
    link.href = `/api/knowledge/${item.id}/download`;
    link.download = item.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleShare = async (item: KnowledgeResource) => {
    const shareText = `${item.title} (${item.subject} · ${item.level}) — แบ่งปันโดย ${item.authorName} บนปันเรียน`;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleHelpful = async (item: KnowledgeResource) => {
    if (votedIds.includes(item.id)) return;
    setVotedIds((prev) => [...prev, item.id]);
    await onMarkHelpful(item.id);
  };

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-medium text-blue-700">
            ระบบที่ 3 · คลังแบ่งปันชีทสรุปและไฟล์ความรู้ฟรี
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 text-balance">
            แบ่งปันชีทสรุปและไฟล์ความรู้ในรายวิชาต่าง ๆ
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            เปิดโอกาสให้นักเรียนเข้าถึงคลังสรุปสูตร เนื้อหาสอบ และไฟล์การเรียนรู้ได้ฟรี อัปโหลดไฟล์จากเครื่องหรือเขียนสรุปแบ่งปันเพื่อนร่วมรุ่นได้ทันที
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>อัปโหลดชีทสรุป / ไฟล์ความรู้</span>
        </button>
      </div>

      {/* Search & Subject Filters */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชีทสรุป สูตรคณิต เนื้อหาสอบ หรือชื่อผู้แบ่งปัน..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {SUBJECTS.map((subj) => (
            <button
              key={subj}
              type="button"
              onClick={() => setSelectedSubject(subj)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedSubject === subj
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>
      </div>

      {/* Resources Grid */}
      {filteredResources.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
          <p className="text-base font-medium text-slate-900">ไม่พบไฟล์ความรู้ในหมวดนี้</p>
          <p className="text-sm text-slate-500">
            ร่วมเป็นคนแรกที่อัปโหลดชีทสรุปในรายวิชานี้เพื่อช่วยเพื่อนนักเรียนคนอื่น ๆ
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((item) => {
            const isCopied = copiedId === item.id;
            const hasVoted = votedIds.includes(item.id);
            return (
              <article
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="truncate">
                      {item.subject} · {item.level} · {item.format}
                    </span>
                    <span className="font-mono-tabular shrink-0">{item.fileSizeLabel}</span>
                  </div>

                  <h3 className="text-base font-semibold text-slate-900 leading-snug line-clamp-2">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {item.summary}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="truncate">
                      โดย {item.authorName} ({item.authorGrade})
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      ดาวน์โหลด {item.downloads}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>เปิดอ่านตัวอย่าง</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(item)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ดาวน์โหลดเก็บไว้</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleHelpful(item)}
                      disabled={hasVoted}
                      title="ชีทนี้มีประโยชน์"
                      className={`inline-flex items-center gap-1 px-2.5 py-2 text-xs font-mono-tabular rounded-lg border transition-colors cursor-pointer ${
                        hasVoted
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{item.helpfulCount}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShare(item)}
                      title="คัดลอกข้อความแบ่งปัน"
                      className="p-2 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Preview & Download Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="text-xs text-slate-500">
                  {previewItem.subject} · {previewItem.level} · {previewItem.fileSizeLabel}
                </div>
                <h3 className="text-xl font-semibold text-slate-900">{previewItem.title}</h3>
                <p className="text-xs text-slate-500">
                  แบ่งปันโดย {previewItem.authorName} ({previewItem.authorGrade} ·{' '}
                  {previewItem.authorSchool})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">{previewItem.summary}</p>

            {previewItem.contentBody ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 overflow-x-auto">
                <pre className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {previewItem.contentBody}
                </pre>
              </div>
            ) : previewItem.storedFileName && previewItem.format === 'Image' ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-hidden">
                <img
                  src={`/api/knowledge/${previewItem.id}/preview`}
                  alt={previewItem.title}
                  className="max-h-96 w-full object-contain rounded"
                />
              </div>
            ) : previewItem.storedFileName && previewItem.format === 'PDF' ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                <iframe
                  src={`/api/knowledge/${previewItem.id}/preview`}
                  title={previewItem.title}
                  className="w-full h-96 bg-white"
                />
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center space-y-2">
                <FileText className="w-8 h-8 text-blue-700 mx-auto" strokeWidth={1.5} />
                <div className="text-sm font-medium text-slate-900">{previewItem.fileName}</div>
                <p className="text-xs text-slate-500">
                  ไฟล์เอกสารพร้อมดาวน์โหลดเก็บไว้ใช้งานและพิมพ์ทบทวนได้ทันที
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-3 text-xs text-slate-500 font-mono-tabular">
                <span>ดาวน์โหลดแล้ว {previewItem.downloads} ครั้ง</span>
                <span>·</span>
                <span>มีประโยชน์ {previewItem.helpfulCount} คน</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleShare(previewItem)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  {copiedId === previewItem.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>คัดลอกลิงก์แล้ว</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>แบ่งปันให้เพื่อน</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(previewItem)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลดไฟล์ ({previewItem.fileName})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload / Compose Study Sheet Modal */}
      {isUploadOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  แบ่งปันชีทสรุปหรือไฟล์ความรู้
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ผู้เผยแพร่: {currentStudent.name} ({currentStudent.grade})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  รูปแบบการแบ่งปัน
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadMode('compose')}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer ${
                      uploadMode === 'compose'
                        ? 'border-blue-700 bg-blue-50 text-blue-800'
                        : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    เขียนสรุปบทเรียนออนไลน์ (.md)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('file')}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer ${
                      uploadMode === 'file'
                        ? 'border-blue-700 bg-blue-50 text-blue-800'
                        : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    อัปโหลดไฟล์จากเครื่อง (PDF / รูป / เอกสาร)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  หัวข้อชีทสรุป / ชื่อไฟล์ความรู้ *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น สรุปสูตรตรีโกณมิติและเอกลักษณ์สำคัญ ม.5"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">หมวดวิชา</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value as SubjectCategory)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {SUBJECTS.filter((s) => s !== 'ทั้งหมด').map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ระดับชั้น</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as EducationLevel)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  คำอธิบายเนื้อหาโดยย่อ *
                </label>
                <textarea
                  rows={2}
                  required
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="ระบุหัวข้อที่ครอบคลุมเพื่อให้เพื่อน ๆ ค้นหาเจอได้ง่าย..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              {uploadMode === 'compose' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    เนื้อหาชีทสรุป (รองรับ Markdown) *
                  </label>
                  <textarea
                    rows={6}
                    value={contentBody}
                    onChange={(e) => setContentBody(e.target.value)}
                    placeholder="# หัวข้อสำคัญ&#10;- ประเด็นที่ 1...&#10;- สูตรลัดและตัวอย่าง..."
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    เลือกไฟล์จากอุปกรณ์ (สูงสุด 5 MB) *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  {selectedFile && (
                    <p className="text-xs text-emerald-700 mt-1.5">
                      พร้อมอัปโหลด: {selectedFile.name} ({selectedFile.format})
                    </p>
                  )}
                </div>
              )}

              {uploadError && <p className="text-xs text-red-700">{uploadError}</p>}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'กำลังเผยแพร่...' : 'เผยแพร่ชีทสรุป'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
