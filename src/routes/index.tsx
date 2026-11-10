import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutGrid, Wallet, TrendingUp, Receipt, Plus, Trash2, ArrowUpRight, ArrowDownRight, Percent, Bell, Settings,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kroma — Dashboard" },
      { name: "description", content: "Acompanhe faturamento, despesas e lucro no seu painel pessoal Kroma." },
      { property: "og:title", content: "Kroma — Dashboard" },
      { property: "og:description", content: "Seu painel pessoal de faturamento e lucro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type Entry = { id: string; type: "receita" | "despesa"; desc: string; value: number; date: string };
const KEY = "kroma-entries";
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function seed(): Entry[] {
  const today = new Date();
  const items: [number, Entry["type"], string, number][] = [
    [6, "receita", "Projeto cliente A", 1800], [5, "despesa", "Ferramentas", 240], [4, "receita", "Consultoria", 950],
    [3, "despesa", "Anúncios", 420], [2, "receita", "Venda produto", 1320], [1, "despesa", "Internet", 120], [0, "receita", "Freela", 680],
  ];
  return items.map(([d, type, desc, value], i) => {
    const dt = new Date(today); dt.setDate(today.getDate() - d);
    return { id: String(i), type, desc, value, date: dt.toISOString().slice(0, 10) };
  });
}

const RANGES = [{ l: "7 dias", d: 7 }, { l: "30 dias", d: 30 }, { l: "90 dias", d: 90 }, { l: "Total", d: 0 }];

function Dashboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [range, setRange] = useState(30);
  const [form, setForm] = useState({ type: "receita" as Entry["type"], desc: "", value: "" });

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    setEntries(raw ? JSON.parse(raw) : seed());
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(KEY, JSON.stringify(entries)); }, [entries, loaded]);

  const filtered = useMemo(() => {
    if (!range) return entries;
    const min = new Date(); min.setDate(min.getDate() - range);
    return entries.filter((e) => new Date(e.date) >= min);
  }, [entries, range]);

  const revenue = filtered.filter((e) => e.type === "receita").reduce((s, e) => s + e.value, 0);
  const expenses = filtered.filter((e) => e.type === "despesa").reduce((s, e) => s + e.value, 0);
  const profit = revenue - expenses;
  const margin = revenue ? (profit / revenue) * 100 : 0;

  const chart = useMemo(() => {
    const map = new Map<string, { date: string; receita: number; lucro: number }>();
    [...filtered].sort((a, b) => a.date.localeCompare(b.date)).forEach((e) => {
      const k = e.date.slice(8, 10) + "/" + e.date.slice(5, 7);
      const r = map.get(k) ?? { date: k, receita: 0, lucro: 0 };
      if (e.type === "receita") { r.receita += e.value; r.lucro += e.value; } else r.lucro -= e.value;
      map.set(k, r);
    });
    return [...map.values()];
  }, [filtered]);

  const add = (ev: React.FormEvent) => {
    ev.preventDefault();
    const v = parseFloat(form.value.replace(",", "."));
    if (!form.desc.trim() || !v || v <= 0) return;
    setEntries([{ id: crypto.randomUUID(), type: form.type, desc: form.desc.trim(), value: v, date: new Date().toISOString().slice(0, 10) }, ...entries]);
    setForm({ ...form, desc: "", value: "" });
  };

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="flex min-h-screen text-foreground">
      <aside className="glass sticky top-4 m-4 hidden h-[calc(100vh-2rem)] w-20 flex-col items-center gap-3 rounded-3xl py-6 md:flex">
        <div className="glass-primary mb-4 grid h-11 w-11 place-items-center rounded-2xl font-display text-lg font-bold">K</div>
        {[LayoutGrid, Wallet, Receipt, Bell, Settings].map((I, i) => (
          <button key={i} aria-label="menu" className={`grid h-11 w-11 place-items-center rounded-2xl ${i === 0 ? "glass-primary" : "glass-btn"}`}>
            <I className="h-5 w-5" />
          </button>
        ))}
      </aside>

      <main className="flex-1 space-y-6 p-4 md:p-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.3em] text-primary">KROMA · DASHBOARD</p>
            <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">{greet}.</h1>
            <p className="mt-1 text-muted-foreground">Seu faturamento e lucro em um só lugar.</p>
          </div>
          <div className="glass flex gap-1 rounded-2xl p-1.5">
            {RANGES.map((r) => (
              <button key={r.l} onClick={() => setRange(r.d)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${range === r.d ? "glass-primary" : "hover:bg-accent"}`}>
                {r.l}
              </button>
            ))}
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat highlight icon={Wallet} label="Faturamento" value={brl(revenue)} sub="Receitas no período" />
          <Stat icon={ArrowDownRight} label="Despesas" value={brl(expenses)} sub="Custos no período" />
          <Stat icon={TrendingUp} label="Lucro líquido" value={brl(profit)} sub={profit >= 0 ? "Resultado positivo" : "Resultado negativo"} tone={profit >= 0 ? "text-success" : "text-destructive"} />
          <Stat icon={Percent} label="Margem" value={`${margin.toFixed(1)}%`} sub="Lucro ÷ faturamento" />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="glass rounded-3xl p-6 lg:col-span-2">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-bold">Desempenho</h2>
                <p className="text-sm text-muted-foreground">Faturamento e lucro por dia</p>
              </div>
              <span className="font-display text-2xl font-bold">{brl(revenue)}</span>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <defs>
                    <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--glass-border)", borderRadius: 12, color: "var(--foreground)" }} formatter={(v: number) => brl(v)} />
                  <Area type="monotone" dataKey="receita" name="Faturamento" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#gr)" />
                  <Area type="monotone" dataKey="lucro" name="Lucro" stroke="var(--chart-2)" strokeWidth={2.5} fill="url(#gl)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <form onSubmit={add} className="glass flex flex-col gap-3 rounded-3xl p-6">
            <h2 className="font-display text-xl font-bold">Novo lançamento</h2>
            <div className="glass flex gap-1 rounded-2xl p-1">
              {(["receita", "despesa"] as const).map((t) => (
                <button type="button" key={t} onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 rounded-xl py-2 text-sm font-semibold capitalize ${form.type === t ? "glass-primary" : "hover:bg-accent"}`}>{t}</button>
              ))}
            </div>
            <input value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="Descrição"
              className="glass rounded-2xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="Valor (R$)" inputMode="decimal"
              className="glass rounded-2xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <button className="glass-primary mt-auto flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold">
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          </form>
        </section>

        <section className="glass rounded-3xl p-6">
          <h2 className="mb-4 font-display text-xl font-bold">Lançamentos recentes</h2>
          <div className="space-y-2">
            {filtered.length === 0 && <p className="text-sm text-muted-foreground">Nenhum lançamento no período.</p>}
            {[...filtered].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map((e) => (
              <div key={e.id} className="glass-btn flex items-center gap-4 rounded-2xl px-4 py-3">
                <div className={`glass grid h-10 w-10 place-items-center rounded-xl ${e.type === "receita" ? "text-success" : "text-destructive"}`}>
                  {e.type === "receita" ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{e.desc}</p>
                  <p className="font-mono text-xs text-muted-foreground">{e.date.split("-").reverse().join("/")}</p>
                </div>
                <span className={`font-semibold ${e.type === "receita" ? "text-success" : "text-destructive"}`}>
                  {e.type === "receita" ? "+" : "−"} {brl(e.value)}
                </span>
                <button aria-label="Remover" onClick={() => setEntries(entries.filter((x) => x.id !== e.id))} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ icon: I, label, value, sub, highlight, tone }: { icon: typeof Wallet; label: string; value: string; sub: string; highlight?: boolean; tone?: string }) {
  return (
    <div className={`${highlight ? "glass-primary" : "glass"} rounded-3xl p-6`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <I className={`h-4 w-4 ${highlight ? "" : "text-primary"}`} /> {label}
      </div>
      <p className={`mt-3 font-display text-3xl font-bold ${tone ?? ""}`}>{value}</p>
      <p className={`mt-2 font-mono text-xs ${highlight ? "" : "text-muted-foreground"}`}>{sub}</p>
    </div>
  );
}
