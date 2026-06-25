import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppData, Appointment, Barber, Client, Expense, Product, ProductSale, ServiceRecord } from "./types";

type Row = Record<string, string | number | boolean | null>;
type SharedUserId = string | null;
type SupabaseResult = { data: Row[] | null; error: Error | null };
type SupabaseMutationResult = { error: Error | null };

export async function loadRemoteData(supabase: SupabaseClient, userId: SharedUserId): Promise<AppData> {
  const [clients, barbers, services, expenses, products, productSales, appointments] = await Promise.all([
    selectRows(supabase, "clients", userId),
    selectRows(supabase, "barbers", userId),
    selectRows(supabase, "service_records", userId),
    selectRows(supabase, "expenses", userId),
    selectRows(supabase, "products", userId),
    selectRows(supabase, "product_sales", userId),
    selectRows(supabase, "appointments", userId),
  ]);

  const error = clients.error || barbers.error || services.error || expenses.error || products.error || productSales.error || appointments.error;
  if (error) throw error;

  return {
    clients: (clients.data ?? []).map(toClient),
    barbers: (barbers.data ?? []).map(toBarber),
    services: (services.data ?? []).map(toServiceRecord),
    expenses: (expenses.data ?? []).map(toExpense),
    products: (products.data ?? []).map(toProduct),
    productSales: (productSales.data ?? []).map(toProductSale),
    appointments: (appointments.data ?? []).map(toAppointment),
  };
}

export async function saveRemoteData(supabase: SupabaseClient, userId: SharedUserId, data: AppData) {
  const tables = ["appointments", "product_sales", "service_records", "expenses", "products", "barbers", "clients"];
  for (const table of tables) {
    const { error } = await deleteRows(supabase, table, userId);
    if (error) throw error;
  }

  await insertRows(supabase, "clients", data.clients.map((client) => fromClient(client, userId)));
  await insertRows(supabase, "barbers", data.barbers.map((barber) => fromBarber(barber, userId)));
  await insertRows(supabase, "products", data.products.map((product) => fromProduct(product, userId)));
  await insertRows(supabase, "service_records", data.services.map((service) => fromServiceRecord(service, userId)));
  await insertRows(supabase, "expenses", data.expenses.map((expense) => fromExpense(expense, userId)));
  await insertRows(supabase, "product_sales", data.productSales.map((sale) => fromProductSale(sale, userId)));
  await insertRows(supabase, "appointments", data.appointments.map((appointment) => fromAppointment(appointment, userId)));
}

type SupabaseQuery = {
  eq: (column: string, value: string) => SupabaseQuery;
  is: (column: string, value: null) => SupabaseQuery;
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQuery;
};

function selectTable(supabase: SupabaseClient, table: string) {
  return supabase.from(table).select("*") as unknown as SupabaseQuery;
}

function deleteTable(supabase: SupabaseClient, table: string) {
  return supabase.from(table).delete() as unknown as SupabaseQuery;
}

function filterByUser<T extends SupabaseQuery>(query: T, userId: SharedUserId) {
  return userId ? query.eq("user_id", userId) : query.is("user_id", null);
}

async function selectRows(supabase: SupabaseClient, table: string, userId: SharedUserId) {
  return await filterByUser(selectTable(supabase, table), userId).order("created_at", { ascending: false }) as unknown as SupabaseResult;
}

async function deleteRows(supabase: SupabaseClient, table: string, userId: SharedUserId) {
  return await filterByUser(deleteTable(supabase, table), userId) as unknown as SupabaseMutationResult;
}

async function insertRows(supabase: SupabaseClient, table: string, rows: Row[]) {
  if (!rows.length) return;
  const { error } = await supabase.from(table).insert(rows);
  if (error) throw error;
}

function toClient(row: Row): Client {
  return { id: String(row.id), name: String(row.name), phone: String(row.phone), birthDate: String(row.birth_date ?? ""), notes: String(row.notes ?? "") };
}

function toBarber(row: Row): Barber {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    commissionRate: Number(row.commission_rate ?? 0),
    role: String(row.role) as Barber["role"],
    active: Boolean(row.active),
  };
}

function toServiceRecord(row: Row): ServiceRecord {
  return {
    id: String(row.id),
    clientId: String(row.client_id ?? ""),
    barberId: String(row.barber_id ?? ""),
    date: String(row.service_date),
    service: String(row.service) as ServiceRecord["service"],
    customService: String(row.custom_service ?? ""),
    value: Number(row.value ?? 0),
  };
}

function toExpense(row: Row): Expense {
  return {
    id: String(row.id),
    date: String(row.expense_date),
    category: String(row.category) as Expense["category"],
    description: String(row.description ?? ""),
    value: Number(row.value ?? 0),
  };
}

function toProduct(row: Row): Product {
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category) as Product["category"],
    stock: Number(row.stock ?? 0),
    cost: Number(row.cost ?? 0),
    price: Number(row.price ?? 0),
    sold: Number(row.sold ?? 0),
  };
}

function toProductSale(row: Row): ProductSale {
  return {
    id: String(row.id),
    productId: String(row.product_id ?? ""),
    clientId: String(row.client_id ?? ""),
    date: String(row.sale_date),
    quantity: Number(row.quantity ?? 0),
    unitPrice: Number(row.unit_price ?? 0),
  };
}

function toAppointment(row: Row): Appointment {
  return {
    id: String(row.id),
    clientId: String(row.client_id ?? ""),
    barberId: String(row.barber_id ?? ""),
    date: String(row.appointment_date),
    time: String(row.appointment_time).slice(0, 5),
    service: String(row.service) as Appointment["service"],
    status: String(row.status) as Appointment["status"],
  };
}

function fromClient(client: Client, userId: SharedUserId): Row {
  return { id: client.id, user_id: userId, name: client.name, phone: client.phone, birth_date: client.birthDate || null, notes: client.notes };
}

function fromBarber(barber: Barber, userId: SharedUserId): Row {
  return { id: barber.id, user_id: userId, name: barber.name, email: barber.email, commission_rate: barber.commissionRate, role: barber.role, active: barber.active };
}

function fromServiceRecord(service: ServiceRecord, userId: SharedUserId): Row {
  return {
    id: service.id,
    user_id: userId,
    client_id: service.clientId || null,
    barber_id: service.barberId || null,
    service_date: service.date,
    service: service.service,
    custom_service: service.customService || null,
    value: service.value,
  };
}

function fromExpense(expense: Expense, userId: SharedUserId): Row {
  return { id: expense.id, user_id: userId, expense_date: expense.date, category: expense.category, description: expense.description, value: expense.value };
}

function fromProduct(product: Product, userId: SharedUserId): Row {
  return { id: product.id, user_id: userId, name: product.name, category: product.category, stock: product.stock, cost: product.cost, price: product.price, sold: product.sold };
}

function fromProductSale(sale: ProductSale, userId: SharedUserId): Row {
  return {
    id: sale.id,
    user_id: userId,
    product_id: sale.productId || null,
    client_id: sale.clientId || null,
    sale_date: sale.date,
    quantity: sale.quantity,
    unit_price: sale.unitPrice,
  };
}

function fromAppointment(appointment: Appointment, userId: SharedUserId): Row {
  return {
    id: appointment.id,
    user_id: userId,
    client_id: appointment.clientId || null,
    barber_id: appointment.barberId || null,
    appointment_date: appointment.date,
    appointment_time: appointment.time,
    service: appointment.service,
    status: appointment.status,
  };
}
