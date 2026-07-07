export type Client = {
  id: string;
  name: string;
  phone: string;
  birthDate: string;
  notes: string;
};

export type Barber = {
  id: string;
  name: string;
  email: string;
  commissionRate: number;
  role: "Administrador" | "Barbeiro" | "Recepcao";
  active: boolean;
};

export type Appointment = {
  id: string;
  clientId: string;
  barberId: string;
  date: string;
  time: string;
  service: string;
  status: "Confirmado" | "Pendente" | "Cancelado";
};

export type ServiceRecord = {
  id: string;
  clientId: string;
  barberId: string;
  date: string;
  service: string;
  customService?: string;
  value: number;
};

export type Expense = {
  id: string;
  date: string;
  category: string;
  description: string;
  value: number;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  stock: number;
  cost: number;
  price: number;
  sold: number;
};

export type ProductSale = {
  id: string;
  productId: string;
  clientId?: string;
  date: string;
  quantity: number;
  unitPrice: number;
};

export type Show = {
  id: string;
  date: string;
  time: string;
  local: string;
  description: string;
  value: number;
  status: "Confirmado" | "Pendente" | "Cancelado";
};

export type Saving = {
  id: string;
  date: string;
  description: string;
  value: number;
};

export type AppData = {
  openingBalance: number;
  clients: Client[];
  barbers: Barber[];
  appointments: Appointment[];
  services: ServiceRecord[];
  expenses: Expense[];
  products: Product[];
  productSales: ProductSale[];
  shows: Show[];
  savings: Saving[];
};
