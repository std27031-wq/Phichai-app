import { useState } from 'react';
import { ArrowRight, BookOpen, Lock, ShieldCheck, UserPlus } from 'lucide-react';
import type { StudentProfile } from '../types.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface AuthGateProps {
  demoStudents: StudentProfile[];
  onAuthSuccess: (token: string, student: StudentProfile) => void;
}

export function AuthGate({ demoStudents, onAuthSuccess }: AuthGateProps) {
  const [mode, setMode] = useState<'register' | 'login'>('register');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regCode, setRegCode] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regGrade, setRegGrade] = useState('ม.5/1');
  const [regSchool, setRegSchool] = useState('โรงเรียนพิชัย');
  const [regContact, setRegContact] = useState('');

  // Login fields
  const [loginCode, setLoginCode] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!regName.trim() || !regCode.trim() || regPassword.length < 4) {
      setErrorMsg(
        'กรุณากรอกชื่อ-นามสกุล รหัสนักเรียน/ชื่อผู้ใช้ และรหัสผ่านอย่างน้อย 4 ตัวอักษร'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          studentCode: regCode,
          password: regPassword,
          grade: regGrade,
          school: regSchool,
          contact: regContact,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'ไม่สามารถสมัครใช้งานบัญชีได้');
      onAuthSuccess(body.token as string, body.student as StudentProfile);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!loginCode.trim() || !loginPassword) {
      setErrorMsg('กรุณากรอกรหัสนักเรียน/ชื่อผู้ใช้ และรหัสผ่าน');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentCode: loginCode,
          password: loginPassword,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'เข้าสู่ระบบไม่สำเร็จ');
      onAuthSuccess(body.token as string, body.student as StudentProfile);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (studentId: string) => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoStudentId: studentId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'เข้าสู่ระบบไม่สำเร็จ');
      onAuthSuccess(body.token as string, body.student as StudentProfile);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถเข้าสู่ระบบได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Minimal Single-Row Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <span className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            ปันเรียน
          </span>
          <span className="text-xs text-slate-500 hidden sm:inline">
            กรุณาสมัครใช้งานบัญชีหรือเข้าสู่ระบบก่อนเริ่มใช้งาน
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-stretch">
          {/* Left Editorial Introduction */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
            <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
              <ResilientImage
                src="/src/assets/images/hero_study_exchange_1794906290394.jpg"
                alt="โต๊ะอ่านหนังสือในห้องสมุดพร้อมหนังสือเรียนและชีทสรุป"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-6 sm:p-8 space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <p className="text-xs font-medium text-blue-700">
                  แพลตฟอร์มส่งต่อและแลกเปลี่ยนทรัพยากรทางการศึกษา
                </p>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 text-balance leading-snug">
                  สมัครใช้งานบัญชีนักเรียน เพื่อซื้อ-ขาย ยืมหนังสือ และดาวน์โหลดชีทสรุป
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed">
                  การยืนยันตัวตนด้วยบัญชีนักเรียนช่วยให้การส่งต่อหนังสือ การแชทนัดรับและชำระเงินปลายทางที่โรงเรียน รวมถึงการติดตามกำหนดคืนเป็นไปอย่างน่าเชื่อถือ
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-xs">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">01. ตลาดหนังสือ</div>
                  <p className="text-slate-500">ประเมินราคาตามสภาพ แชทนัดรับที่ รร. และชำระปลายทาง</p>
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">02. ยืม-แลกเปลี่ยน</div>
                  <p className="text-slate-500">บันทึกผู้ยืม-ผู้ให้ยืม พร้อมติดตามวันส่งคืนอัตโนมัติ</p>
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">03. คลังความรู้ฟรี</div>
                  <p className="text-slate-500">โพสต์และดาวน์โหลดชีทสรุปหรือไฟล์ความรู้เก็บไว้ได้ทันที</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Auth Card */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              {/* Segmented Switch */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                  }}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>สมัครใช้งานบัญชี</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                  }}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>เข้าสู่ระบบ</span>
                </button>
              </div>

              {mode === 'register' ? (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      ชื่อ-นามสกุลนักเรียน *
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="เช่น กานต์ธิดา มั่งมี"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        รหัสนักเรียน / ชื่อผู้ใช้ *
                      </label>
                      <input
                        type="text"
                        required
                        value={regCode}
                        onChange={(e) => setRegCode(e.target.value)}
                        placeholder="เช่น std27501"
                        className="w-full px-3.5 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        รหัสผ่าน (อย่างน้อย 4 ตัวอักษร) *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={4}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="กำหนดรหัสผ่าน"
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        ระดับชั้น / ห้อง *
                      </label>
                      <input
                        type="text"
                        required
                        value={regGrade}
                        onChange={(e) => setRegGrade(e.target.value)}
                        placeholder="เช่น ม.5/2"
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        โรงเรียน *
                      </label>
                      <input
                        type="text"
                        required
                        value={regSchool}
                        onChange={(e) => setRegSchool(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      ช่องทางติดต่อ (ห้องเรียน / Line / เบอร์โทร)
                    </label>
                    <input
                      type="text"
                      value={regContact}
                      onChange={(e) => setRegContact(e.target.value)}
                      placeholder="เช่น ห้อง 502 · Line: kanthida.s"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {errorMsg && <p className="text-xs text-red-700 font-medium">{errorMsg}</p>}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <span>{isSubmitting ? 'กำลังสร้างบัญชี...' : 'สมัครใช้งานและเข้าสู่ระบบ'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      รหัสนักเรียน / ชื่อผู้ใช้ *
                    </label>
                    <input
                      type="text"
                      required
                      value={loginCode}
                      onChange={(e) => setLoginCode(e.target.value)}
                      placeholder="เช่น std27031"
                      className="w-full px-3.5 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      รหัสผ่าน *
                    </label>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="รหัสผ่านบัญชีของคุณ (บัญชีตัวอย่างใช้ 1234)"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {errorMsg && <p className="text-xs text-red-700 font-medium">{errorMsg}</p>}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <span>{isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

            {/* Quick Demo Accounts for Easy Two-Sided Testing */}
            {demoStudents.length > 0 && (
              <div className="pt-4 border-t border-slate-200 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>หรือเข้าสู่ระบบด่วนด้วยบัญชีนักเรียนตัวอย่าง (รหัสผ่าน: 1234):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {demoStudents.slice(0, 3).map((stu) => (
                    <button
                      key={stu.id}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleDemoLogin(stu.id)}
                      className="text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {stu.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono-tabular truncate">
                        {stu.studentCode} · {stu.grade}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-xs text-slate-500">
          <div className="inline-flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-blue-700" />
            <span>ปันเรียน — ระบบส่งต่อและแลกเปลี่ยนทรัพยากรทางการศึกษา</span>
          </div>
          <span>ชำระเงินปลายทางที่โรงเรียนอย่างปลอดภัย</span>
        </div>
      </footer>
    </div>
  );
}
