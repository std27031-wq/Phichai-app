import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import type {
  AppBootstrapData,
  ConditionEvaluationInput,
  KnowledgeResource,
  LendingBook,
  LendingTransaction,
  MarketItem,
  MarketOrder,
  OrderChatMessage,
  SellerNotification,
  StudentProfile,
} from './src/types.ts';
import { evaluateResourcePrice } from './src/utils/priceEvaluator.ts';

interface PersistedStore extends AppBootstrapData {
  credentials?: Record<string, string>;
  sessions?: Record<string, string>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, expectedHex] = stored.split(':');
  if (!salt || !expectedHex) return false;
  const actualBuf = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function sanitizeBootstrap(store: PersistedStore): AppBootstrapData {
  return {
    marketItems: store.marketItems,
    orders: store.orders,
    sellerNotifications: store.sellerNotifications,
    orderMessages: store.orderMessages,
    lendingBooks: store.lendingBooks,
    lendingTransactions: store.lendingTransactions,
    knowledgeResources: store.knowledgeResources,
    students: store.students,
  };
}

function ensureStorageDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function addDaysIso(baseIsoDate: string, days: number): string {
  const dt = new Date(`${baseIsoDate}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildSeedData(): AppBootstrapData {
  const today = getTodayIso();

  const students: StudentProfile[] = [
    {
      id: 'stu-1',
      name: 'ปภาวิน พิชัยรักษ์',
      studentCode: 'std27031',
      grade: 'ม.5/2',
      school: 'โรงเรียนพิชัย',
      contact: 'ห้อง 502 · Line: papawin.stu',
    },
    {
      id: 'stu-2',
      name: 'ณัฐธิดา วงศ์สุวรรณ',
      studentCode: 'std26418',
      grade: 'ม.6/1',
      school: 'โรงเรียนพิชัย',
      contact: 'ห้อง 601 · Line: natthida.w',
    },
    {
      id: 'stu-3',
      name: 'ธนกฤต ศรีสวัสดิ์',
      studentCode: 'std28105',
      grade: 'ม.4/3',
      school: 'โรงเรียนพิชัย',
      contact: 'ห้อง 403 · Line: thanakrit.s',
    },
  ];

  const evalInput1: ConditionEvaluationInput = {
    originalPrice: 280,
    physicalCondition: 'good',
    markingLevel: 'light',
    usageAgeYears: '1to2',
    hasCompleteness: true,
    kind: 'หนังสือเสริมความรู้',
  };
  const evalInput2: ConditionEvaluationInput = {
    originalPrice: 320,
    physicalCondition: 'excellent',
    markingLevel: 'none',
    usageAgeYears: 'under1',
    hasCompleteness: true,
    kind: 'หนังสือเรียน',
  };
  const evalInput3: ConditionEvaluationInput = {
    originalPrice: 240,
    physicalCondition: 'good',
    markingLevel: 'moderate',
    usageAgeYears: '1to2',
    hasCompleteness: true,
    kind: 'หนังสือเสริมความรู้',
  };
  const evalInput4: ConditionEvaluationInput = {
    originalPrice: 120,
    physicalCondition: 'excellent',
    markingLevel: 'none',
    usageAgeYears: 'under1',
    hasCompleteness: true,
    kind: 'ชีทสรุป',
  };

  const marketItems: MarketItem[] = [
    {
      id: 'mkt-101',
      title: 'คัมภีร์คณิตศาสตร์ ม.ปลาย & แคลคูลัสเบื้องต้น',
      authorOrPublisher: 'อ.จักรินทร์ วรรณโพธิ์กลาง',
      subject: 'คณิตศาสตร์',
      level: 'ม.ปลาย',
      kind: 'หนังสือเสริมความรู้',
      description:
        'สรุปเนื้อหาฟังก์ชัน ตรีโกณมิติ และแคลคูลัส พร้อมโจทย์แยกบทและเฉลยละเอียดครบทุกข้อ มีไฮไลท์บทลิมิตเล็กน้อย กระดาษสะอาดอ่านง่าย',
      imageUrl: '/src/assets/images/book_math_calculus_1794906289445.jpg',
      originalPrice: 280,
      sellingPrice: evaluateResourcePrice(evalInput1).suggestedPrice,
      evaluation: evaluateResourcePrice(evalInput1),
      evaluationInput: evalInput1,
      sellerId: 'stu-2',
      sellerName: 'ณัฐธิดา วงศ์สุวรรณ',
      sellerSchool: 'โรงเรียนพิชัย (ม.6/1)',
      sellerContact: 'ห้อง 601 · Line: natthida.w',
      status: 'available',
      createdAt: addDaysIso(today, -4),
    },
    {
      id: 'mkt-102',
      title: 'ฟิสิกส์กลศาสตร์ ไฟฟ้า และคลื่น ฉบับเตรียมสอบ A-Level',
      authorOrPublisher: 'สถาบันกวดวิชาฟิสิกส์ประยุกต์',
      subject: 'ฟิสิกส์',
      level: 'เตรียมสอบเข้ามหาวิทยาลัย',
      kind: 'หนังสือเรียน',
      description:
        'สภาพใหม่มาก ไม่มีรอยขีดเขียนในแบบฝึกหัด มีภาพประกอบเวกเตอร์และวงจรไฟฟ้าชัดเจน เหมาะสำหรับน้อง ม.5–ม.6 เตรียมสอบเข้า',
      imageUrl: '/src/assets/images/book_science_physics_1794906290811.jpg',
      originalPrice: 320,
      sellingPrice: evaluateResourcePrice(evalInput2).suggestedPrice,
      evaluation: evaluateResourcePrice(evalInput2),
      evaluationInput: evalInput2,
      sellerId: 'stu-2',
      sellerName: 'ณัฐธิดา วงศ์สุวรรณ',
      sellerSchool: 'โรงเรียนพิชัย (ม.6/1)',
      sellerContact: 'ห้อง 601 · Line: natthida.w',
      status: 'available',
      createdAt: addDaysIso(today, -3),
    },
    {
      id: 'mkt-103',
      title: 'English Reading & Vocabulary Workbook (B1–B2)',
      authorOrPublisher: 'ELT Academic Press',
      subject: 'ภาษาอังกฤษ',
      level: 'ม.ปลาย',
      kind: 'หนังสือเสริมความรู้',
      description:
        'แบบฝึกหัดคำศัพท์และบทความภาษาอังกฤษ ระดับ B1+ ติดแถบคั่นหน้าแบ่งหมวดหมู่ไว้เรียบร้อย มีจดคำแปลดินสอประมาณ 20%',
      imageUrl: '/src/assets/images/book_english_vocab_1794906291129.jpg',
      originalPrice: 240,
      sellingPrice: evaluateResourcePrice(evalInput3).suggestedPrice,
      evaluation: evaluateResourcePrice(evalInput3),
      evaluationInput: evalInput3,
      sellerId: 'stu-3',
      sellerName: 'ธนกฤต ศรีสวัสดิ์',
      sellerSchool: 'โรงเรียนพิชัย (ม.4/3)',
      sellerContact: 'ห้อง 403 · Line: thanakrit.s',
      status: 'available',
      createdAt: addDaysIso(today, -2),
    },
    {
      id: 'mkt-104',
      title: 'ชุดชีทสรุปชีววิทยา: โครงสร้างเซลล์และการสังเคราะห์ด้วยแสง (พิมพ์สี)',
      authorOrPublisher: 'ชมรมติวเพื่อน้อง ม.6',
      subject: 'ชีววิทยา',
      level: 'ม.ปลาย',
      kind: 'ชีทสรุป',
      description:
        'ชีทสรุปเข้าเล่มพิมพ์สี 36 หน้า ภาพวาดออร์แกเนลล์และการแบ่งเซลล์ Mitosis/Meiosis อ่านทบทวนก่อนสอบปลายภาคได้ทันที',
      imageUrl: '/src/assets/images/notes_biology_summary_1794906291530.jpg',
      originalPrice: 120,
      sellingPrice: evaluateResourcePrice(evalInput4).suggestedPrice,
      evaluation: evaluateResourcePrice(evalInput4),
      evaluationInput: evalInput4,
      sellerId: 'stu-2',
      sellerName: 'ณัฐธิดา วงศ์สุวรรณ',
      sellerSchool: 'โรงเรียนพิชัย (ม.6/1)',
      sellerContact: 'ห้อง 601 · Line: natthida.w',
      status: 'available',
      createdAt: addDaysIso(today, -1),
    },
  ];

  const lendingBooks: LendingBook[] = [
    {
      id: 'lend-201',
      title: 'ตะลุยโจทย์คณิตศาสตร์ ระดับ ม.ต้น–ม.ปลาย (เล่ม 1)',
      subject: 'คณิตศาสตร์',
      level: 'ม.ต้น',
      description:
        'เปิดให้น้อง ๆ ยืมไปฝึกทำโจทย์ฟรี (ขอความกรุณาใช้ดินสอหรือเขียนลงสมุดทดแทน) หรือแลกกับหนังสือวิทยาศาสตร์ ม.ปลาย',
      conditionLabel: 'สภาพดีมาก (90%)',
      imageUrl: '/src/assets/images/book_math_calculus_1794906289445.jpg',
      mode: 'both',
      preferredExchangeTopic: 'หนังสือเคมี หรือ ชีววิทยา ม.5',
      maxLoanDays: 14,
      ownerId: 'stu-2',
      ownerName: 'ณัฐธิดา วงศ์สุวรรณ',
      ownerGrade: 'ม.6/1',
      ownerSchool: 'โรงเรียนพิชัย',
      ownerContact: 'ห้อง 601 · Line: natthida.w',
      availability: 'available',
      createdAt: addDaysIso(today, -10),
    },
    {
      id: 'lend-202',
      title: 'ฟิสิกส์พื้นฐาน: กลศาสตร์และไฟฟ้ากระแสตรง',
      subject: 'ฟิสิกส์',
      level: 'ม.ปลาย',
      description:
        'หนังสืออ้างอิงพร้อมตัวอย่างโจทย์และแผนภาพวงจรไฟฟ้า ให้ยืมอ่านเตรียมสอบกลางภาคสูงสุด 30 วัน',
      conditionLabel: 'สภาพดีเยี่ยม (95%)',
      imageUrl: '/src/assets/images/book_science_physics_1794906290811.jpg',
      mode: 'lend',
      maxLoanDays: 30,
      ownerId: 'stu-1',
      ownerName: 'ปภาวิน พิชัยรักษ์',
      ownerGrade: 'ม.5/2',
      ownerSchool: 'โรงเรียนพิชัย',
      ownerContact: 'ห้อง 502 · Line: papawin.stu',
      availability: 'lent_out',
      createdAt: addDaysIso(today, -18),
    },
    {
      id: 'lend-203',
      title: 'คู่มือคำศัพท์และไวยากรณ์ภาษาอังกฤษเตรียมสอบ TGAT',
      subject: 'ภาษาอังกฤษ',
      level: 'เตรียมสอบเข้ามหาวิทยาลัย',
      description:
        'อยากแลกเปลี่ยนอ่านกับหนังสือสังคมศึกษา หรือภาษาไทยเตรียมสอบ A-Level เป็นระยะเวลา 30 วัน',
      conditionLabel: 'สภาพดี (82%)',
      imageUrl: '/src/assets/images/book_english_vocab_1794906291129.jpg',
      mode: 'exchange',
      preferredExchangeTopic: 'สังคมศึกษา หรือ ภาษาไทย A-Level',
      maxLoanDays: 30,
      ownerId: 'stu-3',
      ownerName: 'ธนกฤต ศรีสวัสดิ์',
      ownerGrade: 'ม.4/3',
      ownerSchool: 'โรงเรียนพิชัย',
      ownerContact: 'ห้อง 403 · Line: thanakrit.s',
      availability: 'available',
      createdAt: addDaysIso(today, -6),
    },
  ];

  const lendingTransactions: LendingTransaction[] = [
    {
      id: 'tx-301',
      bookId: 'lend-202',
      bookTitle: 'ฟิสิกส์พื้นฐาน: กลศาสตร์และไฟฟ้ากระแสตรง',
      transactionType: 'borrow',
      lenderId: 'stu-1',
      lenderName: 'ปภาวิน พิชัยรักษ์',
      lenderContact: 'ห้อง 502 · Line: papawin.stu',
      borrowerId: 'stu-3',
      borrowerName: 'ธนกฤต ศรีสวัสดิ์',
      borrowerGrade: 'ม.4/3',
      borrowerContact: 'ห้อง 403 · Line: thanakrit.s',
      loanDays: 14,
      startDate: addDaysIso(today, -9),
      dueDate: addDaysIso(today, 5),
      status: 'active',
      notes: 'ยืมทบทวนบทเรื่องแรงและการเคลื่อนที่แนวตรง',
      createdAt: addDaysIso(today, -9),
    },
    {
      id: 'tx-302',
      bookId: 'lend-201',
      bookTitle: 'เคมีอินทรีย์และการคำนวณปริมาณสารสัมพันธ์ (เล่มสรุป)',
      transactionType: 'borrow',
      lenderId: 'stu-2',
      lenderName: 'ณัฐธิดา วงศ์สุวรรณ',
      lenderContact: 'ห้อง 601 · Line: natthida.w',
      borrowerId: 'stu-1',
      borrowerName: 'ปภาวิน พิชัยรักษ์',
      borrowerGrade: 'ม.5/2',
      borrowerContact: 'ห้อง 502 · Line: papawin.stu',
      loanDays: 7,
      startDate: addDaysIso(today, -10),
      dueDate: addDaysIso(today, -3),
      status: 'overdue',
      notes: 'ขอยืมอ่านก่อนสอบเก็บคะแนนเคมี',
      createdAt: addDaysIso(today, -10),
    },
  ];

  const knowledgeResources: KnowledgeResource[] = [
    {
      id: 'kn-401',
      title: 'สรุปโครงสร้างเซลล์พืช-เซลล์สัตว์ และกระบวนการแบ่งเซลล์',
      subject: 'ชีววิทยา',
      level: 'ม.ปลาย',
      format: 'Markdown/Note',
      summary:
        'สรุปหน้าที่ของออร์แกเนลล์สำคัญ (Nucleus, Mitochondria, Chloroplast, Golgi Body) เปรียบเทียบ Mitosis กับ Meiosis และสมการสังเคราะห์ด้วยแสงแบบเข้าใจง่าย',
      contentBody: `# สรุปชีววิทยา ม.ปลาย: โครงสร้างเซลล์และการแบ่งเซลล์

## 1. ออร์แกเนลล์สำคัญที่ออกสอบบ่อย
- **Nucleus (นิวเคลียส)**: ศูนย์ควบคุมการทำงานของเซลล์และเก็บสารพันธุกรรม (DNA)
- **Mitochondria (ไมโทคอนเดรีย)**: แหล่งสร้างพลังงาน ATP ผ่านการหายใจระดับเซลล์ (มีเยื่อหุ้ม 2 ชั้น)
- **Ribosome (ไรโบโซม)**: สังเคราะห์โปรตีน (ไม่มีเยื่อหุ้ม พบได้ทั้งโปรคาริโอตและยูคาริโอต)
- **Chloroplast (คลอโรพลาสต์)**: พบในเซลล์พืชและสาหร่าย ทำหน้าที่สังเคราะห์ด้วยแสง
- **Golgi Apparatus (กอลจิบอดี)**: บรรจุและดัดแปลงโปรตีนเพื่อส่งออกนอกเซลล์

## 2. เปรียบเทียบการแบ่งเซลล์
| หัวข้อ | Mitosis | Meiosis |
|---|---|---|
| จุดประสงค์ | เพิ่มจำนวนเซลล์ร่างกาย / ซ่อมแซม | สร้างเซลล์สืบพันธุ์ |
| จำนวนเซลล์ลูก | 2 เซลล์ (2n -> 2n) | 4 เซลล์ (2n -> n) |
| Crossing Over | ไม่เกิด | เกิดในระยะ Prophase I |

## 3. สมการการสังเคราะห์ด้วยแสง
6CO2 + 12H2O --(แสง + คลอโรฟิลล์)--> C6H12O6 + 6O2 + 6H2O
`,
      fileName: 'biology-cell-mitosis-summary.md',
      fileSizeLabel: '4.2 KB · Markdown',
      imageUrl: '/src/assets/images/notes_biology_summary_1794906291530.jpg',
      authorId: 'stu-2',
      authorName: 'ณัฐธิดา วงศ์สุวรรณ',
      authorGrade: 'ม.6/1',
      authorSchool: 'โรงเรียนพิชัย',
      downloads: 48,
      helpfulCount: 31,
      createdAt: addDaysIso(today, -7),
    },
    {
      id: 'kn-402',
      title: 'รวมสูตรแคลคูลัสเบื้องต้น: ลิมิต อนุพันธ์ และอินทิกรัล ม.6',
      subject: 'คณิตศาสตร์',
      level: 'ม.ปลาย',
      format: 'Markdown/Note',
      summary:
        'แผ่นสรุปสูตรลัดการหาลิมิต กฎลูกโซ่ของอนุพันธ์ ค่าสูงสุด-ต่ำสุดสัมพัทธ์ และสูตรอินทิกรัลไม่จำกัดเขตสำหรับทบทวนโค้งสุดท้าย',
      contentBody: `# รวมสูตรแคลคูลัสเบื้องต้น ม.6

## 1. การหาลิมิต (Limits)
- หากแทนค่าแล้วได้ 0/0 ให้แยกตัวประกอบ, คูณคอนจูเกต หรือใช้กฎของโลปิตาล (L'Hopital's Rule)
- lim (x -> a) [f(x) / g(x)] = lim (x -> a) [f'(x) / g'(x)] เมื่อได้รูป 0/0 หรือ inf/inf

## 2. สูตรอนุพันธ์ (Derivatives)
- d/dx (c) = 0
- d/dx (x^n) = n * x^(n-1)
- กฎผลคูณ: (uv)' = u'v + uv'
- กฎผลหาร: (u/v)' = (u'v - uv') / v^2
- กฎลูกโซ่: dy/dx = (dy/du) * (du/dx)

## 3. ปริพันธ์ (Integration)
- int (x^n) dx = x^(n+1) / (n+1) + C  (เมื่อ n != -1)
- พื้นที่ปิดล้อมด้วยเส้นโค้ง f(x) จาก a ถึง b = int_a^b f(x) dx
`,
      fileName: 'math-calculus-formulas.md',
      fileSizeLabel: '3.6 KB · Markdown',
      imageUrl: '/src/assets/images/book_math_calculus_1794906289445.jpg',
      authorId: 'stu-1',
      authorName: 'ปภาวิน พิชัยรักษ์',
      authorGrade: 'ม.5/2',
      authorSchool: 'โรงเรียนพิชัย',
      downloads: 64,
      helpfulCount: 42,
      createdAt: addDaysIso(today, -5),
    },
    {
      id: 'kn-403',
      title: 'สรุปสมการการเคลื่อนที่ กฎของนิวตัน และวงจรไฟฟ้ากระแสตรง',
      subject: 'ฟิสิกส์',
      level: 'ม.ปลาย',
      format: 'Markdown/Note',
      summary:
        'สรุป 5 สูตรสุวัฒน์ (SUVAT) การแตกแรง Free Body Diagram บนพื้นเอียง และวิธีคิดความต้านทานรวมแบบอนุกรม-ขนาน',
      contentBody: `# สรุปฟิสิกส์: กลศาสตร์ & ไฟฟ้ากระแสตรง

## 1. 5 สูตรการเคลื่อนที่แนวตรง (ความเร่งคงที่)
1. v = u + at
2. s = ((u + v) / 2) * t
3. s = ut + (1/2)at^2
4. s = vt - (1/2)at^2
5. v^2 = u^2 + 2as

## 2. กฎการเคลื่อนที่ของนิวตัน
- กฎข้อที่ 1: Sigma F = 0 (วัตถุหยุดนิ่งหรือเคลื่อนที่ด้วยความเร็วคงที่)
- กฎข้อที่ 2: Sigma F = ma
- แรงเสียดทาน: f = mu * N

## 3. กฎของโอห์มและวงจรไฟฟ้า
- V = IR
- ต่ออนุกรม: R_รวม = R1 + R2 + ... (กระแส I เท่ากัน)
- ต่อขนาน: 1/R_รวม = 1/R1 + 1/R2 + ... (ความต่างศักย์ V เท่ากัน)
`,
      fileName: 'physics-mechanics-circuits.md',
      fileSizeLabel: '3.1 KB · Markdown',
      imageUrl: '/src/assets/images/book_science_physics_1794906290811.jpg',
      authorId: 'stu-1',
      authorName: 'ปภาวิน พิชัยรักษ์',
      authorGrade: 'ม.5/2',
      authorSchool: 'โรงเรียนพิชัย',
      downloads: 39,
      helpfulCount: 27,
      createdAt: addDaysIso(today, -2),
    },
  ];

  const orders: MarketOrder[] = [];
  const sellerNotifications: SellerNotification[] = [];
  const orderMessages: OrderChatMessage[] = [];
  const credentials: Record<string, string> = {
    'stu-1': hashPassword('1234'),
    'stu-2': hashPassword('1234'),
    'stu-3': hashPassword('1234'),
  };
  const sessions: Record<string, string> = {};

  return {
    marketItems,
    orders,
    sellerNotifications,
    orderMessages,
    lendingBooks,
    lendingTransactions,
    knowledgeResources,
    students,
    credentials,
    sessions,
  } as PersistedStore;
}

function loadStore(): PersistedStore {
  ensureStorageDirs();
  if (!fs.existsSync(STORE_PATH)) {
    const seeded = buildSeedData() as PersistedStore;
    fs.writeFileSync(STORE_PATH, JSON.stringify(seeded, null, 2), 'utf8');
    return seeded;
  }
  const raw = fs.readFileSync(STORE_PATH, 'utf8');
  const data = JSON.parse(raw) as PersistedStore;
  let mutated = false;

  if (!Array.isArray(data.sellerNotifications)) {
    data.sellerNotifications = [];
    mutated = true;
  }
  if (!Array.isArray(data.orderMessages)) {
    data.orderMessages = [];
    mutated = true;
  }
  if (!data.credentials) {
    data.credentials = {};
    for (const s of data.students) {
      data.credentials[s.id] = hashPassword('1234');
    }
    mutated = true;
  }
  if (!data.sessions) {
    data.sessions = {};
    mutated = true;
  }

  // Auto-sync overdue status based on today's date
  const today = getTodayIso();
  for (const tx of data.lendingTransactions) {
    if (tx.status === 'active' && tx.dueDate < today) {
      tx.status = 'overdue';
      mutated = true;
    }
  }
  if (mutated) {
    saveStore(data);
  }
  return data;
}

function saveStore(data: PersistedStore) {
  ensureStorageDirs();
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, STORE_PATH);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = (request.url || '').split('?')[0];
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  const broadcastWs = (payload: unknown) => {
    const encoded = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(encoded);
      }
    }
  };

  app.get('/api/bootstrap', (_req, res) => {
    const store = loadStore();
    res.json(sanitizeBootstrap(store));
  });

  // Auth: Register new student account
  app.post('/api/auth/register', (req, res) => {
    const store = loadStore();
    const body = req.body as {
      name: string;
      studentCode: string;
      password: string;
      grade: string;
      school: string;
      contact: string;
    };

    const cleanName = body.name?.trim();
    const cleanCode = body.studentCode?.trim().toLowerCase();
    const password = body.password || '';

    if (!cleanName || !cleanCode || password.length < 4) {
      res.status(400).json({
        error: 'กรุณากรอกชื่อ-นามสกุล ชื่อผู้ใช้/รหัสนักเรียน และรหัสผ่านอย่างน้อย 4 ตัวอักษร',
      });
      return;
    }

    const exists = store.students.some(
      (s) => s.studentCode.toLowerCase() === cleanCode
    );
    if (exists) {
      res.status(409).json({
        error: 'รหัสนักเรียนหรือชื่อผู้ใช้นี้ถูกสมัครใช้งานแล้ว กรุณาเข้าสู่ระบบหรือใช้ชื่ออื่น',
      });
      return;
    }

    const newStudent: StudentProfile = {
      id: `stu-${Date.now()}`,
      name: cleanName,
      studentCode: body.studentCode.trim(),
      grade: body.grade?.trim() || 'ม.5',
      school: body.school?.trim() || 'โรงเรียนพิชัย',
      contact: body.contact?.trim() || 'ติดต่อผ่านแชทในระบบปันเรียน',
    };

    store.students.push(newStudent);
    store.credentials = store.credentials || {};
    store.credentials[newStudent.id] = hashPassword(password);

    const token = crypto.randomBytes(24).toString('hex');
    store.sessions = store.sessions || {};
    store.sessions[token] = newStudent.id;

    saveStore(store);
    res.status(201).json({ token, student: newStudent });
  });

  // Auth: Sign in
  app.post('/api/auth/login', (req, res) => {
    const store = loadStore();
    const body = req.body as {
      studentCode?: string;
      password?: string;
      demoStudentId?: string;
    };

    let targetStudent: StudentProfile | undefined;

    if (body.demoStudentId) {
      targetStudent = store.students.find((s) => s.id === body.demoStudentId);
      if (!targetStudent) {
        res.status(404).json({ error: 'ไม่พบบัญชีตัวอย่างที่เลือก' });
        return;
      }
    } else {
      const code = body.studentCode?.trim().toLowerCase();
      const password = body.password || '';
      if (!code || !password) {
        res.status(400).json({ error: 'กรุณากรอกรหัสนักเรียน/ชื่อผู้ใช้ และรหัสผ่าน' });
        return;
      }
      targetStudent = store.students.find(
        (s) => s.studentCode.toLowerCase() === code
      );
      const storedHash = targetStudent ? store.credentials?.[targetStudent.id] : undefined;
      if (!targetStudent || !storedHash || !verifyPassword(password, storedHash)) {
        res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        return;
      }
    }

    const token = crypto.randomBytes(24).toString('hex');
    store.sessions = store.sessions || {};
    store.sessions[token] = targetStudent.id;
    saveStore(store);

    res.json({ token, student: targetStudent });
  });

  // Auth: Current session
  app.get('/api/auth/me', (req, res) => {
    const store = loadStore();
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const studentId = token ? store.sessions?.[token] : undefined;
    const student = studentId ? store.students.find((s) => s.id === studentId) : undefined;
    if (!student) {
      res.status(401).json({ error: 'ยังไม่ได้เข้าสู่ระบบ' });
      return;
    }
    res.json({ student });
  });

  // Auth: Logout
  app.post('/api/auth/logout', (req, res) => {
    const store = loadStore();
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (token && store.sessions?.[token]) {
      delete store.sessions[token];
      saveStore(store);
    }
    res.json({ ok: true });
  });

  // System 1: Create Market Item with Price Evaluation
  app.post('/api/market/items', (req, res) => {
    const store = loadStore();
    const body = req.body as {
      title: string;
      authorOrPublisher: string;
      subject: MarketItem['subject'];
      level: MarketItem['level'];
      kind: MarketItem['kind'];
      description: string;
      imageUrl?: string;
      sellingPrice: number;
      evaluationInput: ConditionEvaluationInput;
      sellerId: string;
      sellerName: string;
      sellerSchool: string;
      sellerContact: string;
    };

    if (!body.title?.trim() || !body.evaluationInput?.originalPrice) {
      res.status(400).json({ error: 'กรุณากรอกชื่อหนังสือและราคาปกเดิมให้ครบถ้วน' });
      return;
    }

    const evaluation = evaluateResourcePrice(body.evaluationInput);
    const defaultImageBySubject: Record<string, string> = {
      คณิตศาสตร์: '/src/assets/images/book_math_calculus_1794906289445.jpg',
      ฟิสิกส์: '/src/assets/images/book_science_physics_1794906290811.jpg',
      วิทยาศาสตร์: '/src/assets/images/book_science_physics_1794906290811.jpg',
      เคมี: '/src/assets/images/book_science_physics_1794906290811.jpg',
      ชีววิทยา: '/src/assets/images/notes_biology_summary_1794906291530.jpg',
      ภาษาอังกฤษ: '/src/assets/images/book_english_vocab_1794906291129.jpg',
    };

    const newItem: MarketItem = {
      id: `mkt-${Date.now()}`,
      title: body.title.trim(),
      authorOrPublisher: body.authorOrPublisher?.trim() || 'สื่อการเรียนรู้โดยนักเรียน',
      subject: body.subject,
      level: body.level,
      kind: body.kind,
      description: body.description?.trim() || 'สภาพพร้อมใช้งานต่อ',
      imageUrl:
        body.imageUrl?.trim() ||
        defaultImageBySubject[body.subject] ||
        '/src/assets/images/book_math_calculus_1794906289445.jpg',
      originalPrice: Number(body.evaluationInput.originalPrice),
      sellingPrice: Math.max(5, Math.round(Number(body.sellingPrice) || evaluation.suggestedPrice)),
      evaluation,
      evaluationInput: body.evaluationInput,
      sellerId: body.sellerId,
      sellerName: body.sellerName,
      sellerSchool: body.sellerSchool,
      sellerContact: body.sellerContact,
      status: 'available',
      createdAt: getTodayIso(),
    };

    store.marketItems.unshift(newItem);
    saveStore(store);
    res.status(201).json(newItem);
  });

  // System 1: Purchase Order Checkout + Dispatch Order Info to Sellers
  app.post('/api/market/orders', (req, res) => {
    const store = loadStore();
    const body = req.body as {
      itemIds: string[];
      buyerId?: string;
      buyerName: string;
      buyerContact: string;
      deliveryMethod: 'pickup' | 'parcel';
      deliveryNote: string;
    };

    if (!body.itemIds?.length || !body.buyerName?.trim() || !body.buyerContact?.trim()) {
      res.status(400).json({ error: 'กรุณาเลือกรายการและกรอกข้อมูลผู้รับให้ครบถ้วน' });
      return;
    }

    const selectedItems = store.marketItems.filter(
      (item) => body.itemIds.includes(item.id) && item.status === 'available'
    );

    if (selectedItems.length === 0) {
      res.status(400).json({ error: 'รายการที่เลือกถูกสั่งซื้อไปแล้วหรือไม่พบในระบบ' });
      return;
    }

    const nowIso = getTodayIso();
    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    let totalAmount = 0;
    let totalOriginal = 0;
    const createdNotifications: SellerNotification[] = [];

    for (const item of selectedItems) {
      item.status = 'sold';
      item.buyerName = body.buyerName.trim();
      item.soldAt = nowIso;
      totalAmount += item.sellingPrice;
      totalOriginal += item.originalPrice;

      const notification: SellerNotification = {
        id: `sn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        orderId,
        itemId: item.id,
        itemTitle: item.title,
        sellingPrice: item.sellingPrice,
        originalPrice: item.originalPrice,
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        sellerContact: item.sellerContact,
        buyerId: body.buyerId?.trim() || 'guest',
        buyerName: body.buyerName.trim(),
        buyerContact: body.buyerContact.trim(),
        deliveryMethod: body.deliveryMethod,
        paymentMethod: 'cod_school',
        paymentStatus: 'pending_cod',
        meetupLocation: body.deliveryNote?.trim() || '',
        deliveryNote: body.deliveryNote?.trim() || '',
        status: 'new',
        isRead: false,
        createdAt: nowIso,
      };
      store.sellerNotifications.unshift(notification);
      createdNotifications.push(notification);

      const sysMsg: OrderChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        notificationId: notification.id,
        orderId,
        senderId: 'system',
        senderName: 'ระบบปันเรียน',
        senderRole: 'system',
        text: `ส่งคำสั่งซื้อ "${item.title}" ราคา ฿${item.sellingPrice} (ชำระเงินปลายทางที่โรงเรียน) จาก ${body.buyerName.trim()} ไปยัง ${item.sellerName} แล้ว กรุณาแชทเพื่อนัดสถานที่ส่งมอบหนังสือในโรงเรียน`,
        createdAt: new Date().toISOString(),
      };
      store.orderMessages.push(sysMsg);
    }

    const order: MarketOrder = {
      id: orderId,
      itemIds: selectedItems.map((i) => i.id),
      itemsSummary: selectedItems.map((i) => ({
        id: i.id,
        title: i.title,
        price: i.sellingPrice,
        originalPrice: i.originalPrice,
        sellerId: i.sellerId,
        sellerName: i.sellerName,
        sellerContact: i.sellerContact,
      })),
      totalAmount,
      totalSaved: Math.max(0, totalOriginal - totalAmount),
      buyerId: body.buyerId?.trim() || 'guest',
      buyerName: body.buyerName.trim(),
      buyerContact: body.buyerContact.trim(),
      deliveryMethod: body.deliveryMethod,
      paymentMethod: 'cod_school',
      deliveryNote: body.deliveryNote?.trim() || '',
      createdAt: nowIso,
    };

    store.orders.unshift(order);
    saveStore(store);
    broadcastWs({
      type: 'order:created',
      order,
      sellerNotifications: createdNotifications,
    });
    res.status(201).json({
      order,
      updatedItems: selectedItems,
      sellerNotifications: createdNotifications,
    });
  });

  // System 1: Real-time Chat Message between Buyer & Seller for COD School Meetup
  app.post('/api/market/orders/:notifId/messages', (req, res) => {
    const store = loadStore();
    const notif = store.sellerNotifications.find((n) => n.id === req.params.notifId);
    if (!notif) {
      res.status(404).json({ error: 'ไม่พบห้องสนทนาของคำสั่งซื้อนี้' });
      return;
    }

    const body = req.body as {
      senderId: string;
      senderName: string;
      senderRole: 'buyer' | 'seller';
      text: string;
    };

    if (!body.text?.trim()) {
      res.status(400).json({ error: 'กรุณาพิมพ์ข้อความก่อนส่ง' });
      return;
    }

    const message: OrderChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      notificationId: notif.id,
      orderId: notif.orderId,
      senderId: body.senderId,
      senderName: body.senderName,
      senderRole: body.senderRole,
      text: body.text.trim(),
      createdAt: new Date().toISOString(),
    };

    store.orderMessages.push(message);
    if (notif.status === 'new') {
      notif.status = 'negotiating';
      notif.isRead = true;
      notif.updatedAt = getTodayIso();
    }

    saveStore(store);
    broadcastWs({ type: 'chat:message', message, notification: notif });
    res.status(201).json({ message, notification: notif });
  });

  // System 1: Seller/Buyer updates meetup location or COD completion status
  app.patch('/api/market/seller-notifications/:id', (req, res) => {
    const store = loadStore();
    const notif = store.sellerNotifications.find((n) => n.id === req.params.id);
    if (!notif) {
      res.status(404).json({ error: 'ไม่พบข้อมูลคำสั่งซื้อของผู้ขาย' });
      return;
    }

    const { action, meetupLocation, actorName } = req.body as {
      action: 'acknowledge' | 'set_meetup' | 'complete' | 'mark_read';
      meetupLocation?: string;
      actorName?: string;
    };

    const today = getTodayIso();
    let createdSystemMsg: OrderChatMessage | undefined;

    if (action === 'acknowledge') {
      notif.status = 'negotiating';
      notif.isRead = true;
      notif.updatedAt = today;
    } else if (action === 'set_meetup') {
      if (!meetupLocation?.trim()) {
        res.status(400).json({ error: 'กรุณาระบุสถานที่และเวลานัดรับหนังสือที่โรงเรียน' });
        return;
      }
      notif.meetupLocation = meetupLocation.trim();
      notif.status = 'ready_meetup';
      notif.isRead = true;
      notif.updatedAt = today;

      createdSystemMsg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        notificationId: notif.id,
        orderId: notif.orderId,
        senderId: 'system',
        senderName: actorName || 'ระบบปันเรียน',
        senderRole: 'system',
        text: `ตกลงจุดนัดรับหนังสือที่โรงเรียน: "${notif.meetupLocation}" · ชำระเงินปลายทาง ฿${notif.sellingPrice}`,
        createdAt: new Date().toISOString(),
      };
      store.orderMessages.push(createdSystemMsg);
    } else if (action === 'complete') {
      notif.status = 'completed';
      notif.paymentStatus = 'paid_cod';
      notif.isRead = true;
      notif.updatedAt = today;

      createdSystemMsg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        notificationId: notif.id,
        orderId: notif.orderId,
        senderId: 'system',
        senderName: actorName || notif.sellerName,
        senderRole: 'system',
        text: `ยืนยันการส่งมอบหนังสือ "${notif.itemTitle}" และรับชำระเงินปลายทางที่โรงเรียน (฿${notif.sellingPrice}) เรียบร้อยแล้ว`,
        createdAt: new Date().toISOString(),
      };
      store.orderMessages.push(createdSystemMsg);
    } else if (action === 'mark_read') {
      notif.isRead = true;
      notif.updatedAt = today;
    } else {
      res.status(400).json({ error: 'คำสั่งไม่ถูกต้อง' });
      return;
    }

    saveStore(store);
    broadcastWs({
      type: 'notification:updated',
      notification: notif,
      message: createdSystemMsg,
    });
    res.json({ notification: notif, message: createdSystemMsg });
  });

  // System 2: Add Lending/Exchange Book
  app.post('/api/lending/books', (req, res) => {
    const store = loadStore();
    const body = req.body as {
      title: string;
      subject: LendingBook['subject'];
      level: LendingBook['level'];
      description: string;
      conditionLabel: string;
      mode: LendingBook['mode'];
      preferredExchangeTopic?: string;
      maxLoanDays: number;
      ownerId: string;
      ownerName: string;
      ownerGrade: string;
      ownerSchool: string;
      ownerContact: string;
    };

    if (!body.title?.trim()) {
      res.status(400).json({ error: 'กรุณาระบุชื่อหนังสือที่ต้องการเปิดให้ยืมหรือแลกเปลี่ยน' });
      return;
    }

    const defaultImageBySubject: Record<string, string> = {
      คณิตศาสตร์: '/src/assets/images/book_math_calculus_1794906289445.jpg',
      ฟิสิกส์: '/src/assets/images/book_science_physics_1794906290811.jpg',
      ชีววิทยา: '/src/assets/images/notes_biology_summary_1794906291530.jpg',
      ภาษาอังกฤษ: '/src/assets/images/book_english_vocab_1794906291129.jpg',
    };

    const newBook: LendingBook = {
      id: `lend-${Date.now()}`,
      title: body.title.trim(),
      subject: body.subject,
      level: body.level,
      description: body.description?.trim() || 'เปิดให้เพื่อนนักเรียนยืมหรือแลกเปลี่ยนเรียนรู้',
      conditionLabel: body.conditionLabel || 'สภาพดีมาก (85%)',
      imageUrl:
        defaultImageBySubject[body.subject] ||
        '/src/assets/images/book_math_calculus_1794906289445.jpg',
      mode: body.mode,
      preferredExchangeTopic: body.preferredExchangeTopic?.trim(),
      maxLoanDays: Math.max(3, Math.min(120, Number(body.maxLoanDays) || 14)),
      ownerId: body.ownerId,
      ownerName: body.ownerName,
      ownerGrade: body.ownerGrade,
      ownerSchool: body.ownerSchool,
      ownerContact: body.ownerContact,
      availability: 'available',
      createdAt: getTodayIso(),
    };

    store.lendingBooks.unshift(newBook);
    saveStore(store);
    res.status(201).json(newBook);
  });

  // System 2: Create Borrow / Exchange Transaction with Due Date
  app.post('/api/lending/transactions', (req, res) => {
    const store = loadStore();
    const body = req.body as {
      bookId: string;
      transactionType: 'borrow' | 'exchange';
      borrowerId: string;
      borrowerName: string;
      borrowerGrade: string;
      borrowerContact: string;
      exchangeBookTitle?: string;
      loanDays: number;
      startDate?: string;
      notes?: string;
    };

    const book = store.lendingBooks.find((b) => b.id === body.bookId);
    if (!book) {
      res.status(404).json({ error: 'ไม่พบหนังสือในระบบยืม-แลกเปลี่ยน' });
      return;
    }

    if (book.availability !== 'available') {
      res.status(400).json({ error: 'หนังสือเล่มนี้กำลังถูกยืมหรือแลกเปลี่ยนอยู่ในขณะนี้' });
      return;
    }

    if (!body.borrowerName?.trim() || !body.borrowerContact?.trim()) {
      res.status(400).json({ error: 'กรุณาระบุชื่อและช่องทางติดต่อของผู้ยืมหรือผู้แลกเปลี่ยน' });
      return;
    }

    const startDate = body.startDate || getTodayIso();
    const loanDays = Math.max(1, Math.min(120, Number(body.loanDays) || book.maxLoanDays));
    const dueDate = addDaysIso(startDate, loanDays);

    const newTx: LendingTransaction = {
      id: `tx-${Date.now()}`,
      bookId: book.id,
      bookTitle: book.title,
      transactionType: body.transactionType,
      lenderId: book.ownerId,
      lenderName: book.ownerName,
      lenderContact: book.ownerContact,
      borrowerId: body.borrowerId,
      borrowerName: body.borrowerName.trim(),
      borrowerGrade: body.borrowerGrade?.trim() || 'นักเรียน',
      borrowerContact: body.borrowerContact.trim(),
      exchangeBookTitle:
        body.transactionType === 'exchange' ? body.exchangeBookTitle?.trim() : undefined,
      loanDays,
      startDate,
      dueDate,
      status: 'active',
      notes: body.notes?.trim() || '',
      createdAt: getTodayIso(),
    };

    book.availability = body.transactionType === 'exchange' ? 'exchanged' : 'lent_out';
    if (body.transactionType === 'exchange') {
      newTx.status = 'active';
    }

    store.lendingTransactions.unshift(newTx);
    saveStore(store);
    res.status(201).json({ transaction: newTx, book });
  });

  // System 2: Update Transaction Status (return / extend / complete_exchange / approve)
  app.patch('/api/lending/transactions/:id', (req, res) => {
    const store = loadStore();
    const tx = store.lendingTransactions.find((t) => t.id === req.params.id);
    if (!tx) {
      res.status(404).json({ error: 'ไม่พบประวัติการทำรายการ' });
      return;
    }

    const { action } = req.body as {
      action: 'approve' | 'return' | 'extend' | 'complete_exchange';
    };
    const book = store.lendingBooks.find((b) => b.id === tx.bookId);
    const today = getTodayIso();

    if (action === 'approve') {
      tx.status = tx.dueDate < today ? 'overdue' : 'active';
    } else if (action === 'return') {
      tx.status = 'returned';
      tx.returnedAt = today;
      if (book) book.availability = 'available';
    } else if (action === 'complete_exchange') {
      tx.status = 'exchanged_completed';
      tx.returnedAt = today;
      if (book) book.availability = 'exchanged';
    } else if (action === 'extend') {
      tx.loanDays += 7;
      tx.dueDate = addDaysIso(tx.dueDate, 7);
      tx.status = tx.dueDate < today ? 'overdue' : 'active';
    } else {
      res.status(400).json({ error: 'คำสั่งไม่ถูกต้อง' });
      return;
    }

    saveStore(store);
    res.json({ transaction: tx, book });
  });

  // System 3: Upload / Share Study Sheet or Knowledge File
  app.post('/api/knowledge', (req, res) => {
    const store = loadStore();
    const body = req.body as {
      title: string;
      subject: KnowledgeResource['subject'];
      level: KnowledgeResource['level'];
      format: KnowledgeResource['format'];
      summary: string;
      contentBody?: string;
      fileName?: string;
      fileDataBase64?: string;
      fileSizeBytes?: number;
      authorId: string;
      authorName: string;
      authorGrade: string;
      authorSchool: string;
    };

    if (!body.title?.trim() || !body.summary?.trim()) {
      res.status(400).json({ error: 'กรุณากรอกชื่อเรื่องและคำอธิบายเนื้อหาโดยย่อ' });
      return;
    }

    let storedFileName: string | undefined;
    let fileName = body.fileName?.trim() || `study-sheet-${Date.now()}.md`;
    let fileSizeLabel = '2.0 KB · Markdown';

    if (body.fileDataBase64) {
      const cleanBase64 = body.fileDataBase64.includes(',')
        ? body.fileDataBase64.split(',')[1]
        : body.fileDataBase64;
      const buffer = Buffer.from(cleanBase64, 'base64');
      const safeExt = path.extname(fileName).replace(/[^a-zA-Z0-9.]/g, '') || '.bin';
      storedFileName = `upload-${Date.now()}${safeExt}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, storedFileName), buffer);
      const kb = Math.max(1, Math.round(buffer.byteLength / 1024));
      fileSizeLabel =
        kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB · ${body.format}`;
    } else if (body.contentBody?.trim()) {
      const byteLen = Buffer.byteLength(body.contentBody, 'utf8');
      const kb = (byteLen / 1024).toFixed(1);
      fileSizeLabel = `${kb} KB · Markdown`;
      if (!fileName.endsWith('.md') && !fileName.endsWith('.txt')) {
        fileName = `${fileName}.md`;
      }
    }

    const newResource: KnowledgeResource = {
      id: `kn-${Date.now()}`,
      title: body.title.trim(),
      subject: body.subject,
      level: body.level,
      format: body.format,
      summary: body.summary.trim(),
      contentBody: body.contentBody?.trim() || undefined,
      fileName,
      fileSizeLabel,
      storedFileName,
      imageUrl: '/src/assets/images/notes_biology_summary_1794906291530.jpg',
      authorId: body.authorId,
      authorName: body.authorName,
      authorGrade: body.authorGrade,
      authorSchool: body.authorSchool,
      downloads: 0,
      helpfulCount: 0,
      createdAt: getTodayIso(),
    };

    store.knowledgeResources.unshift(newResource);
    saveStore(store);
    broadcastWs({ type: 'knowledge:created', resource: newResource });
    res.status(201).json(newResource);
  });

  // System 3: Real Download Endpoint
  app.get('/api/knowledge/:id/download', (req, res) => {
    const store = loadStore();
    const resource = store.knowledgeResources.find((r) => r.id === req.params.id);
    if (!resource) {
      res.status(404).json({ error: 'ไม่พบไฟล์ความรู้ที่ต้องการ' });
      return;
    }

    resource.downloads += 1;
    saveStore(store);
    broadcastWs({ type: 'knowledge:updated', resource });

    const encodedFileName = encodeURIComponent(resource.fileName);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodedFileName}`
    );

    if (resource.storedFileName) {
      const targetPath = path.join(UPLOADS_DIR, resource.storedFileName);
      if (fs.existsSync(targetPath)) {
        res.sendFile(targetPath);
        return;
      }
    }

    const fallbackContent =
      resource.contentBody ||
      `# ${resource.title}\n\nหมวดวิชา: ${resource.subject} (${resource.level})\nผู้แบ่งปัน: ${resource.authorName} (${resource.authorGrade})\n\n${resource.summary}\n`;
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.send(fallbackContent);
  });

  // System 3: Inline preview for uploaded files
  app.get('/api/knowledge/:id/preview', (req, res) => {
    const store = loadStore();
    const resource = store.knowledgeResources.find((r) => r.id === req.params.id);
    if (!resource || !resource.storedFileName) {
      res.status(404).json({ error: 'ไม่พบไฟล์ตัวอย่าง' });
      return;
    }
    const targetPath = path.join(UPLOADS_DIR, resource.storedFileName);
    if (!fs.existsSync(targetPath)) {
      res.status(404).json({ error: 'ไม่พบไฟล์บนเซิร์ฟเวอร์' });
      return;
    }
    res.sendFile(targetPath);
  });

  app.post('/api/knowledge/:id/helpful', (req, res) => {
    const store = loadStore();
    const resource = store.knowledgeResources.find((r) => r.id === req.params.id);
    if (!resource) {
      res.status(404).json({ error: 'ไม่พบข้อมูลชีทสรุป' });
      return;
    }
    resource.helpfulCount += 1;
    saveStore(store);
    broadcastWs({ type: 'knowledge:updated', resource });
    res.json(resource);
  });

  app.post('/api/students', (req, res) => {
    const store = loadStore();
    const body = req.body as Partial<StudentProfile>;
    if (!body.name?.trim()) {
      res.status(400).json({ error: 'กรุณาระบุชื่อนักเรียน' });
      return;
    }
    const newStudent: StudentProfile = {
      id: `stu-${Date.now()}`,
      name: body.name.trim(),
      studentCode: body.studentCode?.trim() || `std${Math.floor(10000 + Math.random() * 89999)}`,
      grade: body.grade?.trim() || 'ม.5',
      school: body.school?.trim() || 'โรงเรียนพิชัย',
      contact: body.contact?.trim() || 'ติดต่อผ่านระบบปันเรียน',
    };
    store.students.push(newStudent);
    store.credentials = store.credentials || {};
    store.credentials[newStudent.id] = hashPassword('1234');
    saveStore(store);
    res.status(201).json(newStudent);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, '0.0.0.0', () => {
    console.log(`PunRian server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
