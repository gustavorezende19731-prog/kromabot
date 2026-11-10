import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "../lib/supabase";
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
  const [tab, setTab] = useState<TabId>("dashboard");
  const [profile, setProfile] = useState<Profile>({ name: "", nick: "", photo: "" });
  useEffect(() => {
    const raw = localStorage.getItem("kroma-profile");
    if (raw) setProfile(JSON.parse(raw));
  }, []);
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
      <aside className="glass sticky top-4 z-40 m-4 hidden h-[calc(100vh-2rem)] w-20 flex-col items-center gap-3 rounded-3xl py-6 md:flex">
        <ProfileMenu profile={profile} setProfile={setProfile} />
        {TABS.map((t) => (
          <button key={t.id} aria-label={t.label} title={t.label} onClick={() => setTab(t.id)}
            className={`grid h-11 w-11 place-items-center rounded-2xl ${tab === t.id ? "glass-primary" : "glass-btn"}`}>
            <t.icon className="h-5 w-5" />
          </button>
        ))}
        <ColorSettings />
      </aside>

      <main className="relative z-0 flex-1 space-y-6 p-4 pb-28 md:p-8">
        <nav className="glass fixed inset-x-4 bottom-4 z-40 flex items-center justify-around rounded-3xl p-2 md:hidden">
          <ProfileMenu profile={profile} setProfile={setProfile} mobile />
          {TABS.map((t) => (
            <button key={t.id} aria-label={t.label} onClick={() => setTab(t.id)}
              className={`grid h-11 w-11 place-items-center rounded-2xl ${tab === t.id ? "glass-primary" : ""}`}>
              <t.icon className="h-5 w-5" />
            </button>
          ))}
        </nav>
        {tab === "carteira" && <WalletView entries={entries} />}
        {tab === "lancamentos" && <EntriesView entries={entries} onRemove={(id) => setEntries(entries.filter((x) => x.id !== id))} />}
        {tab === "alertas" && <AlertsView entries={entries} />}
        {tab === "dashboard" && <>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.3em] text-primary">KROMA · DASHBOARD</p>
            <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">{greet}{profile.nick || profile.name ? `, ${profile.nick || profile.name}` : ""}.</h1>
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
        </>}
      </main>
    </div>
  );
}

type TabId = "dashboard" | "carteira" | "lancamentos" | "alertas";
const TABS: { id: TabId; label: string; icon: typeof Wallet }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "carteira", label: "Carteira", icon: Wallet },
  { id: "lancamentos", label: "Lançamentos", icon: Receipt },
  { id: "alertas", label: "Alertas", icon: Bell },
];

function PageHeader({ tag, title, sub }: { tag: string; title: string; sub: string }) {
  return (
    <header>
      <p className="font-mono text-xs tracking-[0.3em] text-primary">KROMA · {tag}</p>
      <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">{title}</h1>
      <p className="mt-1 text-muted-foreground">{sub}</p>
    </header>
  );
}

const sum = (es: Entry[], t: Entry["type"]) => es.filter((e) => e.type === t).reduce((s, e) => s + e.value, 0);

function WalletView({ entries }: { entries: Entry[] }) {
  const months = new Map<string, Entry[]>();
  entries.forEach((e) => { const k = e.date.slice(0, 7); months.set(k, [...(months.get(k) ?? []), e]); });
  const rows = [...months.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const rev = sum(entries, "receita"), exp = sum(entries, "despesa");
  return (
    <div className="space-y-6">
      <PageHeader tag="CARTEIRA" title="Carteira" sub="Seu saldo acumulado e resultado mês a mês." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat highlight icon={Wallet} label="Saldo total" value={brl(rev - exp)} sub="Receitas − despesas" />
        <Stat icon={ArrowUpRight} label="Entradas" value={brl(rev)} sub="Desde o início" tone="text-success" />
        <Stat icon={ArrowDownRight} label="Saídas" value={brl(exp)} sub="Desde o início" tone="text-destructive" />
      </div>
      <section className="glass rounded-3xl p-6">
        <h2 className="mb-4 font-display text-xl font-bold">Por mês</h2>
        <div className="space-y-2">
          {rows.map(([m, es]) => {
            const r = sum(es, "receita"), d = sum(es, "despesa");
            return (
              <div key={m} className="glass-btn grid grid-cols-4 items-center gap-2 rounded-2xl px-4 py-3 text-sm">
                <span className="font-mono">{m.slice(5)}/{m.slice(0, 4)}</span>
                <span className="text-success">{brl(r)}</span>
                <span className="text-destructive">{brl(d)}</span>
                <span className="text-right font-semibold">{brl(r - d)}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function EntriesView({ entries, onRemove }: { entries: Entry[]; onRemove: (id: string) => void }) {
  const [f, setF] = useState<"todos" | Entry["type"]>("todos");
  const list = entries.filter((e) => f === "todos" || e.type === f).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="space-y-6">
      <PageHeader tag="LANÇAMENTOS" title="Lançamentos" sub="Todas as suas receitas e despesas." />
      <div className="glass inline-flex gap-1 rounded-2xl p-1.5">
        {(["todos", "receita", "despesa"] as const).map((t) => (
          <button key={t} onClick={() => setF(t)} className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize ${f === t ? "glass-primary" : "hover:bg-accent"}`}>{t}</button>
        ))}
      </div>
      <section className="glass space-y-2 rounded-3xl p-6">
        {list.length === 0 && <p className="text-sm text-muted-foreground">Nenhum lançamento.</p>}
        {list.map((e) => (
          <div key={e.id} className="glass-btn flex items-center gap-4 rounded-2xl px-4 py-3">
            <div className={`glass grid h-10 w-10 place-items-center rounded-xl ${e.type === "receita" ? "text-success" : "text-destructive"}`}>
              {e.type === "receita" ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{e.desc}</p>
              <p className="font-mono text-xs text-muted-foreground">{e.date.split("-").reverse().join("/")}</p>
            </div>
            <span className={`font-semibold ${e.type === "receita" ? "text-success" : "text-destructive"}`}>{e.type === "receita" ? "+" : "−"} {brl(e.value)}</span>
            <button aria-label="Remover" onClick={() => onRemove(e.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </section>
    </div>
  );
}

function AlertsView({ entries }: { entries: Entry[] }) {
  const min = new Date(); min.setDate(min.getDate() - 30);
  const recent = entries.filter((e) => new Date(e.date) >= min);
  const r = sum(recent, "receita"), d = sum(recent, "despesa");
  const margin = r ? ((r - d) / r) * 100 : 0;
  const biggest = [...recent].filter((e) => e.type === "despesa").sort((a, b) => b.value - a.value)[0];
  const alerts = [
    r - d < 0 ? { t: "Lucro negativo", m: `Nos últimos 30 dias você gastou ${brl(d - r)} a mais do que faturou.`, bad: true }
      : { t: "Lucro positivo", m: `Você lucrou ${brl(r - d)} nos últimos 30 dias.`, bad: false },
    { t: "Margem de lucro", m: `Sua margem está em ${margin.toFixed(1)}%${margin < 30 ? " — abaixo de 30%, vale revisar custos." : "."}`, bad: margin < 30 },
    biggest && { t: "Maior despesa", m: `${biggest.desc}: ${brl(biggest.value)}.`, bad: false },
    recent.length === 0 && { t: "Sem lançamentos", m: "Nenhum lançamento nos últimos 30 dias.", bad: true },
  ].filter(Boolean) as { t: string; m: string; bad: boolean }[];
  return (
    <div className="space-y-6">
      <PageHeader tag="ALERTAS" title="Alertas" sub="Avisos automáticos sobre suas finanças (últimos 30 dias)." />
      <section className="glass space-y-2 rounded-3xl p-6">
        {alerts.map((a) => (
          <div key={a.t} className="glass-btn flex items-start gap-4 rounded-2xl px-4 py-3">
            <div className={`glass grid h-10 w-10 shrink-0 place-items-center rounded-xl ${a.bad ? "text-destructive" : "text-success"}`}><Bell className="h-5 w-5" /></div>
            <div><p className="font-semibold">{a.t}</p><p className="text-sm text-muted-foreground">{a.m}</p></div>
          </div>
        ))}
      </section>
    </div>
  );
}

type Profile = { name: string; nick: string; photo: string };

function ProfileMenu({ profile, setProfile, mobile = false }: { profile: Profile; setProfile: (p: Profile) => void; mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => setDraft(profile), [profile, open]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !user) return;
    let active = true;
    supabase.from("profiles").select("name,nick,avatar_url").eq("id", user.id).maybeSingle()
      .then(({ data, error: profileError }) => {
        if (!active) return;
        if (profileError) { setError(profileError.message); return; }
        if (data) {
          const next = { name: data.name ?? "", nick: data.nick ?? "", photo: data.avatar_url ?? "" };
          setProfile(next);
          setDraft(next);
        }
      });
    return () => { active = false; };
  }, [user, setProfile]);

  const initial = (profile.nick || profile.name || "K").charAt(0).toUpperCase();
  const onFile = (f?: File) => {
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const sz = Math.min(img.width, img.height);
      c.getContext("2d")!.drawImage(img, (img.width - sz) / 2, (img.height - sz) / 2, sz, sz, 0, 0, 256, 256);
      setDraft((d) => ({ ...d, photo: c.toDataURL("image/jpeg", 0.85) }));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  };

  const authenticate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = mode === "signup"
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        setNotice("Cadastro criado! Confira seu e-mail para confirmar a conta e depois entre.");
      } else {
        setNotice(mode === "signup" ? "Conta criada com sucesso!" : "Login realizado!");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível autenticar.");
    } finally { setBusy(false); }
  };

  const save = async () => {
    if (!supabase || !user) return;
    setBusy(true); setError(""); setNotice("");
    try {
      let photoUrl = draft.photo;
      if (draft.photo.startsWith("data:")) {
        const blob = await (await fetch(draft.photo)).blob();
        const path = user.id + "/avatar.jpg";
        const { error: uploadError } = await supabase.storage.from("avatars").upload(path, blob, {
          contentType: "image/jpeg", upsert: true,
        });
        if (uploadError) throw uploadError;
        photoUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      }
      const { error: saveError } = await supabase.from("profiles").upsert({
        id: user.id, name: draft.name.trim(), nick: draft.nick.trim(), avatar_url: photoUrl, updated_at: new Date().toISOString(),
      });
      if (saveError) throw saveError;
      const next = { ...draft, photo: photoUrl };
      setDraft(next); setProfile(next); localStorage.setItem("kroma-profile", JSON.stringify(next));
      setNotice("Perfil salvo na sua conta!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar o perfil.");
    } finally { setBusy(false); }
  };

  const logout = async () => {
    if (!supabase) return;
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) setError(logoutError.message);
    else {
      setProfile({ name: "", nick: "", photo: "" });
      setDraft({ name: "", nick: "", photo: "" });
      localStorage.removeItem("kroma-profile");
      setNotice("Você saiu da sua conta.");
    }
  };

  const Avatar = ({ p, size }: { p: Profile; size: string }) =>
    p.photo ? <img src={p.photo} alt="Foto de perfil" className={`${size} rounded-2xl object-cover`} />
      : <span className={`glass-primary grid ${size} place-items-center rounded-2xl font-display text-lg font-bold`}>{(p.nick || p.name || "K").charAt(0).toUpperCase()}</span>;

  return (
    <div className={mobile ? "relative mb-0" : "relative mb-4"}>
      <button aria-label="Meu perfil" title="Meu perfil" onClick={() => setOpen(!open)}
        className="block rounded-2xl ring-offset-2 ring-offset-background transition hover:ring-2 hover:ring-primary">
        <Avatar p={profile} size="h-11 w-11" />
      </button>
      {open && (
        <div className={`glass absolute z-50 w-80 space-y-3 rounded-3xl bg-popover/95 p-5 shadow-xl ${mobile ? "bottom-16 right-0 max-w-[calc(100vw-2rem)]" : "left-16 top-0 max-w-[calc(100vw-6rem)]"}`}>
          <div className="flex items-center justify-between">
            <p className="font-display font-bold">Meu perfil</p>
            {user && <button onClick={logout} className="text-xs text-muted-foreground underline">Sair</button>}
          </div>
          {!supabase ? (
            <p className="text-sm text-destructive">Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente para ativar o login.</p>
          ) : !user ? (
            <form onSubmit={authenticate} className="space-y-3">
              <p className="text-xs text-muted-foreground">{mode === "login" ? "Entre com seu e-mail e senha." : "Crie sua conta com e-mail e senha."}</p>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail"
                className="glass w-full rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha (mínimo 6 caracteres)"
                className="glass w-full rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <button disabled={busy} className="glass-primary w-full rounded-2xl py-3 text-sm font-semibold disabled:opacity-50">
                {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
              </button>
              <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setNotice(""); }}
                className="w-full text-xs text-muted-foreground underline">
                {mode === "login" ? "Ainda não tenho conta — cadastrar" : "Já tenho conta — entrar"}
              </button>
            </form>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Conectado como {user.email}</p>
              <label className="flex cursor-pointer items-center gap-3">
                <Avatar p={draft} size="h-16 w-16" />
                <span className="glass-btn rounded-xl px-3 py-2 text-sm font-semibold">Trocar foto</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
              {draft.photo && <button onClick={() => setDraft({ ...draft, photo: "" })} className="text-xs text-muted-foreground underline">Remover foto</button>}
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nome"
                className="glass w-full rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <input value={draft.nick} onChange={(e) => setDraft({ ...draft, nick: e.target.value })} placeholder="Apelido"
                className="glass w-full rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <button disabled={busy} onClick={save} className="glass-primary w-full rounded-2xl py-2.5 text-sm font-semibold disabled:opacity-50">
                {busy ? "Salvando..." : "Salvar perfil"}
              </button>
            </>
          )}
          {notice && <p role="status" className="text-xs text-success">{notice}</p>}
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        </div>
      )}
      <span className="sr-only">{initial}</span>
    </div>
  );
}

const COLORS = [
  { n: "Vermelho", h: 22 }, { n: "Laranja", h: 50 }, { n: "Âmbar", h: 80 }, { n: "Verde", h: 150 },
  { n: "Ciano", h: 200 }, { n: "Azul", h: 255 }, { n: "Violeta", h: 300 }, { n: "Rosa", h: 350 },
];

function ColorSettings() {
  const [open, setOpen] = useState(false);
  const [hue, setHue] = useState(22);
  useEffect(() => {
    const saved = Number(localStorage.getItem("kroma-hue"));
    if (saved) setHue(saved);
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty("--hue", String(hue));
    localStorage.setItem("kroma-hue", String(hue));
  }, [hue]);
  return (
    <div className="relative">
      <button aria-label="Configurações" onClick={() => setOpen(!open)}
        className={`grid h-11 w-11 place-items-center rounded-2xl ${open ? "glass-primary" : "glass-btn"}`}>
        <Settings className="h-5 w-5" />
      </button>
      {open && (
        <div className="glass absolute bottom-0 left-16 z-50 w-64 rounded-3xl bg-popover/80 p-5">
          <p className="font-display font-bold">Cor do app</p>
          <p className="mb-4 text-xs text-muted-foreground">Escolha a cor de destaque</p>
          <div className="grid grid-cols-4 gap-3">
            {COLORS.map((c) => (
              <button key={c.h} title={c.n} aria-label={c.n} onClick={() => setHue(c.h)}
                style={{ background: `oklch(0.6 0.2 ${c.h})` }}
                className={`h-11 w-11 rounded-2xl border border-border transition hover:scale-105 ${hue === c.h ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`} />
            ))}
          </div>
          <input type="range" min={0} max={360} value={hue} onChange={(e) => setHue(Number(e.target.value))}
            aria-label="Tom personalizado" className="mt-4 w-full accent-primary" />
        </div>
      )}
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
