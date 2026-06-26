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
  productSaleProfit,
  productSaleRevenue,
  serviceRevenue,
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
  ServiceRecord,
} from "@/lib/types";
import { loadRemoteData, saveRemoteData } from "@/lib/database";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const sharedUserId = null;
const databaseTimeoutMs = 12000;
const serializeData = (items: AppData) => JSON.stringify(items);
const hasData = (items: AppData) =>
  items.clients.length ||
  items.barbers.length ||
  items.services.length ||
  items.expenses.length ||
  items.products.length ||
  items.productSales.length ||
  items.appointments.length;

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
};

type Tab = "dashboard" | "clientes" | "servicos" | "financeiro" | "relatorios" | "historico" | "produtos" | "agenda" | "admin";

const navItems: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
  { key: "dashboard", label: "Dashboard", icon: TrendingUp },
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "servicos", label: "Serviços", icon: Scissors },
  { key: "financeiro", label: "Financeiro", icon: BadgeDollarSign },
  { key: "relatorios", label: "Relatórios", icon: ClipboardList },
  { key: "historico", label: "Histórico", icon: CalendarClock },
  { key: "produtos", label: "Produtos", icon: Package },
  { key: "agenda", label: "Agenda", icon: CheckCircle2 },
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

const promptText = (label: string, current = "") => {
  const value = window.prompt(label, current);
  return value === null ? null : value.trim();
};

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

const promptNumber = (label: string, current: number) => {
  const value = window.prompt(label, String(current));
  if (value === null) return null;
  const parsed = parseDecimal(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
};

const promptChoice = (label: string, options: Array<{ id: string; text: string }>, currentId: string) => {
  const currentIndex = Math.max(0, options.findIndex((option) => option.id === currentId));
  const list = options.map((option, index) => `${index + 1} - ${option.text}`).join("\n");
  const value = window.prompt(`${label}\n${list}`, String(currentIndex + 1));
  if (value === null) return null;
  const index = Number(value) - 1;
  return options[index]?.id ?? null;
};

export default function Home() {
  const [data, setData] = useState<AppData>(initialData);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [range, setRange] = useState({ start: format(subDays(new Date(), 7), "yyyy-MM-dd"), end: todayKey() });
  const [lastBackup, setLastBackup] = useState("");
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? "Conectando ao banco..." : "Modo local ativo");
  const [notice, setNotice] = useState("");
  const hydratedRef = useRef(false);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);
  const suppressNextSaveRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const latestDataRef = useRef(data);
  const lastSavedDataRef = useRef<AppData | undefined>(undefined);
  const lastSnapshotRef = useRef(serializeData(initialData));
  const lastLocalChangeRef = useRef(0);

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
        lastSnapshotRef.current = serializeData(latestDataRef.current);
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
    dirtyRef.current = true;
    lastLocalChangeRef.current = Date.now();
    setSyncStatus("Alteração pendente");
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(flushSave, 1500);
  };

  useEffect(() => {
    const saved = localStorage.getItem("barbearia-pro-data");
    if (saved) {
      try {
        const localData = JSON.parse(saved) as AppData;
        latestDataRef.current = localData;
        lastSnapshotRef.current = serializeData(localData);
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
      .then(async (remoteData) => {
        if (hasData(remoteData)) {
          suppressNextSaveRef.current = true;
          latestDataRef.current = remoteData;
          lastSavedDataRef.current = remoteData;
          lastSnapshotRef.current = serializeData(remoteData);
          setData(remoteData);
          setSyncStatus("Banco conectado");
          return;
        }

        await withTimeout(saveRemoteData(client, sharedUserId, initialData), "Inicialização do banco");
        lastSavedDataRef.current = initialData;
        lastSnapshotRef.current = serializeData(initialData);
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
    try {
      localStorage.setItem("barbearia-pro-data", JSON.stringify(data));
      const backup = { createdAt: new Date().toISOString(), data };
      localStorage.setItem("barbearia-pro-backup", JSON.stringify(backup));
      localStorage.setItem("barbearia-pro-last-backup", backup.createdAt);
      setLastBackup(backup.createdAt);
    } catch {
      setSyncStatus("Armazenamento local cheio, usando banco");
    }

    if (suppressNextSaveRef.current) {
      suppressNextSaveRef.current = false;
      return;
    }

    const snapshot = serializeData(data);
    if (snapshot === lastSnapshotRef.current) return;
    scheduleSave();
  }, [data]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const interval = window.setInterval(() => {
      if (savingRef.current || dirtyRef.current || Date.now() - lastLocalChangeRef.current < 8000) return;
      withTimeout(loadRemoteData(client, sharedUserId), "Atualização do banco")
        .then((remoteData) => {
          if (!hasData(remoteData)) return;
          const snapshot = serializeData(remoteData);
          if (snapshot === lastSnapshotRef.current) return;
          suppressNextSaveRef.current = true;
          latestDataRef.current = remoteData;
          lastSavedDataRef.current = remoteData;
          lastSnapshotRef.current = snapshot;
          setData(remoteData);
          setSyncStatus("Banco atualizado");
        })
        .catch(() => undefined);
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
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
    const product: Product = {
      id: newId("p"),
      name: String(form.get("name") || ""),
      category: String(form.get("category") || ""),
      stock: parseDecimal(form.get("stock")),
      cost: parseDecimal(form.get("cost")),
      price: parseDecimal(form.get("price")),
      sold: 0,
    };
    if (!product.name.trim() || !product.category.trim()) return;
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

  const editClient = (client: Client) => {
    const name = promptText("Nome completo", client.name);
    if (name === null || !name) return;
    const phone = promptText("Telefone", client.phone);
    if (phone === null) return;
    const birthDateValue = promptText("Data de nascimento (DD-MM-AAAA)", toDisplayDate(client.birthDate));
    const birthDate = birthDateValue === null ? null : toInputDate(birthDateValue, "");
    if (birthDate === null) return;
    const notes = window.prompt("Observações", client.notes);
    if (notes === null) return;
    setData((current) => ({
      ...current,
      clients: current.clients.map((item) => (item.id === client.id ? { ...item, name, phone, birthDate, notes } : item)),
    }));
  };

  const editService = (service: ServiceRecord) => {
    const clientId = promptChoice("Cliente", data.clients.map((client) => ({ id: client.id, text: client.name })), service.clientId);
    if (clientId === null) return;
    const barberId = promptChoice("Barbeiro", data.barbers.map((barber) => ({ id: barber.id, text: barber.name })), service.barberId);
    if (barberId === null) return;
    const dateValue = promptText("Data do atendimento (DD-MM-AAAA)", toDisplayDate(service.date));
    const date = dateValue === null ? null : toInputDate(dateValue, service.date);
    if (date === null || !date) return;
    const serviceName = promptText("Serviço realizado", service.service);
    if (serviceName === null || !serviceName) return;
    const value = promptNumber("Valor cobrado", service.value);
    if (value === null || value <= 0) return;
    setData((current) => ({
      ...current,
      services: current.services.map((item) => (item.id === service.id ? { ...item, clientId, barberId, date, service: serviceName, value } : item)),
    }));
  };

  const editExpense = (expense: Expense) => {
    const dateValue = promptText("Data da despesa (DD-MM-AAAA)", toDisplayDate(expense.date));
    const date = dateValue === null ? null : toInputDate(dateValue, expense.date);
    if (date === null || !date) return;
    const category = promptText("Categoria", expense.category);
    if (category === null || !category) return;
    const description = promptText("Descrição", expense.description);
    if (description === null) return;
    const value = promptNumber("Valor", expense.value);
    if (value === null || value <= 0) return;
    setData((current) => ({
      ...current,
      expenses: current.expenses.map((item) => (item.id === expense.id ? { ...item, date, category, description, value } : item)),
    }));
  };

  const editProduct = (product: Product) => {
    const name = promptText("Nome do produto", product.name);
    if (name === null || !name) return;
    const category = promptText("Categoria", product.category);
    if (category === null || !category) return;
    const stock = promptNumber("Estoque total", product.stock);
    if (stock === null || stock < 0) return;
    const cost = promptNumber("Custo", product.cost);
    if (cost === null || cost < 0) return;
    const price = promptNumber("Preço de venda", product.price);
    if (price === null || price < 0) return;
    setData((current) => ({
      ...current,
      products: current.products.map((item) => (item.id === product.id ? { ...item, name, category, stock, cost, price } : item)),
    }));
  };

  const addProductStock = (product: Product) => {
    const quantity = promptNumber(`Adicionar quantas unidades em ${product.name}?`, 1);
    if (quantity === null || quantity <= 0) return;
    setData((current) => ({
      ...current,
      products: current.products.map((item) => (item.id === product.id ? { ...item, stock: item.stock + quantity } : item)),
    }));
    setNotice(`Estoque atualizado: ${product.name} recebeu ${quantity} un.`);
  };

  const editAppointment = (appointment: Appointment) => {
    const clientId = promptChoice("Cliente", data.clients.map((client) => ({ id: client.id, text: client.name })), appointment.clientId);
    if (clientId === null) return;
    const barberId = promptChoice("Barbeiro", data.barbers.map((barber) => ({ id: barber.id, text: barber.name })), appointment.barberId);
    if (barberId === null) return;
    const dateValue = promptText("Data do agendamento (DD-MM-AAAA)", toDisplayDate(appointment.date));
    const date = dateValue === null ? null : toInputDate(dateValue, appointment.date);
    if (date === null || !date) return;
    const time = promptText("Horário (HH:MM)", appointment.time);
    if (time === null || !time) return;
    const service = promptText("Serviço", appointment.service);
    if (service === null || !service) return;
    setData((current) => ({
      ...current,
      appointments: current.appointments.map((item) => (item.id === appointment.id ? { ...item, clientId, barberId, date, time, service } : item)),
    }));
  };

  const editBarber = (barber: Barber) => {
    const name = promptText("Nome do barbeiro", barber.name);
    if (name === null || !name) return;
    const email = promptText("E-mail", barber.email);
    if (email === null) return;
    const commissionRate = promptNumber("Comissão (%)", barber.commissionRate);
    if (commissionRate === null || commissionRate < 0) return;
    setData((current) => ({
      ...current,
      barbers: current.barbers.map((item) => (item.id === barber.id ? { ...item, name, email, commissionRate } : item)),
    }));
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
    doc.text("Relatório BRAVOS BARBEARIA", 14, 18);
    doc.setFontSize(11);
    doc.text(`Gerado em ${format(new Date(), "dd-MM-yyyy HH:mm")}`, 14, 28);
    const lines = [
      `Receita diária: ${brl.format(metrics.today)}`,
      `Receita semanal: ${brl.format(metrics.week)}`,
      `Receita mensal: ${brl.format(metrics.month)}`,
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

  return (
    <main className="min-h-screen">
      <aside className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-coal/95 px-2 py-2 backdrop-blur lg:inset-y-0 lg:left-0 lg:right-auto lg:w-72 lg:border-r lg:border-t-0 lg:p-5">
        <div className="mb-8 hidden items-center gap-3 lg:flex">
          <div className="grid size-11 place-items-center rounded-md border border-gold/50 bg-gold/10 text-gold">
            <Scissors size={24} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">BRAVOS BARBEARIA</h1>
            <p className="text-xs text-muted">{syncStatus}</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto lg:block lg:space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`flex min-w-20 flex-1 items-center justify-center gap-2 rounded-md px-3 py-3 text-xs font-medium transition lg:w-full lg:justify-start lg:text-sm ${
                  active ? "bg-gold text-coal" : "text-muted hover:bg-ivory/5 hover:text-ivory"
                }`}
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="pb-28 lg:ml-72 lg:pb-0">
        <header className="no-print sticky top-0 z-20 border-b border-line bg-coal/86 px-4 py-4 backdrop-blur lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-gold">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
              <h2 className="text-2xl font-semibold md:text-3xl">{navItems.find((item) => item.key === tab)?.label}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={exportPdf} className="icon-button w-auto px-4" title="Exportar PDF">
                <Download size={18} />
                PDF
              </button>
              <span className="hidden rounded-md border border-line bg-panel px-3 py-2 text-xs text-muted md:inline">
                Backup {safeBackupDate(lastBackup)}
              </span>
            </div>
          </div>
        </header>

        <div className="space-y-6 px-4 py-6 lg:px-8">
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
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <Stat title="Faturado hoje" value={brl.format(metrics.today)} icon={BadgeDollarSign} />
                <Stat title="Faturado semana" value={brl.format(metrics.week)} icon={TrendingUp} />
                <Stat title="Faturado mês" value={brl.format(metrics.month)} icon={CreditCard} />
                <Stat title="Atendimentos hoje" value={String(metrics.todayCount)} icon={Scissors} />
                <Stat title="Ticket médio" value={brl.format(metrics.averageTicket)} icon={Users} />
              </div>
              <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
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
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
                <Panel title="Lucro líquido">
                  <div className="space-y-3">
                    <Row label="Hoje" value={brl.format(metrics.todayProfit)} />
                    <Row label="Semana" value={brl.format(metrics.weekProfit)} />
                    <Row label="Mês" value={brl.format(metrics.monthProfit)} strong />
                    <Row label="Despesas do mês" value={brl.format(metrics.monthExpenses)} />
                  </div>
                </Panel>
              </div>
            </>
          )}

          {tab === "clientes" && (
            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.4fr]">
              <Panel title="Cadastrar cliente">
                <SmartForm action={addClient} submit="Salvar cliente">
                  <Field label="Nome completo" name="name" />
                  <Field label="Telefone" name="phone" />
                  <DateField label="Data de nascimento" name="birthDate" defaultValue="" />
                  <Textarea label="Observações" name="notes" />
                </SmartForm>
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
                            <button onClick={() => editClient(client)} className="icon-button" title="Editar cliente">
                              <Pencil size={17} />
                            </button>
                            <button onClick={() => deleteClient(client.id)} className="icon-button" title="Excluir cliente">
                              <Trash2 size={17} />
                            </button>
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
            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.4fr]">
              <Panel title="Finalizar atendimento">
                <SmartForm action={addService} submit="Registrar serviço">
                  <Select label="Cliente" name="clientId" options={data.clients.map((client) => [client.id, client.name])} />
                  <Select label="Barbeiro" name="barberId" options={data.barbers.filter((barber) => barber.active).map((barber) => [barber.id, barber.name])} />
                  <DateField label="Data" name="date" defaultValue={todayKey()} />
                  <Field label="Serviço realizado" name="service" placeholder="Ex.: Corte degradê, barba terapia, luzes" />
                  <DecimalField label="Valor cobrado" name="value" />
                </SmartForm>
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
                          <button onClick={() => editService(service)} className="icon-button" title="Editar atendimento">
                            <Pencil size={17} />
                          </button>
                          <button onClick={() => deleteById("services", service.id)} className="icon-button" title="Excluir atendimento">
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {tab === "financeiro" && (
            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <Panel title="Entradas">
                <SmartForm action={sellProduct} submit="Registrar venda">
                  <Select label="Produto" name="productId" options={data.products.map((product) => [product.id, product.name])} />
                  <Select label="Cliente" name="clientId" options={[["", "Venda avulsa"], ...data.clients.map((client) => [client.id, client.name])]} />
                  <DateField label="Data" name="date" defaultValue={todayKey()} />
                  <DecimalField label="Quantidade" name="quantity" defaultValue="1" />
                  <DecimalField label="Preço unitário" name="unitPrice" />
                </SmartForm>
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
                  <DecimalField label="Valor" name="value" />
                </SmartForm>
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
                          <button onClick={() => editExpense(expense)} className="icon-button" title="Editar despesa">
                            <Pencil size={17} />
                          </button>
                          <button onClick={() => deleteById("expenses", expense.id)} className="icon-button" title="Excluir despesa">
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {tab === "relatorios" && (
            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <Panel title="Resumo financeiro">
                <div className="grid gap-3 sm:grid-cols-2">
                  <MiniMetric label="Receita diária" value={brl.format(metrics.today)} />
                  <MiniMetric label="Receita semanal" value={brl.format(metrics.week)} />
                  <MiniMetric label="Receita mensal" value={brl.format(metrics.month)} />
                  <MiniMetric label="Lucro líquido" value={brl.format(metrics.monthProfit)} />
                  <MiniMetric label="Total entradas" value={brl.format(totalEntries(data, () => true))} />
                  <MiniMetric label="Total saídas" value={brl.format(totalExpenses(data, () => true))} />
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
            </div>
          )}

          {tab === "historico" && (
            <Panel title="Histórico financeiro">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.4fr]">
                <DateField label="Consultar dia" name="selectedDate" value={selectedDate} onDateChange={setSelectedDate} />
                <DateField label="Início do período" name="start" value={range.start} onDateChange={(value) => setRange((current) => ({ ...current, start: value }))} />
                <DateField label="Fim do período" name="end" value={range.end} onDateChange={(value) => setRange((current) => ({ ...current, end: value }))} />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MiniMetric label="Entradas do dia" value={brl.format(totalEntries(data, (date) => date === selectedDate))} />
                <MiniMetric label="Saídas do dia" value={brl.format(totalExpenses(data, (date) => date === selectedDate))} />
                <MiniMetric label="Lucro do dia" value={brl.format(netProfit(data, (date) => date === selectedDate))} />
              </div>
              <SearchBox query={query} setQuery={setQuery} placeholder="Buscar cliente no histórico" />
              <div className="mt-5">
                <DataTable
                  rows={data.services
                    .filter((item) => item.date >= range.start && item.date <= range.end)
                    .filter((item) => (selectedClient(item.clientId)?.name ?? "").toLowerCase().includes(query.toLowerCase()))
                    .map((item) => ({
                      Data: safeDisplayDate(item.date),
                      Cliente: selectedClient(item.clientId)?.name ?? "-",
                      Barbeiro: selectedBarber(item.barberId)?.name ?? "-",
                      Serviço: item.service,
                      Valor: brl.format(item.value),
                    }))}
                />
              </div>
            </Panel>
          )}

          {tab === "produtos" && (
            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.4fr]">
              <ProductForm action={addProduct} />
              <Panel title="Estoque e lucro">
                <ProductList products={data.products} productSales={data.productSales} editProduct={editProduct} addProductStock={addProductStock} deleteProduct={deleteProduct} />
              </Panel>
            </div>
          )}

          {tab === "agenda" && (
            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.4fr]">
              <Panel title="Agendamento online">
                <SmartForm action={addAppointment} submit="Criar agendamento">
                  <Select label="Cliente" name="clientId" options={data.clients.map((client) => [client.id, client.name])} />
                  <Select label="Barbeiro" name="barberId" options={data.barbers.filter((barber) => barber.active).map((barber) => [barber.id, barber.name])} />
                  <DateField label="Data" name="date" defaultValue={todayKey()} />
                  <Field label="Horário" name="time" type="time" defaultValue="09:00" />
                  <Field label="Serviço" name="service" placeholder="Ex.: Corte social, barba, pigmentação" />
                </SmartForm>
              </Panel>
              <Panel title="Calendário de horários">
                <div className="grid gap-3">
                  {data.appointments
                    .slice()
                    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
                    .map((appointment) => (
                      <Card key={appointment.id}>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold">{safeDisplayDate(appointment.date)} às {appointment.time}</p>
                            <p className="text-sm text-muted">{selectedClient(appointment.clientId)?.name} • {appointment.service} • {selectedBarber(appointment.barberId)?.name}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => editAppointment(appointment)} className="icon-button" title="Editar agendamento">
                              <Pencil size={17} />
                            </button>
                            <button onClick={() => updateAppointmentStatus(appointment.id, "Confirmado")} className="icon-button" title="Confirmar">
                              <CheckCircle2 size={17} />
                            </button>
                            <button onClick={() => updateAppointmentStatus(appointment.id, "Cancelado")} className="icon-button" title="Cancelar">
                              <XCircle size={17} />
                            </button>
                            <button onClick={() => deleteById("appointments", appointment.id)} className="icon-button" title="Excluir agendamento">
                              <Trash2 size={17} />
                            </button>
                            <span className="rounded bg-ivory/10 px-3 py-2 text-xs text-muted">{appointment.status}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              </Panel>
            </div>
          )}

          {tab === "admin" && (
            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.4fr]">
              <Panel title="Cadastrar barbeiro">
                <SmartForm action={addBarber} submit="Salvar barbeiro">
                  <Field label="Nome" name="name" />
                  <Field label="E-mail" name="email" type="email" />
                  <DecimalField label="Comissão (%)" name="commissionRate" />
                  <Select label="Permissão" name="role" options={[["Administrador", "Administrador"], ["Barbeiro", "Barbeiro"], ["Recepcao", "Recepção"]]} />
                </SmartForm>
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
                            <button onClick={() => editBarber(barber)} className="icon-button" title="Editar barbeiro">
                              <Pencil size={17} />
                            </button>
                            <button onClick={() => deleteBarber(barber.id)} className="icon-button" title="Excluir barbeiro">
                              <Trash2 size={17} />
                            </button>
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

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, ...input } = props;
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <input
        {...input}
        className="h-11 w-full rounded-md border border-line bg-coal px-3 text-ivory outline-none transition placeholder:text-muted focus:border-gold"
      />
    </label>
  );
}

function DecimalField(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, ...input } = props;
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <input
        {...input}
        type="text"
        inputMode="decimal"
        placeholder={input.placeholder ?? "Ex.: 99,90"}
        className="h-11 w-full rounded-md border border-line bg-coal px-3 text-ivory outline-none transition placeholder:text-muted focus:border-gold"
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
    <label className="block">
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
        className="h-11 w-full rounded-md border border-line bg-coal px-3 text-ivory outline-none transition placeholder:text-muted focus:border-gold"
      />
      <span className="mt-1 block text-xs text-muted">{isoValue ? toDisplayDate(isoValue) : "DD-MM-AAAA"}</span>
    </label>
  );
}

function Textarea({ label, name }: { label: string; name: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <textarea name={name} rows={4} className="w-full rounded-md border border-line bg-coal px-3 py-2 text-ivory outline-none transition focus:border-gold" />
    </label>
  );
}

function Select({ label, name, options }: { label: string; name: string; options: string[][] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <select name={name} className="h-11 w-full rounded-md border border-line bg-coal px-3 text-ivory outline-none transition focus:border-gold">
        {options.map(([value, text]) => (
          <option key={`${name}-${value}`} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProductForm({ action }: { action: (form: FormData) => void }) {
  return (
    <Panel title="Cadastrar produto">
      <SmartForm action={action} submit="Salvar produto">
        <Field label="Nome" name="name" />
        <Field label="Categoria" name="category" placeholder="Ex.: Pomadas, shampoos, óleos, máquinas" />
        <DecimalField label="Estoque" name="stock" placeholder="Ex.: 10" />
        <DecimalField label="Custo" name="cost" />
        <DecimalField label="Preço de venda" name="price" />
      </SmartForm>
    </Panel>
  );
}

function ProductList({
  products,
  productSales,
  editProduct,
  addProductStock,
  deleteProduct,
}: {
  products: Product[];
  productSales: ProductSale[];
  editProduct: (product: Product) => void;
  addProductStock: (product: Product) => void;
  deleteProduct: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {products.map((product) => {
        const sales = productSales.filter((sale) => sale.productId === product.id);
        return (
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
                <button onClick={() => deleteProduct(product.id)} className="icon-button" title="Excluir produto">
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Vendidos" value={String(product.sold)} />
              <Row label="Preço" value={brl.format(product.price)} />
              <Row label="Lucro" value={brl.format(sum(sales.map((sale) => productSaleProfit(sale, products))))} strong />
            </div>
          </Card>
        );
      })}
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
    <section className="print-card rounded-lg border border-line bg-panel p-5 shadow-[0_12px_45px_rgba(0,0,0,0.28)]">
      <h2 className="mb-5 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <article className="rounded-lg border border-line bg-coal p-4">{children}</article>;
}

function Stat({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) {
  return (
    <article className="rounded-lg border border-line bg-panel p-4">
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
    <div className="rounded-md border border-line bg-coal p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gold">{value}</p>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/70 py-2 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className={strong ? "font-semibold text-gold" : "font-medium text-ivory"}>{value}</span>
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
