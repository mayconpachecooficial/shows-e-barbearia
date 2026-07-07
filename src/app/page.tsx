"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BadgeDollarSign,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Download,
  Menu,
  Package,
  Pencil,
  Plus,
  Scissors,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  barberCommission,
  brl,
  buildRevenueChart,
  inDay,
  inMonth,
  inWeek,
  netProfit,
  productRevenue,
  productSaleProfit,
  productSaleRevenue,
  serviceRevenue,
  showRevenue,
  sum,
  todayKey,
  totalEntries,
  totalExpenses,
} from "@/lib/finance";
import type {
  AppData,
  Appointment,
  Barber,
  Client,
  Expense,
  Product,
  ProductSale,
  Saving,
  ServiceRecord,
  Show,
} from "@/lib/types";
import { loadRemoteData, saveRemoteData } from "@/lib/database";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getUser, signOut, onAuthStateChange } from "@/lib/auth";

const sharedUserId = null;
const databaseTimeoutMs = 12000;
const hasData = (items: AppData) =>
  items.clients.length ||
  items.barbers.length ||
  items.services.length ||
  items.expenses.length ||
  items.products.length ||
  items.productSales.length ||
  items.appointments.length ||
  items.shows.length ||
  items.savings.length;

const initialData: AppData = {
  clients: [
    { id: "c1", name: "Rafael Almeida", phone: "(67) 99211-4400", birthDate: "1994-04-18", notes: "Prefere degradê baixo e finalização matte." },
    { id: "c2", name: "Bruno Martins", phone: "(67) 98422-1190", birthDate: "1988-11-02", notes: "Barba desenhada quinzenal." },
    { id: "c3", name: "Lucas Pereira", phone: "(67) 99100-8701", birthDate: "2001-08-27", notes: "Atendimento rápido no horário de almoço." },
  ],
  barbers: [
    { id: "b1", name: "Maycon Pacheco", email: "maycon@barbearia.com", commissionRate: 35, role: "Administrador", active: true },
    { id: "b2", name: "João Victor", email: "joao@barbearia.com", commissionRate: 30, role: "Barbeiro", active: true },
    { id: "b3", name: "Pedro Lima", email: "pedro@barbearia.com", commissionRate: 28, role: "Barbeiro", active: true },
  ],
  services: [
    { id: "s1", clientId: "c1", barberId: "b1", date: todayKey(), service: "Corte + barba", value: 70 },
    { id: "s2", clientId: "c2", barberId: "b2", date: todayKey(), service: "Barba", value: 35 },
    { id: "s3", clientId: "c3", barberId: "b1", date: format(subDays(new Date(), 1), "yyyy-MM-dd"), service: "Corte de cabelo", value: 45 },
    { id: "s4", clientId: "c1", barberId: "b3", date: format(subDays(new Date(), 3), "yyyy-MM-dd"), service: "Corte + barba", value: 70 },
    { id: "s5", clientId: "c2", barberId: "b2", date: format(subDays(new Date(), 7), "yyyy-MM-dd"), service: "Corte de cabelo", value: 45 },
  ],
  expenses: [
    { id: "e1", date: todayKey(), category: "Produtos", description: "Reposição de lâminas", value: 85 },
    { id: "e2", date: format(subDays(new Date(), 2), "yyyy-MM-dd"), category: "Energia", description: "Conta parcial", value: 230 },
    { id: "e3", date: format(subDays(new Date(), 8), "yyyy-MM-dd"), category: "Aluguel", description: "Aluguel da sala", value: 1200 },
  ],
  products: [
    { id: "p1", name: "Pomada Matte Prime", category: "Pomadas", stock: 18, cost: 18, price: 38, sold: 9 },
    { id: "p2", name: "Shampoo Anticaspa Pro", category: "Shampoos", stock: 11, cost: 22, price: 49, sold: 4 },
    { id: "p3", name: "Óleo de Barba Wood", category: "Oleos para barba", stock: 14, cost: 20, price: 44, sold: 6 },
  ],
  productSales: [
    { id: "ps1", productId: "p1", clientId: "c1", date: todayKey(), quantity: 1, unitPrice: 38 },
    { id: "ps2", productId: "p3", clientId: "c2", date: format(subDays(new Date(), 1), "yyyy-MM-dd"), quantity: 2, unitPrice: 44 },
  ],
  appointments: [
    { id: "a1", clientId: "c3", barberId: "b1", date: todayKey(), time: "15:30", service: "Corte de cabelo", status: "Confirmado" },
    { id: "a2", clientId: "c1", barberId: "b2", date: format(subDays(new Date(), -1), "yyyy-MM-dd"), time: "10:00", service: "Corte + barba", status: "Pendente" },
  ],
  shows: [
    { id: "sh1", date: todayKey(), time: "20:00", local: "Bar do Zé", description: "Noite de pagode", value: 500, status: "Confirmado" },
    { id: "sh2", date: format(subDays(new Date(), -3), "yyyy-MM-dd"), time: "21:00", local: "Buffet Floral", description: "Festa de aniversário", value: 800, status: "Confirmado" },
  ],
  savings: [
    { id: "sv1", date: format(subDays(new Date(), -3), "yyyy-MM-dd"), description: "Reserva cofrinho", value: 75 },
    { id: "sv2", date: format(subDays(new Date(), -2), "yyyy-MM-dd"), description: "Reserva cofrinho", value: 110 },
  ],
};

type Tab = "dashboard" | "clientes" | "servicos" | "financeiro" | "relatorios" | "historico" | "produtos" | "agenda" | "shows" | "cofrinho" | "admin";

const navItems: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
  { key: "dashboard", label: "Dashboard", icon: TrendingUp },
  { key: "shows", label: "Shows", icon: BadgeDollarSign },
  { key: "cofrinho", label: "Cofrinho", icon: Package },
  { key: "relatorios", label: "Relatórios", icon: ClipboardList },
  { key: "historico", label: "Histórico", icon: CalendarClock },
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "agenda", label: "Agenda", icon: CheckCircle2 },
  { key: "servicos", label: "Serviços", icon: Scissors },
  { key: "produtos", label: "Produtos", icon: Package },
  { key: "financeiro", label: "Financeiro", icon: BadgeDollarSign },
  { key: "admin", label: "Admin", icon: ShieldCheck },
];

const newId = (prefix: string) => `${prefix}${crypto.randomUUID()}`;

const withTimeout = <T,>(promise: Promise<T>, label: string) =>
  Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} demorou demais`)), databaseTimeoutMs);
    }),
  ]);

const toInputDate = (value: string, fallback = todayKey()) => {
  const clean = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const match = clean.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return fallback;
};

const toDisplayDate = (value: string) => {
  if (!value) return "";
  const normalized = toInputDate(value, "");
  if (!normalized) return value;
  const [year, month, day] = normalized.split("-");
  return `${day}-${month}-${year}`;
};

const safeDisplayDate = (value: string) => {
  try {
    return toDisplayDate(value);
  } catch {
    return value || "não informado";
  }
};

const safeBackupDate = (value: string) => {
  if (!value) return "pendente";
  try {
    return format(parseISO(value), "dd-MM HH:mm");
  } catch {
    return "pendente";
  }
};

const finiteNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === "number" ? value : parseDecimal(String(value ?? ""), fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const ensureArray = <T,>(value: T[] | undefined) => (Array.isArray(value) ? value : []);

const normalizeAppData = (items: AppData): AppData => ({
  clients: ensureArray(items.clients)
    .filter((client) => client && typeof client === "object")
    .map((client) => ({
      id: String(client.id || newId("c")),
      name: String(client.name || ""),
      phone: String(client.phone || ""),
      birthDate: client.birthDate ? toInputDate(String(client.birthDate), "") : "",
      notes: String(client.notes || ""),
    }))
    .filter((client) => client.name.trim()),
  barbers: ensureArray(items.barbers)
    .filter((barber) => barber && typeof barber === "object")
    .map((barber) => ({
      id: String(barber.id || newId("b")),
      name: String(barber.name || ""),
      email: String(barber.email || ""),
      commissionRate: finiteNumber(barber.commissionRate),
      role: (["Administrador", "Barbeiro", "Recepcao"].includes(String(barber.role)) ? barber.role : "Barbeiro") as Barber["role"],
      active: barber.active !== false,
    }))
    .filter((barber) => barber.name.trim()),
  services: ensureArray(items.services)
    .filter((service) => service && typeof service === "object")
    .map((service) => ({
      id: String(service.id || newId("s")),
      clientId: String(service.clientId || ""),
      barberId: String(service.barberId || ""),
      date: toInputDate(String(service.date || ""), todayKey()),
      service: String(service.service || ""),
      customService: String(service.customService || ""),
      value: finiteNumber(service.value),
    }))
    .filter((service) => service.service.trim()),
  expenses: ensureArray(items.expenses)
    .filter((expense) => expense && typeof expense === "object")
    .map((expense) => ({
      id: String(expense.id || newId("e")),
      date: toInputDate(String(expense.date || ""), todayKey()),
      category: String(expense.category || ""),
      description: String(expense.description || ""),
      value: finiteNumber(expense.value),
    }))
    .filter((expense) => expense.category.trim()),
  products: ensureArray(items.products)
    .filter((product) => product && typeof product === "object")
    .map((product) => ({
      id: String(product.id || newId("p")),
      name: String(product.name || ""),
      category: String(product.category || ""),
      stock: finiteNumber(product.stock),
      cost: finiteNumber(product.cost),
      price: finiteNumber(product.price),
      sold: finiteNumber(product.sold),
    }))
    .filter((product) => product.name.trim()),
  productSales: ensureArray(items.productSales)
    .filter((sale) => sale && typeof sale === "object")
    .map((sale) => ({
      id: String(sale.id || newId("ps")),
      productId: String(sale.productId || ""),
      clientId: String(sale.clientId || ""),
      date: toInputDate(String(sale.date || ""), todayKey()),
      quantity: finiteNumber(sale.quantity),
      unitPrice: finiteNumber(sale.unitPrice),
    }))
    .filter((sale) => sale.productId.trim()),
  appointments: ensureArray(items.appointments)
    .filter((appointment) => appointment && typeof appointment === "object")
    .map((appointment) => ({
      id: String(appointment.id || newId("a")),
      clientId: String(appointment.clientId || ""),
      barberId: String(appointment.barberId || ""),
      date: toInputDate(String(appointment.date || ""), todayKey()),
      time: String(appointment.time || "09:00").slice(0, 5),
      service: String(appointment.service || ""),
      status: (["Confirmado", "Pendente", "Cancelado"].includes(String(appointment.status)) ? appointment.status : "Pendente") as Appointment["status"],
    }))
    .filter((appointment) => appointment.service.trim()),
  shows: ensureArray(items.shows)
    .filter((show) => show && typeof show === "object")
    .map((show) => ({
      id: String(show.id || newId("sh")),
      date: toInputDate(String(show.date || ""), todayKey()),
      time: String(show.time || "20:00").slice(0, 5),
      local: String(show.local || ""),
      description: String(show.description || ""),
      value: finiteNumber(show.value),
      status: (["Confirmado", "Pendente", "Cancelado"].includes(String(show.status)) ? show.status : "Pendente") as Show["status"],
    }))
    .filter((show) => show.local.trim()),
  savings: ensureArray(items.savings)
    .filter((saving) => saving && typeof saving === "object")
    .map((saving) => ({
      id: String(saving.id || newId("sv")),
      date: toInputDate(String(saving.date || ""), todayKey()),
      description: String(saving.description || ""),
      value: finiteNumber(saving.value),
    }))
    .filter((saving) => saving.value > 0),
});

const parseDecimal = (value: FormDataEntryValue | string | number | null | undefined, fallback = 0) => {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(,|\.|$))/g, "")
    .replace(",", ".");
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const onlyDigits = (value: FormDataEntryValue | string | number | null | undefined) => String(value ?? "").replace(/\D/g, "");

const formatPhone = (value: FormDataEntryValue | string | number | null | undefined) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
};

const formatMoney = (value: FormDataEntryValue | string | number | null | undefined) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseDecimal(raw));
};

const formatMoneyTyping = (value: FormDataEntryValue | string | number | null | undefined) => {
  const digits = onlyDigits(value).slice(0, 12);
  if (!digits) return "";
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(digits) / 100);
};

export default function Home() {
  const [data, setData] = useState<AppData>(initialData);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [range, setRange] = useState({ start: format(subDays(new Date(), 7), "yyyy-MM-dd"), end: todayKey() });
  const [lastBackup, setLastBackup] = useState("");
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? "Conectando ao banco..." : "Modo local ativo");
  const [notice, setNotice] = useState("");
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [stockProductId, setStockProductId] = useState<string | null>(null);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [editingBarberId, setEditingBarberId] = useState<string | null>(null);
  const [editingShowId, setEditingShowId] = useState<string | null>(null);
  const [editingSavingId, setEditingSavingId] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);
  const suppressNextSaveRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const localSaveTimerRef = useRef<number | null>(null);
  const latestDataRef = useRef(data);
  const lastSavedDataRef = useRef<AppData | undefined>(undefined);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const flushSave = () => {
    const client = supabase;
    if (!client || !hydratedRef.current) return;
    if (savingRef.current) return;

    savingRef.current = true;
    dirtyRef.current = false;
    setSyncStatus("Salvando...");
    withTimeout(saveRemoteData(client, sharedUserId, latestDataRef.current, lastSavedDataRef.current), "Salvamento")
      .then(() => {
        lastSavedDataRef.current = latestDataRef.current;
        setSyncStatus("Salvo no banco");
      })
      .catch(() => {
        dirtyRef.current = true;
        setSyncStatus("Sem conexão, tentando novamente");
      })
      .finally(() => {
        savingRef.current = false;
        if (dirtyRef.current) {
          if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
          saveTimerRef.current = window.setTimeout(flushSave, 5000);
        }
      });
  };

  const scheduleSave = () => {
    const client = supabase;
    if (!client || !hydratedRef.current) return;
    const wasAlreadyDirty = dirtyRef.current;
    dirtyRef.current = true;
    if (!wasAlreadyDirty) setSyncStatus("Salvando em instantes...");
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(flushSave, 5000);
  };

  useEffect(() => {
    const saved = localStorage.getItem("barbearia-pro-data");
    if (saved) {
      try {
        const localData = normalizeAppData(JSON.parse(saved) as AppData);
        latestDataRef.current = localData;
        setData(localData);
      } catch {
        localStorage.removeItem("barbearia-pro-data");
        localStorage.removeItem("barbearia-pro-backup");
        localStorage.removeItem("barbearia-pro-last-backup");
      }
    }
    setLastBackup(localStorage.getItem("barbearia-pro-last-backup") || "");

    const client = supabase;
    if (!client) {
      hydratedRef.current = true;
      return;
    }

    setSyncStatus("Carregando dados do banco...");
    withTimeout(loadRemoteData(client, sharedUserId), "Carregamento")
      .then(async (loadedData) => {
        const remoteData = normalizeAppData(loadedData);
        if (hasData(remoteData)) {
          suppressNextSaveRef.current = true;
          latestDataRef.current = remoteData;
          lastSavedDataRef.current = remoteData;
          setData(remoteData);
          setSyncStatus("Banco conectado");
          return;
        }

        await withTimeout(saveRemoteData(client, sharedUserId, initialData), "Inicialização do banco");
        lastSavedDataRef.current = initialData;
        setSyncStatus("Banco iniciado");
      })
      .catch(() => {
        setSyncStatus("Banco indisponível, salvando local");
      })
      .finally(() => {
        hydratedRef.current = true;
      });
  }, []);

  useEffect(() => {
    latestDataRef.current = data;
    if (localSaveTimerRef.current) window.clearTimeout(localSaveTimerRef.current);
    localSaveTimerRef.current = window.setTimeout(() => {
      try {
        const backup = { createdAt: new Date().toISOString(), data: latestDataRef.current };
        localStorage.setItem("barbearia-pro-data", JSON.stringify(latestDataRef.current));
        localStorage.setItem("barbearia-pro-backup", JSON.stringify(backup));
        localStorage.setItem("barbearia-pro-last-backup", backup.createdAt);
        setLastBackup(backup.createdAt);
      } catch {
        setSyncStatus("Armazenamento local cheio, usando banco");
      }
    }, 900);

    if (suppressNextSaveRef.current) {
      suppressNextSaveRef.current = false;
      return;
    }

    scheduleSave();
  }, [data]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      if (localSaveTimerRef.current) window.clearTimeout(localSaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => registrations.forEach((registration) => registration.unregister())).catch(() => undefined);
    }
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key))).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await getUser();
      if (!currentUser) {
        window.location.href = "/login";
        return;
      }
      setUser({ id: currentUser.id, email: currentUser.email || "" });
      setAuthLoading(false);
    };
    checkUser();

    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        window.location.href = "/login";
      } else if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || "" });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const metrics = useMemo(() => {
    const todayServices = data.services.filter((item) => inDay(item.date));
    const monthServices = data.services.filter((item) => inMonth(item.date));
    const ticketBase = todayServices.length ? todayServices : monthServices;
    return {
      today: totalEntries(data, inDay),
      week: totalEntries(data, inWeek),
      month: totalEntries(data, inMonth),
      todayCount: todayServices.length,
      averageTicket: ticketBase.length ? serviceRevenue(ticketBase) / ticketBase.length : 0,
      todayExpenses: totalExpenses(data, inDay),
      weekExpenses: totalExpenses(data, inWeek),
      monthExpenses: totalExpenses(data, inMonth),
      todayProfit: netProfit(data, inDay),
      weekProfit: netProfit(data, inWeek),
      monthProfit: netProfit(data, inMonth),
    };
  }, [data]);

  const clientsByQuery = useMemo(() => {
    const normalized = query.toLowerCase();
    return data.clients.filter((client) => `${client.name} ${client.phone}`.toLowerCase().includes(normalized));
  }, [data.clients, query]);

  const selectedClient = (id?: string) => data.clients.find((client) => client.id === id);
  const selectedBarber = (id?: string) => data.barbers.find((barber) => barber.id === id);
  const selectedProduct = (id?: string) => data.products.find((product) => product.id === id);
  const editingClient = selectedClient(editingClientId ?? undefined);
  const editingService = data.services.find((service) => service.id === editingServiceId);
  const editingExpense = data.expenses.find((expense) => expense.id === editingExpenseId);
  const editingProduct = selectedProduct(editingProductId ?? undefined);
  const stockProduct = selectedProduct(stockProductId ?? undefined);
  const editingAppointment = data.appointments.find((appointment) => appointment.id === editingAppointmentId);
  const editingBarber = selectedBarber(editingBarberId ?? undefined);
  const editingShow = data.shows.find((show) => show.id === editingShowId);
  const editingSaving = data.savings.find((saving) => saving.id === editingSavingId);
  const clientNameById = useMemo(() => new Map(data.clients.map((client) => [client.id, client.name])), [data.clients]);
  const barberNameById = useMemo(() => new Map(data.barbers.map((barber) => [barber.id, barber.name])), [data.barbers]);
  const productProfitById = useMemo(() => {
    const costById = new Map(data.products.map((product) => [product.id, product.cost]));
    const profitById = new Map<string, number>();
    data.productSales.forEach((sale) => {
      const profit = sale.quantity * (sale.unitPrice - (costById.get(sale.productId) ?? 0));
      profitById.set(sale.productId, (profitById.get(sale.productId) ?? 0) + profit);
    });
    return profitById;
  }, [data.productSales, data.products]);
  const visibleProducts = useMemo(() => data.products.slice(0, 40), [data.products]);
  const visibleAppointments = useMemo(
    () =>
      data.appointments
        .slice()
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
        .slice(0, 60),
    [data.appointments],
  );

  const addClient = (form: FormData) => {
    const client: Client = {
      id: newId("c"),
      name: String(form.get("name") || ""),
      phone: String(form.get("phone") || ""),
      birthDate: toInputDate(String(form.get("birthDate") || ""), ""),
      notes: String(form.get("notes") || ""),
    };
    if (!client.name.trim()) return;
    setData((current) => ({ ...current, clients: [client, ...current.clients] }));
  };

  const addService = (form: FormData) => {
    const record: ServiceRecord = {
      id: newId("s"),
      clientId: String(form.get("clientId")),
      barberId: String(form.get("barberId")),
      date: toInputDate(String(form.get("date") || ""), todayKey()),
      service: String(form.get("service") || ""),
      customService: String(form.get("customService") || ""),
      value: parseDecimal(form.get("value")),
    };
    if (!record.clientId || !record.barberId || !record.service.trim() || !record.value) return;
    setData((current) => ({ ...current, services: [record, ...current.services] }));
  };

  const addExpense = (form: FormData) => {
    const expense: Expense = {
      id: newId("e"),
      date: toInputDate(String(form.get("date") || ""), todayKey()),
      category: String(form.get("category") || ""),
      description: String(form.get("description") || ""),
      value: parseDecimal(form.get("value")),
    };
    if (!expense.category.trim() || !expense.value) return;
    setData((current) => ({ ...current, expenses: [expense, ...current.expenses] }));
  };

  const addProduct = (form: FormData) => {
    const stock = parseDecimal(form.get("stock"));
    const totalCost = parseDecimal(form.get("totalCost"));
    const product: Product = {
      id: newId("p"),
      name: String(form.get("name") || ""),
      category: String(form.get("category") || ""),
      stock,
      cost: stock > 0 ? totalCost / stock : 0,
      price: parseDecimal(form.get("price")),
      sold: 0,
    };
    if (!product.name.trim() || !product.category.trim() || stock < 0 || totalCost < 0 || product.price < 0) return false;
    setData((current) => ({ ...current, products: [product, ...current.products] }));
  };

  const sellProduct = (form: FormData) => {
    const quantity = parseDecimal(form.get("quantity"), 1);
    const productId = String(form.get("productId"));
    const product = selectedProduct(productId);
    if (!product || quantity <= 0) return false;
    if (quantity > product.stock) {
      setNotice(`Estoque insuficiente para ${product.name}. Disponível: ${product.stock} un.`);
      return false;
    }
    setNotice("");
    const sale: ProductSale = {
      id: newId("ps"),
      productId,
      clientId: String(form.get("clientId") || ""),
      date: toInputDate(String(form.get("date") || ""), todayKey()),
      quantity,
      unitPrice: parseDecimal(form.get("unitPrice"), product.price),
    };
    setData((current) => ({
      ...current,
      productSales: [sale, ...current.productSales],
      products: current.products.map((item) =>
        item.id === productId ? { ...item, stock: item.stock - quantity, sold: item.sold + quantity } : item,
      ),
    }));
  };

  const addAppointment = (form: FormData) => {
    const appointment: Appointment = {
      id: newId("a"),
      clientId: String(form.get("clientId")),
      barberId: String(form.get("barberId")),
      date: toInputDate(String(form.get("date") || ""), todayKey()),
      time: String(form.get("time") || "09:00"),
      service: String(form.get("service") || ""),
      status: "Pendente",
    };
    if (!appointment.clientId || !appointment.barberId || !appointment.service.trim()) return;
    setData((current) => ({ ...current, appointments: [appointment, ...current.appointments] }));
  };

  const addBarber = (form: FormData) => {
    const barber: Barber = {
      id: newId("b"),
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      commissionRate: parseDecimal(form.get("commissionRate")),
      role: String(form.get("role") || "Barbeiro") as Barber["role"],
      active: true,
    };
    if (!barber.name.trim()) return;
    setData((current) => ({ ...current, barbers: [barber, ...current.barbers] }));
  };

  const addShow = (form: FormData) => {
    const show: Show = {
      id: newId("sh"),
      date: toInputDate(String(form.get("date") || ""), todayKey()),
      time: String(form.get("time") || "20:00"),
      local: String(form.get("local") || ""),
      description: String(form.get("description") || ""),
      value: parseDecimal(form.get("value")),
      status: "Pendente",
    };
    if (!show.local.trim()) return;
    setData((current) => ({ ...current, shows: [show, ...current.shows] }));
  };

  const addSaving = (form: FormData) => {
    const saving: Saving = {
      id: newId("sv"),
      date: toInputDate(String(form.get("date") || ""), todayKey()),
      description: String(form.get("description") || ""),
      value: parseDecimal(form.get("value")),
    };
    if (saving.value <= 0) return;
    setData((current) => ({ ...current, savings: [saving, ...current.savings] }));
  };

  const deleteById = <K extends keyof AppData>(key: K, id: string) => {
    setData((current) => ({
      ...current,
      [key]: (current[key] as Array<{ id: string }>).filter((item) => item.id !== id),
    }));
  };

  const deleteClient = (id: string) => {
    setData((current) => ({
      ...current,
      clients: current.clients.filter((client) => client.id !== id),
      services: current.services.filter((service) => service.clientId !== id),
      appointments: current.appointments.filter((appointment) => appointment.clientId !== id),
      productSales: current.productSales.filter((sale) => sale.clientId !== id),
    }));
  };

  const deleteBarber = (id: string) => {
    setData((current) => ({
      ...current,
      barbers: current.barbers.filter((barber) => barber.id !== id),
      services: current.services.filter((service) => service.barberId !== id),
      appointments: current.appointments.filter((appointment) => appointment.barberId !== id),
    }));
  };

  const deleteProduct = (id: string) => {
    setData((current) => ({
      ...current,
      products: current.products.filter((product) => product.id !== id),
      productSales: current.productSales.filter((sale) => sale.productId !== id),
    }));
  };

  const updateClient = (client: Client, form: FormData) => {
    const name = String(form.get("name") || "");
    const phone = String(form.get("phone") || "");
    const birthDate = toInputDate(String(form.get("birthDate") || ""), "");
    const notes = String(form.get("notes") || "");
    if (!name.trim()) return false;
    setData((current) => ({
      ...current,
      clients: current.clients.map((item) => (item.id === client.id ? { ...item, name, phone, birthDate, notes } : item)),
    }));
    setEditingClientId(null);
  };

  const updateService = (service: ServiceRecord, form: FormData) => {
    const clientId = String(form.get("clientId") || "");
    const barberId = String(form.get("barberId") || "");
    const date = toInputDate(String(form.get("date") || ""), service.date);
    const serviceName = String(form.get("service") || "");
    const value = parseDecimal(form.get("value"));
    if (!clientId || !barberId || !serviceName.trim() || value <= 0) return false;
    setData((current) => ({
      ...current,
      services: current.services.map((item) => (item.id === service.id ? { ...item, clientId, barberId, date, service: serviceName, value } : item)),
    }));
    setEditingServiceId(null);
  };

  const updateExpense = (expense: Expense, form: FormData) => {
    const date = toInputDate(String(form.get("date") || ""), expense.date);
    const category = String(form.get("category") || "");
    const description = String(form.get("description") || "");
    const value = parseDecimal(form.get("value"));
    if (!category.trim() || value <= 0) return false;
    setData((current) => ({
      ...current,
      expenses: current.expenses.map((item) => (item.id === expense.id ? { ...item, date, category, description, value } : item)),
    }));
    setEditingExpenseId(null);
  };

  const updateProduct = (product: Product, form: FormData) => {
    const name = String(form.get("name") || "");
    const category = String(form.get("category") || "");
    const stock = parseDecimal(form.get("stock"));
    const cost = parseDecimal(form.get("cost"));
    const price = parseDecimal(form.get("price"));
    if (!name.trim() || !category.trim() || stock < 0 || cost < 0 || price < 0) return false;
    setData((current) => ({
      ...current,
      products: current.products.map((item) => (item.id === product.id ? { ...item, name, category, stock, cost, price } : item)),
    }));
    setEditingProductId(null);
  };

  const addProductStock = (product: Product, form: FormData) => {
    const quantity = parseDecimal(form.get("quantity"), 0);
    if (quantity <= 0) return false;
    setData((current) => ({
      ...current,
      products: current.products.map((item) => (item.id === product.id ? { ...item, stock: item.stock + quantity } : item)),
    }));
    setNotice(`Estoque atualizado: ${product.name} recebeu ${quantity} un.`);
    setStockProductId(null);
  };

  const updateAppointment = (appointment: Appointment, form: FormData) => {
    const clientId = String(form.get("clientId") || "");
    const barberId = String(form.get("barberId") || "");
    const date = toInputDate(String(form.get("date") || ""), appointment.date);
    const time = String(form.get("time") || appointment.time);
    const service = String(form.get("service") || "");
    if (!clientId || !barberId || !time || !service.trim()) return false;
    setData((current) => ({
      ...current,
      appointments: current.appointments.map((item) => (item.id === appointment.id ? { ...item, clientId, barberId, date, time, service } : item)),
    }));
    setEditingAppointmentId(null);
  };

  const updateBarber = (barber: Barber, form: FormData) => {
    const name = String(form.get("name") || "");
    const email = String(form.get("email") || "");
    const commissionRate = parseDecimal(form.get("commissionRate"));
    if (!name.trim() || commissionRate < 0) return false;
    setData((current) => ({
      ...current,
      barbers: current.barbers.map((item) => (item.id === barber.id ? { ...item, name, email, commissionRate } : item)),
    }));
    setEditingBarberId(null);
  };

  const updateShow = (show: Show, form: FormData) => {
    const date = toInputDate(String(form.get("date") || ""), show.date);
    const time = String(form.get("time") || show.time);
    const local = String(form.get("local") || "");
    const description = String(form.get("description") || "");
    const value = parseDecimal(form.get("value"));
    if (!local.trim()) return false;
    setData((current) => ({
      ...current,
      shows: current.shows.map((item) => (item.id === show.id ? { ...item, date, time, local, description, value } : item)),
    }));
    setEditingShowId(null);
  };

  const updateShowStatus = (id: string, status: Show["status"]) => {
    setData((current) => ({
      ...current,
      shows: current.shows.map((show) => (show.id === id ? { ...show, status } : show)),
    }));
  };

  const updateSaving = (saving: Saving, form: FormData) => {
    const date = toInputDate(String(form.get("date") || ""), saving.date);
    const description = String(form.get("description") || "");
    const value = parseDecimal(form.get("value"));
    if (value <= 0) return false;
    setData((current) => ({
      ...current,
      savings: current.savings.map((item) => (item.id === saving.id ? { ...item, date, description, value } : item)),
    }));
    setEditingSavingId(null);
  };

  const updateAppointmentStatus = (id: string, status: Appointment["status"]) => {
    setData((current) => ({
      ...current,
      appointments: current.appointments.map((appointment) => (appointment.id === id ? { ...appointment, status } : appointment)),
    }));
  };

  const exportPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório SHOWS E BARBEARIA", 14, 18);
    doc.setFontSize(11);
    doc.text(`Gerado em ${format(new Date(), "dd-MM-yyyy HH:mm")}`, 14, 28);
    const lines = [
      `Receita diária: ${brl.format(metrics.today)}`,
      `Receita semanal: ${brl.format(metrics.week)}`,
      `Receita mensal: ${brl.format(metrics.month)}`,
      `Cachês do mês: ${brl.format(showRevenue(data.shows.filter((s) => inMonth(s.date))))}`,
      `Despesas diárias: ${brl.format(metrics.todayExpenses)}`,
      `Despesas semanais: ${brl.format(metrics.weekExpenses)}`,
      `Despesas mensais: ${brl.format(metrics.monthExpenses)}`,
      `Lucro líquido mensal: ${brl.format(metrics.monthProfit)}`,
      `Atendimentos hoje: ${metrics.todayCount}`,
      `Ticket médio: ${brl.format(metrics.averageTicket)}`,
    ];
    lines.forEach((line, index) => doc.text(line, 14, 44 + index * 8));
    doc.save(`relatorio-barbearia-${todayKey()}.pdf`);
  };

  const selectTab = (nextTab: Tab) => {
    setTab(nextTab);
    setMobileMenuOpen(false);
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-muted">Carregando...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-line bg-coal/95 p-5 backdrop-blur lg:block">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md border border-gold/50 bg-gold/10 text-gold">
            <Scissors size={24} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">SHOWS E BARBEARIA</h1>
            <p className="text-xs text-muted">{syncStatus}</p>
          </div>
        </div>
        <NavigationItems activeTab={tab} onSelect={selectTab} />
      </aside>

      <section className="min-w-0 overflow-x-hidden lg:ml-72">
        <header className="no-print sticky top-0 z-20 border-b border-line bg-coal/86 px-4 py-4 backdrop-blur lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                className="icon-button shrink-0 lg:hidden"
                title={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
                aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <XCircle size={20} /> : <Menu size={20} />}
              </button>
              <div>
                <p className="text-sm text-gold">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
                <h2 className="text-2xl font-semibold md:text-3xl">{navItems.find((item) => item.key === tab)?.label}</h2>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={exportPdf} className="icon-button w-auto px-4" title="Exportar PDF">
                <Download size={18} />
                PDF
              </button>
              <span className="hidden rounded-md border border-line bg-panel px-3 py-2 text-xs text-muted md:inline">
                Backup {safeBackupDate(lastBackup)}
              </span>
              <button
                onClick={async () => {
                  await signOut();
                  window.location.href = "/login";
                }}
                className="icon-button"
                title="Sair"
              >
                Sair
              </button>
            </div>
          </div>
          {mobileMenuOpen ? (
            <div className="mt-4 rounded-lg border border-line bg-panel p-2 shadow-[0_18px_60px_rgba(0,0,0,0.35)] lg:hidden">
              <NavigationItems activeTab={tab} onSelect={selectTab} />
            </div>
          ) : null}
        </header>

        <div className="min-w-0 space-y-6 px-4 py-6 sm:px-5 lg:px-8">
          {notice ? (
            <div className="no-print flex items-center justify-between gap-3 rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ivory">
              <span>{notice}</span>
              <button onClick={() => setNotice("")} className="text-gold" title="Fechar aviso">
                <XCircle size={18} />
              </button>
            </div>
          ) : null}
          {tab === "dashboard" && (
            <>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat title="Saldo do dia" value={brl.format(metrics.today - metrics.todayExpenses)} icon={BadgeDollarSign} />
                <Stat title="Faturado mês" value={brl.format(metrics.month)} icon={CreditCard} />
                <Stat title="Cachês mês" value={brl.format(showRevenue(data.shows.filter((s) => inMonth(s.date))))} icon={BadgeDollarSign} />
                <Stat title="Lucro líquido mês" value={brl.format(metrics.monthProfit)} icon={TrendingUp} />
              </div>
              <div className="grid min-w-0 gap-6 xl:grid-cols-[1.7fr_1fr]">
                <Panel title="Faturamento por dia">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={buildRevenueChart(data)}>
                        <CartesianGrid stroke="#2a2a2a" vertical={false} />
                        <XAxis dataKey="date" stroke="#a8a29a" />
                        <YAxis stroke="#a8a29a" tickFormatter={(value) => `R$${value}`} />
                        <Tooltip contentStyle={{ background: "#171717", border: "1px solid #2a2a2a", borderRadius: 8 }} />
                        <Area type="monotone" dataKey="servicos" stackId="1" stroke="#d8a63f" fill="#d8a63f" fillOpacity={0.42} />
                        <Area type="monotone" dataKey="produtos" stackId="1" stroke="#f8f5ed" fill="#f8f5ed" fillOpacity={0.16} />
                        <Area type="monotone" dataKey="shows" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
                <Panel title="Resumo do dia">
                  <div className="space-y-3">
                    <Row label="Serviços" value={brl.format(serviceRevenue(data.services.filter((s) => inDay(s.date))))} />
                    <Row label="Shows confirmados" value={brl.format(showRevenue(data.shows.filter((s) => inDay(s.date) && s.status === "Confirmado")))} />
                    <Row label="Produtos" value={brl.format(productRevenue(data.productSales.filter((s) => inDay(s.date))))} />
                    <Row label="Total entradas" value={brl.format(metrics.today)} strong />
                    <Row label="Despesas" value={brl.format(metrics.todayExpenses)} />
                    <Row label="Saldo do dia" value={brl.format(metrics.today - metrics.todayExpenses)} strong />
                  </div>
                </Panel>
                <Panel title="Cofrinho">
                  <div className="space-y-3">
                    <Row label="Total reservado" value={brl.format(sum(data.savings.map((s) => s.value)))} strong />
                    {data.savings.slice(0, 5).map((saving) => (
                      <div key={saving.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted">{safeDisplayDate(saving.date)} - {saving.description}</span>
                        <span className="text-gold">{brl.format(saving.value)}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </>
          )}

          {tab === "clientes" && (
            <div className="grid min-w-0 gap-6 xl:grid-cols-[0.85fr_1.4fr]">
              <Panel title="Cadastrar cliente">
                <SmartForm action={addClient} submit="Salvar cliente">
                  <Field label="Nome completo" name="name" />
                  <PhoneField label="Telefone" name="phone" />
                  <DateField label="Data de nascimento" name="birthDate" defaultValue="" />
                  <Textarea label="Observações" name="notes" />
                </SmartForm>
                {editingClient ? (
                  <InlineForm key={editingClient.id} title="Editar cliente" submit="Salvar alterações" onCancel={() => setEditingClientId(null)} action={(form) => updateClient(editingClient, form)}>
                    <Field label="Nome completo" name="name" defaultValue={editingClient.name} />
                    <PhoneField label="Telefone" name="phone" defaultValue={editingClient.phone} />
                    <DateField label="Data de nascimento" name="birthDate" defaultValue={editingClient.birthDate} />
                    <Textarea label="Observações" name="notes" defaultValue={editingClient.notes} />
                  </InlineForm>
                ) : null}
              </Panel>
              <Panel title="Clientes e histórico">
                <SearchBox query={query} setQuery={setQuery} placeholder="Pesquisar por nome ou telefone" />
                <div className="mt-4 space-y-3">
                  {clientsByQuery.map((client) => {
                    const history = data.services.filter((service) => service.clientId === client.id);
                    return (
                      <Card key={client.id}>
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="font-semibold">{client.name}</h3>
                            <p className="text-sm text-muted">{client.phone} • Nasc. {client.birthDate ? safeDisplayDate(client.birthDate) : "não informado"}</p>
                            <p className="mt-2 text-sm text-muted">{client.notes}</p>
                            <p className="mt-3 text-sm text-gold">{history.length} atendimento(s) • {brl.format(serviceRevenue(history))}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingClientId(client.id)} className="icon-button" title="Editar cliente">
                              <Pencil size={17} />
                            </button>
                            <DeleteButton title="Excluir cliente" onConfirm={() => deleteClient(client.id)} />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </Panel>
            </div>
          )}

          {tab === "servicos" && (
            <div className="grid min-w-0 gap-6 xl:grid-cols-[0.85fr_1.4fr]">
              <Panel title="Finalizar atendimento">
                <SmartForm action={addService} submit="Registrar serviço">
                  <Select label="Cliente" name="clientId" options={data.clients.map((client) => [client.id, client.name])} />
                  <Select label="Barbeiro" name="barberId" options={data.barbers.filter((barber) => barber.active).map((barber) => [barber.id, barber.name])} />
                  <DateField label="Data" name="date" defaultValue={todayKey()} />
                  <Field label="Serviço realizado" name="service" placeholder="Ex.: Corte degradê, barba terapia, luzes" />
                  <MoneyField label="Valor cobrado" name="value" />
                </SmartForm>
                {editingService ? (
                  <InlineForm key={editingService.id} title="Editar atendimento" submit="Salvar atendimento" onCancel={() => setEditingServiceId(null)} action={(form) => updateService(editingService, form)}>
                    <Select label="Cliente" name="clientId" defaultValue={editingService.clientId} options={data.clients.map((client) => [client.id, client.name])} />
                    <Select label="Barbeiro" name="barberId" defaultValue={editingService.barberId} options={data.barbers.filter((barber) => barber.active).map((barber) => [barber.id, barber.name])} />
                    <DateField label="Data" name="date" defaultValue={editingService.date} />
                    <Field label="Serviço realizado" name="service" defaultValue={editingService.service} />
                    <MoneyField label="Valor cobrado" name="value" defaultValue={editingService.value} />
                  </InlineForm>
                ) : null}
              </Panel>
              <Panel title="Últimos atendimentos">
                <div className="space-y-3">
                  {data.services.slice(0, 12).map((service) => (
                    <Card key={service.id}>
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold">{selectedClient(service.clientId)?.name ?? "-"}</p>
                          <p className="text-sm text-muted">
                            {safeDisplayDate(service.date)} • {selectedBarber(service.barberId)?.name ?? "-"} • {service.service}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gold">{brl.format(service.value)}</span>
                          <button onClick={() => setEditingServiceId(service.id)} className="icon-button" title="Editar atendimento">
                            <Pencil size={17} />
                          </button>
                          <DeleteButton title="Excluir atendimento" onConfirm={() => deleteById("services", service.id)} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {tab === "financeiro" && (
            <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_1fr]">
              <Panel title="Entradas">
                <ProductSaleForm products={data.products} clients={data.clients} action={sellProduct} />
                <div className="mt-5 space-y-2">
                  <Row label="Serviços no mês" value={brl.format(serviceRevenue(data.services.filter((item) => inMonth(item.date))))} />
                  <Row label="Produtos no mês" value={brl.format(sum(data.productSales.filter((item) => inMonth(item.date)).map(productSaleRevenue)))} />
                </div>
              </Panel>
              <Panel title="Saídas">
                <SmartForm action={addExpense} submit="Registrar despesa">
                  <DateField label="Data" name="date" defaultValue={todayKey()} />
                  <Field label="Categoria" name="category" placeholder="Ex.: Aluguel, produtos, taxa, limpeza" />
                  <Field label="Descrição" name="description" />
                  <MoneyField label="Valor" name="value" />
                </SmartForm>
                {editingExpense ? (
                  <InlineForm key={editingExpense.id} title="Editar despesa" submit="Salvar despesa" onCancel={() => setEditingExpenseId(null)} action={(form) => updateExpense(editingExpense, form)}>
                    <DateField label="Data" name="date" defaultValue={editingExpense.date} />
                    <Field label="Categoria" name="category" defaultValue={editingExpense.category} />
                    <Field label="Descrição" name="description" defaultValue={editingExpense.description} />
                    <MoneyField label="Valor" name="value" defaultValue={editingExpense.value} />
                  </InlineForm>
                ) : null}
                <div className="mt-5 space-y-2">
                  <Row label="Despesas hoje" value={brl.format(metrics.todayExpenses)} />
                  <Row label="Despesas semana" value={brl.format(metrics.weekExpenses)} />
                  <Row label="Despesas mês" value={brl.format(metrics.monthExpenses)} strong />
                </div>
                <div className="mt-5 space-y-3">
                  {data.expenses.slice(0, 6).map((expense) => (
                    <Card key={expense.id}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{expense.description || expense.category}</p>
                          <p className="text-sm text-muted">{safeDisplayDate(expense.date)} • {expense.category}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gold">{brl.format(expense.value)}</span>
                          <button onClick={() => setEditingExpenseId(expense.id)} className="icon-button" title="Editar despesa">
                            <Pencil size={17} />
                          </button>
                          <DeleteButton title="Excluir despesa" onConfirm={() => deleteById("expenses", expense.id)} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {tab === "shows" && (
            <div className="grid min-w-0 gap-6 xl:grid-cols-[0.85fr_1.4fr]">
              <Panel title="Cadastrar show">
                <SmartForm action={addShow} submit="Salvar show">
                  <DateField label="Data" name="date" defaultValue={todayKey()} />
                  <Field label="Horário" name="time" defaultValue="20:00" />
                  <Field label="Local" name="local" placeholder="Ex.: Bar do Zé, Buffet Floral" />
                  <Field label="Descrição" name="description" placeholder="Ex.: Noite de pagode, Festa" />
                  <MoneyField label="Cachê" name="value" />
                </SmartForm>
                {editingShow ? (
                  <InlineForm key={editingShow.id} title="Editar show" submit="Salvar show" onCancel={() => setEditingShowId(null)} action={(form) => updateShow(editingShow, form)}>
                    <DateField label="Data" name="date" defaultValue={editingShow.date} />
                    <Field label="Horário" name="time" defaultValue={editingShow.time} />
                    <Field label="Local" name="local" defaultValue={editingShow.local} />
                    <Field label="Descrição" name="description" defaultValue={editingShow.description} />
                    <MoneyField label="Cachê" name="value" defaultValue={editingShow.value} />
                  </InlineForm>
                ) : null}
              </Panel>
              <Panel title="Shows e cachês">
                <div className="space-y-3">
                  {data.shows.slice(0, 20).map((show) => (
                    <Card key={show.id}>
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold">{show.local}</p>
                          <p className="text-sm text-muted">
                            {safeDisplayDate(show.date)} • {show.time} • {show.description}
                          </p>
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => updateShowStatus(show.id, "Confirmado")}
                              className={`text-xs px-2 py-1 rounded ${show.status === "Confirmado" ? "bg-green-500/20 text-green-400" : "text-muted hover:text-green-400"}`}
                            >
                              Confirmado
                            </button>
                            <button
                              onClick={() => updateShowStatus(show.id, "Pendente")}
                              className={`text-xs px-2 py-1 rounded ${show.status === "Pendente" ? "bg-yellow-500/20 text-yellow-400" : "text-muted hover:text-yellow-400"}`}
                            >
                              Pendente
                            </button>
                            <button
                              onClick={() => updateShowStatus(show.id, "Cancelado")}
                              className={`text-xs px-2 py-1 rounded ${show.status === "Cancelado" ? "bg-red-500/20 text-red-400" : "text-muted hover:text-red-400"}`}
                            >
                              Cancelado
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gold">{brl.format(show.value)}</span>
                          <button onClick={() => setEditingShowId(show.id)} className="icon-button" title="Editar show">
                            <Pencil size={17} />
                          </button>
                          <DeleteButton title="Excluir show" onConfirm={() => deleteById("shows", show.id)} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {tab === "cofrinho" && (
            <div className="grid min-w-0 gap-6 xl:grid-cols-[0.85fr_1.4fr]">
              <Panel title="Adicionar reserva">
                <SmartForm action={addSaving} submit="Salvar reserva">
                  <DateField label="Data" name="date" defaultValue={todayKey()} />
                  <Field label="Descrição" name="description" placeholder="Ex.: Reserva cofrinho" />
                  <MoneyField label="Valor" name="value" />
                </SmartForm>
                {editingSaving ? (
                  <InlineForm key={editingSaving.id} title="Editar reserva" submit="Salvar reserva" onCancel={() => setEditingSavingId(null)} action={(form) => updateSaving(editingSaving, form)}>
                    <DateField label="Data" name="date" defaultValue={editingSaving.date} />
                    <Field label="Descrição" name="description" defaultValue={editingSaving.description} />
                    <MoneyField label="Valor" name="value" defaultValue={editingSaving.value} />
                  </InlineForm>
                ) : null}
              </Panel>
              <Panel title="Reservas (Cofrinho)">
                <div className="mb-4 rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
                  <span className="text-muted">Total reservado: </span>
                  <span className="font-semibold text-gold">{brl.format(sum(data.savings.map((s) => s.value)))}</span>
                </div>
                <div className="space-y-3">
                  {data.savings.slice(0, 20).map((saving) => (
                    <Card key={saving.id}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{saving.description || "Reserva"}</p>
                          <p className="text-sm text-muted">{safeDisplayDate(saving.date)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gold">{brl.format(saving.value)}</span>
                          <button onClick={() => setEditingSavingId(saving.id)} className="icon-button" title="Editar reserva">
                            <Pencil size={17} />
                          </button>
                          <DeleteButton title="Excluir reserva" onConfirm={() => deleteById("savings", saving.id)} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {tab === "relatorios" && (
            <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_1fr]">
              <Panel title="Resumo financeiro">
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <MiniMetric label="Receita diária" value={brl.format(metrics.today)} />
                  <MiniMetric label="Receita semanal" value={brl.format(metrics.week)} />
                  <MiniMetric label="Receita mensal" value={brl.format(metrics.month)} />
                  <MiniMetric label="Cachês do mês" value={brl.format(showRevenue(data.shows.filter((s) => inMonth(s.date))))} />
                  <MiniMetric label="Lucro líquido" value={brl.format(metrics.monthProfit)} />
                  <MiniMetric label="Total entradas" value={brl.format(totalEntries(data, () => true))} />
                  <MiniMetric label="Total saídas" value={brl.format(totalExpenses(data, () => true))} />
                  <MiniMetric label="Total cachês" value={brl.format(showRevenue(data.shows))} />
                </div>
              </Panel>
              <Panel title="Ranking de barbeiros">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.barbers.map((barber) => ({ name: barber.name.split(" ")[0], faturamento: serviceRevenue(data.services.filter((item) => item.barberId === barber.id)) }))}>
                      <CartesianGrid stroke="#2a2a2a" vertical={false} />
                      <XAxis dataKey="name" stroke="#a8a29a" />
                      <YAxis stroke="#a8a29a" />
                      <Tooltip contentStyle={{ background: "#171717", border: "1px solid #2a2a2a", borderRadius: 8 }} />
                      <Bar dataKey="faturamento" fill="#d8a63f" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
              <Panel title="Ranking de shows">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(
                      data.shows
                        .filter((s) => s.status === "Confirmado")
                        .reduce((acc, show) => {
                          acc[show.local] = (acc[show.local] || 0) + show.value;
                          return acc;
                        }, {} as Record<string, number>)
                    )
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 8)
                      .map(([local, valor]) => ({ local, valor }))}>
                      <CartesianGrid stroke="#2a2a2a" vertical={false} />
                      <XAxis dataKey="local" stroke="#a8a29a" />
                      <YAxis stroke="#a8a29a" />
                      <Tooltip contentStyle={{ background: "#171717", border: "1px solid #2a2a2a", borderRadius: 8 }} />
                      <Bar dataKey="valor" fill="#22c55e" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>
          )}

          {tab === "historico" && (
            <Panel title="Histórico financeiro">
              <div className="grid min-w-0 gap-3 md:grid-cols-[1fr_1fr_1.4fr]">
                <DateField label="Consultar dia" name="selectedDate" value={selectedDate} onDateChange={setSelectedDate} />
                <DateField label="Início do período" name="start" value={range.start} onDateChange={(value) => setRange((current) => ({ ...current, start: value }))} />
                <DateField label="Fim do período" name="end" value={range.end} onDateChange={(value) => setRange((current) => ({ ...current, end: value }))} />
              </div>
              <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-3">
                <MiniMetric label="Entradas do dia" value={brl.format(totalEntries(data, (date) => date === selectedDate))} />
                <MiniMetric label="Saídas do dia" value={brl.format(totalExpenses(data, (date) => date === selectedDate))} />
                <MiniMetric label="Lucro do dia" value={brl.format(netProfit(data, (date) => date === selectedDate))} />
              </div>
              <SearchBox query={query} setQuery={setQuery} placeholder="Buscar no histórico" />
              <div className="mt-5">
                <DataTable
                  rows={[
                    ...data.services
                      .filter((item) => item.date >= range.start && item.date <= range.end)
                      .filter((item) => (selectedClient(item.clientId)?.name ?? "").toLowerCase().includes(query.toLowerCase()))
                      .map((item) => ({
                        Data: safeDisplayDate(item.date),
                        Tipo: "Serviço",
                        Cliente: selectedClient(item.clientId)?.name ?? "-",
                        Descrição: item.service,
                        Valor: brl.format(item.value),
                      })),
                    ...data.shows
                      .filter((item) => item.date >= range.start && item.date <= range.end)
                      .filter((item) => item.local.toLowerCase().includes(query.toLowerCase()) || item.description.toLowerCase().includes(query.toLowerCase()))
                      .map((item) => ({
                        Data: safeDisplayDate(item.date),
                        Tipo: "Show",
                        Cliente: item.local,
                        Descrição: `${item.description} (${item.status})`,
                        Valor: brl.format(item.value),
                      })),
                    ...data.expenses
                      .filter((item) => item.date >= range.start && item.date <= range.end)
                      .filter((item) => item.category.toLowerCase().includes(query.toLowerCase()) || item.description.toLowerCase().includes(query.toLowerCase()))
                      .map((item) => ({
                        Data: safeDisplayDate(item.date),
                        Tipo: "Despesa",
                        Cliente: item.category,
                        Descrição: item.description,
                        Valor: brl.format(item.value),
                      })),
                    ...data.productSales
                      .filter((item) => item.date >= range.start && item.date <= range.end)
                      .map((item) => ({
                        Data: safeDisplayDate(item.date),
                        Tipo: "Produto",
                        Cliente: selectedClient(item.clientId)?.name ?? "-",
                        Descrição: `Venda de produto`,
                        Valor: brl.format(item.unitPrice * item.quantity),
                      })),
                  ].sort((a, b) => b.Data.localeCompare(a.Data))}
                />
              </div>
            </Panel>
          )}

          {tab === "produtos" && (
            <div className="grid min-w-0 gap-6 xl:grid-cols-[0.85fr_1.4fr]">
              <ProductForm action={addProduct} />
              <Panel title="Estoque e lucro">
                {editingProduct ? (
                  <InlineForm key={editingProduct.id} title="Editar produto" submit="Salvar produto" onCancel={() => setEditingProductId(null)} action={(form) => updateProduct(editingProduct, form)}>
                    <Field label="Nome" name="name" defaultValue={editingProduct.name} />
                    <Field label="Categoria" name="category" defaultValue={editingProduct.category} />
                    <DecimalField label="Estoque" name="stock" defaultValue={String(editingProduct.stock).replace(".", ",")} />
                    <MoneyField label="Custo" name="cost" defaultValue={editingProduct.cost} />
                    <MoneyField label="Preço de venda" name="price" defaultValue={editingProduct.price} />
                  </InlineForm>
                ) : null}
                {stockProduct ? (
                  <InlineForm key={`stock-${stockProduct.id}`} title={`Adicionar estoque: ${stockProduct.name}`} submit="Adicionar unidades" onCancel={() => setStockProductId(null)} action={(form) => addProductStock(stockProduct, form)}>
                    <DecimalField label="Quantidade" name="quantity" defaultValue="1" placeholder="Ex.: 10" />
                  </InlineForm>
                ) : null}
                <ProductList
                  products={visibleProducts}
                  totalProducts={data.products.length}
                  profitById={productProfitById}
                  editProduct={(product) => setEditingProductId(product.id)}
                  addProductStock={(product) => setStockProductId(product.id)}
                  deleteProduct={deleteProduct}
                />
              </Panel>
            </div>
          )}

          {tab === "agenda" && (
            <div className="grid min-w-0 gap-6 xl:grid-cols-[0.85fr_1.4fr]">
              <Panel title="Agendamento online">
                <SmartForm action={addAppointment} submit="Criar agendamento">
                  <Select label="Cliente" name="clientId" options={data.clients.map((client) => [client.id, client.name])} />
                  <Select label="Barbeiro" name="barberId" options={data.barbers.filter((barber) => barber.active).map((barber) => [barber.id, barber.name])} />
                  <DateField label="Data" name="date" defaultValue={todayKey()} />
                  <Field label="Horário" name="time" type="time" defaultValue="09:00" />
                  <Field label="Serviço" name="service" placeholder="Ex.: Corte social, barba, pigmentação" />
                </SmartForm>
                {editingAppointment ? (
                  <InlineForm key={editingAppointment.id} title="Editar agendamento" submit="Salvar agendamento" onCancel={() => setEditingAppointmentId(null)} action={(form) => updateAppointment(editingAppointment, form)}>
                    <Select label="Cliente" name="clientId" defaultValue={editingAppointment.clientId} options={data.clients.map((client) => [client.id, client.name])} />
                    <Select label="Barbeiro" name="barberId" defaultValue={editingAppointment.barberId} options={data.barbers.filter((barber) => barber.active).map((barber) => [barber.id, barber.name])} />
                    <DateField label="Data" name="date" defaultValue={editingAppointment.date} />
                    <Field label="Horário" name="time" type="time" defaultValue={editingAppointment.time} />
                    <Field label="Serviço" name="service" defaultValue={editingAppointment.service} />
                  </InlineForm>
                ) : null}
              </Panel>
              <Panel title="Calendário de horários">
                <div className="grid min-w-0 gap-3">
                  {visibleAppointments.map((appointment) => (
                      <Card key={appointment.id}>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold">{safeDisplayDate(appointment.date)} às {appointment.time}</p>
                            <p className="text-sm text-muted">{clientNameById.get(appointment.clientId) ?? "-"} • {appointment.service} • {barberNameById.get(appointment.barberId) ?? "-"}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingAppointmentId(appointment.id)} className="icon-button" title="Editar agendamento">
                              <Pencil size={17} />
                            </button>
                            <button
                              onClick={() => updateAppointmentStatus(appointment.id, appointment.status === "Confirmado" ? "Pendente" : "Confirmado")}
                              className={`icon-button ${appointment.status === "Confirmado" ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300" : ""}`}
                              title={appointment.status === "Confirmado" ? "Voltar para pendente" : "Confirmar"}
                            >
                              <CheckCircle2 size={17} />
                            </button>
                            <button
                              onClick={() => updateAppointmentStatus(appointment.id, appointment.status === "Cancelado" ? "Pendente" : "Cancelado")}
                              className={`icon-button ${appointment.status === "Cancelado" ? "border-red-500/60 bg-red-500/15 text-red-300" : ""}`}
                              title={appointment.status === "Cancelado" ? "Voltar para pendente" : "Cancelar"}
                            >
                              <XCircle size={17} />
                            </button>
                            <DeleteButton title="Excluir agendamento" onConfirm={() => deleteById("appointments", appointment.id)} />
                            <span
                              className={`rounded px-3 py-2 text-xs ${
                                appointment.status === "Confirmado"
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : appointment.status === "Cancelado"
                                    ? "bg-red-500/15 text-red-300"
                                    : "bg-ivory/10 text-muted"
                              }`}
                            >
                              {appointment.status}
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  {data.appointments.length > visibleAppointments.length ? (
                    <p className="rounded-md border border-line bg-coal p-4 text-sm text-muted">
                      Mostrando {visibleAppointments.length} de {data.appointments.length} agendamentos.
                    </p>
                  ) : null}
                </div>
              </Panel>
            </div>
          )}

          {tab === "admin" && (
            <div className="grid min-w-0 gap-6 xl:grid-cols-[0.85fr_1.4fr]">
              <Panel title="Cadastrar barbeiro">
                <SmartForm action={addBarber} submit="Salvar barbeiro">
                  <Field label="Nome" name="name" />
                  <Field label="E-mail" name="email" type="email" />
                  <MoneyField label="Comissão (%)" name="commissionRate" placeholder="Ex.: 35,00" />
                  <Select label="Permissão" name="role" options={[["Administrador", "Administrador"], ["Barbeiro", "Barbeiro"], ["Recepcao", "Recepção"]]} />
                </SmartForm>
                {editingBarber ? (
                  <InlineForm key={editingBarber.id} title="Editar barbeiro" submit="Salvar barbeiro" onCancel={() => setEditingBarberId(null)} action={(form) => updateBarber(editingBarber, form)}>
                    <Field label="Nome" name="name" defaultValue={editingBarber.name} />
                    <Field label="E-mail" name="email" type="email" defaultValue={editingBarber.email} />
                    <MoneyField label="Comissão (%)" name="commissionRate" defaultValue={editingBarber.commissionRate} placeholder="Ex.: 35,00" />
                  </InlineForm>
                ) : null}
              </Panel>
              <Panel title="Comissões e permissões">
                <div className="space-y-3">
                  {data.barbers.map((barber) => {
                    const barberServices = data.services.filter((service) => service.barberId === barber.id && inMonth(service.date));
                    return (
                      <Card key={barber.id}>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h3 className="font-semibold">{barber.name}</h3>
                            <p className="text-sm text-muted">{barber.email} • {barber.role} • {barber.commissionRate}%</p>
                          </div>
                          <div className="flex items-center gap-3 text-left md:text-right">
                            <div>
                            <p className="text-sm text-muted">Faturamento mensal</p>
                            <p className="font-semibold text-gold">{brl.format(serviceRevenue(barberServices))}</p>
                            <p className="text-sm text-muted">Comissão {brl.format(barberCommission(barber, barberServices))}</p>
                            </div>
                            <button onClick={() => setEditingBarberId(barber.id)} className="icon-button" title="Editar barbeiro">
                              <Pencil size={17} />
                            </button>
                            <DeleteButton title="Excluir barbeiro" onConfirm={() => deleteBarber(barber.id)} />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </Panel>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function SmartForm({ action, submit, children }: { action: (form: FormData) => boolean | void; submit: string; children: React.ReactNode }) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const result = action(new FormData(event.currentTarget));
        if (result !== false) event.currentTarget.reset();
      }}
    >
      {children}
      <button className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gold px-4 font-semibold text-coal transition hover:bg-gold-soft">
        <Plus size={18} />
        {submit}
      </button>
    </form>
  );
}

function NavigationItems({ activeTab, onSelect }: { activeTab: Tab; onSelect: (tab: Tab) => void }) {
  return (
    <nav className="space-y-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            className={`flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition ${
              active ? "bg-gold text-coal" : "text-muted hover:bg-ivory/5 hover:text-ivory"
            }`}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function InlineForm({
  title,
  action,
  submit,
  onCancel,
  children,
}: {
  title: string;
  action: (form: FormData) => boolean | void;
  submit: string;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <form
      className="mt-5 space-y-4 rounded-lg border border-gold/30 bg-gold/5 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const result = action(new FormData(event.currentTarget));
        if (result !== false) event.currentTarget.reset();
      }}
    >
      <h3 className="font-semibold text-gold">{title}</h3>
      {children}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-gold px-4 font-semibold text-coal transition hover:bg-gold-soft">
          <Plus size={18} />
          {submit}
        </button>
        <button type="button" onClick={onCancel} className="h-11 rounded-md border border-line px-4 font-semibold text-ivory">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function DeleteButton({ title, onConfirm }: { title: string; onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timeout = window.setTimeout(() => setConfirming(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [confirming]);

  return (
    <button
      type="button"
      onClick={() => {
        if (!confirming) {
          setConfirming(true);
          return;
        }
        onConfirm();
        setConfirming(false);
      }}
      className={
        confirming
          ? "h-10 rounded-md border border-red-500/60 bg-red-500/15 px-3 text-xs font-semibold text-red-300 transition"
          : "icon-button"
      }
      title={confirming ? "Clique novamente para confirmar" : title}
    >
      {confirming ? "Excluir?" : <Trash2 size={17} />}
    </button>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, ...input } = props;
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <input
        {...input}
        className="h-11 w-full min-w-0 rounded-md border border-line bg-coal px-3 text-ivory outline-none transition placeholder:text-muted focus:border-gold"
      />
    </label>
  );
}

function PhoneField(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, defaultValue, ...input } = props;
  const [phone, setPhone] = useState(formatPhone(defaultValue as string | number | null | undefined));
  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPhone(formatPhone(defaultValue as string | number | null | undefined));
  }, [defaultValue]);

  useEffect(() => {
    const form = fieldRef.current?.form;
    if (!form) return;
    const reset = () => setPhone(formatPhone(defaultValue as string | number | null | undefined));
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [defaultValue]);

  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <input
        {...input}
        ref={fieldRef}
        type="tel"
        inputMode="numeric"
        maxLength={16}
        value={phone}
        onChange={(event) => setPhone(formatPhone(event.target.value))}
        placeholder={input.placeholder ?? "(00) 0 0000-0000"}
        className="h-11 w-full min-w-0 rounded-md border border-line bg-coal px-3 text-ivory outline-none transition placeholder:text-muted focus:border-gold"
      />
    </label>
  );
}

function DecimalField(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, ...input } = props;
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <input
        {...input}
        type="text"
        inputMode="decimal"
        placeholder={input.placeholder ?? "Ex.: 99,90"}
        className="h-11 w-full min-w-0 rounded-md border border-line bg-coal px-3 text-ivory outline-none transition placeholder:text-muted focus:border-gold"
      />
    </label>
  );
}

function MoneyField(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, defaultValue, ...input } = props;
  const [money, setMoney] = useState(formatMoney(defaultValue as string | number | null | undefined));
  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMoney(formatMoney(defaultValue as string | number | null | undefined));
  }, [defaultValue]);

  useEffect(() => {
    const form = fieldRef.current?.form;
    if (!form) return;
    const reset = () => setMoney(formatMoney(defaultValue as string | number | null | undefined));
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [defaultValue]);

  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <input
        {...input}
        ref={fieldRef}
        type="text"
        inputMode="numeric"
        value={money}
        onChange={(event) => setMoney(formatMoneyTyping(event.target.value))}
        placeholder={input.placeholder ?? "Ex.: 99,90"}
        className="h-11 w-full min-w-0 rounded-md border border-line bg-coal px-3 text-ivory outline-none transition placeholder:text-muted focus:border-gold"
      />
    </label>
  );
}

function DateField({
  label,
  name,
  defaultValue = todayKey(),
  value,
  onDateChange,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onDateChange?: (value: string) => void;
}) {
  const initialValue = toInputDate(value ?? defaultValue, defaultValue);
  const [isoValue, setIsoValue] = useState(initialValue);
  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value === undefined) return;
    setIsoValue(toInputDate(value, defaultValue));
  }, [defaultValue, value]);

  useEffect(() => {
    const form = fieldRef.current?.form;
    if (!form || value !== undefined) return;
    const reset = () => {
      setIsoValue(toInputDate(defaultValue, defaultValue));
    };
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [defaultValue, name, value]);

  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <input
        type="date"
        ref={fieldRef}
        name={name}
        value={isoValue}
        onChange={(event) => {
          setIsoValue(event.target.value);
          onDateChange?.(event.target.value);
        }}
        className="h-11 w-full min-w-0 rounded-md border border-line bg-coal px-3 text-ivory outline-none transition placeholder:text-muted focus:border-gold"
      />
      <span className="mt-1 block text-xs text-muted">{isoValue ? toDisplayDate(isoValue) : "DD-MM-AAAA"}</span>
    </label>
  );
}

function Textarea({ label, name, defaultValue = "" }: { label: string; name: string; defaultValue?: string }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <textarea name={name} rows={4} defaultValue={defaultValue} className="w-full min-w-0 rounded-md border border-line bg-coal px-3 py-2 text-ivory outline-none transition focus:border-gold" />
    </label>
  );
}

function Select({
  label,
  name,
  options,
  defaultValue,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: string[][];
  defaultValue?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <select
        name={name}
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        onChange={onChange}
        className="h-11 w-full min-w-0 rounded-md border border-line bg-coal px-3 text-ivory outline-none transition focus:border-gold"
      >
        {options.map(([value, text]) => (
          <option key={`${name}-${value}`} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProductSaleForm({ products, clients, action }: { products: Product[]; clients: Client[]; action: (form: FormData) => boolean | void }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const selectedProduct = products.find((product) => product.id === productId) ?? products[0];

  useEffect(() => {
    if (!products.length) {
      setProductId("");
      return;
    }
    if (!products.some((product) => product.id === productId)) {
      setProductId(products[0].id);
    }
  }, [productId, products]);

  return (
    <SmartForm action={action} submit="Registrar venda">
      <Select
        label="Produto"
        name="productId"
        value={productId}
        onChange={(event) => setProductId(event.target.value)}
        options={products.map((product) => [product.id, product.name])}
      />
      <Select label="Cliente" name="clientId" options={[["", "Venda avulsa"], ...clients.map((client) => [client.id, client.name])]} />
      <DateField label="Data" name="date" defaultValue={todayKey()} />
      <DecimalField label="Quantidade" name="quantity" defaultValue="1" placeholder="Ex.: 10" />
      <MoneyField key={selectedProduct?.id ?? "empty-price"} label="Preço unitário" name="unitPrice" defaultValue={selectedProduct?.price ?? ""} />
    </SmartForm>
  );
}

function ProductForm({ action }: { action: (form: FormData) => boolean | void }) {
  return (
    <Panel title="Cadastrar produto">
      <SmartForm action={action} submit="Salvar produto">
        <Field label="Nome" name="name" />
        <Field label="Categoria" name="category" placeholder="Ex.: Pomadas, shampoos, óleos, máquinas" />
        <DecimalField label="Estoque" name="stock" defaultValue="1" placeholder="Ex.: 10" />
        <MoneyField label="Custo total do estoque" name="totalCost" placeholder="Ex.: 300,00" />
        <MoneyField label="Preço de venda" name="price" />
      </SmartForm>
    </Panel>
  );
}

function ProductList({
  products,
  totalProducts,
  profitById,
  editProduct,
  addProductStock,
  deleteProduct,
}: {
  products: Product[];
  totalProducts: number;
  profitById: Map<string, number>;
  editProduct: (product: Product) => void;
  addProductStock: (product: Product) => void;
  deleteProduct: (id: string) => void;
}) {
  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-2">
      {products.map((product) => (
          <Card key={product.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-sm text-muted">{product.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-gold/15 px-2 py-1 text-xs text-gold">{product.stock} un.</span>
                <button onClick={() => addProductStock(product)} className="icon-button" title="Adicionar estoque">
                  <Plus size={17} />
                </button>
                <button onClick={() => editProduct(product)} className="icon-button" title="Editar produto">
                  <Pencil size={17} />
                </button>
                <DeleteButton title="Excluir produto" onConfirm={() => deleteProduct(product.id)} />
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Vendidos" value={String(product.sold)} />
              <Row label="Preço" value={brl.format(product.price)} />
              <Row label="Lucro" value={brl.format(profitById.get(product.id) ?? 0)} strong />
            </div>
          </Card>
      ))}
      {totalProducts > products.length ? (
        <p className="rounded-md border border-line bg-coal p-4 text-sm text-muted md:col-span-2">
          Mostrando {products.length} de {totalProducts} produtos.
        </p>
      ) : null}
    </div>
  );
}

function SearchBox({ query, setQuery, placeholder }: { query: string; setQuery: (query: string) => void; placeholder: string }) {
  return (
    <label className="mt-4 flex h-11 items-center gap-2 rounded-md border border-line bg-coal px-3 text-muted focus-within:border-gold">
      <Search size={18} />
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} className="w-full bg-transparent text-ivory outline-none placeholder:text-muted" />
    </label>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="print-card min-w-0 overflow-hidden rounded-lg border border-line bg-panel p-4 shadow-[0_12px_45px_rgba(0,0,0,0.28)] sm:p-5">
      <h2 className="mb-5 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <article className="min-w-0 overflow-hidden rounded-lg border border-line bg-coal p-4">{children}</article>;
}

function Stat({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) {
  return (
    <article className="min-w-0 rounded-lg border border-line bg-panel p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">{title}</p>
        <Icon className="text-gold" size={20} />
      </div>
      <p className="text-2xl font-semibold">{value}</p>
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-line bg-coal p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gold">{value}</p>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 border-b border-line/70 py-2 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className={strong ? "min-w-0 break-words text-right font-semibold text-gold" : "min-w-0 break-words text-right font-medium text-ivory"}>{value}</span>
    </div>
  );
}

function DataTable({ rows }: { rows: Array<Record<string, string>> }) {
  if (!rows.length) return <p className="rounded-md border border-line bg-coal p-4 text-sm text-muted">Nenhum registro encontrado.</p>;
  const columns = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[680px] border-collapse text-left text-sm">
        <thead className="bg-coal text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-line">
              {columns.map((column) => (
                <td key={column} className="px-4 py-3">
                  {row[column]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
