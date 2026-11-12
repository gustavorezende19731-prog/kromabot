import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Trash2, Check, Plus } from "lucide-react";

type Priority = "alta" | "média" | "baixa";
type Product = { id: string; name: string; url: string; price: number; category: string; priority: Priority; bought: boolean };
type Cycle = "mensal" | "anual" | "semanal";
type Sub = { id: string; name: string; price: number; next: string; cycle: Cycle };

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const uid = () => Math.random().toString(36).slice(2, 10);
const field = "glass rounded-2xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring bg-transparent";
const btn = "glass-primary flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold";

function useStored<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => { const raw = localStorage.getItem(key); if (raw) { try { setV(JSON.parse(raw)); } catch { /* ignore */ } } setReady(true); }, [key]);
  useEffect(() => { if (ready) localStorage.setItem(key, JSON.stringify(v)); }, [key, v, ready]);
  return [v, setV] as const;
}
function daysUntil(date: string) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((new Date(date + "T00:00:00").getTime() - t.getTime()) / 86400000);
}
function advance(date: string, cycle: Cycle) {
  const d = new Date(date + "T00:00:00");
  if (cycle === "mensal") d.setMonth(d.getMonth() + 1);
  else if (cycle === "anual") d.setFullYear(d.getFullYear() + 1);
  else d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}
function domain(url: string) { try { return new URL(url).hostname.replace("www.", ""); } catch { return url; } }

export function CofreView() {
  const [tab, setTab] = useState<"compras" | "assinaturas">("compras");
  const [products, setProducts] = useStored<Product[]>("cofre-products", []);
  const [subs, setSubs] = useStored<Sub[]>("cofre-subs", []);
  const pending = products.filter((p) => !p.bought);
  const wishTotal = pending.reduce((s, p) => s + p.price, 0);
  const monthly = subs.reduce((s, x) => s + (x.cycle === "mensal" ? x.price : x.cycle === "anual" ? x.price / 12 : x.price * 4.33), 0);
  const dueSoon = subs.filter((s) => daysUntil(s.next) <= 3).length;

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-primary">KROMA · COFRE</p>
        <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">Cofre</h1>
        <p className="mt-1 text-muted-foreground">Compras planejadas e assinaturas, sob controle.</p>
      </header>
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Lista de desejos" value={brl(wishTotal)} hint={`${pending.length} itens pendentes`} />
        <Stat label="Assinaturas / mês" value={brl(monthly)} hint={`${subs.length} ativas`} />
        <Stat label="Vencendo em 3 dias" value={String(dueSoon)} hint={dueSoon ? "Atenção às cobranças" : "Tudo tranquilo"} alert={dueSoon > 0} />
      </section>
      <div className="glass inline-flex gap-1 rounded-2xl p-1.5">
        {(["compras", "assinaturas"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-xl px-5 py-2 text-sm font-semibold capitalize ${tab === t ? "glass-primary" : "hover:bg-accent"}`}>{t}</button>
        ))}
      </div>
      {tab === "compras" ? <Products items={products} setItems={setProducts} /> : <Subs items={subs} setItems={setSubs} />}
    </div>
  );
}

function Stat({ label, value, hint, alert }: { label: string; value: string; hint: string; alert?: boolean }) {
  return (
    <div className="glass rounded-3xl p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-2 font-display text-3xl font-bold ${alert ? "text-destructive" : "text-primary"}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Products({ items, setItems }: { items: Product[]; setItems: (f: (p: Product[]) => Product[]) => void }) {
  const [f, setF] = useState({ name: "", url: "", price: "", category: "", priority: "média" as Priority });
  const [filter, setFilter] = useState<"todos" | "pendentes" | "comprados">("pendentes");
  const list = useMemo(() => {
    const order: Record<Priority, number> = { alta: 0, "média": 1, baixa: 2 };
    return items.filter((p) => filter === "todos" || (filter === "comprados" ? p.bought : !p.bought)).sort((a, b) => order[a.priority] - order[b.priority]);
  }, [items, filter]);
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.url && !f.name) return;
    let url = f.url.trim();
    if (url && !/^https?:\/\//.test(url)) url = "https://" + url;
    setItems((p) => [{ id: uid(), name: f.name || domain(url), url, price: Number(f.price.replace(",", ".")) || 0, category: f.category, priority: f.priority, bought: false }, ...p]);
    setF({ name: "", url: "", price: "", category: "", priority: "média" });
  };
  return (
    <div className="space-y-6">
      <form onSubmit={add} className="glass grid gap-3 rounded-3xl p-5 md:grid-cols-6">
        <input className={`${field} md:col-span-3`} placeholder="Cole o link do produto" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
        <input className={`${field} md:col-span-3`} placeholder="Nome do produto" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={`${field} md:col-span-2`} placeholder="Preço (R$)" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        <input className={`${field} md:col-span-2`} placeholder="Categoria" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
        <select className={field} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Priority })}>
          <option value="alta">Alta</option><option value="média">Média</option><option value="baixa">Baixa</option>
        </select>
        <button className={btn}><Plus className="h-4 w-4" />Adicionar</button>
      </form>
      <div className="glass inline-flex gap-1 rounded-2xl p-1">
        {(["pendentes", "comprados", "todos"] as const).map((x) => (
          <button key={x} onClick={() => setFilter(x)} className={`rounded-xl px-4 py-1.5 text-sm font-semibold capitalize ${filter === x ? "glass-primary" : "hover:bg-accent"}`}>{x}</button>
        ))}
      </div>
      {list.length === 0 ? <Empty text="Nenhum produto aqui ainda. Cole um link acima." /> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((p) => (
            <li key={p.id} className={`glass rounded-3xl p-5 ${p.bought ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex gap-2 text-[10px] uppercase tracking-widest">
                    <span className={p.priority === "alta" ? "text-destructive" : "text-muted-foreground"}>● {p.priority}</span>
                    {p.category && <span className="text-muted-foreground">· {p.category}</span>}
                  </div>
                  <h3 className={`truncate font-display text-xl font-bold ${p.bought ? "line-through" : ""}`}>{p.name}</h3>
                  {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">{domain(p.url)} <ExternalLink className="h-3 w-3" /></a>}
                </div>
                <p className="font-display text-xl font-bold text-primary">{brl(p.price)}</p>
              </div>
              <div className="mt-4 flex gap-2 text-xs">
                <button onClick={() => setItems((l) => l.map((x) => x.id === p.id ? { ...x, bought: !x.bought } : x))} className="glass-btn flex items-center gap-1 rounded-xl px-3 py-2 font-semibold">
                  <Check className="h-3.5 w-3.5" />{p.bought ? "Desfazer" : "Comprado"}
                </button>
                <button onClick={() => setItems((l) => l.filter((x) => x.id !== p.id))} className="glass-btn flex items-center gap-1 rounded-xl px-3 py-2 text-muted-foreground"><Trash2 className="h-3.5 w-3.5" />Remover</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Subs({ items, setItems }: { items: Sub[]; setItems: (f: (p: Sub[]) => Sub[]) => void }) {
  const [f, setF] = useState({ name: "", price: "", next: "", cycle: "mensal" as Cycle });
  const sorted = [...items].sort((a, b) => a.next.localeCompare(b.next));
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name || !f.next) return;
    setItems((p) => [...p, { id: uid(), name: f.name, price: Number(f.price.replace(",", ".")) || 0, next: f.next, cycle: f.cycle }]);
    setF({ name: "", price: "", next: "", cycle: "mensal" });
  };
  return (
    <div className="space-y-6">
      <form onSubmit={add} className="glass grid gap-3 rounded-3xl p-5 md:grid-cols-6">
        <input className={`${field} md:col-span-2`} placeholder="Serviço (ex: Netflix)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={field} placeholder="Valor (R$)" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        <input className={field} type="date" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} />
        <select className={field} value={f.cycle} onChange={(e) => setF({ ...f, cycle: e.target.value as Cycle })}>
          <option value="mensal">Mensal</option><option value="anual">Anual</option><option value="semanal">Semanal</option>
        </select>
        <button className={btn}><Plus className="h-4 w-4" />Adicionar</button>
      </form>
      {sorted.length === 0 ? <Empty text="Nenhuma assinatura cadastrada." /> : (
        <ul className="space-y-2">
          {sorted.map((s) => {
            const d = daysUntil(s.next);
            const tone = d < 0 ? "text-destructive" : d <= 3 ? "text-primary" : "text-muted-foreground";
            const label = d < 0 ? `Venceu há ${-d} dia(s)` : d === 0 ? "Cobra hoje" : d === 1 ? "Amanhã" : `Em ${d} dias`;
            return (
              <li key={s.id} className="glass flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5">
                <div>
                  <h3 className="font-display text-xl font-bold">{s.name}</h3>
                  <p className="text-xs capitalize text-muted-foreground">{s.cycle} · próxima em {new Date(s.next + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-semibold ${tone}`}>{label}</span>
                  <span className="font-display text-xl font-bold text-primary">{brl(s.price)}</span>
                  <button onClick={() => setItems((l) => l.map((x) => x.id === s.id ? { ...x, next: advance(x.next, x.cycle) } : x))} className="glass-btn rounded-xl px-3 py-2 text-xs font-semibold">Paga ✓</button>
                  <button aria-label="Remover" onClick={() => setItems((l) => l.filter((x) => x.id !== s.id))} className="glass-btn rounded-xl p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="glass rounded-3xl border-dashed p-12 text-center text-muted-foreground">{text}</div>;
}
