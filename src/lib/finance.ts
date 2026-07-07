import { endOfMonth, endOfWeek, format, isValid, isWithinInterval, parseISO, startOfMonth, startOfWeek } from "date-fns";
import type { AppData, Barber, Product, ProductSale, ServiceRecord, Show } from "./types";

export const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const todayKey = () => format(new Date(), "yyyy-MM-dd");

function parseValidDate(date: string) {
  const parsed = parseISO(date);
  return isValid(parsed) ? parsed : null;
}

export function inDay(date: string, day = todayKey()) {
  return date === day;
}

export function inWeek(date: string, base = new Date()) {
  const parsed = parseValidDate(date);
  if (!parsed) return false;
  return isWithinInterval(parsed, {
    start: startOfWeek(base, { weekStartsOn: 1 }),
    end: endOfWeek(base, { weekStartsOn: 1 }),
  });
}

export function inMonth(date: string, base = new Date()) {
  const parsed = parseValidDate(date);
  if (!parsed) return false;
  return isWithinInterval(parsed, {
    start: startOfMonth(base),
    end: endOfMonth(base),
  });
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function productSaleRevenue(sale: ProductSale) {
  return sale.quantity * sale.unitPrice;
}

export function productSaleProfit(sale: ProductSale, products: Product[]) {
  const product = products.find((item) => item.id === sale.productId);
  return sale.quantity * (sale.unitPrice - (product?.cost ?? 0));
}

export function serviceRevenue(records: ServiceRecord[]) {
  return sum(records.map((record) => record.value));
}

export function productRevenue(sales: ProductSale[]) {
  return sum(sales.map(productSaleRevenue));
}

export function showRevenue(shows: Show[]) {
  return sum(shows.filter((show) => show.status === "Confirmado").map((show) => show.value));
}

export function totalEntries(data: AppData, predicate: (date: string) => boolean) {
  return serviceRevenue(data.services.filter((item) => predicate(item.date))) + productRevenue(data.productSales.filter((item) => predicate(item.date))) + showRevenue(data.shows.filter((item) => predicate(item.date)));
}

export function totalExpenses(data: AppData, predicate: (date: string) => boolean) {
  return sum(data.expenses.filter((item) => predicate(item.date)).map((item) => item.value));
}

export function barberCommission(barber: Barber, services: ServiceRecord[]) {
  const base = serviceRevenue(services.filter((service) => service.barberId === barber.id));
  return base * (barber.commissionRate / 100);
}

export function netProfit(data: AppData, predicate: (date: string) => boolean) {
  const services = data.services.filter((item) => predicate(item.date));
  const commissions = sum(data.barbers.map((barber) => barberCommission(barber, services)));
  const productProfit = sum(data.productSales.filter((item) => predicate(item.date)).map((sale) => productSaleProfit(sale, data.products)));
  return serviceRevenue(services) + productProfit + showRevenue(data.shows.filter((item) => predicate(item.date))) - totalExpenses(data, predicate) - commissions;
}

export function buildRevenueChart(data: AppData) {
  const dates = Array.from(new Set([...data.services.map((item) => item.date), ...data.productSales.map((item) => item.date), ...data.shows.map((item) => item.date)]))
    .filter((date) => Boolean(parseValidDate(date)))
    .sort();
  return dates.slice(-14).map((date) => ({
    date: format(parseISO(date), "dd/MM"),
    servicos: serviceRevenue(data.services.filter((item) => item.date === date)),
    produtos: productRevenue(data.productSales.filter((item) => item.date === date)),
    shows: showRevenue(data.shows.filter((item) => item.date === date)),
  }));
}
