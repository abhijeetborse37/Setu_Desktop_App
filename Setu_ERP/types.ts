
export enum BusinessType {
  PRIVATE = 0,
  PUBLIC = 1,
  FIRM = 2,
  PARTNERSHIP = 3,
  NGO = 4
}

export enum UserRole {
  ADMIN = 0,
  CUSTOMER = 1
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  validity: string;
  featuresJson: string;
  maxCompanies: number;
  maxProducts: number;
  maxUsers: number;
  status: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  userName?: string;
  planId: string;
  planName?: string;
  startDate?: string;
  endDate?: string;
  status: string; // Pending, Active, Expired, Rejected
  isActive: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  contactNo?: string;
  allowedTabsPattern?: string; // "*" = all, comma-separated list e.g. "dashboard,sales"
  token?: string;
  isSubscriptionActive?: boolean;
  subscriptionStatus?: string;
  subscriptionEndDate?: string;
  planName?: string;
  warningMessage?: string;
}

export interface CustomAttribute {
  label: string;
  value: string;
}

export interface Company {
  id: string;
  userId: string; // Owner of the data
  name: string;
  address: string;
  country: string;
  currency: string;
  currencySymbol: string;
  contact: string;
  type: BusinessType;
  taxId: string;
  gstNumber?: string;
  licenseNumber: string;
  bankAccount: string;
  bankName?: string;
  ifscCode?: string;
  branchName?: string;
  industry: string;
  employees: number;
  revenue: number;
  expenses: number;
  incorporationDate: string;
  website?: string;
}

export interface Product {
  id: string;
  userId: string; // Owner
  companyId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  purchasePrice?: number;
  stock: number;
  supplier: string;
  sku: string;
  image?: string;
  unitPerPack?: number;
  hsnCode?: string;
  sgstRate?: number;  // State GST rate as percentage
  cgstRate?: number;  // Central GST rate as percentage
  customAttributes?: CustomAttribute[];
}

export enum CustomerGroup {
  REGULAR = 'Regular',
  VIP = 'Vip',
  NEW = 'New'
}

export interface Customer {
  id: string;
  userId: string; // Owner
  name: string;
  email: string;
  phone: string;
  address: string;
  gstPanId?: string;
  licenseNo?: string;
  group: CustomerGroup;
  totalSpent: number;
}

export interface TransactionItem {
  productId: string;
  productName: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  cgstRate?: number;
  sgstRate?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  totalAmount: number;
}

export interface Transaction {
  id: string;
  userId: string; // Owner
  type: 'PURCHASE' | 'SALE';
  items: TransactionItem[];
  totalAmount: number;
  totalTax: number;
  cgstTotal?: number;
  sgstTotal?: number;
  roundOff?: number;
  date: string;
  entityName: string; // Customer for Sale, Supplier for Purchase
  entityGstNumber?: string; // GST/PAN number of the customer or supplier
  invoiceNumber: string;
}

export interface AppState {
  companies: Company[];
  activeCompanyId: string | null;
  products: Product[];
  customers: Customer[];
  transactions: Transaction[];
  currentUser: User | null;
}
