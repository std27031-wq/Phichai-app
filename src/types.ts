export type SubjectCategory =
  | 'คณิตศาสตร์'
  | 'วิทยาศาสตร์'
  | 'ฟิสิกส์'
  | 'เคมี'
  | 'ชีววิทยา'
  | 'ภาษาอังกฤษ'
  | 'ภาษาไทย'
  | 'สังคมศึกษา'
  | 'วิทยาการคำนวณ';

export type EducationLevel =
  | 'ประถมศึกษา'
  | 'ม.ต้น'
  | 'ม.ปลาย'
  | 'เตรียมสอบเข้ามหาวิทยาลัย';

export type ResourceKind =
  | 'หนังสือเรียน'
  | 'หนังสือเสริมความรู้'
  | 'ชีทสรุป'
  | 'ไฟล์ความรู้';

export type PhysicalCondition = 'excellent' | 'good' | 'fair' | 'worn';
export type MarkingLevel = 'none' | 'light' | 'moderate' | 'heavy';
export type UsageAge = 'under1' | '1to2' | '3to4' | 'over5';

export interface StudentProfile {
  id: string;
  name: string;
  studentCode: string;
  grade: string;
  school: string;
  contact: string;
}

export interface ConditionEvaluationInput {
  originalPrice: number;
  physicalCondition: PhysicalCondition;
  markingLevel: MarkingLevel;
  usageAgeYears: UsageAge;
  hasCompleteness: boolean;
  kind: ResourceKind;
}

export interface PriceCriterionBreakdown {
  criterion: string;
  impactLabel: string;
  points: number;
}

export interface PriceEvaluationResult {
  conditionScore: number;
  conditionGrade: 'A+' | 'A' | 'B' | 'C';
  conditionLabel: string;
  suggestedPrice: number;
  minFairPrice: number;
  maxFairPrice: number;
  discountPercent: number;
  breakdown: PriceCriterionBreakdown[];
}

export interface MarketItem {
  id: string;
  title: string;
  authorOrPublisher: string;
  subject: SubjectCategory;
  level: EducationLevel;
  kind: ResourceKind;
  description: string;
  imageUrl: string;
  originalPrice: number;
  sellingPrice: number;
  evaluation: PriceEvaluationResult;
  evaluationInput: ConditionEvaluationInput;
  sellerId: string;
  sellerName: string;
  sellerSchool: string;
  sellerContact: string;
  status: 'available' | 'sold';
  buyerName?: string;
  soldAt?: string;
  createdAt: string;
}

export interface MarketOrder {
  id: string;
  itemIds: string[];
  itemsSummary: {
    id: string;
    title: string;
    price: number;
    originalPrice: number;
  }[];
  totalAmount: number;
  totalSaved: number;
  buyerName: string;
  buyerContact: string;
  deliveryMethod: 'pickup' | 'parcel';
  deliveryNote: string;
  createdAt: string;
}

export interface LendingBook {
  id: string;
  title: string;
  subject: SubjectCategory;
  level: EducationLevel;
  description: string;
  conditionLabel: string;
  imageUrl: string;
  mode: 'lend' | 'exchange' | 'both';
  preferredExchangeTopic?: string;
  maxLoanDays: number;
  ownerId: string;
  ownerName: string;
  ownerGrade: string;
  ownerSchool: string;
  ownerContact: string;
  availability: 'available' | 'lent_out' | 'exchanged';
  createdAt: string;
}

export interface LendingTransaction {
  id: string;
  bookId: string;
  bookTitle: string;
  transactionType: 'borrow' | 'exchange';
  lenderId: string;
  lenderName: string;
  lenderContact: string;
  borrowerId: string;
  borrowerName: string;
  borrowerGrade: string;
  borrowerContact: string;
  exchangeBookTitle?: string;
  loanDays: number;
  startDate: string;
  dueDate: string;
  returnedAt?: string;
  status: 'pending' | 'active' | 'overdue' | 'returned' | 'exchanged_completed';
  notes: string;
  createdAt: string;
}

export interface KnowledgeResource {
  id: string;
  title: string;
  subject: SubjectCategory;
  level: EducationLevel;
  format: 'PDF' | 'Markdown/Note' | 'Image' | 'Document';
  summary: string;
  contentBody?: string;
  fileName: string;
  fileSizeLabel: string;
  storedFileName?: string;
  imageUrl?: string;
  authorId: string;
  authorName: string;
  authorGrade: string;
  authorSchool: string;
  downloads: number;
  helpfulCount: number;
  createdAt: string;
}

export interface AppBootstrapData {
  marketItems: MarketItem[];
  orders: MarketOrder[];
  lendingBooks: LendingBook[];
  lendingTransactions: LendingTransaction[];
  knowledgeResources: KnowledgeResource[];
  students: StudentProfile[];
}
