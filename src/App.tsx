import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarClock,
  Download,
  UserCheck,
  X,
} from 'lucide-react';
import type {
  AppBootstrapData,
  ConditionEvaluationInput,
  EducationLevel,
  KnowledgeResource,
  LendingBook,
  MarketOrder,
  ResourceKind,
  StudentProfile,
  SubjectCategory,
} from './types.ts';
import { ResilientImage } from './components/ResilientImage.tsx';
import { MarketplaceView } from './components/MarketplaceView.tsx';
import { LendingView } from './components/LendingView.tsx';
import { KnowledgeView } from './components/KnowledgeView.tsx';
import { UnifiedCreateModal } from './components/UnifiedCreateModal.tsx';

type ActiveTab = 'home' | 'market' | 'lending' | 'knowledge' | 'tracker';

export default function App() {
  const [data, setData] = useState<AppBootstrapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [currentStudentId, setCurrentStudentId] = useState<string>('stu-1');
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [isUnifiedCreateOpen, setIsUnifiedCreateOpen] = useState(false);
  const [pendingCreateFor, setPendingCreateFor] = useState<
    'market' | 'lending' | 'knowledge' | null
  >(null);

  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStuName, setNewStuName] = useState('');
  const [newStuGrade, setNewStuGrade] = useState('ม.5/1');
  const [newStuSchool, setNewStuSchool] = useState('โรงเรียนพิชัย');
  const [newStuContact, setNewStuContact] = useState('');

  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? '' : prev));
    }, 3500);
  };

  const fetchBootstrap = async () => {
    try {
      setLoadError('');
      const res = await fetch('/api/bootstrap');
      if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้');
      const json = (await res.json()) as AppBootstrapData;
      setData(json);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchBootstrap();
  }, []);

  const currentStudent: StudentProfile = useMemo(() => {
    if (!data?.students.length) {
      return {
        id: 'stu-1',
        name: 'ปภาวิน พิชัยรักษ์',
        studentCode: 'std27031',
        grade: 'ม.5/2',
        school: 'โรงเรียนพิชัย',
        contact: 'ห้อง 502 · Line: papawin.stu',
      };
    }
    return data.students.find((s) => s.id === currentStudentId) ?? data.students[0];
  }, [data, currentStudentId]);

  const handleToggleCart = (itemId: string) => {
    setCartIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleCreateMarketItem = async (payload: {
    title: string;
    authorOrPublisher: string;
    subject: SubjectCategory;
    level: EducationLevel;
    kind: ResourceKind;
    description: string;
    sellingPrice: number;
    evaluationInput: ConditionEvaluationInput;
  }) => {
    const res = await fetch('/api/market/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        sellerId: currentStudent.id,
        sellerName: currentStudent.name,
        sellerSchool: `${currentStudent.school} (${currentStudent.grade})`,
        sellerContact: currentStudent.contact,
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'ไม่สามารถลงประกาศได้');

    setData((prev) => (prev ? { ...prev, marketItems: [body, ...prev.marketItems] } : prev));
    showToast('ลงประกาศจำหน่ายสื่อการเรียนเรียบร้อยแล้ว');
  };

  const handleCheckout = async (payload: {
    itemIds: string[];
    buyerName: string;
    buyerContact: string;
    deliveryMethod: 'pickup' | 'parcel';
    deliveryNote: string;
  }): Promise<MarketOrder> => {
    const res = await fetch('/api/market/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'ไม่สามารถสั่งซื้อได้');

    await fetchBootstrap();
    showToast(`ยืนยันคำสั่งซื้อ ${body.order.id} สำเร็จ`);
    return body.order as MarketOrder;
  };

  const handleAddLendingBook = async (payload: {
    title: string;
    subject: SubjectCategory;
    level: EducationLevel;
    description: string;
    conditionLabel: string;
    mode: LendingBook['mode'];
    preferredExchangeTopic?: string;
    maxLoanDays: number;
  }) => {
    const res = await fetch('/api/lending/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        ownerId: currentStudent.id,
        ownerName: currentStudent.name,
        ownerGrade: currentStudent.grade,
        ownerSchool: currentStudent.school,
        ownerContact: currentStudent.contact,
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'ไม่สามารถเพิ่มหนังสือได้');

    setData((prev) => (prev ? { ...prev, lendingBooks: [body, ...prev.lendingBooks] } : prev));
    showToast('ลงทะเบียนหนังสือให้ยืม/แลกเปลี่ยนเรียบร้อยแล้ว');
  };

  const handleCreateLendingTx = async (payload: {
    bookId: string;
    transactionType: 'borrow' | 'exchange';
    borrowerName: string;
    borrowerGrade: string;
    borrowerContact: string;
    exchangeBookTitle?: string;
    loanDays: number;
    startDate: string;
    notes: string;
  }) => {
    const res = await fetch('/api/lending/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        borrowerId: currentStudent.id,
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'ไม่สามารถบันทึกรายการได้');

    await fetchBootstrap();
    showToast('บันทึกข้อมูลการยืมและวันกำหนดส่งคืนเรียบร้อยแล้ว');
  };

  const handleUpdateLendingTx = async (
    txId: string,
    action: 'approve' | 'return' | 'extend' | 'complete_exchange'
  ) => {
    const res = await fetch(`/api/lending/transactions/${txId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const body = await res.json();
    if (!res.ok) {
      showToast(body.error || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ');
      return;
    }
    await fetchBootstrap();
    if (action === 'return') showToast('บันทึกการส่งคืนหนังสือเรียบร้อยแล้ว');
    else if (action === 'extend') showToast('ขยายระยะเวลาการยืมเพิ่ม +7 วันแล้ว');
    else if (action === 'complete_exchange') showToast('ยืนยันการแลกเปลี่ยนสำเร็จ');
  };

  const handleUploadKnowledge = async (payload: {
    title: string;
    subject: SubjectCategory;
    level: EducationLevel;
    format: KnowledgeResource['format'];
    summary: string;
    contentBody?: string;
    fileName?: string;
    fileDataBase64?: string;
  }) => {
    const res = await fetch('/api/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        authorId: currentStudent.id,
        authorName: currentStudent.name,
        authorGrade: currentStudent.grade,
        authorSchool: currentStudent.school,
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'ไม่สามารถอัปโหลดชีทสรุปได้');

    setData((prev) =>
      prev ? { ...prev, knowledgeResources: [body, ...prev.knowledgeResources] } : prev
    );
    showToast('เผยแพร่ชีทสรุปสู่คลังความรู้เรียบร้อยแล้ว');
  };

  const handleMarkHelpful = async (id: string) => {
    const res = await fetch(`/api/knowledge/${id}/helpful`, { method: 'POST' });
    if (!res.ok) return;
    const updated = (await res.json()) as KnowledgeResource;
    setData((prev) =>
      prev
        ? {
            ...prev,
            knowledgeResources: prev.knowledgeResources.map((r) => (r.id === id ? updated : r)),
          }
        : prev
    );
  };

  const handleRecordDownload = (id: string) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            knowledgeResources: prev.knowledgeResources.map((r) =>
              r.id === id ? { ...r, downloads: r.downloads + 1 } : r
            ),
          }
        : prev
    );
    showToast('เริ่มดาวน์โหลดไฟล์ความรู้แล้ว');
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStuName.trim()) return;
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newStuName,
        grade: newStuGrade,
        school: newStuSchool,
        contact: newStuContact || 'ติดต่อผ่านระบบปันเรียน',
      }),
    });
    if (res.ok) {
      const created = (await res.json()) as StudentProfile;
      await fetchBootstrap();
      setCurrentStudentId(created.id);
      setNewStuName('');
      setNewStuContact('');
      setIsAddStudentOpen(false);
      showToast(`สลับบัญชีผู้ใช้งานเป็น ${created.name}`);
    }
  };

  const availableMarketCount =
    data?.marketItems.filter((i) => i.status === 'available').length ?? 0;
  const avgDiscount = useMemo(() => {
    if (!data?.marketItems.length) return 0;
    const sum = data.marketItems.reduce((acc, i) => acc + i.evaluation.discountPercent, 0);
    return Math.round(sum / data.marketItems.length);
  }, [data]);
  const activeLoansCount =
    data?.lendingTransactions.filter((t) => t.status === 'active' || t.status === 'overdue')
      .length ?? 0;
  const overdueLoansCount =
    data?.lendingTransactions.filter((t) => t.status === 'overdue').length ?? 0;
  const totalKnowledgeDownloads =
    data?.knowledgeResources.reduce((acc, r) => acc + r.downloads, 0) ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark only */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            ปันเรียน
          </button>

          {/* Zone 2: 5 Single-Line Navigation Links */}
          <nav
            aria-label="เมนูหลัก"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 overflow-x-auto"
          >
            {(
              [
                ['home', 'หน้าหลัก'],
                ['market', 'ตลาดหนังสือ'],
                ['lending', 'ยืม-แลกเปลี่ยน'],
                ['knowledge', 'คลังความรู้'],
                ['tracker', 'ติดตามรายการ'],
              ] as const
            ).map(([tabKey, label]) => {
              const isActive = activeTab === tabKey;
              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setActiveTab(tabKey)}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'border-blue-700 text-slate-900 font-semibold'
                      : 'border-transparent hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setIsUnifiedCreateOpen(true)}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              ลงประกาศ / อัปโหลด
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Strip (Compact, <=15% height) */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-medium text-slate-600">
        {(
          [
            ['home', 'หน้าหลัก'],
            ['market', 'ตลาดหนังสือ'],
            ['lending', 'ยืม-แลกเปลี่ยน'],
            ['knowledge', 'คลังความรู้'],
            ['tracker', 'ติดตามรายการ'],
          ] as const
        ).map(([tabKey, label]) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setActiveTab(tabKey)}
            className={`py-1 border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tabKey
                ? 'border-blue-700 text-slate-900 font-semibold'
                : 'border-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Workspace Profile Strip (outside <header> to preserve Top Bar Contract) */}
      <div className="border-b border-slate-200 bg-slate-100/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <UserCheck className="w-4 h-4 text-blue-700 shrink-0" />
            <span>ผู้ใช้งานปัจจุบัน:</span>
            <select
              value={currentStudent.id}
              onChange={(e) => setCurrentStudentId(e.target.value)}
              aria-label="เลือกโปรไฟล์นักเรียน"
              className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {data?.students.map((stu) => (
                <option key={stu.id} value={stu.id}>
                  {stu.name} ({stu.grade} · {stu.school})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setIsAddStudentOpen(true)}
              className="text-blue-700 hover:underline font-medium whitespace-nowrap cursor-pointer"
            >
              + เพิ่มโปรไฟล์นักเรียน
            </button>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            {overdueLoansCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('tracker')}
                className="inline-flex items-center gap-1.5 text-red-700 font-medium hover:underline cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>มีรายการเลยกำหนดคืน {overdueLoansCount} รายการ</span>
              </button>
            )}
            <span className="hidden sm:inline text-slate-500">
              พื้นที่ส่งต่อหนังสือและชีทสรุปเพื่อลดความเหลื่อมล้ำทางการศึกษา
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {isLoading ? (
          <div className="py-20 text-center space-y-2">
            <p className="text-sm font-medium text-slate-700">กำลังโหลดข้อมูลทรัพยากรการเรียนรู้...</p>
          </div>
        ) : loadError || !data ? (
          <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-3">
            <p className="text-sm font-medium text-red-700">{loadError || 'ไม่พบข้อมูล'}</p>
            <button
              type="button"
              onClick={() => void fetchBootstrap()}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg cursor-pointer"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'home' && (
              <div className="space-y-12">
                {/* Editorial 2-Column Hero Split */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                  <div className="lg:col-span-6 flex flex-col justify-between bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
                    <div className="space-y-4">
                      <p className="text-xs font-medium text-blue-700">
                        เครือข่ายแบ่งปันหนังสือและคลังความรู้สำหรับนักเรียน
                      </p>
                      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 leading-tight text-balance">
                        ส่งต่อหนังสือเรียนและชีทสรุป ลดช่องว่างโอกาสทางการศึกษา
                      </h1>
                      <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
                        นำหนังสือเรียน หนังสือเสริมความรู้ และไฟล์สรุปบทเรียนที่ไม่ได้ใช้แล้วกลับมาสร้างประโยชน์ใหม่ ผ่านตลาดราคาย่อมเยาที่มีเกณฑ์ประเมินราคาเป็นธรรม ระบบยืม-แลกเปลี่ยนพร้อมติดตามวันคืน และคลังชีทสรุปฟรีสำหรับทุกคน
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('market')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <span>เลือกดูหนังสือราคาย่อมเยา</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('knowledge')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <span>ดาวน์โหลดชีทสรุปฟรี</span>
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-6 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 min-h-[260px]">
                    <ResilientImage
                      src="/src/assets/images/hero_study_exchange_1794906290394.jpg"
                      alt="โต๊ะอ่านหนังสือในห้องสมุดพร้อมหนังสือเรียนและสมุดจดสรุป"
                      className="w-full h-full lg:h-full object-cover"
                    />
                  </div>
                </section>

                {/* 4-Column Quantitative Summary Strip (Directly below Hero Split) */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="text-xs text-slate-500">หนังสือพร้อมส่งต่อ</div>
                    <div className="text-2xl font-semibold text-slate-900 font-mono-tabular mt-1">
                      {availableMarketCount} รายการ
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="text-xs text-slate-500">ประหยัดจากราคาปกเฉลี่ย</div>
                    <div className="text-2xl font-semibold text-emerald-700 font-mono-tabular mt-1">
                      {avgDiscount}%
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="text-xs text-slate-500">กำลังยืม-แลกเปลี่ยน</div>
                    <div className="text-2xl font-semibold text-slate-900 font-mono-tabular mt-1">
                      {activeLoansCount} รายการ
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="text-xs text-slate-500">ดาวน์โหลดชีทความรู้แล้ว</div>
                    <div className="text-2xl font-semibold text-blue-700 font-mono-tabular mt-1">
                      {totalKnowledgeDownloads} ครั้ง
                    </div>
                  </div>
                </section>

                {/* System 1 Featured Collection Preview */}
                <section className="space-y-5">
                  <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-3">
                    <div>
                      <p className="text-xs font-medium text-blue-700">01. ตลาดสื่อการเรียนรู้</p>
                      <h2 className="text-xl font-semibold text-slate-900">
                        หนังสือแนะนำพร้อมผลประเมินราคาตามสภาพ
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('market')}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>ดูทั้งหมดในตลาด</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {data.marketItems
                      .filter((i) => i.status === 'available')
                      .slice(0, 3)
                      .map((item) => (
                        <article
                          key={item.id}
                          className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
                        >
                          <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                            <ResilientImage
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                            <div className="space-y-1.5">
                              <div className="text-xs text-slate-500">
                                {item.subject} · {item.level} · สภาพ {item.evaluation.conditionScore}%
                              </div>
                              <h3 className="text-base font-semibold text-slate-900 line-clamp-2">
                                {item.title}
                              </h3>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                              <div className="flex items-baseline gap-2">
                                <span className="text-lg font-semibold font-mono-tabular text-slate-900">
                                  ฿{item.sellingPrice}
                                </span>
                                <span className="text-xs line-through font-mono-tabular text-slate-400">
                                  ฿{item.originalPrice}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setActiveTab('market')}
                                className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                              >
                                ดูรายละเอียด
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                  </div>
                </section>

                {/* Systems 2 & 3 Split Showcase */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* System 2 Summary */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-blue-700">
                          02. ระบบแลกเปลี่ยนและยืมหนังสือ
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('tracker')}
                          className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                        >
                          เปิดตารางติดตาม ({activeLoansCount})
                        </button>
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900">
                        บันทึกผู้ให้ยืม ผู้ยืม และวันกำหนดส่งคืนชัดเจน
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        ยืมหนังสือเรียนจากรุ่นพี่หรือแลกเปลี่ยนหนังสือระหว่างเพื่อน พร้อมคำนวณวันกำหนดส่งคืนและแจ้งเตือนเมื่อใกล้ครบกำหนด
                      </p>

                      <div className="divide-y divide-slate-100 pt-2">
                        {data.lendingTransactions.slice(0, 2).map((tx) => (
                          <div
                            key={tx.id}
                            className="py-2.5 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="truncate">
                              <div className="font-medium text-slate-900 truncate">
                                {tx.bookTitle}
                              </div>
                              <div className="text-slate-500">
                                ผู้ยืม: {tx.borrowerName} · กำหนดคืน {tx.dueDate}
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 font-medium shrink-0 ${
                                tx.status === 'overdue' ? 'text-red-700' : 'text-amber-700'
                              }`}
                            >
                              {tx.status === 'overdue' ? (
                                <>
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>เลยกำหนดคืน</span>
                                </>
                              ) : (
                                <>
                                  <CalendarClock className="w-3.5 h-3.5" />
                                  <span>กำลังยืม</span>
                                </>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('lending')}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>เข้าสู่ระบบยืม-แลกเปลี่ยนหนังสือ</span>
                      </button>
                    </div>
                  </div>

                  {/* System 3 Summary */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-blue-700">
                          03. ระบบแบ่งปันและแลกเปลี่ยนความรู้
                        </p>
                        <span className="text-xs text-slate-500 font-mono-tabular">
                          {data.knowledgeResources.length} ชีทสรุป
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900">
                        คลังชีทสรุปและไฟล์ความรู้เปิดให้ดาวน์โหลดฟรี
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        อัปโหลดไฟล์ PDF เอกสาร หรืออ่านสรุปบทเรียนออนไลน์ในรายวิชาต่าง ๆ เพื่อให้นักเรียนทุกคนเข้าถึงแหล่งเรียนรู้ได้อย่างเท่าเทียม
                      </p>

                      <div className="divide-y divide-slate-100 pt-2">
                        {data.knowledgeResources.slice(0, 2).map((resItem) => (
                          <div
                            key={resItem.id}
                            className="py-2.5 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="truncate">
                              <div className="font-medium text-slate-900 truncate">
                                {resItem.title}
                              </div>
                              <div className="text-slate-500">
                                {resItem.subject} · {resItem.authorName}
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 text-slate-600 font-mono-tabular shrink-0">
                              <Download className="w-3.5 h-3.5 text-blue-700" />
                              <span>{resItem.downloads}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('knowledge')}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>เปิดคลังชีทสรุปและอัปโหลดไฟล์</span>
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'market' && (
              <MarketplaceView
                items={data.marketItems}
                orders={data.orders}
                currentStudent={currentStudent}
                cartIds={cartIds}
                onToggleCart={handleToggleCart}
                onClearCart={() => setCartIds([])}
                onCreateItem={handleCreateMarketItem}
                onCheckout={handleCheckout}
                openCreateInitially={pendingCreateFor === 'market'}
                onConsumeOpenCreate={() => setPendingCreateFor(null)}
              />
            )}

            {(activeTab === 'lending' || activeTab === 'tracker') && (
              <LendingView
                books={data.lendingBooks}
                transactions={data.lendingTransactions}
                currentStudent={currentStudent}
                initialSubView={activeTab === 'tracker' ? 'ledger' : 'catalog'}
                onAddBook={handleAddLendingBook}
                onCreateTransaction={handleCreateLendingTx}
                onUpdateTransaction={handleUpdateLendingTx}
                openCreateInitially={pendingCreateFor === 'lending'}
                onConsumeOpenCreate={() => setPendingCreateFor(null)}
              />
            )}

            {activeTab === 'knowledge' && (
              <KnowledgeView
                resources={data.knowledgeResources}
                currentStudent={currentStudent}
                onUploadResource={handleUploadKnowledge}
                onMarkHelpful={handleMarkHelpful}
                onRecordDownload={handleRecordDownload}
                openCreateInitially={pendingCreateFor === 'knowledge'}
                onConsumeOpenCreate={() => setPendingCreateFor(null)}
              />
            )}
          </>
        )}
      </main>

      {/* Clean Editorial Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            ปันเรียน — โครงการส่งต่อและแลกเปลี่ยนทรัพยากรทางการศึกษาเพื่อโอกาสการเรียนรู้ที่ทั่วถึง
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setActiveTab('market')}
              className="hover:text-slate-900 cursor-pointer"
            >
              ตลาดหนังสือ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lending')}
              className="hover:text-slate-900 cursor-pointer"
            >
              ยืม-แลกเปลี่ยน
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('knowledge')}
              className="hover:text-slate-900 cursor-pointer"
            >
              คลังความรู้
            </button>
          </div>
        </div>
      </footer>

      {/* Unified Create Selector Modal */}
      <UnifiedCreateModal
        isOpen={isUnifiedCreateOpen}
        onClose={() => setIsUnifiedCreateOpen(false)}
        onSelectTarget={(target) => {
          setIsUnifiedCreateOpen(false);
          setPendingCreateFor(target);
          setActiveTab(target);
        }}
      />

      {/* Add Student Profile Modal */}
      {isAddStudentOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">เพิ่มโปรไฟล์นักเรียน</h3>
              <button
                type="button"
                onClick={() => setIsAddStudentOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ชื่อ-นามสกุล *
                </label>
                <input
                  type="text"
                  required
                  value={newStuName}
                  onChange={(e) => setNewStuName(e.target.value)}
                  placeholder="เช่น กานต์ธิดา มั่งมี"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ระดับชั้น</label>
                  <input
                    type="text"
                    required
                    value={newStuGrade}
                    onChange={(e) => setNewStuGrade(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">โรงเรียน</label>
                  <input
                    type="text"
                    required
                    value={newStuSchool}
                    onChange={(e) => setNewStuSchool(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ช่องทางติดต่อ (ห้อง / Line)
                </label>
                <input
                  type="text"
                  value={newStuContact}
                  onChange={(e) => setNewStuContact(e.target.value)}
                  placeholder="เช่น ห้อง 504 · Line: kanthida"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  บันทึกและสลับบัญชี
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-lg shadow-lg">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
