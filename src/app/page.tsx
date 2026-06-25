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

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const sharedUserId = null;
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
  const lastLocalChangeRef = useRef(0);

  useEffect(() => {
    const saved = localStorage.getItem("barbearia-pro-data");
    if (saved) setData(JSON.parse(saved) as AppData);
    setLastBackup(localStorage.getItem("barbearia-pro-last-backup") || "");

    const client = supabase;
    if (!client) {
      hydratedRef.current = true;
      return;
    }

    setSyncStatus("Carregando dados do banco...");
    loadRemoteData(client, sharedUserId)
      .then(async (remoteData) => {
        if (hasData(remoteData)) {
          setData(remoteData);
          setSyncStatus("Banco conectado");
          return;
        }

        await saveRemoteData(client, sharedUserId, initialData);
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
    localStorage.setItem("barbearia-pro-data", JSON.stringify(data));
    const backup = { createdAt: new Date().toISOString(), data };
    localStorage.setItem("barbearia-pro-backup", JSON.stringify(backup));
    localStorage.setItem("barbearia-pro-last-backup", backup.createdAt);
    setLastBackup(backup.createdAt);

    const client = supabase;
    if (!hydratedRef.current || !client) return;
    lastLocalChangeRef.current = Date.now();
    const timeout = window.setTimeout(() => {
      savingRef.current = true;
      setSyncStatus("Salvando no banco...");
      saveRemoteData(client, sharedUserId, data)
        .then(() => setSyncStatus("Banco sincronizado"))
        .catch(() => setSyncStatus("Falha ao salvar no banco"))
        .finally(() => {
          savingRef.current = false;
        });
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [data]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const interval = window.setInterval(() => {
      if (savingRef.current || Date.now() - lastLocalChangeRef.current < 4000) return;
      loadRemoteData(client, sharedUserId)
        .then((remoteData) => {
          if (hasData(remoteData)) setData(remoteData);
        })
        .catch(() => undefined);
    }, 20000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${basePath}/sw.js`).catch(() => undefined);
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
      birthDate: String(form.get("birthDate") || ""),
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
      date: String(form.get("date") || todayKey()),
      service: String(form.get("service") || ""),
      customService: String(form.get("customService") || ""),
      value: Number(form.get("value") || 0),
    };
    if (!record.clientId || !record.barberId || !record.service.trim() || !record.value) return;
    setData((current) => ({ ...current, services: [record, ...current.services] }));
  };

  const addExpense = (form: FormData) => {
    const expense: Expense = {
      id: newId("e"),
      date: String(form.get("date") || todayKey()),
      category: String(form.get("category") || ""),
      description: String(form.get("description") || ""),
      value: Number(form.get("value") || 0),
    };
    if (!expense.category.trim() || !expense.value) return;
    setData((current) => ({ ...current, expenses: [expense, ...current.expenses] }));
  };

  const addProduct = (form: FormData) => {
    const product: Product = {
      id: newId("p"),
      name: String(form.get("name") || ""),
      category: String(form.get("category") || ""),
      stock: Number(form.get("stock") || 0),
      cost: Number(form.get("cost") || 0),
      price: Number(form.get("price") || 0),
      sold: 0,
    };
    if (!product.name.trim() || !product.category.trim()) return;
    setData((current) => ({ ...current, products: [product, ...current.products] }));
  };

  const sellProduct = (form: FormData) => {
    const quantity = Number(form.get("quantity") || 1);
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
      date: String(form.get("date") || todayKey()),
      quantity,
      unitPrice: Number(form.get("unitPrice") || product.price),
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
      date: String(form.get("date") || todayKey()),
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
      commissionRate: Number(form.get("commissionRate") || 0),
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
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);
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
                Backup {lastBackup ? format(parseISO(lastBackup), "dd/MM HH:mm") : "pendente"}
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
                  <Field label="Data de nascimento" name="birthDate" type="date" />
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
                            <p className="text-sm text-muted">{client.phone} • Nasc. {client.birthDate ? format(parseISO(client.birthDate), "dd/MM/yyyy") : "não informado"}</p>
                            <p className="mt-2 text-sm text-muted">{client.notes}</p>
                            <p className="mt-3 text-sm text-gold">{history.length} atendimento(s) • {brl.format(serviceRevenue(history))}</p>
                          </div>
                          <button onClick={() => deleteClient(client.id)} className="icon-button" title="Excluir cliente">
                            <Trash2 size={17} />
                          </button>
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
                  <Field label="Data" name="date" type="date" defaultValue={todayKey()} />
                  <Field label="Serviço realizado" name="service" placeholder="Ex.: Corte degradê, barba terapia, luzes" />
                  <Field label="Valor cobrado" name="value" type="number" />
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
                            {format(parseISO(service.date), "dd/MM/yyyy")} • {selectedBarber(service.barberId)?.name ?? "-"} • {service.service}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gold">{brl.format(service.value)}</span>
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
                  <Field label="Data" name="date" type="date" defaultValue={todayKey()} />
                  <Field label="Quantidade" name="quantity" type="number" defaultValue="1" />
                  <Field label="Preço unitário" name="unitPrice" type="number" />
                </SmartForm>
                <div className="mt-5 space-y-2">
                  <Row label="Serviços no mês" value={brl.format(serviceRevenue(data.services.filter((item) => inMonth(item.date))))} />
                  <Row label="Produtos no mês" value={brl.format(sum(data.productSales.filter((item) => inMonth(item.date)).map(productSaleRevenue)))} />
                </div>
              </Panel>
              <Panel title="Saídas">
                <SmartForm action={addExpense} submit="Registrar despesa">
                  <Field label="Data" name="date" type="date" defaultValue={todayKey()} />
                  <Field label="Categoria" name="category" placeholder="Ex.: Aluguel, produtos, taxa, limpeza" />
                  <Field label="Descrição" name="description" />
                  <Field label="Valor" name="value" type="number" />
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
                          <p className="text-sm text-muted">{format(parseISO(expense.date), "dd/MM/yyyy")} • {expense.category}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gold">{brl.format(expense.value)}</span>
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
                <Field label="Consultar dia" name="selectedDate" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
                <Field label="Início do período" name="start" type="date" value={range.start} onChange={(event) => setRange((current) => ({ ...current, start: event.target.value }))} />
                <Field label="Fim do período" name="end" type="date" value={range.end} onChange={(event) => setRange((current) => ({ ...current, end: event.target.value }))} />
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
                      Data: format(parseISO(item.date), "dd/MM/yyyy"),
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
                <ProductList products={data.products} productSales={data.productSales} deleteProduct={deleteProduct} />
              </Panel>
            </div>
          )}

          {tab === "agenda" && (
            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.4fr]">
              <Panel title="Agendamento online">
                <SmartForm action={addAppointment} submit="Criar agendamento">
                  <Select label="Cliente" name="clientId" options={data.clients.map((client) => [client.id, client.name])} />
                  <Select label="Barbeiro" name="barberId" options={data.barbers.filter((barber) => barber.active).map((barber) => [barber.id, barber.name])} />
                  <Field label="Data" name="date" type="date" defaultValue={todayKey()} />
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
                            <p className="font-semibold">{format(parseISO(appointment.date), "dd/MM/yyyy")} às {appointment.time}</p>
                            <p className="text-sm text-muted">{selectedClient(appointment.clientId)?.name} • {appointment.service} • {selectedBarber(appointment.barberId)?.name}</p>
                          </div>
                          <div className="flex gap-2">
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
                  <Field label="Comissão (%)" name="commissionRate" type="number" />
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
        <Field label="Estoque" name="stock" type="number" />
        <Field label="Custo" name="cost" type="number" />
        <Field label="Preço de venda" name="price" type="number" />
      </SmartForm>
    </Panel>
  );
}

function ProductList({
  products,
  productSales,
  deleteProduct,
}: {
  products: Product[];
  productSales: ProductSale[];
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
