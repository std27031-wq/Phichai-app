import { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  CheckCircle2,
  Clock,
  Inbox,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Send,
  ShoppingBag,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import type {
  ConditionEvaluationInput,
  EducationLevel,
  MarketItem,
  MarketOrder,
  MarkingLevel,
  OrderChatMessage,
  PhysicalCondition,
  ResourceKind,
  SellerNotification,
  StudentProfile,
  SubjectCategory,
  UsageAge,
} from '../types.ts';
import {
  evaluateResourcePrice,
  MARKING_LEVEL_OPTIONS,
  PHYSICAL_CONDITION_OPTIONS,
  USAGE_AGE_OPTIONS,
} from '../utils/priceEvaluator.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface MarketplaceViewProps {
  items: MarketItem[];
  orders: MarketOrder[];
  sellerNotifications: SellerNotification[];
  orderMessages: OrderChatMessage[];
  currentStudent: StudentProfile;
  cartIds: string[];
  initialSubView?: 'catalog' | 'seller_inbox';
  onSubViewChange?: (view: 'catalog' | 'seller_inbox') => void;
  onToggleCart: (itemId: string) => void;
  onAddToCart: (itemId: string) => void;
  onClearCart: () => void;
  onCreateItem: (payload: {
    title: string;
    authorOrPublisher: string;
    subject: SubjectCategory;
    level: EducationLevel;
    kind: ResourceKind;
    description: string;
    sellingPrice: number;
    evaluationInput: ConditionEvaluationInput;
  }) => Promise<void>;
  onCheckout: (payload: {
    itemIds: string[];
    buyerId: string;
    buyerName: string;
    buyerContact: string;
    deliveryMethod: 'pickup' | 'parcel';
    deliveryNote: string;
  }) => Promise<MarketOrder>;
  onUpdateSellerNotification: (
    notifId: string,
    action: 'acknowledge' | 'set_meetup' | 'complete' | 'mark_read',
    meetupLocation?: string
  ) => Promise<void>;
  onOpenChat: (notification: SellerNotification) => void;
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

const LEVELS: Array<'ทั้งหมด' | EducationLevel> = [
  'ทั้งหมด',
  'ประถมศึกษา',
  'ม.ต้น',
  'ม.ปลาย',
  'เตรียมสอบเข้ามหาวิทยาลัย',
];

const KINDS: ResourceKind[] = [
  'หนังสือเรียน',
  'หนังสือเสริมความรู้',
  'ชีทสรุป',
  'ไฟล์ความรู้',
];

export function MarketplaceView({
  items,
  orders,
  sellerNotifications,
  orderMessages,
  currentStudent,
  cartIds,
  initialSubView = 'catalog',
  onSubViewChange,
  onToggleCart,
  onAddToCart,
  onClearCart,
  onCreateItem,
  onCheckout,
  onUpdateSellerNotification,
  onOpenChat,
  openCreateInitially = false,
  onConsumeOpenCreate,
}: MarketplaceViewProps) {
  const [subView, setSubView] = useState<'catalog' | 'seller_inbox'>(initialSubView);
  const [inboxScope, setInboxScope] = useState<'mine' | 'all'>('mine');
  const [busyNotifId, setBusyNotifId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<'ทั้งหมด' | SubjectCategory>('ทั้งหมด');
  const [selectedLevel, setSelectedLevel] = useState<'ทั้งหมด' | EducationLevel>('ทั้งหมด');
  const [showSold, setShowSold] = useState(false);

  const [inspectedItem, setInspectedItem] = useState<MarketItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(openCreateInitially);
  const [isEvaluatorOpen, setIsEvaluatorOpen] = useState(false);

  // Create Listing Form State
  const [title, setTitle] = useState('');
  const [authorOrPublisher, setAuthorOrPublisher] = useState('');
  const [subject, setSubject] = useState<SubjectCategory>('คณิตศาสตร์');
  const [level, setLevel] = useState<EducationLevel>('ม.ปลาย');
  const [kind, setKind] = useState<ResourceKind>('หนังสือเรียน');
  const [description, setDescription] = useState('');
  const [originalPrice, setOriginalPrice] = useState(250);
  const [physicalCondition, setPhysicalCondition] = useState<PhysicalCondition>('good');
  const [markingLevel, setMarkingLevel] = useState<MarkingLevel>('light');
  const [usageAgeYears, setUsageAgeYears] = useState<UsageAge>('1to2');
  const [hasCompleteness, setHasCompleteness] = useState(true);
  const [customSellingPrice, setCustomSellingPrice] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Checkout Form State
  const [buyerName, setBuyerName] = useState(currentStudent.name);
  const [buyerContact, setBuyerContact] = useState(currentStudent.contact);
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'parcel'>('pickup');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [latestOrder, setLatestOrder] = useState<MarketOrder | null>(null);
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    setSubView(initialSubView);
  }, [initialSubView]);

  useEffect(() => {
    setBuyerName(currentStudent.name);
    setBuyerContact(currentStudent.contact);
  }, [currentStudent.id, currentStudent.name, currentStudent.contact]);

  useEffect(() => {
    if (openCreateInitially) {
      setIsCreateOpen(true);
      onConsumeOpenCreate?.();
    }
  }, [openCreateInitially, onConsumeOpenCreate]);

  const switchSubView = (next: 'catalog' | 'seller_inbox') => {
    setSubView(next);
    onSubViewChange?.(next);
  };

  const evalInput: ConditionEvaluationInput = useMemo(
    () => ({
      originalPrice,
      physicalCondition,
      markingLevel,
      usageAgeYears,
      hasCompleteness,
      kind,
    }),
    [originalPrice, physicalCondition, markingLevel, usageAgeYears, hasCompleteness, kind]
  );

  const liveEvaluation = useMemo(() => evaluateResourcePrice(evalInput), [evalInput]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (!showSold && item.status === 'sold') return false;
      if (selectedSubject !== 'ทั้งหมด' && item.subject !== selectedSubject) return false;
      if (selectedLevel !== 'ทั้งหมด' && item.level !== selectedLevel) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.authorOrPublisher.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        item.sellerName.toLowerCase().includes(q)
      );
    });
  }, [items, searchQuery, selectedSubject, selectedLevel, showSold]);

  const cartItems = useMemo(
    () => items.filter((i) => cartIds.includes(i.id) && i.status === 'available'),
    [items, cartIds]
  );

  const cartTotal = cartItems.reduce((sum, i) => sum + i.sellingPrice, 0);
  const cartOriginalTotal = cartItems.reduce((sum, i) => sum + i.originalPrice, 0);
  const cartSaved = Math.max(0, cartOriginalTotal - cartTotal);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!title.trim()) {
      setFormError('กรุณาระบุชื่อหนังสือหรือสื่อการเรียนรู้');
      return;
    }
    setIsSubmitting(true);
    try {
      const finalPrice =
        customSellingPrice === '' ? liveEvaluation.suggestedPrice : Number(customSellingPrice);
      await onCreateItem({
        title,
        authorOrPublisher,
        subject,
        level,
        kind,
        description,
        sellingPrice: finalPrice,
        evaluationInput: evalInput,
      });
      setTitle('');
      setAuthorOrPublisher('');
      setDescription('');
      setCustomSellingPrice('');
      setIsCreateOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกประกาศได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');
    if (cartItems.length === 0) return;
    setIsSubmitting(true);
    try {
      const order = await onCheckout({
        itemIds: cartItems.map((i) => i.id),
        buyerId: currentStudent.id,
        buyerName: buyerName.trim() || currentStudent.name,
        buyerContact: buyerContact.trim() || currentStudent.contact,
        deliveryMethod,
        deliveryNote,
      });
      setLatestOrder(order);
      onClearCart();
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'ไม่สามารถสั่งซื้อได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectBuy = (itemId: string) => {
    onAddToCart(itemId);
    setLatestOrder(null);
    setIsCartOpen(true);
  };

  const mySellerNotifications = useMemo(
    () => sellerNotifications.filter((n) => n.sellerId === currentStudent.id),
    [sellerNotifications, currentStudent.id]
  );

  const unreadMySellerCount = mySellerNotifications.filter((n) => n.status === 'new').length;

  const displayedSellerNotifications =
    inboxScope === 'mine' ? mySellerNotifications : sellerNotifications;

  const handleSellerAction = async (
    notifId: string,
    action: 'acknowledge' | 'set_meetup' | 'complete' | 'mark_read'
  ) => {
    setBusyNotifId(notifId);
    try {
      await onUpdateSellerNotification(notifId, action);
    } finally {
      setBusyNotifId(null);
    }
  };

  const countChatMessages = (notifId: string) =>
    orderMessages.filter((m) => m.notificationId === notifId && m.senderRole !== 'system').length;

  return (
    <section className="space-y-8">
      {/* Section Header + Primary Marketplace Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-medium text-blue-700">ระบบที่ 1 · ตลาดสื่อการเรียนราคาย่อมเยา</p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 text-balance">
            จำหน่ายหนังสือเรียน ชีทสรุป และสื่อการเรียนรู้มือสอง
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            ส่งต่อหนังสือที่ไม่ได้ใช้แล้วในราคายุติธรรม พร้อมเกณฑ์ช่วยประเมินราคาตามสภาพรูปเล่ม ร่องรอยขีดเขียน และอายุการใช้งานจริง
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => switchSubView('catalog')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                subView === 'catalog'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              คลังหนังสือ
            </button>
            <button
              type="button"
              onClick={() => switchSubView('seller_inbox')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                subView === 'seller_inbox'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>คำสั่งซื้อถึงผู้ขาย</span>
              <span className="font-mono-tabular text-blue-700 font-semibold">
                ({unreadMySellerCount > 0 ? `${unreadMySellerCount} ใหม่` : mySellerNotifications.length})
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsEvaluatorOpen((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Calculator className="w-4 h-4 text-blue-700" />
            <span>เกณฑ์ประเมินราคา</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLatestOrder(null);
              setIsCartOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-slate-700" />
            <span>รายการที่เลือก</span>
            <span className="font-mono-tabular text-xs font-semibold text-blue-700">
              ({cartItems.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ลงประกาศขาย</span>
          </button>
        </div>
      </div>

      {/* Collapsible Interactive Price Criteria Calculator */}
      {isEvaluatorOpen && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                เกณฑ์ช่วยประเมินราคาหนังสือและสื่อการเรียน
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                คำนวณราคาย่อมเยาที่แนะนำโดยคิดจากคะแนนสภาพรวม (100 คะแนน) เพื่อช่วยให้ผู้ขายตั้งราคาเหมาะสมและผู้ซื้อประหยัดได้จริง
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEvaluatorOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              aria-label="ปิดเครื่องมือประเมินราคา"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  ประเภทสื่อการเรียนรู้
                </label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as ResourceKind)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  ราคาปก / ราคาเต็มเดิม (บาท)
                </label>
                <input
                  type="number"
                  min={10}
                  max={5000}
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  สภาพรูปเล่มและกระดาษ
                </label>
                <select
                  value={physicalCondition}
                  onChange={(e) => setPhysicalCondition(e.target.value as PhysicalCondition)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {PHYSICAL_CONDITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  ร่องรอยการขีดเขียน / ไฮไลท์
                </label>
                <select
                  value={markingLevel}
                  onChange={(e) => setMarkingLevel(e.target.value as MarkingLevel)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {MARKING_LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  อายุการใช้งาน
                </label>
                <select
                  value={usageAgeYears}
                  onChange={(e) => setUsageAgeYears(e.target.value as UsageAge)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {USAGE_AGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end pb-2">
                <label className="inline-flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasCompleteness}
                    onChange={(e) => setHasCompleteness(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span>ปก เฉลย หรือไฟล์แนบครบถ้วน (+15 คะแนน)</span>
                </label>
              </div>
            </div>

            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-baseline justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="text-xs text-slate-500">ราคากลางแนะนำตามเกณฑ์</div>
                  <div className="text-3xl font-semibold text-blue-700 font-mono-tabular mt-0.5">
                    ฿{liveEvaluation.suggestedPrice}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">คะแนนสภาพรวม</div>
                  <div className="text-lg font-semibold text-slate-900 font-mono-tabular">
                    {liveEvaluation.conditionScore}/100 ({liveEvaluation.conditionGrade})
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>ช่วงราคาที่เป็นธรรม:</span>
                  <span className="font-mono-tabular font-medium text-slate-900">
                    ฿{liveEvaluation.minFairPrice} – ฿{liveEvaluation.maxFairPrice}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ช่วยผู้ซื้อประหยัดจากราคาปก:</span>
                  <span className="font-mono-tabular font-medium text-emerald-700">
                    {liveEvaluation.discountPercent}%
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                {liveEvaluation.breakdown.map((row) => (
                  <div key={row.criterion} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{row.criterion}</span>
                    <span className="font-mono-tabular text-slate-900 font-medium">
                      +{row.points} คะแนน
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-view: Seller Orders Inbox */}
      {subView === 'seller_inbox' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-slate-900">
                ข้อมูลคำสั่งซื้อที่ส่งถึงผู้ขาย
              </h3>
              <p className="text-xs text-slate-600">
                เมื่อผู้ซื้อกดยืนยันสั่งซื้อ ระบบจะส่งข้อมูลผู้ซื้อ ช่องทางติดต่อ และวิธีรับหนังสือมาที่กล่องของผู้ขายทันที
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
              <button
                type="button"
                onClick={() => setInboxScope('mine')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
                  inboxScope === 'mine' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                ของฉัน ({mySellerNotifications.length})
              </button>
              <button
                type="button"
                onClick={() => setInboxScope('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
                  inboxScope === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                ผู้ขายทั้งหมด ({sellerNotifications.length})
              </button>
            </div>
          </div>

          {displayedSellerNotifications.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
              <p className="text-sm font-medium text-slate-900">
                {inboxScope === 'mine'
                  ? `ยังไม่มีคำสั่งซื้อเข้าถึงบัญชีผู้ขาย "${currentStudent.name}"`
                  : 'ยังไม่มีรายการสั่งซื้อในระบบ'}
              </p>
              <p className="text-xs text-slate-500">
                เมื่อมีนักเรียนกดสั่งซื้อหนังสือที่ลงประกาศไว้ ข้อมูลผู้ซื้อและช่องทางติดต่อจะถูกส่งมาแสดงที่นี่ทันที
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                      <th className="py-3 px-4">คำสั่งซื้อ / หนังสือ</th>
                      <th className="py-3 px-4">ผู้ขายที่รับข้อมูล</th>
                      <th className="py-3 px-4">ข้อมูลผู้ซื้อ & ช่องทางติดต่อ</th>
                      <th className="py-3 px-4">วิธีรับ & หมายเหตุ</th>
                      <th className="py-3 px-4">ราคา</th>
                      <th className="py-3 px-4">สถานะผู้ขาย</th>
                      <th className="py-3 px-4 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {displayedSellerNotifications.map((notif) => {
                      const chatCount = countChatMessages(notif.id);
                      const isPaidCod = notif.paymentStatus === 'paid_cod';
                      return (
                        <tr key={notif.id} className="hover:bg-slate-50/70">
                          <td className="py-3.5 px-4 max-w-[230px]">
                            <div className="font-mono-tabular text-slate-500">
                              {notif.orderId} · {notif.createdAt}
                            </div>
                            <div className="font-medium text-slate-900 mt-0.5">
                              {notif.itemTitle}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-medium text-slate-900">{notif.sellerName}</div>
                            <div className="text-slate-500">{notif.sellerContact}</div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-medium text-blue-800">{notif.buyerName}</div>
                            <div className="text-slate-600">{notif.buyerContact}</div>
                          </td>
                          <td className="py-3.5 px-4 max-w-[240px]">
                            <div className="font-medium text-slate-800">
                              {notif.deliveryMethod === 'pickup'
                                ? 'นัดรับ & ชำระปลายทางที่โรงเรียน'
                                : 'จัดส่งพัสดุ'}
                            </div>
                            <div className="text-slate-600 truncate">
                              {notif.meetupLocation
                                ? `จุดนัดรับ: ${notif.meetupLocation}`
                                : notif.deliveryNote || 'ยังไม่ตกลงจุดนัดรับ'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-mono-tabular font-semibold text-slate-900">
                              ฿{notif.sellingPrice}
                            </div>
                            <div
                              className={`text-[11px] font-medium ${
                                isPaidCod ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              {isPaidCod ? 'ชำระปลายทางแล้ว' : 'รอชำระปลายทางที่ รร.'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {notif.status === 'new' && (
                              <span className="inline-flex items-center gap-1.5 font-medium text-blue-700">
                                <Send className="w-3.5 h-3.5" />
                                <span>ส่งถึงผู้ขายแล้ว (ใหม่)</span>
                              </span>
                            )}
                            {(notif.status === 'acknowledged' || notif.status === 'negotiating') && (
                              <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                                <Clock className="w-3.5 h-3.5" />
                                <span>กำลังนัดสถานที่รับหนังสือ</span>
                              </span>
                            )}
                            {notif.status === 'ready_meetup' && (
                              <span className="inline-flex items-center gap-1.5 font-medium text-blue-700">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>ตกลงสถานที่นัดรับแล้ว</span>
                              </span>
                            )}
                            {notif.status === 'completed' && (
                              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>ส่งมอบและชำระปลายทางแล้ว</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => onOpenChat(notif)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-blue-700" />
                                <span>
                                  แชทตกลงสถานที่{chatCount > 0 ? ` (${chatCount})` : ''}
                                </span>
                              </button>

                              {notif.status === 'new' && (
                                <button
                                  type="button"
                                  disabled={busyNotifId === notif.id}
                                  onClick={() => handleSellerAction(notif.id, 'acknowledge')}
                                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer disabled:opacity-50"
                                >
                                  รับทราบ
                                </button>
                              )}

                              {(notif.status === 'acknowledged' ||
                                notif.status === 'negotiating' ||
                                notif.status === 'ready_meetup') && (
                                <button
                                  type="button"
                                  disabled={busyNotifId === notif.id}
                                  onClick={() => handleSellerAction(notif.id, 'complete')}
                                  className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md cursor-pointer disabled:opacity-50"
                                >
                                  ยืนยันส่งมอบ & รับเงิน
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search and Filter Controls */}
      {subView === 'catalog' && (
      <>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อหนังสือ รายวิชา หรือชื่อผู้ขาย..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as 'ทั้งหมด' | EducationLevel)}
              aria-label="กรองตามระดับชั้น"
              className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  ระดับ: {lvl}
                </option>
              ))}
            </select>

            <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={showSold}
                onChange={(e) => setShowSold(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-700"
              />
              <span>แสดงรายการที่ขายแล้ว</span>
            </label>
          </div>
        </div>

        {/* Interactive Subject Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {SUBJECTS.map((subj) => {
            const active = selectedSubject === subj;
            return (
              <button
                key={subj}
                type="button"
                onClick={() => setSelectedSubject(subj)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {subj}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3-Column Product Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
          <p className="text-base font-medium text-slate-900">ไม่พบรายการหนังสือที่ตรงกับเงื่อนไข</p>
          <p className="text-sm text-slate-500">
            ลองเปลี่ยนคำค้นหา หมวดวิชา หรือกดลงประกาศขายหนังสือเล่มแรกในหมวดนี้
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const inCart = cartIds.includes(item.id);
            const isSold = item.status === 'sold';
            return (
              <article
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
                  <ResilientImage
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    fallbackLabel={item.title}
                  />
                  {isSold && (
                    <div className="absolute inset-0 bg-slate-900/55 flex items-center justify-center">
                      <span className="px-3 py-1.5 bg-white text-slate-900 text-xs font-semibold rounded-md">
                        ส่งต่อแล้ว · {item.buyerName}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                      <span>{item.subject}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.level}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.kind}</span>
                    </div>

                    <h3 className="text-base font-semibold text-slate-900 leading-snug line-clamp-2">
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-semibold text-slate-900 font-mono-tabular">
                          ฿{item.sellingPrice}
                        </span>
                        <span className="text-xs text-slate-400 line-through font-mono-tabular">
                          ฿{item.originalPrice}
                        </span>
                        <span className="text-xs font-medium text-emerald-700 font-mono-tabular">
                          ประหยัด {item.evaluation.discountPercent}%
                        </span>
                      </div>
                      <span className="text-xs text-slate-600 font-mono-tabular whitespace-nowrap">
                        สภาพ {item.evaluation.conditionScore}% ({item.evaluation.conditionGrade})
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 truncate">
                      ผู้ส่งต่อ: {item.sellerName} · {item.sellerSchool}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setInspectedItem(item)}
                        className="flex-1 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        เกณฑ์ราคา & รายละเอียด
                      </button>

                      {!isSold && (
                        <button
                          type="button"
                          onClick={() => handleDirectBuy(item.id)}
                          className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                            inCart
                              ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                              : 'bg-blue-700 text-white hover:bg-blue-800'
                          }`}
                        >
                          {inCart ? 'ดำเนินการสั่งซื้อ' : 'สั่งซื้อ'}
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

      {/* Recent Completed Orders Summary + Buyer Meetup Chat */}
      {orders.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              ประวัติการสั่งซื้อ & แชทตกลงจุดนัดรับชำระปลายทางที่โรงเรียน
            </h3>
            <button
              type="button"
              onClick={() => switchSubView('seller_inbox')}
              className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
            >
              ดูสถานะฝั่งผู้ขาย
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {orders.slice(0, 5).map((ord) => {
              const linkedNotifs = sellerNotifications.filter((n) => n.orderId === ord.id);
              return (
                <div key={ord.id} className="py-3 space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-medium text-slate-900">
                        คำสั่งซื้อ <span className="font-mono-tabular">{ord.id}</span> · ผู้ซื้อ{' '}
                        {ord.buyerName} ({ord.buyerContact})
                      </div>
                      <div className="text-slate-500">
                        {ord.itemsSummary
                          .map(
                            (i) =>
                              `${i.title}${i.sellerName ? ` [ผู้ขาย: ${i.sellerName}]` : ''}`
                          )
                          .join(', ')}{' '}
                        ·{' '}
                        {ord.deliveryMethod === 'pickup'
                          ? 'นัดรับ & ชำระปลายทางที่โรงเรียน'
                          : 'จัดส่งพัสดุ'}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 font-mono-tabular">
                      <span className="text-emerald-700">ประหยัด ฿{ord.totalSaved}</span>
                      <span className="font-semibold text-slate-900">รวม ฿{ord.totalAmount}</span>
                    </div>
                  </div>

                  {linkedNotifs.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {linkedNotifs.map((notif) => {
                        const msgCount = countChatMessages(notif.id);
                        return (
                          <button
                            key={notif.id}
                            type="button"
                            onClick={() => onOpenChat(notif)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>
                              แชทกับ {notif.sellerName}
                              {notif.meetupLocation ? ` · ${notif.meetupLocation}` : ''}
                              {msgCount > 0 ? ` (${msgCount})` : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      </>
      )}

      {/* Item Detail + Price Rubric Modal */}
      {inspectedItem && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs text-slate-500">
                  {inspectedItem.subject} · {inspectedItem.level} · {inspectedItem.kind}
                </div>
                <h3 className="text-xl font-semibold text-slate-900">{inspectedItem.title}</h3>
                <p className="text-xs text-slate-500">{inspectedItem.authorOrPublisher}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden">
                <ResilientImage
                  src={inspectedItem.imageUrl}
                  alt={inspectedItem.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-3 text-sm">
                <p className="text-slate-600 leading-relaxed">{inspectedItem.description}</p>
                <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ผู้ส่งต่อ</span>
                    <span className="font-medium text-slate-900">
                      {inspectedItem.sellerName} ({inspectedItem.sellerSchool})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ช่องทางติดต่อ</span>
                    <span className="text-slate-800">{inspectedItem.sellerContact}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ราคาปกเดิม</span>
                    <span className="font-mono-tabular line-through text-slate-400">
                      ฿{inspectedItem.originalPrice}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ราคาขายจริง</span>
                    <span className="font-mono-tabular text-base font-semibold text-blue-700">
                      ฿{inspectedItem.sellingPrice}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transparent Evaluation Breakdown */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">
                  ผลการประเมินสภาพและราคาตามเกณฑ์กลาง
                </span>
                <span className="text-sm font-semibold font-mono-tabular text-blue-700">
                  {inspectedItem.evaluation.conditionScore}/100 คะแนน · เกรด{' '}
                  {inspectedItem.evaluation.conditionGrade}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {inspectedItem.evaluation.breakdown.map((b) => (
                  <div
                    key={b.criterion}
                    className="bg-white border border-slate-200 rounded-md px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-slate-500">{b.criterion}</div>
                      <div className="font-medium text-slate-900">{b.impactLabel}</div>
                    </div>
                    <span className="font-mono-tabular font-semibold text-slate-800 shrink-0">
                      +{b.points}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-600">
                <span>
                  ช่วงราคาแนะนำของระบบ:{' '}
                  <strong className="font-mono-tabular text-slate-900">
                    ฿{inspectedItem.evaluation.minFairPrice} – ฿
                    {inspectedItem.evaluation.maxFairPrice}
                  </strong>
                </span>
                <span className="text-emerald-700 font-medium">
                  {inspectedItem.sellingPrice <= inspectedItem.evaluation.maxFairPrice
                    ? 'ราคาอยู่ในเกณฑ์ย่อมเยาตามมาตรฐาน'
                    : 'ราคาปรับตามตกลงของผู้ขาย'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setInspectedItem(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                ปิด
              </button>
              {inspectedItem.status === 'available' && (
                <button
                  type="button"
                  onClick={() => {
                    if (!cartIds.includes(inspectedItem.id)) {
                      onToggleCart(inspectedItem.id);
                    }
                    setInspectedItem(null);
                    setIsCartOpen(true);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  เลือกซื้อรายการนี้
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Listing Modal with Built-in Price Evaluator */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  ลงประกาศจำหน่ายหนังสือและสื่อการเรียนรู้
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ระบุสภาพหนังสือจริง เพื่อให้ระบบคำนวณช่วงราคาขายต่อที่ย่อมเยาและเหมาะสมให้โดยอัตโนมัติ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ชื่อหนังสือ / ชุดชีทสรุป *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="เช่น สรุปเคมี ม.ปลาย ฉบับเตรียมสอบ A-Level"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ผู้แต่ง / สำนักพิมพ์ / ผู้จัดทำ
                  </label>
                  <input
                    type="text"
                    value={authorOrPublisher}
                    onChange={(e) => setAuthorOrPublisher(e.target.value)}
                    placeholder="เช่น อ.สำราญ หรือ ชมรมวิชาการ"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ประเภทสื่อการเรียน
                  </label>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as ResourceKind)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {KINDS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">หมวดวิชา</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value as SubjectCategory)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {SUBJECTS.filter((s) => s !== 'ทั้งหมด').map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ระดับชั้น
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as EducationLevel)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {LEVELS.filter((l) => l !== 'ทั้งหมด').map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    รายละเอียดเพิ่มเติม
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="ระบุจุดเด่น บทที่สรุปไว้ หรือสภาพเพิ่มเติมให้ผู้ซื้อทราบ..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Integrated Price Evaluation Criteria Block */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-900">
                    ประเมินราคาตามเกณฑ์สภาพและการใช้งาน
                  </h4>
                  <span className="text-xs font-mono-tabular font-semibold text-blue-700">
                    คะแนนสภาพ {liveEvaluation.conditionScore}/100 ({liveEvaluation.conditionGrade})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      ราคาปกเดิม (บาท) *
                    </label>
                    <input
                      type="number"
                      required
                      min={10}
                      max={5000}
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      สภาพรูปเล่ม
                    </label>
                    <select
                      value={physicalCondition}
                      onChange={(e) => setPhysicalCondition(e.target.value as PhysicalCondition)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                    >
                      {PHYSICAL_CONDITION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      ร่องรอยขีดเขียน
                    </label>
                    <select
                      value={markingLevel}
                      onChange={(e) => setMarkingLevel(e.target.value as MarkingLevel)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                    >
                      {MARKING_LEVEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      อายุการใช้งาน
                    </label>
                    <select
                      value={usageAgeYears}
                      onChange={(e) => setUsageAgeYears(e.target.value as UsageAge)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                    >
                      {USAGE_AGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasCompleteness}
                    onChange={(e) => setHasCompleteness(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-700"
                  />
                  <span>มีหน้าครบ ปกครบ และเฉลย/ไฟล์แนบครบถ้วน</span>
                </label>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
                  <div>
                    <div className="text-xs text-slate-500">
                      ระบบแนะนำราคาที่{' '}
                      <strong className="font-mono-tabular text-blue-700">
                        ฿{liveEvaluation.suggestedPrice}
                      </strong>{' '}
                      (ช่วงเหมาะสม ฿{liveEvaluation.minFairPrice} – ฿{liveEvaluation.maxFairPrice})
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-700 whitespace-nowrap">
                      ราคาขายจริง (฿):
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={5000}
                      value={
                        customSellingPrice === ''
                          ? liveEvaluation.suggestedPrice
                          : customSellingPrice
                      }
                      onChange={(e) =>
                        setCustomSellingPrice(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-28 px-3 py-1.5 text-sm font-mono-tabular font-semibold bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {formError && <p className="text-xs text-red-700">{formError}</p>}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'ลงประกาศขาย'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-Over Cart & Order Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex justify-end" role="dialog" aria-modal="true">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-6 flex flex-col justify-between border-l border-slate-200">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <h3 className="text-lg font-semibold text-slate-900">รายการสั่งซื้อหนังสือ</h3>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {latestOrder ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>ส่งข้อมูลการสั่งซื้อไปยังผู้ขายแล้ว ({latestOrder.id})</span>
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    ระบบได้ส่งข้อมูลผู้ซื้อ ({latestOrder.buyerName} · {latestOrder.buyerContact}) ไปยังผู้ขายแล้ว กรุณาเปิดห้องแชทเพื่อตกลงสถานที่รับหนังสือและชำระเงินปลายทางที่โรงเรียน
                  </p>
                  <div className="bg-white/85 border border-emerald-200 rounded-lg p-3 space-y-2 text-xs text-emerald-950">
                    <div className="font-medium text-emerald-900">แชทตกลงจุดนัดรับกับผู้ขาย:</div>
                    {sellerNotifications
                      .filter((n) => n.orderId === latestOrder.id)
                      .map((notif) => (
                        <div
                          key={notif.id}
                          className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-100 first:border-t-0 first:pt-0"
                        >
                          <div className="truncate">
                            <div className="font-medium text-slate-900 truncate">
                              {notif.itemTitle}
                            </div>
                            <div className="text-[11px] text-slate-600">
                              ผู้ขาย: {notif.sellerName} · ฿{notif.sellingPrice}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCartOpen(false);
                              onOpenChat(notif);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>เปิดแชทกับผู้ขาย</span>
                          </button>
                        </div>
                      ))}
                  </div>
                  <div className="border-t border-emerald-200 pt-3 space-y-1 text-xs text-emerald-900">
                    <div className="flex justify-between">
                      <span>การชำระเงิน:</span>
                      <span className="font-medium">ชำระเงินปลายทางที่โรงเรียน (COD)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ยอดชำระเมื่อรับหนังสือ:</span>
                      <span className="font-mono-tabular font-semibold">
                        ฿{latestOrder.totalAmount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>ประหยัดจากราคาปก:</span>
                      <span className="font-mono-tabular font-semibold">
                        ฿{latestOrder.totalSaved}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCartOpen(false);
                      setInboxScope('all');
                      switchSubView('seller_inbox');
                    }}
                    className="w-full py-2 text-xs font-medium text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-100 rounded-lg cursor-pointer"
                  >
                    ดูข้อมูลที่ส่งไปในกล่องผู้ขาย
                  </button>
                </div>
              ) : cartItems.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm font-medium text-slate-900">ยังไม่มีรายการหนังสือที่เลือก</p>
                  <p className="text-xs text-slate-500">
                    กดปุ่ม "สั่งซื้อ" บนหนังสือที่ต้องการเพื่อส่งคำสั่งซื้อและนัดรับกับผู้ขาย
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-slate-100">
                    {cartItems.map((item) => (
                      <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium text-slate-900">{item.title}</div>
                          <div className="text-xs text-slate-500">
                            ผู้ส่งต่อ: {item.sellerName}
                          </div>
                          <div className="text-xs font-mono-tabular text-blue-700 font-semibold">
                            ฿{item.sellingPrice}{' '}
                            <span className="text-slate-400 line-through font-normal">
                              ฿{item.originalPrice}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onToggleCart(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md cursor-pointer"
                          aria-label={`นำ ${item.title} ออก`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>ประหยัดจากราคาปกทั้งหมด</span>
                      <span className="font-mono-tabular font-medium text-emerald-700">
                        -฿{cartSaved}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-slate-900 text-base pt-1 border-t border-slate-200">
                      <span>ยอดชำระปลายทางที่ รร.</span>
                      <span className="font-mono-tabular">฿{cartTotal}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-blue-800 pt-1">
                      <Wallet className="w-3.5 h-3.5 shrink-0" />
                      <span>ชำระเงินปลายทางกับผู้ขายเมื่อตรวจรับหนังสือที่โรงเรียน</span>
                    </div>
                  </div>

                  <form onSubmit={handleConfirmOrder} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        ชื่อผู้รับ / นักเรียน
                      </label>
                      <input
                        type="text"
                        required
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        ห้องเรียน / ช่องทางติดต่อ
                      </label>
                      <input
                        type="text"
                        required
                        value={buyerContact}
                        onChange={(e) => setBuyerContact(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        วิธีรับสื่อการเรียน & การชำระเงิน
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDeliveryMethod('pickup')}
                          className={`px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer ${
                            deliveryMethod === 'pickup'
                              ? 'border-blue-700 bg-blue-50 text-blue-800'
                              : 'border-slate-300 bg-white text-slate-700'
                          }`}
                        >
                          นัดรับ & ชำระปลายทางที่ รร.
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeliveryMethod('parcel')}
                          className={`px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer ${
                            deliveryMethod === 'parcel'
                              ? 'border-blue-700 bg-blue-50 text-blue-800'
                              : 'border-slate-300 bg-white text-slate-700'
                          }`}
                        >
                          จัดส่ง / นัดรับตามตกลง
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        จุดนัดรับเบื้องต้นที่โรงเรียน (แชทปรับเปลี่ยนภายหลังได้)
                      </label>
                      <input
                        type="text"
                        value={deliveryNote}
                        onChange={(e) => setDeliveryNote(e.target.value)}
                        placeholder="เช่น หน้าห้องสมุดโรงเรียน พักกลางวัน 12:20 น."
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>

                    {checkoutError && <p className="text-xs text-red-700">{checkoutError}</p>}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting
                        ? 'กำลังส่งข้อมูลไปยังผู้ขาย...'
                        : `ยืนยันสั่งซื้อ & เปิดแชทนัดรับที่ รร. (฿${cartTotal})`}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
