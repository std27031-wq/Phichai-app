import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import type {
  EducationLevel,
  LendingBook,
  LendingTransaction,
  StudentProfile,
  SubjectCategory,
} from '../types.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface LendingViewProps {
  books: LendingBook[];
  transactions: LendingTransaction[];
  currentStudent: StudentProfile;
  initialSubView?: 'catalog' | 'ledger';
  onAddBook: (payload: {
    title: string;
    subject: SubjectCategory;
    level: EducationLevel;
    description: string;
    conditionLabel: string;
    mode: LendingBook['mode'];
    preferredExchangeTopic?: string;
    maxLoanDays: number;
  }) => Promise<void>;
  onCreateTransaction: (payload: {
    bookId: string;
    transactionType: 'borrow' | 'exchange';
    borrowerName: string;
    borrowerGrade: string;
    borrowerContact: string;
    exchangeBookTitle?: string;
    loanDays: number;
    startDate: string;
    notes: string;
  }) => Promise<void>;
  onUpdateTransaction: (
    txId: string,
    action: 'approve' | 'return' | 'extend' | 'complete_exchange'
  ) => Promise<void>;
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

function computeDueDatePreview(startIso: string, days: number): string {
  if (!startIso) return '';
  const dt = new Date(`${startIso}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return '';
  dt.setUTCDate(dt.getUTCDate() + Math.max(1, days));
  return dt.toISOString().slice(0, 10);
}

function getDaysDiffFromToday(dueIso: string): number {
  const todayStr = new Date().toISOString().slice(0, 10);
  const due = new Date(`${dueIso}T00:00:00Z`).getTime();
  const today = new Date(`${todayStr}T00:00:00Z`).getTime();
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

export function LendingView({
  books,
  transactions,
  currentStudent,
  initialSubView = 'catalog',
  onAddBook,
  onCreateTransaction,
  onUpdateTransaction,
  openCreateInitially = false,
  onConsumeOpenCreate,
}: LendingViewProps) {
  const [subView, setSubView] = useState<'catalog' | 'ledger'>(initialSubView);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<'ทั้งหมด' | SubjectCategory>('ทั้งหมด');
  const [modeFilter, setModeFilter] = useState<'all' | 'lend' | 'exchange'>('all');
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'active' | 'overdue' | 'completed'>(
    'all'
  );

  const [selectedBookForRequest, setSelectedBookForRequest] = useState<LendingBook | null>(null);
  const [isAddBookOpen, setIsAddBookOpen] = useState(openCreateInitially);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Borrow / Exchange Form State
  const todayIso = new Date().toISOString().slice(0, 10);
  const [txType, setTxType] = useState<'borrow' | 'exchange'>('borrow');
  const [borrowerName, setBorrowerName] = useState(currentStudent.name);
  const [borrowerGrade, setBorrowerGrade] = useState(currentStudent.grade);
  const [borrowerContact, setBorrowerContact] = useState(currentStudent.contact);
  const [exchangeBookTitle, setExchangeBookTitle] = useState('');
  const [loanDays, setLoanDays] = useState(14);
  const [startDate, setStartDate] = useState(todayIso);
  const [notes, setNotes] = useState('');
  const [txError, setTxError] = useState('');

  // Add Book Form State
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState<SubjectCategory>('คณิตศาสตร์');
  const [newLevel, setNewLevel] = useState<EducationLevel>('ม.ปลาย');
  const [newMode, setNewMode] = useState<LendingBook['mode']>('both');
  const [newPreferredTopic, setNewPreferredTopic] = useState('');
  const [newCondition, setNewCondition] = useState('สภาพดีมาก (90%)');
  const [newMaxLoanDays, setNewMaxLoanDays] = useState(14);
  const [newDescription, setNewDescription] = useState('');
  const [bookError, setBookError] = useState('');

  useEffect(() => {
    setSubView(initialSubView);
  }, [initialSubView]);

  useEffect(() => {
    if (openCreateInitially) {
      setIsAddBookOpen(true);
      onConsumeOpenCreate?.();
    }
  }, [openCreateInitially, onConsumeOpenCreate]);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return books.filter((b) => {
      if (selectedSubject !== 'ทั้งหมด' && b.subject !== selectedSubject) return false;
      if (modeFilter === 'lend' && b.mode === 'exchange') return false;
      if (modeFilter === 'exchange' && b.mode === 'lend') return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.subject.toLowerCase().includes(q) ||
        b.ownerName.toLowerCase().includes(q)
      );
    });
  }, [books, searchQuery, selectedSubject, modeFilter]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (ledgerFilter === 'active') return tx.status === 'active' || tx.status === 'pending';
      if (ledgerFilter === 'overdue') return tx.status === 'overdue';
      if (ledgerFilter === 'completed')
        return tx.status === 'returned' || tx.status === 'exchanged_completed';
      return true;
    });
  }, [transactions, ledgerFilter]);

  const overdueCount = transactions.filter((t) => t.status === 'overdue').length;
  const activeCount = transactions.filter(
    (t) => t.status === 'active' || t.status === 'overdue'
  ).length;

  const openRequestModal = (book: LendingBook) => {
    setSelectedBookForRequest(book);
    setTxType(book.mode === 'exchange' ? 'exchange' : 'borrow');
    setLoanDays(book.maxLoanDays);
    setStartDate(todayIso);
    setBorrowerName(currentStudent.name);
    setBorrowerGrade(currentStudent.grade);
    setBorrowerContact(currentStudent.contact);
    setExchangeBookTitle('');
    setNotes('');
    setTxError('');
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookForRequest) return;
    setTxError('');
    if (txType === 'exchange' && !exchangeBookTitle.trim()) {
      setTxError('กรุณาระบุชื่อหนังสือที่จะนำมาแลกเปลี่ยน');
      return;
    }
    setBusyId('creating-tx');
    try {
      await onCreateTransaction({
        bookId: selectedBookForRequest.id,
        transactionType: txType,
        borrowerName,
        borrowerGrade,
        borrowerContact,
        exchangeBookTitle: txType === 'exchange' ? exchangeBookTitle : undefined,
        loanDays,
        startDate,
        notes,
      });
      setSelectedBookForRequest(null);
      setSubView('ledger');
    } catch (err) {
      setTxError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกรายการได้');
    } finally {
      setBusyId(null);
    }
  };

  const handleAddBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookError('');
    if (!newTitle.trim()) {
      setBookError('กรุณากรอกชื่อหนังสือ');
      return;
    }
    setBusyId('creating-book');
    try {
      await onAddBook({
        title: newTitle,
        subject: newSubject,
        level: newLevel,
        description: newDescription,
        conditionLabel: newCondition,
        mode: newMode,
        preferredExchangeTopic: newMode === 'lend' ? undefined : newPreferredTopic,
        maxLoanDays: newMaxLoanDays,
      });
      setNewTitle('');
      setNewDescription('');
      setNewPreferredTopic('');
      setIsAddBookOpen(false);
    } catch (err) {
      setBookError(err instanceof Error ? err.message : 'ไม่สามารถเพิ่มหนังสือได้');
    } finally {
      setBusyId(null);
    }
  };

  const handleTxAction = async (
    txId: string,
    action: 'approve' | 'return' | 'extend' | 'complete_exchange'
  ) => {
    setBusyId(txId);
    try {
      await onUpdateTransaction(txId, action);
    } finally {
      setBusyId(null);
    }
  };

  const previewDueDate = computeDueDatePreview(startDate, loanDays);

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-medium text-blue-700">
            ระบบที่ 2 · ยืม-แลกเปลี่ยน และติดตามวันส่งคืน
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 text-balance">
            ยืมหนังสือเรียนและแลกเปลี่ยนระหว่างนักเรียน
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            บันทึกข้อมูลผู้ให้ยืม ผู้ยืม หรือผู้แลกเปลี่ยน พร้อมกำหนดระยะเวลาและวันกำหนดส่งคืนอัตโนมัติ เพื่อให้ติดตามสถานะได้อย่างโปร่งใส
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Segmented Sub-view Switch */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setSubView('catalog')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                subView === 'catalog'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              คลังหนังสือยืม-แลก ({books.length})
            </button>
            <button
              type="button"
              onClick={() => setSubView('ledger')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                subView === 'ledger'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ติดตามการยืม-คืน ({activeCount})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAddBookOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เปิดให้ยืม / แลกเปลี่ยน</span>
          </button>
        </div>
      </div>

      {/* Sub-view 1: Books Catalog */}
      {subView === 'catalog' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาหนังสือที่เปิดให้ยืมหรือแลกเปลี่ยน..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
              <button
                type="button"
                onClick={() => setModeFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
                  modeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setModeFilter('lend')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
                  modeFilter === 'lend' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                ให้ยืมฟรี
              </button>
              <button
                type="button"
                onClick={() => setModeFilter('exchange')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
                  modeFilter === 'exchange' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                แลกเปลี่ยน
              </button>
            </div>
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

          {filteredBooks.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
              <p className="text-base font-medium text-slate-900">
                ยังไม่มีหนังสือที่เปิดให้ยืมหรือแลกเปลี่ยนในหมวดนี้
              </p>
              <p className="text-sm text-slate-500">
                คุณสามารถแบ่งปันหนังสือเรียนที่อ่านจบแล้วเพื่อให้เพื่อน ๆ ยืมต่อได้
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBooks.map((book) => {
                const isAvailable = book.availability === 'available';
                const modeLabel =
                  book.mode === 'lend'
                    ? 'เปิดให้ยืมเรียน'
                    : book.mode === 'exchange'
                      ? 'แลกเปลี่ยนหนังสือ'
                      : 'ยืมหรือแลกเปลี่ยนได้';

                return (
                  <article
                    key={book.id}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
                  >
                    <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
                      <ResilientImage
                        src={book.imageUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                          <span>{book.subject}</span>
                          <span aria-hidden="true">·</span>
                          <span>{book.level}</span>
                          <span aria-hidden="true">·</span>
                          <span>{modeLabel}</span>
                        </div>

                        <h3 className="text-base font-semibold text-slate-900 leading-snug line-clamp-2">
                          {book.title}
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {book.description}
                        </p>

                        {book.preferredExchangeTopic && (
                          <div className="text-xs text-slate-700 pt-1">
                            สนใจแลกกับ: <span className="font-medium">{book.preferredExchangeTopic}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">
                            เจ้าของ: <strong className="text-slate-800">{book.ownerName}</strong> ({book.ownerGrade})
                          </span>
                          <span className="font-mono-tabular text-slate-700 font-medium">
                            สูงสุด {book.maxLoanDays} วัน
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                              isAvailable
                                ? 'text-emerald-700'
                                : book.availability === 'lent_out'
                                  ? 'text-amber-700'
                                  : 'text-slate-600'
                            }`}
                          >
                            {isAvailable ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>พร้อมให้ยืม / แลก</span>
                              </>
                            ) : book.availability === 'lent_out' ? (
                              <>
                                <Clock className="w-3.5 h-3.5" />
                                <span>กำลังถูกยืมอยู่</span>
                              </>
                            ) : (
                              <>
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                                <span>แลกเปลี่ยนแล้ว</span>
                              </>
                            )}
                          </span>

                          {isAvailable ? (
                            <button
                              type="button"
                              onClick={() => openRequestModal(book)}
                              className="px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                            >
                              {book.mode === 'exchange' ? 'ทำรายการแลกเปลี่ยน' : 'ขอยืม / แลกเปลี่ยน'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSubView('ledger')}
                              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                            >
                              ดูวันกำหนดคืน
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sub-view 2: Lending & Exchange Tracking Ledger */}
      {subView === 'ledger' && (
        <div className="space-y-5">
          {/* Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">รายการที่กำลังยืม / แลกเปลี่ยนอยู่</div>
              <div className="text-2xl font-semibold text-slate-900 font-mono-tabular mt-1">
                {activeCount} รายการ
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">รายการที่เลยกำหนดส่งคืน</div>
              <div
                className={`text-2xl font-semibold font-mono-tabular mt-1 ${
                  overdueCount > 0 ? 'text-red-700' : 'text-slate-900'
                }`}
              >
                {overdueCount} รายการ
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">ส่งคืนและแลกเปลี่ยนสำเร็จแล้ว</div>
              <div className="text-2xl font-semibold text-emerald-700 font-mono-tabular mt-1">
                {
                  transactions.filter(
                    (t) => t.status === 'returned' || t.status === 'exchanged_completed'
                  ).length
                }{' '}
                รายการ
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  ['all', 'ทั้งหมด'],
                  ['active', 'กำลังยืม'],
                  ['overdue', 'เลยกำหนดคืน'],
                  ['completed', 'คืนแล้ว / สำเร็จ'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLedgerFilter(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
                    ledgerFilter === key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-500">
              บันทึกครบทั้งผู้ให้ยืม ผู้ยืม/ผู้แลกเปลี่ยน ระยะเวลายืม และวันกำหนดส่งคืน
            </p>
          </div>

          {/* Tracking Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {filteredTransactions.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                ไม่พบประวัติการยืมหรือแลกเปลี่ยนในหมวดนี้
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                      <th className="py-3 px-4">หนังสือ / ประเภท</th>
                      <th className="py-3 px-4">ผู้ให้ยืม</th>
                      <th className="py-3 px-4">ผู้ยืม / ผู้แลกเปลี่ยน</th>
                      <th className="py-3 px-4">ระยะเวลายืม</th>
                      <th className="py-3 px-4">วันกำหนดส่งคืน</th>
                      <th className="py-3 px-4">สถานะติดตาม</th>
                      <th className="py-3 px-4 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredTransactions.map((tx) => {
                      const daysDiff = getDaysDiffFromToday(tx.dueDate);
                      const isDone =
                        tx.status === 'returned' || tx.status === 'exchanged_completed';

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/70">
                          <td className="py-3.5 px-4 max-w-[260px]">
                            <div className="font-medium text-slate-900">{tx.bookTitle}</div>
                            <div className="text-slate-500 mt-0.5">
                              {tx.transactionType === 'exchange'
                                ? `แลกกับ: ${tx.exchangeBookTitle || '-'}`
                                : 'ยืมหนังสือเรียน'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-medium text-slate-800">{tx.lenderName}</div>
                            <div className="text-slate-500">{tx.lenderContact}</div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-medium text-slate-800">
                              {tx.borrowerName} ({tx.borrowerGrade})
                            </div>
                            <div className="text-slate-500">{tx.borrowerContact}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono-tabular whitespace-nowrap">
                            <div>{tx.loanDays} วัน</div>
                            <div className="text-slate-500">เริ่ม {tx.startDate}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono-tabular whitespace-nowrap">
                            <div className="font-medium text-slate-900">{tx.dueDate}</div>
                            {!isDone && (
                              <div
                                className={
                                  daysDiff < 0
                                    ? 'text-red-700 font-medium'
                                    : daysDiff <= 3
                                      ? 'text-amber-700 font-medium'
                                      : 'text-slate-500'
                                }
                              >
                                {daysDiff < 0
                                  ? `เลยกำหนด ${Math.abs(daysDiff)} วัน`
                                  : daysDiff === 0
                                    ? 'ครบกำหนดวันนี้'
                                    : `เหลือเวลา ${daysDiff} วัน`}
                              </div>
                            )}
                            {tx.returnedAt && (
                              <div className="text-emerald-700">คืนเมื่อ {tx.returnedAt}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {tx.status === 'overdue' && (
                              <span className="inline-flex items-center gap-1.5 font-medium text-red-700">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>เลยกำหนดส่งคืน</span>
                              </span>
                            )}
                            {tx.status === 'active' && (
                              <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                                <CalendarClock className="w-3.5 h-3.5" />
                                <span>กำลังยืม / รอคืน</span>
                              </span>
                            )}
                            {tx.status === 'returned' && (
                              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>ส่งคืนเรียบร้อย</span>
                              </span>
                            )}
                            {tx.status === 'exchanged_completed' && (
                              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                                <span>แลกเปลี่ยนสำเร็จ</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {!isDone ? (
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={busyId === tx.id}
                                  onClick={() => handleTxAction(tx.id, 'extend')}
                                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer disabled:opacity-50"
                                >
                                  +7 วัน
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === tx.id}
                                  onClick={() =>
                                    handleTxAction(
                                      tx.id,
                                      tx.transactionType === 'exchange'
                                        ? 'complete_exchange'
                                        : 'return'
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md cursor-pointer disabled:opacity-50"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>
                                    {tx.transactionType === 'exchange'
                                      ? 'แลกเปลี่ยนแล้ว'
                                      : 'ยืนยันรับคืน'}
                                  </span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400">ปิดรายการแล้ว</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Request Borrow or Exchange with Auto Due-Date Calculation */}
      {selectedBookForRequest && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  บันทึกการยืม / แลกเปลี่ยนหนังสือ
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedBookForRequest.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookForRequest(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs space-y-1">
                <div className="text-slate-500">ข้อมูลผู้ให้ยืม / เจ้าของหนังสือ</div>
                <div className="font-medium text-slate-900">
                  {selectedBookForRequest.ownerName} ({selectedBookForRequest.ownerGrade} ·{' '}
                  {selectedBookForRequest.ownerSchool})
                </div>
                <div className="text-slate-600">{selectedBookForRequest.ownerContact}</div>
              </div>

              {selectedBookForRequest.mode === 'both' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    ประเภทการทำรายการ
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTxType('borrow')}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer ${
                        txType === 'borrow'
                          ? 'border-blue-700 bg-blue-50 text-blue-800'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      ขอยืมหนังสือ (ส่งคืนตามกำหนด)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('exchange')}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer ${
                        txType === 'exchange'
                          ? 'border-blue-700 bg-blue-50 text-blue-800'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      แลกเปลี่ยนหนังสือ
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ชื่อผู้ยืม / ผู้ขอแลกเปลี่ยน *
                  </label>
                  <input
                    type="text"
                    required
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ระดับชั้น / ห้อง</label>
                  <input
                    type="text"
                    required
                    value={borrowerGrade}
                    onChange={(e) => setBorrowerGrade(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ช่องทางติดต่อผู้ยืม *
                  </label>
                  <input
                    type="text"
                    required
                    value={borrowerContact}
                    onChange={(e) => setBorrowerContact(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {txType === 'exchange' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ชื่อหนังสือที่คุณนำมาแลกเปลี่ยน *
                  </label>
                  <input
                    type="text"
                    required
                    value={exchangeBookTitle}
                    onChange={(e) => setExchangeBookTitle(e.target.value)}
                    placeholder="เช่น สรุปชีววิทยา ม.5 หรือ คู่มือสอบฟิสิกส์"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    วันที่เริ่มต้น
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ระยะเวลาการยืม (สูงสุด {selectedBookForRequest.maxLoanDays} วัน)
                  </label>
                  <select
                    value={loanDays}
                    onChange={(e) => setLoanDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg"
                  >
                    {[7, 14, 21, 30, 60]
                      .filter((d) => d <= Math.max(selectedBookForRequest.maxLoanDays, 14))
                      .map((d) => (
                        <option key={d} value={d}>
                          {d} วัน
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between text-xs">
                <span className="text-blue-900">วันกำหนดส่งคืนที่คำนวณอัตโนมัติ:</span>
                <span className="font-mono-tabular font-semibold text-blue-800 text-sm">
                  {previewDueDate}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  บันทึกเพิ่มเติม / จุดนัดรับหนังสือ
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น นัดรับที่โต๊ะม้าหินหน้าอาคารเรียน 2"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              {txError && <p className="text-xs text-red-700">{txError}</p>}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBookForRequest(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={busyId === 'creating-tx'}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {busyId === 'creating-tx' ? 'กำลังบันทึก...' : 'ยืนยันและบันทึกวันกำหนดคืน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Book for Lending or Exchange */}
      {isAddBookOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  ลงทะเบียนหนังสือให้ยืมหรือแลกเปลี่ยน
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  แบ่งปันหนังสือเรียนให้เพื่อนนักเรียนยืมทบทวนหรือแลกเปลี่ยนกันอ่าน
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBookOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBookSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ชื่อหนังสือ *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="เช่น คู่มือเตรียมสอบภาษาไทย A-Level"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">หมวดวิชา</label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value as SubjectCategory)}
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
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value as EducationLevel)}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">รูปแบบ</label>
                  <select
                    value={newMode}
                    onChange={(e) => setNewMode(e.target.value as LendingBook['mode'])}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="both">ให้ยืม หรือ แลกเปลี่ยนได้</option>
                    <option value="lend">เปิดให้ยืมเรียนอย่างเดียว</option>
                    <option value="exchange">แลกเปลี่ยนหนังสืออย่างเดียว</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ระยะเวลายืมสูงสุด (วัน)
                  </label>
                  <select
                    value={newMaxLoanDays}
                    onChange={(e) => setNewMaxLoanDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg"
                  >
                    <option value={7}>7 วัน</option>
                    <option value={14}>14 วัน</option>
                    <option value={30}>30 วัน</option>
                    <option value={60}>60 วัน</option>
                  </select>
                </div>
              </div>

              {newMode !== 'lend' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    หนังสือที่สนใจแลกเปลี่ยน (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={newPreferredTopic}
                    onChange={(e) => setNewPreferredTopic(e.target.value)}
                    placeholder="เช่น หนังสือคณิตศาสตร์ หรือ ชีววิทยา ม.ปลาย"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">สภาพหนังสือ</label>
                <input
                  type="text"
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  รายละเอียดเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="ระบุเงื่อนไขการดูแลหนังสือ หรือจุดนัดรับ..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              {bookError && <p className="text-xs text-red-700">{bookError}</p>}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddBookOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={busyId === 'creating-book'}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {busyId === 'creating-book' ? 'กำลังบันทึก...' : 'ลงทะเบียนหนังสือ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
