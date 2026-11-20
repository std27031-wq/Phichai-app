import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, MapPin, Send, Wallet, X } from 'lucide-react';
import type { OrderChatMessage, SellerNotification, StudentProfile } from '../types.ts';

interface OrderChatModalProps {
  notification: SellerNotification | null;
  messages: OrderChatMessage[];
  currentStudent: StudentProfile;
  onClose: () => void;
  onSendMessage: (
    notificationId: string,
    text: string,
    senderRole: 'buyer' | 'seller'
  ) => Promise<void>;
  onSaveMeetupLocation: (notificationId: string, meetupLocation: string) => Promise<void>;
  onCompleteCodOrder: (notificationId: string) => Promise<void>;
}

const QUICK_SCHOOL_SPOTS = [
  'หน้าห้องสมุดโรงเรียน (พักกลางวัน 12:20 น.)',
  'โรงอาหารกลาง โต๊ะฝั่งตะวันออก (12:30 น.)',
  'หน้าอาคารเรียน 1 ชั้นล่าง (หลังเลิกเรียน 15:40 น.)',
  'ศาลาพักใจหน้าเสาธง (07:45 น.)',
];

export function OrderChatModal({
  notification,
  messages,
  currentStudent,
  onClose,
  onSendMessage,
  onSaveMeetupLocation,
  onCompleteCodOrder,
}: OrderChatModalProps) {
  const [draftText, setDraftText] = useState('');
  const [meetupInput, setMeetupInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSavingMeetup, setIsSavingMeetup] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (notification) {
      setMeetupInput(notification.meetupLocation || '');
      setErrorMsg('');
    }
  }, [notification?.id, notification?.meetupLocation]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!notification) return null;

  const isSeller = notification.sellerId === currentStudent.id;
  const senderRole: 'buyer' | 'seller' = isSeller ? 'seller' : 'buyer';
  const partnerName = isSeller ? notification.buyerName : notification.sellerName;
  const partnerContact = isSeller ? notification.buyerContact : notification.sellerContact;
  const isCompleted = notification.status === 'completed';

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftText.trim()) return;
    setErrorMsg('');
    setIsSending(true);
    try {
      await onSendMessage(notification.id, draftText.trim(), senderRole);
      setDraftText('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ส่งข้อความไม่สำเร็จ');
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveMeetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetupInput.trim()) return;
    setErrorMsg('');
    setIsSavingMeetup(true);
    try {
      await onSaveMeetupLocation(notification.id, meetupInput.trim());
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'บันทึกสถานที่นัดรับไม่สำเร็จ');
    } finally {
      setIsSavingMeetup(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 bg-white">
          <div className="space-y-1">
            <div className="text-xs text-slate-500 font-mono-tabular">
              คำสั่งซื้อ {notification.orderId} · {isSeller ? 'คุณเป็นผู้ขาย' : 'คุณเป็นผู้ซื้อ'}
            </div>
            <h3 className="text-lg font-semibold text-slate-900 leading-snug">
              {notification.itemTitle}
            </h3>
            <div className="text-xs text-slate-600">
              คู่สนทนา: <strong className="text-slate-900">{partnerName}</strong> ({partnerContact})
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
            aria-label="ปิดห้องแชท"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* COD Payment & Meetup Location Agreement Bar */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="inline-flex items-center gap-1.5 text-slate-800 font-medium">
              <Wallet className="w-4 h-4 text-blue-700" />
              <span>
                ชำระเงินปลายทางที่โรงเรียน:{' '}
                <strong className="font-mono-tabular text-blue-700 text-sm">
                  ฿{notification.sellingPrice}
                </strong>
              </span>
            </div>

            <div className="font-medium">
              {isCompleted ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ส่งมอบและชำระปลายทางสำเร็จ</span>
                </span>
              ) : (
                <span className="text-amber-700">รอรับหนังสือและชำระเงินปลายทาง ณ จุดนัดรับ</span>
              )}
            </div>
          </div>

          {!isCompleted && (
            <form onSubmit={handleSaveMeetup} className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={meetupInput}
                    onChange={(e) => setMeetupInput(e.target.value)}
                    placeholder="ตกลงจุดนัดรับหนังสือและเวลาที่โรงเรียน (เช่น หน้าห้องสมุด 12:20 น.)"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSavingMeetup || !meetupInput.trim()}
                  className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap disabled:opacity-50 cursor-pointer"
                >
                  {isSavingMeetup ? 'กำลังบันทึก...' : 'บันทึกสถานที่นัดรับ'}
                </button>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {QUICK_SCHOOL_SPOTS.map((spot) => (
                  <button
                    key={spot}
                    type="button"
                    onClick={() => setMeetupInput(spot)}
                    className="px-2.5 py-1 text-[11px] bg-white border border-slate-200 hover:border-blue-600 text-slate-700 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {spot}
                  </button>
                ))}
              </div>
            </form>
          )}

          {notification.meetupLocation && (
            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
              <span>
                สถานที่นัดรับที่ตกลงกัน: <strong>{notification.meetupLocation}</strong>
              </span>
              {!isCompleted && (
                <button
                  type="button"
                  onClick={() => void onCompleteCodOrder(notification.id)}
                  className="px-2.5 py-1 text-[11px] font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                >
                  ยืนยันรับเงินปลายทาง & ส่งมอบแล้ว
                </button>
              )}
            </div>
          )}
        </div>

        {/* Chat Messages Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-white min-h-[240px]">
          {messages.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              เริ่มแชทเพื่อตกลงสถานที่และเวลาส่งมอบหนังสือภายในโรงเรียน
            </div>
          ) : (
            messages.map((msg) => {
              if (msg.senderRole === 'system') {
                return (
                  <div
                    key={msg.id}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-700 text-center"
                  >
                    {msg.text}
                  </div>
                );
              }

              const isMine = msg.senderId === currentStudent.id;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[11px] text-slate-500 mb-1">
                    {msg.senderName} ({msg.senderRole === 'seller' ? 'ผู้ขาย' : 'ผู้ซื้อ'}) ·{' '}
                    <span className="font-mono-tabular">
                      {new Date(msg.createdAt).toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
                      isMine
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-100 text-slate-900 border border-slate-200'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {/* Message Composer */}
        <form
          onSubmit={handleSend}
          className="px-6 py-4 border-t border-slate-200 bg-slate-50 space-y-2"
        >
          {errorMsg && <p className="text-xs text-red-700">{errorMsg}</p>}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder={
                isCompleted
                  ? 'ส่งข้อความเพิ่มเติมถึงคู่สนทนา...'
                  : 'พิมพ์ข้อความนัดสถานที่รับหนังสือและชำระเงินปลายทางที่โรงเรียน...'
              }
              className="flex-1 px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              disabled={isSending || !draftText.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>ส่งข้อความ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
