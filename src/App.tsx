import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarClock,
  Download,
  Inbox,
  LogOut,
  MessageSquare,
  UserCheck,
} from 'lucide-react';
import type {
  AppBootstrapData,
  ConditionEvaluationInput,
  EducationLevel,
  KnowledgeResource,
  LendingBook,
  MarketOrder,
  OrderChatMessage,
  ResourceKind,
  SellerNotification,
  StudentProfile,
  SubjectCategory,
} from './types.ts';
import { ResilientImage } from './components/ResilientImage.tsx';
import { MarketplaceView } from './components/MarketplaceView.tsx';
import { LendingView } from './components/LendingView.tsx';
import { KnowledgeView } from './components/KnowledgeView.tsx';
import { UnifiedCreateModal } from './components/UnifiedCreateModal.tsx';
import { AuthGate } from './components/AuthGate.tsx';
import { OrderChatModal } from './components/OrderChatModal.tsx';

type ActiveTab = 'home' | 'market' | 'lending' | 'knowledge' | 'tracker';

const AUTH_TOKEN_KEY = 'punrian_auth_token';

export default function App() {
  const [data, setData] = useState<AppBootstrapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [authToken, setAuthToken] = useState<string>(() => {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY) || '';
    } catch {
      return '';
    }
  });
  const [authUser, setAuthUser] = useState<StudentProfile | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [marketSubView, setMarketSubView] = useState<'catalog' | 'seller_inbox'>('catalog');
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [isUnifiedCreateOpen, setIsUnifiedCreateOpen] = useState(false);
  const [pendingCreateFor, setPendingCreateFor] = useState<
    'market' | 'lending' | 'knowledge' | null
  >(null);
  const [activeChatNotifId, setActiveChatNotifId] = useState<string | null>(null);

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
    const init = async () => {
      await fetchBootstrap();
      const savedToken = (() => {
        try {
          return localStorage.getItem(AUTH_TOKEN_KEY) || '';
        } catch {
          return '';
        }
      })();
      if (savedToken) {
        try {
          const meRes = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          if (meRes.ok) {
            const meData = (await meRes.json()) as { student: StudentProfile };
            setAuthToken(savedToken);
            setAuthUser(meData.student);
          } else {
            try {
              localStorage.removeItem(AUTH_TOKEN_KEY);
            } catch {
              // ignore storage errors
            }
            setAuthToken('');
            setAuthUser(null);
          }
        } catch {
          setAuthToken('');
          setAuthUser(null);
        }
      }
      setIsAuthChecked(true);
    };
    void init();
  }, []);

  useEffect(() => {
    if (!authToken || !authUser) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as
            | {
                type: 'order:created';
                order: MarketOrder;
                sellerNotifications: SellerNotification[];
              }
            | {
                type: 'chat:message';
                message: OrderChatMessage;
                notification?: SellerNotification;
              }
            | {
                type: 'notification:updated';
                notification: SellerNotification;
                message?: OrderChatMessage;
              }
            | { type: 'knowledge:created'; resource: KnowledgeResource }
            | { type: 'knowledge:updated'; resource: KnowledgeResource };

          if (payload.type === 'order:created') {
            setData((prev) => {
              if (!prev) return prev;
              const existingOrder = prev.orders.some((o) => o.id === payload.order.id);
              const existingNotifIds = new Set(prev.sellerNotifications.map((n) => n.id));
              const newNotifs = payload.sellerNotifications.filter(
                (n) => !existingNotifIds.has(n.id)
              );
              return {
                ...prev,
                orders: existingOrder ? prev.orders : [payload.order, ...prev.orders],
                sellerNotifications: [...newNotifs, ...prev.sellerNotifications],
              };
            });
          } else if (payload.type === 'chat:message') {
            setData((prev) => {
              if (!prev) return prev;
              const msgExists = prev.orderMessages.some((m) => m.id === payload.message.id);
              return {
                ...prev,
                orderMessages: msgExists
                  ? prev.orderMessages
                  : [...prev.orderMessages, payload.message],
                sellerNotifications: payload.notification
                  ? prev.sellerNotifications.map((n) =>
                      n.id === payload.notification!.id ? payload.notification! : n
                    )
                  : prev.sellerNotifications,
              };
            });
          } else if (payload.type === 'notification:updated') {
            setData((prev) => {
              if (!prev) return prev;
              const msgExists = payload.message
                ? prev.orderMessages.some((m) => m.id === payload.message!.id)
                : true;
              return {
                ...prev,
                sellerNotifications: prev.sellerNotifications.map((n) =>
                  n.id === payload.notification.id ? payload.notification : n
                ),
                orderMessages:
                  payload.message && !msgExists
                    ? [...prev.orderMessages, payload.message]
                    : prev.orderMessages,
              };
            });
          } else if (payload.type === 'knowledge:created') {
            setData((prev) => {
              if (!prev) return prev;
              const exists = prev.knowledgeResources.some((r) => r.id === payload.resource.id);
              return exists
                ? prev
                : { ...prev, knowledgeResources: [payload.resource, ...prev.knowledgeResources] };
            });
          } else if (payload.type === 'knowledge:updated') {
            setData((prev) =>
              prev
                ? {
                    ...prev,
                    knowledgeResources: prev.knowledgeResources.map((r) =>
                      r.id === payload.resource.id ? payload.resource : r
                    ),
                  }
                : prev
            );
          }
        } catch {
          // Ignore malformed WS payloads
        }
      };

      ws.onclose = () => {
        if (!cancelled) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [authToken, authUser?.id]);

  const handleAuthSuccess = async (token: string, student: StudentProfile) => {
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } catch {
      // ignore storage errors
    }
    setAuthToken(token);
    setAuthUser(student);
    await fetchBootstrap();
    showToast(`เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ ${student.name}`);
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {
        // ignore network error on logout
      }
    }
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {
      // ignore storage errors
    }
    setAuthToken('');
    setAuthUser(null);
    setCartIds([]);
    setActiveChatNotifId(null);
    setActiveTab('home');
  };

  const currentStudent: StudentProfile = useMemo(() => {
    if (authUser) return authUser;
    return {
      id: 'stu-1',
      name: 'ปภาวิน พิชัยรักษ์',
      studentCode: 'std27031',
      grade: 'ม.5/2',
      school: 'โรงเรียนพิชัย',
      contact: 'ห้อง 502 · Line: papawin.stu',
    };
  }, [authUser]);

  const handleToggleCart = (itemId: string) => {
    setCartIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleAddToCart = (itemId: string) => {
    setCartIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
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
    buyerId: string;
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
    showToast(`ยืนยันคำสั่งซื้อ ${body.order.id} และส่งข้อมูลไปยังผู้ขายเรียบร้อยแล้ว`);
    return body.order as MarketOrder;
  };

  const handleUpdateSellerNotification = async (
    notifId: string,
    action: 'acknowledge' | 'set_meetup' | 'complete' | 'mark_read',
    meetupLocation?: string
  ) => {
    const res = await fetch(`/api/market/seller-notifications/${notifId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        meetupLocation,
        actorName: currentStudent.name,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      showToast(body.error || 'ไม่สามารถอัปเดตสถานะคำสั่งซื้อได้');
      throw new Error(body.error || 'ไม่สามารถอัปเดตสถานะคำสั่งซื้อได้');
    }
    await fetchBootstrap();
    if (action === 'acknowledge') showToast('รับทราบคำสั่งซื้อจากผู้ซื้อแล้ว');
    else if (action === 'set_meetup') showToast('บันทึกสถานที่นัดรับหนังสือที่โรงเรียนแล้ว');
    else if (action === 'complete')
      showToast('ยืนยันการส่งมอบและรับชำระเงินปลายทางที่โรงเรียนเรียบร้อยแล้ว');
  };

  const handleSendOrderMessage = async (
    notificationId: string,
    text: string,
    senderRole: 'buyer' | 'seller'
  ) => {
    const res = await fetch(`/api/market/orders/${notificationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: currentStudent.id,
        senderName: currentStudent.name,
        senderRole,
        text,
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'ส่งข้อความไม่สำเร็จ');
    setData((prev) => {
      if (!prev) return prev;
      const msgExists = prev.orderMessages.some((m) => m.id === body.message.id);
      return {
        ...prev,
        orderMessages: msgExists ? prev.orderMessages : [...prev.orderMessages, body.message],
        sellerNotifications: prev.sellerNotifications.map((n) =>
          n.id === body.notification.id ? body.notification : n
        ),
      };
    });
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

  const handleHomeDownloadKnowledge = (resItem: KnowledgeResource) => {
    handleRecordDownload(resItem.id);
    const link = document.createElement('a');
    link.href = `/api/knowledge/${resItem.id}/download`;
    link.download = resItem.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
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
  const mySellerNewOrdersCount =
    data?.sellerNotifications?.filter(
      (n) => n.sellerId === currentStudent.id && n.status === 'new'
    ).length ?? 0;
  const mySellerTotalOrdersCount =
    data?.sellerNotifications?.filter((n) => n.sellerId === currentStudent.id).length ?? 0;
  const myBuyerActiveNotifications =
    data?.sellerNotifications?.filter(
      (n) => n.buyerId === currentStudent.id && n.status !== 'completed'
    ) ?? [];

  const activeChatNotification = useMemo(
    () => data?.sellerNotifications?.find((n) => n.id === activeChatNotifId) ?? null,
    [data?.sellerNotifications, activeChatNotifId]
  );

  const activeChatMessages = useMemo(
    () =>
      (data?.orderMessages ?? []).filter((m) => m.notificationId === activeChatNotifId),
    [data?.orderMessages, activeChatNotifId]
  );

  if (!isAuthChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm font-medium text-slate-600">กำลังตรวจสอบสถานะบัญชีผู้ใช้งาน...</p>
      </div>
    );
  }

  if (!authToken || !authUser) {
    return (
      <AuthGate
        demoStudents={data?.students ?? []}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

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
          <div className="flex flex-wrap items-center gap-2 text-slate-700">
            <UserCheck className="w-4 h-4 text-blue-700 shrink-0" />
            <span className="font-semibold text-slate-900">{currentStudent.name}</span>
            <span className="text-slate-500 font-mono-tabular">
              ({currentStudent.studentCode} · {currentStudent.grade} · {currentStudent.school})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-600">
            {mySellerTotalOrdersCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMarketSubView('seller_inbox');
                  setActiveTab('market');
                }}
                className="inline-flex items-center gap-1.5 text-blue-700 font-medium hover:underline cursor-pointer"
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>
                  คำสั่งซื้อถึงคุณ (ผู้ขาย):{' '}
                  {mySellerNewOrdersCount > 0
                    ? `${mySellerNewOrdersCount} รายการใหม่`
                    : `${mySellerTotalOrdersCount} รายการ`}
                </span>
              </button>
            )}
            {myBuyerActiveNotifications.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveChatNotifId(myBuyerActiveNotifications[0].id)}
                className="inline-flex items-center gap-1.5 text-emerald-700 font-medium hover:underline cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>แชทนัดรับหนังสือ ({myBuyerActiveNotifications.length})</span>
              </button>
            )}
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
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-red-700 font-medium cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบ</span>
            </button>
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
                        {data.knowledgeResources.slice(0, 3).map((resItem) => (
                          <div
                            key={resItem.id}
                            className="py-2.5 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="truncate">
                              <div className="font-medium text-slate-900 truncate">
                                {resItem.title}
                              </div>
                              <div className="text-slate-500">
                                {resItem.subject} · {resItem.authorName} ·{' '}
                                <span className="font-mono-tabular">
                                  ดาวน์โหลด {resItem.downloads}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleHomeDownloadKnowledge(resItem)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md shrink-0 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>ดาวน์โหลด</span>
                            </button>
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
                sellerNotifications={data.sellerNotifications ?? []}
                orderMessages={data.orderMessages ?? []}
                currentStudent={currentStudent}
                cartIds={cartIds}
                initialSubView={marketSubView}
                onSubViewChange={setMarketSubView}
                onToggleCart={handleToggleCart}
                onAddToCart={handleAddToCart}
                onClearCart={() => setCartIds([])}
                onCreateItem={handleCreateMarketItem}
                onCheckout={handleCheckout}
                onUpdateSellerNotification={handleUpdateSellerNotification}
                onOpenChat={(notif) => setActiveChatNotifId(notif.id)}
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

      {/* Buyer-Seller Real-Time Meetup & COD Chat Modal */}
      <OrderChatModal
        notification={activeChatNotification}
        messages={activeChatMessages}
        currentStudent={currentStudent}
        onClose={() => setActiveChatNotifId(null)}
        onSendMessage={handleSendOrderMessage}
        onSaveMeetupLocation={async (notificationId, meetupLocation) => {
          await handleUpdateSellerNotification(notificationId, 'set_meetup', meetupLocation);
        }}
        onCompleteCodOrder={async (notificationId) => {
          await handleUpdateSellerNotification(notificationId, 'complete');
        }}
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-lg shadow-lg">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
