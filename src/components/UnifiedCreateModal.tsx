import { ArrowLeftRight, BookOpen, FileText, X } from 'lucide-react';

interface UnifiedCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTarget: (target: 'market' | 'lending' | 'knowledge') => void;
}

export function UnifiedCreateModal({
  isOpen,
  onClose,
  onSelectTarget,
}: UnifiedCreateModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              เลือกรูปแบบการส่งต่อทรัพยากรทางการศึกษา
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ต้องการลงประกาศขาย ให้เพื่อนยืม-แลกเปลี่ยน หรือแบ่งปันไฟล์ความรู้ฟรี
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onSelectTarget('market')}
            className="w-full text-left p-4 border border-slate-200 rounded-xl hover:border-blue-600 hover:bg-blue-50/40 transition-colors flex items-start gap-3.5 cursor-pointer"
          >
            <BookOpen className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-slate-900">
                1. ลงประกาศจำหน่ายหนังสือและชีทสรุป
              </div>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                ตั้งราคาย่อมเยาพร้อมระบบช่วยประเมินราคาตามสภาพรูปเล่ม ร่องรอยขีดเขียน และอายุการใช้งาน
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectTarget('lending')}
            className="w-full text-left p-4 border border-slate-200 rounded-xl hover:border-blue-600 hover:bg-blue-50/40 transition-colors flex items-start gap-3.5 cursor-pointer"
          >
            <ArrowLeftRight className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-slate-900">
                2. ลงทะเบียนหนังสือให้ยืมหรือแลกเปลี่ยน
              </div>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                กำหนดระยะเวลาการยืมสูงสุด บันทึกข้อมูลผู้ให้ยืม-ผู้ยืม และติดตามวันกำหนดส่งคืนอัตโนมัติ
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectTarget('knowledge')}
            className="w-full text-left p-4 border border-slate-200 rounded-xl hover:border-blue-600 hover:bg-blue-50/40 transition-colors flex items-start gap-3.5 cursor-pointer"
          >
            <FileText className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-slate-900">
                3. อัปโหลดหรือเขียนชีทสรุปแบ่งปันฟรี
              </div>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                อัปโหลดไฟล์ PDF เอกสาร รูปภาพ หรือพิมพ์สรุปบทเรียนออนไลน์ให้เพื่อนนักเรียนดาวน์โหลดฟรี
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
