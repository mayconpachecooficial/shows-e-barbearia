import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppData, Appointment, Barber, Client, Expense, Product, ProductSale, Saving, ServiceRecord, Show } from "./types";

type Row = Record<string, string | number | boolean | null>;
type SharedUserId = string | null;
type SupabaseResult = { data: Row[] | null; error: Error | null };
type SupabaseMutationResult = { error: Error | null };

export async function loadRemoteData(supabase: SupabaseClient, userId: SharedUserId): Promise<AppData> {
  const [clients, barbers, services, expenses, products, productSales, appointments, shows, savings] = await Promise.all([
    selectRows(supabase, "clients", userId),
    selectRows(supabase, "barbers", userId),
    selectRows(supabase, "service_records", userId),
    selectRows(supabase, "expenses", userId),
    selectRows(supabase, "products", userId),
    selectRows(supabase, "product_sales", userId),
    selectRows(supabase, "appointments", userId),
    selectRows(supabase, "shows", userId),
    selectRows(supabase, "savings", userId),
  ]);

  const error = clients.error || barbers.error || services.error || expenses.error || products.error || productSales.error || appointments.error || shows.error || savings.error;
  if (error) throw error;

  return {
    clients: (clients.data ?? []).map(toClient),
    barbers: (barbers.data ?? []).map(toBarber),
    services: (services.data ?? []).map(toServiceRecord),
    expenses: (expenses.data ?? []).map(toExpense),
    products: (products.data ?? []).map(toProduct),
    productSales: (productSales.data ?? []).map(toProductSale),
    appointments: (appointments.data ?? []).map(toAppointment),
    shows: (shows.data ?? []).map(toShow),
    savings: (savings.data ?? []).map(toSaving),
  };
}

export async function saveRemoteData(supabase: SupabaseClient, userId: SharedUserId, data: AppData, previous?: AppData) {
  const changes = buildChanges(data, previous, userId);

  await Promise.all(changes.upserts.map((change) => upsertRows(supabase, change.table, change.rows)));

  for (const change of changes.deletions) {
    await deleteRowsByIds(supabase, change.table, userId, change.ids);
  }
}

type SupabaseQuery = {
  eq: (column: string, value: string) => SupabaseQuery;
  is: (column: string, value: null) => SupabaseQuery;
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQuery;
};

type CollectionChange = { table: string; rows: Row[] };
type DeletionChange = { table: string; ids: string[] };

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

async function upsertRows(supabase: SupabaseClient, table: string, rows: Row[]) {
  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

async function deleteRowsByIds(supabase: SupabaseClient, table: string, userId: SharedUserId, ids: string[]) {
  await Promise.all(ids.map(async (id) => {
    const { error } = await filterByUser(supabase.from(table).delete().eq("id", id) as unknown as SupabaseQuery, userId) as unknown as SupabaseMutationResult;
    if (error) throw error;
  }));
}

function buildChanges(data: AppData, previous: AppData | undefined, userId: SharedUserId) {
  const clients = diffRows(data.clients, previous?.clients, (client) => fromClient(client, userId));
  const barbers = diffRows(data.barbers, previous?.barbers, (barber) => fromBarber(barber, userId));
  const products = diffRows(data.products, previous?.products, (product) => fromProduct(product, userId));
  const services = diffRows(data.services, previous?.services, (service) => fromServiceRecord(service, userId));
  const expenses = diffRows(data.expenses, previous?.expenses, (expense) => fromExpense(expense, userId));
  const productSales = diffRows(data.productSales, previous?.productSales, (sale) => fromProductSale(sale, userId));
  const appointments = diffRows(data.appointments, previous?.appointments, (appointment) => fromAppointment(appointment, userId));
  const shows = diffRows(data.shows, previous?.shows, (show) => fromShow(show, userId));
  const savings = diffRows(data.savings, previous?.savings, (saving) => fromSaving(saving, userId));

  return {
    upserts: [
      { table: "clients", rows: clients.upserts },
      { table: "barbers", rows: barbers.upserts },
      { table: "products", rows: products.upserts },
      { table: "service_records", rows: services.upserts },
      { table: "expenses", rows: expenses.upserts },
      { table: "product_sales", rows: productSales.upserts },
      { table: "appointments", rows: appointments.upserts },
      { table: "shows", rows: shows.upserts },
      { table: "savings", rows: savings.upserts },
    ] satisfies CollectionChange[],
    deletions: [
      { table: "savings", ids: savings.deletions },
      { table: "shows", ids: shows.deletions },
      { table: "appointments", ids: appointments.deletions },
      { table: "product_sales", ids: productSales.deletions },
      { table: "service_records", ids: services.deletions },
      { table: "expenses", ids: expenses.deletions },
      { table: "products", ids: products.deletions },
      { table: "barbers", ids: barbers.deletions },
      { table: "clients", ids: clients.deletions },
    ] satisfies DeletionChange[],
  };
}

function diffRows<T extends { id: string }>(items: T[], previousItems: T[] | undefined, toRow: (item: T) => Row) {
  if (!previousItems) return { upserts: items.map(toRow), deletions: [] };

  const previousById = new Map(previousItems.map((item) => [item.id, item]));
  const currentIds = new Set(items.map((item) => item.id));
  return {
    upserts: items.filter((item) => JSON.stringify(item) !== JSON.stringify(previousById.get(item.id))).map(toRow),
    deletions: previousItems.filter((item) => !currentIds.has(item.id)).map((item) => item.id),
  };
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

function toShow(row: Row): Show {
  return {
    id: String(row.id),
    date: String(row.show_date),
    time: String(row.show_time).slice(0, 5),
    local: String(row.local),
    description: String(row.description ?? ""),
    value: Number(row.value ?? 0),
    status: String(row.status) as Show["status"],
  };
}

function fromShow(show: Show, userId: SharedUserId): Row {
  return {
    id: show.id,
    user_id: userId,
    show_date: show.date,
    show_time: show.time,
    local: show.local,
    description: show.description,
    value: show.value,
    status: show.status,
  };
}

function toSaving(row: Row): Saving {
  return {
    id: String(row.id),
    date: String(row.saving_date),
    description: String(row.description ?? ""),
    value: Number(row.value ?? 0),
  };
}

function fromSaving(saving: Saving, userId: SharedUserId): Row {
  return {
    id: saving.id,
    user_id: userId,
    saving_date: saving.date,
    description: saving.description,
    value: saving.value,
  };
}
