"use strict";

const DEFAULT_PRODUCTS = [
  { id: "P-1001", barcode: "8941100500012", name: "Wireless Mouse", price: 850, stock: 24 },
  { id: "P-1002", barcode: "8941100500029", name: "Type-C Fast Cable", price: 350, stock: 42 },
  { id: "P-1003", barcode: "8941100500036", name: "20W Power Adapter", price: 1250, stock: 16 },
  { id: "P-1004", barcode: "1004", name: "Premium Notebook", price: 120, stock: 75 },
  { id: "P-1005", barcode: "1005", name: "Blue Ball Pen", price: 15, stock: 120 },
  { id: "P-1006", barcode: "1006", name: "Phone Stand", price: 280, stock: 31 },
  { id: "P-1007", barcode: "1007", name: "Bluetooth Speaker Mini", price: 1450, stock: 9 },
  { id: "P-1008", barcode: "1008", name: "USB Flash Drive 32GB", price: 650, stock: 27 }
];

const DEFAULT_CUSTOMERS = [
  { id: "C-1001", name: "Rahim Ahmed", phone: "01712345678" }
];

const $ = (id) => document.getElementById(id);
const el = {
  html: document.documentElement,
  themeToggle: $("themeToggle"), themeIcon: $("themeIcon"), paperSize: $("paperSize"), networkStatus: $("networkStatus"),
  invoiceNumber: $("invoiceNumber"), dateDisplay: $("dateDisplay"), customerSerial: $("customerSerial"), logoutButton: $("logoutButton"),
  customerInput: $("customerInput"), customerLabel: $("customerLabel"),
  customerMessage: $("customerMessage"), customerEntry: $("customerEntry"), customerChip: $("customerChip"),
  customerChipName: $("customerChipName"), customerChipPhone: $("customerChipPhone"), customerInputIcon: $("customerInputIcon"),
  removeCustomer: $("removeCustomer"), changeCustomer: $("changeCustomer"), skipCustomerName: $("skipCustomerName"),
  barcodeInput: $("barcodeInput"), barcodeMessage: $("barcodeMessage"), searchProduct: $("searchProduct"),
  cartBody: $("cartBody"), emptyCart: $("emptyCart"), cartCount: $("cartCount"), clearCart: $("clearCart"),
  summaryItems: $("summaryItems"), summaryQty: $("summaryQty"), summarySubtotal: $("summarySubtotal"),
  discountInput: $("discountInput"), paidInput: $("paidInput"), summaryPayable: $("summaryPayable"),
  settlementLabel: $("settlementLabel"), settlementAmount: $("settlementAmount"),
  paidPrint: $("paidPrint"), saveSale: $("saveSale"), printOnly: $("printOnly"),
  productModal: $("productModal"), closeProductModal: $("closeProductModal"),
  productSearchInput: $("productSearchInput"), productList: $("productList"), toastRegion: $("toastRegion"), receipt: $("receipt")
};

const storage = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
  }
};

const state = {
  products: storage.get("fahimPos.products", DEFAULT_PRODUCTS),
  customers: storage.get("fahimPos.customers", DEFAULT_CUSTOMERS),
  cart: [],
  selectedCartIndex: -1,
  selectedCustomer: null,
  pendingPhone: "",
  customerMode: "phone",
  invoiceCounter: storage.get("fahimPos.invoiceCounter", 1),
  lastReceipt: null
};

const bnDigits = { "০":"0", "১":"1", "২":"2", "৩":"3", "৪":"4", "৫":"5", "৬":"6", "৭":"7", "৮":"8", "৯":"9" };
const normalizeDigits = (value) => String(value || "").replace(/[০-৯]/g, (d) => bnDigits[d]);
const cleanPhone = (value) => normalizeDigits(value).replace(/[^0-9]/g, "");
const validPhone = (phone) => /^01[3-9]\d{8}$/.test(phone);
const number = (value) => Math.max(0, Number.parseFloat(normalizeDigits(value)) || 0);
const money = (value) => `${Number(value || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TK`;
const escapeHTML = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[char]);

function invoiceNo() {
  return String(1000 + state.invoiceCounter);
}

function nextCustomerSerial() {
  return String(state.customers.length + 1).padStart(4, "0");
}

function serialForCustomer(customer) {
  const index = state.customers.findIndex((item) => item.id === customer?.id);
  return index >= 0 ? String(index + 1).padStart(4, "0") : nextCustomerSerial();
}

function setMessage(target, text = "", type = "") {
  target.textContent = text;
  target.className = `field-message${type ? ` ${type}` : ""}`;
}

function toast(message, type = "") {
  const node = document.createElement("div");
  node.className = `toast${type ? ` ${type}` : ""}`;
  node.textContent = message;
  el.toastRegion.appendChild(node);
  window.setTimeout(() => node.remove(), 2700);
}

function applyTheme(theme) {
  el.html.dataset.theme = theme;
  el.themeIcon.textContent = theme === "dark" ? "☀" : "☾";
  el.themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  document.querySelector('meta[name="theme-color"]').setAttribute("content", theme === "dark" ? "#020617" : "#0f172a");
  storage.set("fahimPos.theme", theme);
}

function setCustomerMode(mode) {
  state.customerMode = mode;
  setMessage(el.customerMessage);
  if (mode === "phone") {
    state.pendingPhone = "";
    el.customerLabel.textContent = "Mobile Number";
    el.customerInput.placeholder = "Optional";
    el.customerInput.inputMode = "tel";
    el.customerInput.maxLength = 11;
    el.customerInputIcon.textContent = "☎";
    el.skipCustomerName.classList.add("hidden");
  } else {
    el.customerLabel.textContent = "Customer Name";
    el.customerInput.placeholder = "Name (Optional)";
    el.customerInput.inputMode = "text";
    el.customerInput.maxLength = 80;
    el.customerInputIcon.textContent = "♙";
    el.skipCustomerName.classList.remove("hidden");
  }
  el.customerInput.value = "";
}

function showCustomerChip(customer, pending = false) {
  el.customerChip.classList.remove("hidden");
  el.customerChipName.textContent = customer.name || (pending ? "New customer" : "Customer");
  el.customerChipPhone.textContent = customer.phone;
  el.customerSerial.value = pending ? "NEW" : serialForCustomer(customer);
  if (!pending) {
    el.customerLabel.textContent = "Customer";
    el.customerEntry.classList.add("hidden");
    el.changeCustomer.classList.remove("hidden");
  } else {
    el.customerEntry.classList.remove("hidden");
    el.changeCustomer.classList.add("hidden");
  }
}

function resetCustomer(focus = false) {
  state.selectedCustomer = null;
  state.pendingPhone = "";
  el.customerChip.classList.add("hidden");
  el.customerEntry.classList.remove("hidden");
  el.changeCustomer.classList.add("hidden");
  setCustomerMode("phone");
  el.customerSerial.value = nextCustomerSerial();
  if (focus) el.customerInput.focus();
}

function finalizePhone({ moveNext = true } = {}) {
  const phone = cleanPhone(el.customerInput.value);
  el.customerInput.value = phone;
  if (!phone) {
    setMessage(el.customerMessage);
    if (moveNext) el.barcodeInput.focus();
    return true;
  }
  if (!validPhone(phone)) {
    setMessage(el.customerMessage, "Enter a valid 11-digit Bangladesh mobile number.", "error");
    el.customerInput.focus();
    return false;
  }
  const existing = state.customers.find((customer) => customer.phone === phone);
  if (existing) {
    state.selectedCustomer = existing;
    showCustomerChip(existing);
    setMessage(el.customerMessage);
    toast(`Customer found: ${existing.name || phone}`, "success");
    if (moveNext) el.barcodeInput.focus();
    return true;
  }
  state.pendingPhone = phone;
  showCustomerChip({ name: "", phone }, true);
  setCustomerMode("name");
  state.pendingPhone = phone;
  setMessage(el.customerMessage, "New number — add a name or skip.", "success");
  el.customerInput.focus();
  return true;
}

function finalizeCustomerName({ moveNext = true } = {}) {
  if (!state.pendingPhone) return true;
  const name = el.customerInput.value.trim();
  const customer = { id: `C-${Date.now()}`, name, phone: state.pendingPhone };
  state.customers.push(customer);
  storage.set("fahimPos.customers", state.customers);
  state.selectedCustomer = customer;
  showCustomerChip(customer);
  setMessage(el.customerMessage);
  toast(name ? "New customer saved." : "Customer number attached without a name.", "success");
  if (moveNext) el.barcodeInput.focus();
  return true;
}

function commitCustomerEntry() {
  if (state.selectedCustomer) return true;
  if (state.customerMode === "name" && state.pendingPhone) return finalizeCustomerName({ moveNext: false });
  if (state.customerMode === "phone" && el.customerInput.value.trim()) return finalizePhone({ moveNext: false });
  return true;
}

function addProduct(product) {
  if (!product || product.stock <= 0) {
    toast("This product is out of stock.", "error");
    return;
  }
  const existingIndex = state.cart.findIndex((item) => item.id === product.id);
  const line = state.cart[existingIndex];
  if (line) {
    if (line.qty >= product.stock) {
      toast(`Only ${product.stock} units are in stock.`, "error");
      return;
    }
    line.qty += 1;
    state.selectedCartIndex = existingIndex;
  } else {
    state.cart.push({ ...product, qty: 1 });
    state.selectedCartIndex = state.cart.length - 1;
  }
  renderCart();
  setMessage(el.barcodeMessage, `${product.name} added.`, "success");
  el.barcodeInput.value = "";
  el.barcodeInput.focus();
}

function findByBarcode() {
  const query = normalizeDigits(el.barcodeInput.value).trim().toLowerCase();
  if (!query) return;
  const product = state.products.find((item) => item.barcode.toLowerCase() === query || item.id.toLowerCase() === query);
  if (product) {
    addProduct(product);
  } else {
    setMessage(el.barcodeMessage, "No exact match. Search the product catalogue.", "error");
    openProductModal(query);
  }
}

function changeQty(id, delta) {
  const line = state.cart.find((item) => item.id === id);
  if (!line) return;
  const product = state.products.find((item) => item.id === id);
  const next = line.qty + delta;
  if (next <= 0) return removeItem(id);
  if (next > product.stock) return toast(`Only ${product.stock} units are in stock.`, "error");
  line.qty = next;
  renderCart();
}

function removeItem(id) {
  const removedIndex = state.cart.findIndex((item) => item.id === id);
  if (removedIndex < 0) return;
  state.cart.splice(removedIndex, 1);
  if (!state.cart.length) state.selectedCartIndex = -1;
  else if (state.selectedCartIndex > removedIndex) state.selectedCartIndex -= 1;
  else if (state.selectedCartIndex === removedIndex) state.selectedCartIndex = Math.min(removedIndex, state.cart.length - 1);
  renderCart();
}

function clearCart() {
  if (!state.cart.length) return;
  state.cart = [];
  state.selectedCartIndex = -1;
  renderCart();
  toast("Cart cleared.");
}

function totals() {
  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const qty = state.cart.reduce((sum, item) => sum + item.qty, 0);
  const discount = Math.min(number(el.discountInput.value), subtotal);
  const payable = Math.max(0, subtotal - discount);
  const paid = number(el.paidInput.value);
  return { subtotal, qty, discount, payable, paid, change: Math.max(0, paid - payable), due: Math.max(0, payable - paid) };
}

function renderCart() {
  if (!state.cart.length) state.selectedCartIndex = -1;
  else state.selectedCartIndex = Math.min(Math.max(state.selectedCartIndex, 0), state.cart.length - 1);
  el.cartBody.innerHTML = state.cart.map((item, index) => `
    <tr data-id="${escapeHTML(item.id)}" class="${index === state.selectedCartIndex ? "selected-row" : ""}" aria-selected="${index === state.selectedCartIndex}">
      <td>${index + 1}</td>
      <td class="code-cell">${escapeHTML(item.id)}</td>
      <td class="product-cell"><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(item.barcode)}</small></td>
      <td><div class="qty-control"><button type="button" data-action="decrease" aria-label="Decrease ${escapeHTML(item.name)}">−</button><span>${item.qty}</span><button type="button" data-action="increase" aria-label="Increase ${escapeHTML(item.name)}">+</button></div></td>
      <td class="price-cell">${money(item.price)}</td>
      <td class="total-cell">${money(item.price * item.qty)}</td>
      <td>${item.stock}</td>
      <td><button class="delete-item" type="button" data-action="remove" aria-label="Remove ${escapeHTML(item.name)}">×</button></td>
    </tr>`).join("");
  el.emptyCart.classList.toggle("hidden", state.cart.length > 0);
  const label = `${state.cart.length} ${state.cart.length === 1 ? "item" : "items"}`;
  el.cartCount.textContent = label;
  updateTotals();
}

function selectCartIndex(index) {
  if (!state.cart.length) {
    state.selectedCartIndex = -1;
    return;
  }
  state.selectedCartIndex = Math.min(Math.max(index, 0), state.cart.length - 1);
  const rows = [...el.cartBody.querySelectorAll("tr")];
  rows.forEach((row, rowIndex) => {
    const selected = rowIndex === state.selectedCartIndex;
    row.classList.toggle("selected-row", selected);
    row.setAttribute("aria-selected", String(selected));
  });
  rows[state.selectedCartIndex]?.scrollIntoView({ block: "nearest" });
}

function canUseCartShortcut(target) {
  if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement) && !(target instanceof HTMLSelectElement)) return true;
  return target === el.barcodeInput && !el.barcodeInput.value;
}

function updateTotals() {
  const value = totals();
  if (number(el.discountInput.value) > value.subtotal) el.discountInput.value = String(value.subtotal);
  el.summaryItems.textContent = String(state.cart.length);
  el.summaryQty.textContent = String(value.qty);
  el.summarySubtotal.textContent = money(value.subtotal);
  el.summaryPayable.textContent = money(value.payable);
  if (value.paid < value.payable) {
    el.settlementLabel.textContent = value.paid > 0 ? "Amount due" : "Change return";
    el.settlementAmount.textContent = value.paid > 0 ? money(value.due) : money(0);
    el.settlementAmount.style.color = value.paid > 0 ? "var(--warning)" : "";
  } else {
    el.settlementLabel.textContent = "Change return";
    el.settlementAmount.textContent = money(value.change);
    el.settlementAmount.style.color = value.change > 0 ? "var(--success)" : "";
  }
}

function renderProductList(query = "") {
  const term = normalizeDigits(query).trim().toLowerCase();
  const matches = state.products.filter((item) => !term || item.name.toLowerCase().includes(term) || item.id.toLowerCase().includes(term) || item.barcode.includes(term));
  el.productList.innerHTML = matches.length ? matches.map((item) => `
    <article class="product-result">
      <div><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(item.id)} · ${escapeHTML(item.barcode)}</small></div>
      <div class="stock"><span>Stock</span><strong>${item.stock}</strong></div>
      <button type="button" data-product-id="${escapeHTML(item.id)}" ${item.stock <= 0 ? "disabled" : ""}>${item.stock <= 0 ? "Out" : money(item.price)}</button>
    </article>`).join("") : `<div class="empty-cart"><span>⌕</span><strong>No products found</strong><p>Try a different name, code or barcode.</p></div>`;
}

function openProductModal(query = "") {
  el.productModal.classList.remove("hidden");
  el.productSearchInput.value = query;
  renderProductList(query);
  window.setTimeout(() => el.productSearchInput.focus(), 0);
}

function closeProductModal() {
  el.productModal.classList.add("hidden");
  el.barcodeInput.focus();
}

function receiptData() {
  const value = totals();
  return {
    invoice: el.invoiceNumber.value,
    createdAt: new Date(),
    customer: state.selectedCustomer,
    items: state.cart.map((item) => ({ ...item })),
    ...value
  };
}

function renderReceipt(data) {
  const date = data.createdAt.toLocaleDateString("en-GB");
  const time = data.createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const customerLine = data.customer ? `<div class="receipt-customer">Customer: ${escapeHTML(data.customer.name || "Customer")} · ${escapeHTML(data.customer.phone)}</div>` : "";
  const discountLine = data.discount > 0 ? `<div><span>Discount</span><strong>-${money(data.discount)}</strong></div>` : "";
  const dueLine = data.due > 0 ? `<div><span>Due</span><strong>${money(data.due)}</strong></div>` : "";
  const changeLine = data.change > 0 ? `<div><span>Change</span><strong>${money(data.change)}</strong></div>` : "";
  el.receipt.dataset.paper = el.paperSize.value;
  el.receipt.innerHTML = `
    <h1>FAHIM POS</h1>
    <div class="shop-meta">Retail Shop · 01XXXXXXXXX</div>
    <div class="rule">----------------------------------------</div>
    <div class="receipt-meta"><span>INV: ${escapeHTML(data.invoice)}</span><span>${date}</span><span>Cashier: Fahim</span><span>${time}</span></div>
    ${customerLine}
    <div class="rule">----------------------------------------</div>
    <table><thead><tr><th>Item</th><th>Qty×Rate</th><th>Total</th></tr></thead><tbody>${data.items.map((item) => `<tr><td>${escapeHTML(item.name)}</td><td>${item.qty}×${Number(item.price).toFixed(0)}</td><td>${Number(item.qty * item.price).toFixed(0)}</td></tr>`).join("")}</tbody></table>
    <div class="rule">----------------------------------------</div>
    <div class="receipt-summary"><div><span>Subtotal</span><strong>${money(data.subtotal)}</strong></div>${discountLine}<div class="grand"><span>PAYABLE</span><strong>${money(data.payable)}</strong></div><div><span>Paid</span><strong>${money(data.paid)}</strong></div>${dueLine}${changeLine}</div>
    <div class="rule">----------------------------------------</div>
    <div class="receipt-footer">Items: ${data.items.length} · Qty: ${data.qty}<br>Thank you for shopping!</div>`;
  state.lastReceipt = data;
}

function saveCurrentSale({ print = false } = {}) {
  if (!state.cart.length) {
    toast("Add at least one product first.", "error");
    el.barcodeInput.focus();
    return;
  }
  if (!commitCustomerEntry()) return;
  const data = receiptData();
  if (data.paid === 0 && print) {
    data.paid = data.payable;
    data.change = 0;
    data.due = 0;
    el.paidInput.value = String(data.payable);
  }
  renderReceipt(data);
  const sales = storage.get("fahimPos.sales", []);
  sales.push({ ...data, createdAt: data.createdAt.toISOString() });
  storage.set("fahimPos.sales", sales.slice(-500));
  data.items.forEach((line) => {
    const product = state.products.find((item) => item.id === line.id);
    if (product) product.stock = Math.max(0, product.stock - line.qty);
  });
  storage.set("fahimPos.products", state.products);
  state.invoiceCounter += 1;
  storage.set("fahimPos.invoiceCounter", state.invoiceCounter);
  if (print) window.print();
  state.cart = [];
  el.discountInput.value = "0.00";
  el.paidInput.value = "";
  resetCustomer();
  el.invoiceNumber.value = invoiceNo();
  el.dateDisplay.value = new Date().toLocaleDateString("en-US");
  renderCart();
  toast(print ? "Sale saved and receipt sent to printer." : "Sale saved successfully.", "success");
  el.barcodeInput.focus();
}

function printCurrent() {
  if (!state.cart.length) return toast("Add at least one product first.", "error");
  if (!commitCustomerEntry()) return;
  renderReceipt(receiptData());
  window.print();
}

function updateNetworkStatus() {
  const online = navigator.onLine;
  el.networkStatus.classList.toggle("offline", !online);
  el.networkStatus.querySelector("span").textContent = online ? "Online" : "Offline";
}

el.themeToggle.addEventListener("click", () => applyTheme(el.html.dataset.theme === "dark" ? "light" : "dark"));
el.logoutButton.addEventListener("click", () => toast("Logout will be active after the login system is connected."));
el.paperSize.addEventListener("change", () => storage.set("fahimPos.paperSize", el.paperSize.value));
el.customerInput.addEventListener("input", () => {
  if (state.customerMode === "phone") el.customerInput.value = cleanPhone(el.customerInput.value);
  setMessage(el.customerMessage);
});
el.customerInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== "Tab") return;
  event.preventDefault();
  if (state.customerMode === "phone") finalizePhone();
  else finalizeCustomerName();
});
el.skipCustomerName.addEventListener("click", () => finalizeCustomerName());
el.removeCustomer.addEventListener("click", () => resetCustomer(true));
el.changeCustomer.addEventListener("click", () => resetCustomer(true));
el.barcodeInput.addEventListener("input", () => setMessage(el.barcodeMessage));
el.barcodeInput.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); findByBarcode(); } });
el.searchProduct.addEventListener("click", () => openProductModal(el.barcodeInput.value));
el.cartBody.addEventListener("click", (event) => {
  const row = event.target.closest("tr");
  if (!row) return;
  selectCartIndex([...el.cartBody.children].indexOf(row));
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = row.dataset.id;
  if (button.dataset.action === "increase") changeQty(id, 1);
  if (button.dataset.action === "decrease") changeQty(id, -1);
  if (button.dataset.action === "remove") removeItem(id);
});
el.clearCart.addEventListener("click", clearCart);
el.discountInput.addEventListener("input", updateTotals);
el.paidInput.addEventListener("input", updateTotals);
el.paidPrint.addEventListener("click", () => saveCurrentSale({ print: true }));
el.saveSale.addEventListener("click", () => saveCurrentSale({ print: false }));
el.printOnly.addEventListener("click", printCurrent);
el.closeProductModal.addEventListener("click", closeProductModal);
el.productModal.addEventListener("click", (event) => { if (event.target === el.productModal) closeProductModal(); });
el.productSearchInput.addEventListener("input", () => renderProductList(el.productSearchInput.value));
el.productList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-product-id]");
  if (!button) return;
  const product = state.products.find((item) => item.id === button.dataset.productId);
  addProduct(product);
  closeProductModal();
});
window.addEventListener("online", updateNetworkStatus);
window.addEventListener("offline", updateNetworkStatus);
window.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "x") { event.preventDefault(); clearCart(); return; }
  if (event.key === "F2") { event.preventDefault(); el.barcodeInput.focus(); el.barcodeInput.select(); return; }
  if (event.key === "F3") { event.preventDefault(); openProductModal(); }
  if (event.key === "F6") { event.preventDefault(); el.discountInput.focus(); el.discountInput.select(); return; }
  if (event.key === "F7") { event.preventDefault(); el.paidInput.focus(); el.paidInput.select(); return; }
  if (event.key === "F8") { event.preventDefault(); saveCurrentSale({ print: true }); return; }
  if (event.key === "Escape" && !el.productModal.classList.contains("hidden")) { event.preventDefault(); closeProductModal(); return; }
  if (!el.productModal.classList.contains("hidden") || !state.cart.length || !canUseCartShortcut(event.target)) return;

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (state.selectedCartIndex < 0) selectCartIndex(event.key === "ArrowDown" ? 0 : state.cart.length - 1);
    else selectCartIndex(state.selectedCartIndex + (event.key === "ArrowDown" ? 1 : -1));
    return;
  }

  const addKey = event.key === "+" || event.code === "NumpadAdd";
  const subtractKey = event.key === "-" || event.code === "NumpadSubtract";
  if (addKey || subtractKey) {
    event.preventDefault();
    if (state.selectedCartIndex < 0) selectCartIndex(0);
    const selectedItem = state.cart[state.selectedCartIndex];
    if (selectedItem) changeQty(selectedItem.id, addKey ? 1 : -1);
    return;
  }

  if (event.key === "Delete") {
    event.preventDefault();
    const selectedItem = state.cart[state.selectedCartIndex];
    if (selectedItem) removeItem(selectedItem.id);
  }
});

applyTheme(storage.get("fahimPos.theme", window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
el.paperSize.value = storage.get("fahimPos.paperSize", "58");
el.invoiceNumber.value = invoiceNo();
el.dateDisplay.value = new Date().toLocaleDateString("en-US");
el.customerSerial.value = nextCustomerSerial();
updateNetworkStatus();
renderCart();
renderProductList();
window.setTimeout(() => el.barcodeInput.focus(), 100);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
}
