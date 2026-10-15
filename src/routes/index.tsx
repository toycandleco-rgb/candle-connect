import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowDownRight,
  BadgeIndianRupee,
  Boxes,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  Flame,
  LogOut,
  MessageCircle,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  UsersRound,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateSale, formatINR, makeBillMessage, makeOfferMessage, makeWhatsAppUrl, normalizePhone, type SaleExpense, type SaleLine } from "@/lib/candle-business";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"candle_products">;
type Customer = Tables<"candle_customers">;
type Sale = Tables<"candle_sales">;
type SaleItem = Tables<"candle_sale_items">;
type Expense = Tables<"candle_sale_expenses">;
type Section = "sale" | "overview" | "products" | "customers";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wick & Wax | Candle Sales" },
      { name: "description", content: "Quick candle billing, sales and profit tracking for your expo." },
      { property: "og:title", content: "Wick & Wax | Candle Sales" },
      { property: "og:description", content: "Quick candle billing, sales and profit tracking for your expo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: App,
});

function App() {
  const [session, setSession] = useState<{ id: string; email: string | undefined } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState<Section>("sale");
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [offerOptIn, setOfferOptIn] = useState(false);
  const [draftLines, setDraftLines] = useState<{ productId: string; quantity: number }[]>([]);
  const [draftExpenses, setDraftExpenses] = useState<SaleExpense[]>([]);
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [savedBillLink, setSavedBillLink] = useState("");
  const [offerText, setOfferText] = useState("");
  const [offerCustomer, setOfferCustomer] = useState<Customer | null>(null);
  const [productName, setProductName] = useState("");
  const [productCost, setProductCost] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [editingProductId, setEditingProductId] = useState("");
  const [editProductName, setEditProductName] = useState("");
  const [editProductCost, setEditProductCost] = useState("");
  const [editProductPrice, setEditProductPrice] = useState("");

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null);
      setAuthReady(true);
    }).catch(() => { if (alive) setAuthReady(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setSession(currentSession?.user ? { id: currentSession.user.id, email: currentSession.user.email } : null);
      if (event === "SIGNED_OUT") clearBusinessData();
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (session) void loadBusinessData();
  }, [session?.id]);

  const draftCart: SaleLine[] = useMemo(() => draftLines.flatMap((line) => {
    const product = products.find((item) => item.id === line.productId);
    return product ? [{ name: product.name, quantity: line.quantity, salePrice: Number(product.sale_price), costPrice: Number(product.cost_price) }] : [];
  }), [draftLines, products]);
  const draftTotals = calculateSale(draftCart, draftExpenses);
  const totals = useMemo(() => sales.reduce((acc, sale) => {
    const saleItems = items.filter((item) => item.sale_id === sale.id);
    const saleExpenses = expenses.filter((item) => item.sale_id === sale.id);
    const calculated = calculateSale(saleItems.map((item) => ({ name: item.product_name, quantity: item.quantity, salePrice: Number(item.sale_price), costPrice: Number(item.cost_price) })), saleExpenses.map((item) => ({ description: item.description, amount: Number(item.amount) })));
    acc.revenue += calculated.revenue;
    acc.cost += calculated.productCost;
    acc.expenses += calculated.expenses;
    acc.profit += calculated.profit;
    return acc;
  }, { revenue: 0, cost: 0, expenses: 0, profit: 0 }), [sales, items, expenses]);
  const visibleCustomers = customers.filter((customer) => `${customer.name} ${customer.phone}`.toLowerCase().includes(search.toLowerCase()));
  const visibleProducts = products.filter((product) => `${product.name}`.toLowerCase().includes(search.toLowerCase()));
  const visibleSales = sales.filter((sale) => `${sale.customer_name} ${sale.customer_phone}`.toLowerCase().includes(search.toLowerCase()));

  function clearBusinessData() {
    setProducts([]); setCustomers([]); setSales([]); setItems([]); setExpenses([]);
  }

  async function loadBusinessData() {
    setError("");
    const [productsRes, customersRes, salesRes] = await Promise.all([
      supabase.from("candle_products").select("*").order("name"),
      supabase.from("candle_customers").select("*").order("name"),
      supabase.from("candle_sales").select("*").eq("status", "completed").order("created_at", { ascending: false }),
    ]);
    const loadError = productsRes.error ?? customersRes.error ?? salesRes.error;
    if (loadError) { setError(loadError.message); return; }
    const loadedSales = salesRes.data ?? [];
    const saleIds = loadedSales.map((sale) => sale.id);
    const [itemsRes, expensesRes] = saleIds.length ? await Promise.all([
      supabase.from("candle_sale_items").select("*").in("sale_id", saleIds),
      supabase.from("candle_sale_expenses").select("*").in("sale_id", saleIds),
    ]) : [{ data: [], error: null }, { data: [], error: null }];
    if (itemsRes.error || expensesRes.error) { setError((itemsRes.error ?? expensesRes.error)?.message ?? "Unable to load sales."); return; }
    setProducts(productsRes.data ?? []);
    setCustomers(customersRes.data ?? []);
    setSales(loadedSales);
    setItems(itemsRes.data ?? []);
    setExpenses(expensesRes.data ?? []);
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setAuthMessage("");
    const response = authMode === "signup"
      ? await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
    if (response.error) setError(response.error.message);
    else if (authMode === "signup" && !response.data.session) setAuthMessage("Check your email to confirm your account, then sign in.");
    else if (response.data.session?.user) setSession({ id: response.data.session.user.id, email: response.data.session.user.email });
    setBusy(false);
  }

  async function signOut() {
    setBusy(true); await supabase.auth.signOut(); setSession(null); clearBusinessData(); setBusy(false);
  }

  async function signInWithGoogle() {
    setBusy(true); setError("");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) setError(result.error.message);
    setBusy(false);
  }

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!session) return;
    const cost = Number(productCost); const price = Number(productPrice);
    if (!productName.trim() || !Number.isFinite(cost) || !Number.isFinite(price) || cost < 0 || price < 0) { setError("Add a name and valid non-negative prices."); return; }
    setBusy(true); setError("");
    const { error: insertError } = await supabase.from("candle_products").insert({ owner_id: session.id, name: productName.trim(), cost_price: cost, sale_price: price });
    if (insertError) setError(insertError.message); else { setProductName(""); setProductCost(""); setProductPrice(""); setNotice("Product added"); await loadBusinessData(); }
    setBusy(false);
  }

  async function updateProduct(product: Product, active: boolean) {
    const { error: updateError } = await supabase.from("candle_products").update({ active, updated_at: new Date().toISOString() }).eq("id", product.id);
    if (updateError) setError(updateError.message); else await loadBusinessData();
  }

  function startProductEdit(product: Product) {
    setEditingProductId(product.id);
    setEditProductName(product.name);
    setEditProductCost(String(product.cost_price));
    setEditProductPrice(String(product.sale_price));
  }

  async function saveProductEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cost = Number(editProductCost);
    const price = Number(editProductPrice);
    if (!session || !editProductName.trim() || !Number.isFinite(cost) || cost < 0 || !Number.isFinite(price) || price < 0) { setError("Add a name and valid non-negative prices."); return; }
    setBusy(true);
    const { error: updateError } = await supabase.from("candle_products").update({ name: editProductName.trim(), cost_price: cost, sale_price: price, updated_at: new Date().toISOString() }).eq("id", editingProductId);
    if (updateError) setError(updateError.message); else { setEditingProductId(""); setNotice("Product updated"); await loadBusinessData(); }
    setBusy(false);
  }

  async function chooseCustomer(customerId: string) {
    setSelectedCustomerId(customerId);
    const selected = customers.find((customer) => customer.id === customerId);
    setCustomerName(selected?.name ?? ""); setCustomerPhone(selected?.phone ?? ""); setOfferOptIn(selected?.offers_opt_in ?? false);
  }

  function addProductToBill(productId: string) {
    setDraftLines((current) => {
      const existing = current.find((line) => line.productId === productId);
      return existing ? current.map((line) => line.productId === productId ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { productId, quantity: 1 }];
    });
  }

  function changeQuantity(productId: string, change: number) {
    setDraftLines((current) => current.flatMap((line) => {
      if (line.productId !== productId) return [line];
      const quantity = line.quantity + change;
      return quantity > 0 ? [{ ...line, quantity }] : [];
    }));
  }

  function addExpense() {
    const amount = Number(expenseAmount);
    if (!expenseDescription.trim() || !Number.isFinite(amount) || amount < 0) { setError("Add an expense name and valid amount."); return; }
    setDraftExpenses((current) => [...current, { description: expenseDescription.trim(), amount }]);
    setExpenseDescription(""); setExpenseAmount(""); setError("");
  }

  async function saveSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!session) return;
    const phone = normalizePhone(customerPhone);
    if (!customerName.trim()) { setError("Add the customer's name."); return; }
    if (!phone) { setError("Enter a WhatsApp number with 8–15 digits, including country code."); return; }
    if (!draftCart.length) { setError("Add at least one candle to the bill."); return; }
    setBusy(true); setError(""); setNotice("");
    let customerId = selectedCustomerId || null;
    const { data: customer, error: customerError } = await supabase.from("candle_customers").upsert({ owner_id: session.id, name: customerName.trim(), phone: `+${phone}`, offers_opt_in: offerOptIn, updated_at: new Date().toISOString() }, { onConflict: "owner_id,phone" }).select("id").single();
    if (customerError || !customer) { setError(customerError?.message ?? "Unable to save the customer."); setBusy(false); return; }
    customerId = customer.id;
    const { data: sale, error: saleError } = await supabase.from("candle_sales").insert({ owner_id: session.id, customer_id: customerId, customer_name: customerName.trim(), customer_phone: `+${phone}`, status: "completed" }).select("id").single();
    if (saleError || !sale) { setError(saleError?.message ?? "Unable to save the sale."); setBusy(false); return; }
    const lineRows = draftCart.map((line) => {
      const product = products.find((item) => item.name === line.name);
      return { owner_id: session.id, sale_id: sale.id, product_id: product?.id ?? null, product_name: line.name, quantity: line.quantity, cost_price: line.costPrice, sale_price: line.salePrice };
    });
    const itemResult = await supabase.from("candle_sale_items").insert(lineRows);
    const expenseResult = draftExpenses.length ? await supabase.from("candle_sale_expenses").insert(draftExpenses.map((expense) => ({ owner_id: session.id, sale_id: sale.id, description: expense.description, amount: expense.amount }))) : { error: null };
    if (itemResult.error || expenseResult.error) {
      await supabase.from("candle_sales").delete().eq("id", sale.id);
      setError((itemResult.error ?? expenseResult.error)?.message ?? "Unable to save the sale details."); setBusy(false); return;
    }
    setSavedBillLink(makeWhatsAppUrl(`+${phone}`, makeBillMessage(customerName.trim(), draftCart, draftExpenses)) ?? "");
    setSelectedCustomerId(customerId); setDraftLines([]); setDraftExpenses([]); setSection("sale"); setNotice("Sale saved · WhatsApp message is ready");
    await loadBusinessData(); setBusy(false);
  }

  async function openOffer(customer: Customer) {
    if (!customer.offers_opt_in) { setError("This customer has not opted in to offers."); return; }
    const link = makeWhatsAppUrl(customer.phone, makeOfferMessage(customer.name, offerText));
    if (!link || !offerText.trim()) { setError("Write an offer message first."); return; }
    window.open(link, "_blank", "noopener,noreferrer"); setError("");
  }

  if (!authReady) return <main className="screen-center"><div className="loading-mark"><Flame size={22} /></div><span>Getting your stall ready</span></main>;
  if (!session) return <main className="auth-page">
    <div className="auth-brand"><div className="brand-mark"><Flame size={20} fill="currentColor" /></div><span>wick<span className="brand-amp">&</span>wax</span></div>
    <div className="auth-layout">
      <section className="auth-story"><div className="eyebrow"><span className="eyebrow-dot" /> EXPO SALES, MADE SIMPLE</div><h1>A little less admin.<br /><span>A lot more glow.</span></h1><p>Keep the candles moving. Your sales, costs, customers and WhatsApp bills—all together, right here.</p><div className="story-stats"><div><strong>₹</strong><span>Quick billing</span></div><i /><div><ChartNoAxesCombined size={19} /><span>Know your profit</span></div><i /><div><MessageCircle size={18} /><span>Send on WhatsApp</span></div></div><div className="flame-art" aria-hidden="true"><div className="flame-outer"><div className="flame-inner" /></div><div className="flame-glow" /><div className="candle-body" /></div></section>
      <section className="auth-panel"><span className="panel-kicker">YOUR EXPO DESK</span><h2>{authMode === "signin" ? "Welcome back" : "Set up your account"}</h2><p className="muted">{authMode === "signin" ? "Sign in to your candle business." : "Use your email to create a private account."}</p>
        <form className="auth-form" onSubmit={handleAuth}><label>Email address<Input type="email" autoComplete="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required maxLength={255} placeholder="you@example.com" /></label><label>Password<Input type="password" autoComplete={authMode === "signin" ? "current-password" : "new-password"} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required minLength={8} placeholder="At least 8 characters" /></label><Button className="auth-submit" type="submit" disabled={busy}>{busy ? "One moment…" : authMode === "signin" ? "Sign in" : "Create account"}<ChevronRight size={17} /></Button></form>
        <div className="auth-or"><span />or<span /></div><Button variant="outline" className="google-submit" onClick={signInWithGoogle} disabled={busy}><GoogleMark />Continue with Google</Button>
        <p className="auth-switch">{authMode === "signin" ? "New to Wick & Wax?" : "Already have an account?"} <button type="button" onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setError(""); setAuthMessage(""); }}>{authMode === "signin" ? "Create account" : "Sign in"}</button></p>
        {error && <p className="form-alert" role="alert">{error}</p>}{authMessage && <p className="form-success" role="status">{authMessage}</p>}
      </section>
    </div>
    <footer className="auth-footer"><span>HAND-POURED. WELL-TRACKED.</span><span>PRIVATE BUSINESS RECORDS <i>·</i> INR ₹</span></footer>
  </main>;

  return <main className="app-shell">
    <header className="topbar"><div className="brand-lockup"><div className="brand-mark"><Flame size={19} fill="currentColor" /></div><span>wick<span className="brand-amp">&</span>wax</span><span className="topbar-divider" /><span className="topbar-label">STALL DESK</span></div><div className="topbar-right"><span className="online-state"><i /> READY TO SELL</span><span className="account-email">{session.email}</span><Button size="icon" variant="ghost" aria-label="Sign out" title="Sign out" onClick={signOut} disabled={busy}><LogOut /></Button></div></header>
    <div className="main-layout">
      <aside className="sidebar"><div className="side-label">WORKSPACE</div><nav className="side-nav" aria-label="Main navigation">{([
        ["sale", "New sale", ShoppingBag], ["overview", "Sales overview", ChartNoAxesCombined], ["products", "Products", Boxes], ["customers", "Customers", UsersRound],
      ] as const).map(([key, label, Icon]) => <button type="button" key={key} onClick={() => { setSection(key); setSearch(""); setError(""); }} className={`nav-item ${section === key ? "active" : ""}`}><Icon size={18} /><span>{label}</span>{key === "sale" && <span className="nav-live" />}</button>)}</nav><div className="side-note"><div className="note-icon"><Flame size={15} /></div><div><strong>Make it a bright day.</strong><span>One candle at a time.</span></div></div><div className="sidebar-bottom"><span>RUPEES · INDIA</span><span className="sync-label"><i /> PRIVATE & SYNCED</span></div></aside>
      <section className="work-area">
        {error && <div className="notice notice-error" role="alert"><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Dismiss">×</button></div>}
        {notice && <div className="notice notice-success" role="status"><Check size={15} /><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
        {section === "sale" && <>
          <div className="page-heading sale-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> EXPO COUNTER</div><h1>Make a sale<span className="heading-period">.</span></h1><p>Pick the candles, add your customer, and you’re done.</p></div><div className="heading-date"><span>YOUR PRODUCT RANGE</span><strong>{products.filter((item) => item.active).length} <small>ACTIVE</small></strong></div></div>
          {savedBillLink && <div className="bill-ready"><div className="bill-ready-icon"><MessageCircle size={19} /></div><div className="bill-ready-copy"><strong>Your bill is ready to share</strong><span>Plain text · reviewed and sent by you</span></div><a href={savedBillLink} target="_blank" rel="noreferrer" className="bill-ready-link"><MessageCircle size={17} /> Open WhatsApp <ChevronRight size={16} /></a><button type="button" aria-label="Dismiss bill" onClick={() => setSavedBillLink("")}>×</button></div>}
          <form onSubmit={saveSale} className="sale-grid">
            <div className="sale-main"><section className="panel customer-panel"><div className="section-title"><span className="step-badge">01</span><div><h2>Customer</h2><p>Find a regular or add someone new</p></div></div><div className="customer-fields"><label className="field-wide">Saved customers<div className="select-wrap"><UsersRound size={16} /><select value={selectedCustomerId} onChange={(event) => void chooseCustomer(event.target.value)}><option value="">New customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}</select><ChevronDown size={15} /></div></label><label>Name<Input value={customerName} onChange={(event) => { setCustomerName(event.target.value); setSelectedCustomerId(""); }} maxLength={120} required placeholder="Customer name" /></label><label>WhatsApp number<Input type="tel" value={customerPhone} onChange={(event) => { setCustomerPhone(event.target.value); setSelectedCustomerId(""); }} inputMode="tel" maxLength={18} required placeholder="+91 98765 43210" /></label></div><label className="check-row"><input type="checkbox" checked={offerOptIn} onChange={(event) => setOfferOptIn(event.target.checked)} /><span className="check-ui"><Check size={12} /></span><span>Customer agreed to receive occasional offers</span></label></section>
              <section className="panel product-pick-panel"><div className="section-title"><span className="step-badge">02</span><div><h2>Add candles</h2><p>Tap an item to add it to the bill</p></div><Badge variant="secondary" className="unit-badge">{products.filter((item) => item.active).length} PRODUCTS</Badge></div>{products.filter((item) => item.active).length ? <div className="product-pick-list">{products.filter((item) => item.active).map((product) => { const quantity = draftLines.find((item) => item.productId === product.id)?.quantity ?? 0; return <div className={`product-pick ${quantity ? "is-added" : ""}`} key={product.id}><div className="product-icon"><Flame size={17} /></div><div className="product-pick-name"><strong>{product.name}</strong><span>Cost {formatINR(Number(product.cost_price))}</span></div><strong className="product-pick-price">{formatINR(Number(product.sale_price))}</strong>{quantity ? <div className="quantity-control"><Button size="icon" variant="outline" type="button" aria-label={`Remove one ${product.name}`} onClick={() => changeQuantity(product.id, -1)}><Minus size={14} /></Button><span>{quantity}</span><Button size="icon" variant="outline" type="button" aria-label={`Add one ${product.name}`} onClick={() => changeQuantity(product.id, 1)}><Plus size={14} /></Button></div> : <Button size="icon" variant="outline" type="button" aria-label={`Add ${product.name}`} onClick={() => addProductToBill(product.id)}><Plus size={17} /></Button>}</div>;})}</div> : <div className="empty-products"><div className="empty-icon"><Package size={21} /></div><strong>Your product shelf is waiting</strong><span>Add your candle names and prices first.</span><Button variant="outline" type="button" onClick={() => setSection("products")}>Add a product <ChevronRight size={15} /></Button></div>}{draftCart.length > 0 && <div className="bill-items">{draftCart.map((line) => <div className="bill-item" key={line.name}><span>{line.name} <b>× {line.quantity}</b></span><strong>{formatINR(line.salePrice * line.quantity)}</strong></div>)}</div>}</section>
              <section className="panel expense-panel"><div className="section-title"><span className="step-badge step-muted">03</span><div><h2>Sale expenses</h2><p>Optional costs for this sale</p></div></div><div className="expense-inputs"><Input aria-label="Expense description" value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} maxLength={120} placeholder="e.g. Gift wrap, delivery" /><div className="money-input"><span>₹</span><Input aria-label="Expense amount" type="number" min="0" step="0.01" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} placeholder="0.00" /></div><Button type="button" variant="outline" onClick={addExpense}><Plus size={15} /> Add</Button></div>{draftExpenses.map((expense, index) => <div className="expense-line" key={`${expense.description}-${index}`}><span>{expense.description}</span><strong>{formatINR(expense.amount)}</strong><button type="button" aria-label={`Remove ${expense.description}`} onClick={() => setDraftExpenses((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14} /></button></div>)}</section>
            </div>
            <aside className="sale-summary"><div className="summary-top"><div className="summary-icon"><BadgeIndianRupee size={19} /></div><span>SALE TOTAL</span></div><div className="summary-total">{formatINR(draftTotals.revenue)}</div><div className="summary-rule" /><div className="summary-row"><span>Candles</span><strong>{draftCart.reduce((sum, line) => sum + line.quantity, 0)} items</strong></div><div className="summary-row"><span>Sale expenses</span><strong>{formatINR(draftTotals.expenses)}</strong></div><div className="summary-row profit-row"><span>Est. profit</span><strong>{formatINR(draftTotals.profit)}</strong></div><Button type="submit" className="save-sale-button" disabled={busy || !draftCart.length}><span>{busy ? "Saving sale…" : "Save sale"}</span><ChevronRight size={18} /></Button><p className="summary-footnote"><Check size={13} />Customer and bill saved privately</p><p className="summary-whatsapp"><MessageCircle size={14} />Simple text bill · WhatsApp</p></aside>
          </form>
        </>}
        {section === "overview" && <><PageHeader eyebrow="YOUR EXPO AT A GLANCE" title="Sales overview" description="Every sale, cost and rupee of profit—together." /><div className="metric-grid"><Metric icon={Wallet} label="Sales" amount={totals.revenue} tone="blue" caption={`${sales.length} completed ${sales.length === 1 ? "sale" : "sales"}`} /><Metric icon={ArrowDownRight} label="Product cost" amount={totals.cost} tone="amber" caption="At the cost price you recorded" /><Metric icon={ArrowDownRight} label="Sale expenses" amount={totals.expenses} tone="coral" caption="Expenses recorded against sales" /><Metric icon={ChartNoAxesCombined} label="Profit" amount={totals.profit} tone="green" caption="Sales − product cost − expenses" /></div><section className="panel table-panel"><div className="list-heading"><div><h2>Recent sales</h2><p>Product cost and prices are saved at the time of sale.</p></div><div className="list-actions"><span className="record-count">{sales.length} BILLS</span><label className="list-search"><Search size={14} /><Input aria-label="Search sales" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a customer" /></label></div></div>{sales.length ? (visibleSales.length ? <div className="sales-list">{visibleSales.map((sale) => <SaleCard key={sale.id} sale={sale} saleItems={items.filter((item) => item.sale_id === sale.id)} saleExpenses={expenses.filter((item) => item.sale_id === sale.id)} />)}</div> : <EmptyState icon={Search} title="No sales match" text="Try searching by a different customer name or phone number." />) : <EmptyState icon={ChartNoAxesCombined} title="Your first sale is waiting" text="Record your first candle sale to see sales and profit here." action="Start a sale" onAction={() => setSection("sale")} />}</section></>}
        {section === "products" && <><PageHeader eyebrow="YOUR CANDLE SHELF" title="Products" description="Set your costs and selling prices once. Your past bills keep their original values." /><div className="product-page-grid"><form className="panel add-product-panel" onSubmit={addProduct}><div className="section-title"><span className="add-icon"><CirclePlus size={19} /></span><div><h2>Add a candle</h2><p>New products are ready to add to a sale.</p></div></div><label>Candle name<Input value={productName} onChange={(event) => setProductName(event.target.value)} required maxLength={120} placeholder="e.g. Rose & sandalwood" /></label><div className="price-fields"><label>Cost price<div className="money-input"><span>₹</span><Input type="number" min="0" step="0.01" value={productCost} onChange={(event) => setProductCost(event.target.value)} required placeholder="0.00" /></div></label><label>Sale price<div className="money-input"><span>₹</span><Input type="number" min="0" step="0.01" value={productPrice} onChange={(event) => setProductPrice(event.target.value)} required placeholder="0.00" /></div></label></div><Button type="submit" className="product-submit" disabled={busy}><Plus size={16} />Save product</Button></form><section className="panel catalog-panel"><div className="list-heading"><div><h2>Your products</h2><p>{products.filter((product) => product.active).length} ready for billing</p></div><div className="list-actions"><span className="record-count">{products.length} TOTAL</span><label className="list-search"><Search size={14} /><Input aria-label="Search products" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a candle" /></label></div></div>{products.length ? (visibleProducts.length ? <div className="catalog-list">{visibleProducts.map((product) => <div key={product.id}><div className={`catalog-item ${!product.active ? "catalog-inactive" : ""}`}><div className="product-icon"><Flame size={17} /></div><div className="catalog-name"><strong>{product.name}</strong><span>Cost <b>{formatINR(Number(product.cost_price))}</b> <i>·</i> Sale <b>{formatINR(Number(product.sale_price))}</b></span></div><span className="unit-margin">{formatINR(Number(product.sale_price) - Number(product.cost_price))}<small>UNIT MARGIN</small></span><Button type="button" variant="outline" size="sm" onClick={() => editingProductId === product.id ? setEditingProductId("") : startProductEdit(product)}>{editingProductId === product.id ? "Cancel" : "Edit"}</Button><Button type="button" variant="outline" size="sm" onClick={() => void updateProduct(product, !product.active)}>{product.active ? "Archive" : "Restore"}</Button></div>{editingProductId === product.id && <form className="product-edit-form" onSubmit={saveProductEdit}><label>Name<Input value={editProductName} onChange={(event) => setEditProductName(event.target.value)} required maxLength={120} /></label><label>Cost price<div className="money-input"><span>₹</span><Input type="number" min="0" step="0.01" value={editProductCost} onChange={(event) => setEditProductCost(event.target.value)} required /></div></label><label>Sale price<div className="money-input"><span>₹</span><Input type="number" min="0" step="0.01" value={editProductPrice} onChange={(event) => setEditProductPrice(event.target.value)} required /></div></label><Button type="submit" disabled={busy}><Check size={14} />Save changes</Button></form>}</div>)}</div> : <EmptyState icon={Search} title="No products match" text="Try searching by a different candle name." />) : <EmptyState icon={Package} title="No candles on the shelf yet" text="Add your first candle and its cost and sale price." />}</section></div></>}
        {section === "customers" && <><PageHeader eyebrow="PEOPLE WHO LOVE YOUR CANDLES" title="Customers" description="Your customer book, kept private. WhatsApp offers are sent by you." /><section className="customer-book panel"><div className="customer-book-top"><div><h2>Customer book</h2><p>Only message customers who agreed to receive offers.</p></div><div className="list-actions"><span className="record-count">{customers.length} CONTACTS</span><label className="list-search"><Search size={14} /><Input aria-label="Search customers" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a contact" /></label></div></div><label className="offer-label">Your offer message<textarea value={offerText} onChange={(event) => setOfferText(event.target.value)} maxLength={500} placeholder="Write a personal offer, e.g. We have 15% off our new lavender candles this weekend!" rows={3} /></label><div className="customer-list-heading"><span>CUSTOMER</span><span>WHATSAPP</span><span>OFFER PERMISSION</span><span /></div>{visibleCustomers.length ? visibleCustomers.map((customer) => <div className="customer-row" key={customer.id}><div className="customer-cell"><div className="avatar-mark">{customer.name.slice(0, 1).toUpperCase()}</div><strong>{customer.name}</strong></div><a className="phone-link" href={makeWhatsAppUrl(customer.phone, "Hello") ?? undefined} target="_blank" rel="noreferrer">{customer.phone}</a><span className={`permission-pill ${customer.offers_opt_in ? "permission-yes" : "permission-no"}`}><i />{customer.offers_opt_in ? "Agreed" : "Not opted in"}</span>{customer.offers_opt_in ? <Button type="button" variant="outline" size="sm" onClick={() => { setError(""); void openOffer(customer); }} disabled={!offerText.trim()}><MessageCircle size={14} />Offer</Button> : <span className="offer-disabled">—</span>}</div>) : <EmptyState icon={customers.length ? Search : UsersRound} title={customers.length ? "No customers match" : "No customers just yet"} text={customers.length ? "Try a different name or phone number." : "Customer details are saved when you record a sale."} action={!customers.length ? "Make a sale" : undefined} onAction={() => setSection("sale")} />}</section></>}
        <footer className="page-footer"><span>WICK & WAX <i>·</i> HANDMADE, WELL TRACKED</span><span>All amounts in INR <b>₹</b></span></footer>
      </section>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation">{([ ["sale", "Sale", ShoppingBag], ["overview", "Totals", ChartNoAxesCombined], ["products", "Candles", Boxes], ["customers", "People", UsersRound] ] as const).map(([key, label, Icon]) => <button type="button" key={key} onClick={() => { setSection(key); setSearch(""); setError(""); }} className={section === key ? "active" : ""}><Icon size={19} /><span>{label}</span></button>)}</nav>
  </main>;
}

function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> {eyebrow}</div><h1>{title}<span className="heading-period">.</span></h1><p>{description}</p></div></div>;
}

function Metric({ icon: Icon, label, amount, tone, caption }: { icon: typeof Wallet; label: string; amount: number; tone: string; caption: string }) {
  return <article className={`metric-card metric-${tone}`}><div className="metric-head"><span className="metric-icon"><Icon size={18} /></span><span>{label}</span></div><strong>{formatINR(amount)}</strong><p>{caption}</p></article>;
}

function SaleCard({ sale, saleItems, saleExpenses }: { sale: Sale; saleItems: SaleItem[]; saleExpenses: Expense[] }) {
  const lines = saleItems.map((item) => ({ name: item.product_name, quantity: item.quantity, salePrice: Number(item.sale_price), costPrice: Number(item.cost_price) }));
  const saleCosts = saleExpenses.map((item) => ({ description: item.description, amount: Number(item.amount) }));
  const sums = calculateSale(lines, saleCosts);
  const message = makeBillMessage(sale.customer_name, lines, saleCosts);
  const url = makeWhatsAppUrl(sale.customer_phone, message);
  return <article className="sale-record"><div className="sale-record-main"><div className="avatar-mark">{sale.customer_name.slice(0, 1).toUpperCase()}</div><div><strong>{sale.customer_name}</strong><span>{new Date(sale.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} <i>·</i> {saleItems.reduce((sum, item) => sum + item.quantity, 0)} items</span></div></div><div className="sale-record-products">{lines.map((line) => `${line.name} × ${line.quantity}`).join(", ") || "No products"}{saleExpenses.length > 0 && <small>{saleExpenses.length} sale {saleExpenses.length === 1 ? "expense" : "expenses"}</small>}</div><div className="sale-record-profit"><strong>{formatINR(sums.profit)}</strong><span>PROFIT</span></div><div className="sale-record-total"><strong>{formatINR(sums.revenue)}</strong><span>SALE</span></div>{url && <a className="sale-record-whatsapp" href={url} target="_blank" rel="noreferrer" aria-label={`Open WhatsApp bill for ${sale.customer_name}`} title="Open bill in WhatsApp"><MessageCircle size={16} /></a>}</article>;
}

function EmptyState({ icon: Icon, title, text, action, onAction }: { icon: typeof Wallet; title: string; text: string; action?: string | undefined; onAction?: (() => void) | undefined }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={22} /></div><strong>{title}</strong><span>{text}</span>{action && onAction && <Button type="button" variant="outline" onClick={onAction}>{action}<ChevronRight size={15} /></Button>}</div>;
}

function GoogleMark() {
  return <svg viewBox="0 0 48 48" aria-hidden="true" className="google-mark"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15Z" /><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z" /><path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z" /><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3l5.8-5.8A19.5 19.5 0 0 0 24 4 20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z" /></svg>;
}