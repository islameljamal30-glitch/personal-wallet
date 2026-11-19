/* Safe to spend calculator. Everything stays in this page: no storage, no network, no cookies. */
(function () {
  "use strict";
  var root = document.querySelector("[data-calc]");
  if (!root) return;

  var list = root.querySelector("[data-bills]");
  var result = root.querySelector("[data-result]");
  var short = root.querySelector("[data-short]");
  var money = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
  var nextBill = list.children.length + 1;

  // Accepts 1234.56, 1234,56, 1.234,56, 1,234.56 and amounts with spaces or a € sign.
  function parse(text) {
    var t = String(text || "").replace(/[\s€]/g, "").replace(/^\+/, "");
    if (!t) return 0;
    var negative = /^-/.test(t);
    t = t.replace(/^-/, "");
    if (!/^[0-9.,]+$/.test(t)) return NaN;
    var lastDot = t.lastIndexOf("."), lastComma = t.lastIndexOf(",");
    var decimal = null;
    if (lastDot >= 0 && lastComma >= 0) decimal = lastDot > lastComma ? "." : ",";
    else if (lastComma >= 0) decimal = /,[0-9]{3}$/.test(t) && /^[0-9]{1,3}(,[0-9]{3})+$/.test(t) ? null : ",";
    else if (lastDot >= 0) decimal = /^[0-9]{1,3}(\.[0-9]{3})+$/.test(t) ? null : ".";
    var whole = t, fraction = "";
    if (decimal) {
      var at = t.lastIndexOf(decimal);
      whole = t.slice(0, at);
      fraction = t.slice(at + 1);
      if (fraction.length > 2) return NaN;
    }
    if (/[.,]/.test(whole) && !/^[0-9]{1,3}([.,][0-9]{3})+$/.test(whole)) return NaN;
    whole = whole.replace(/[.,]/g, "");
    if (!/^[0-9]*$/.test(whole) || (!whole && !fraction)) return NaN;
    var cents = parseInt(whole || "0", 10) * 100 + parseInt((fraction + "00").slice(0, 2), 10);
    return negative ? -cents : cents;
  }

  function read(input) {
    var cents = parse(input.value);
    var bad = isNaN(cents) || cents < 0;
    input.setAttribute("aria-invalid", bad ? "true" : "false");
    input.closest(".field__money").classList.toggle("is-invalid", bad);
    return bad ? 0 : cents;
  }

  function show(cents) { return money.format(cents / 100); }

  var invalidNote = root.querySelector("[data-invalid]");

  function update() {
    var have = read(root.querySelector('[data-amount="money"]'));
    var bills = 0;
    root.querySelectorAll('[data-amount="bill"]').forEach(function (input) { bills += read(input); });
    var savings = read(root.querySelector('[data-amount="savings"]'));
    var buffer = read(root.querySelector('[data-amount="buffer"]'));
    var left = have - bills - savings - buffer;
    var safe = Math.max(0, left);

    result.textContent = show(safe);
    if (left < 0) {
      short.hidden = false;
      short.textContent = show(-left) + " more needed to cover your bills, savings and buffer.";
    } else {
      short.hidden = true;
      short.textContent = "";
    }
    var parts = { safe: safe, bills: bills, savings: savings, buffer: buffer };
    Object.keys(parts).forEach(function (key) {
      root.querySelector('[data-out="' + key + '"]').textContent = show(parts[key]);
      var seg = root.querySelector('[data-seg="' + key + '"]');
      seg.style.flexGrow = String(parts[key]);
      seg.hidden = parts[key] <= 0;
    });
    root.classList.toggle("is-empty", have + bills + savings + buffer === 0);
    invalidNote.hidden = !root.querySelector('[aria-invalid="true"]');
  }

  function addBill() {
    var n = nextBill++;
    var li = document.createElement("li");
    li.className = "bill";
    var nameLabel = document.createElement("label");
    nameLabel.className = "visually-hidden";
    nameLabel.htmlFor = "bill-name-" + n;
    nameLabel.textContent = "Bill " + n + " name";
    var name = document.createElement("input");
    name.className = "bill__name";
    name.id = "bill-name-" + n;
    name.type = "text";
    name.autocomplete = "off";
    name.placeholder = "Bill";
    var wrap = document.createElement("div");
    wrap.className = "field__money";
    var euro = document.createElement("span");
    euro.setAttribute("aria-hidden", "true");
    euro.textContent = "€";
    var amountLabel = document.createElement("label");
    amountLabel.className = "visually-hidden";
    amountLabel.htmlFor = "bill-amount-" + n;
    amountLabel.textContent = "Bill " + n + " amount";
    var amount = document.createElement("input");
    amount.id = "bill-amount-" + n;
    amount.type = "text";
    amount.inputMode = "decimal";
    amount.autocomplete = "off";
    amount.spellcheck = false;
    amount.placeholder = "0";
    amount.setAttribute("data-amount", "bill");
    wrap.append(euro, amountLabel, amount);
    var remove = document.createElement("button");
    remove.className = "bill__remove";
    remove.type = "button";
    remove.setAttribute("aria-label", "Remove bill " + n);
    remove.setAttribute("data-remove", "");
    remove.textContent = "×";
    li.append(nameLabel, name, wrap, remove);
    list.appendChild(li);
    name.focus();
  }

  root.addEventListener("input", update);
  root.querySelector("[data-add-bill]").addEventListener("click", function () { addBill(); update(); });
  list.addEventListener("click", function (event) {
    var button = event.target.closest("[data-remove]");
    if (!button) return;
    var item = button.closest(".bill");
    var next = item.nextElementSibling || item.previousElementSibling;
    item.remove();
    if (!list.children.length) addBill();
    else if (next) next.querySelector("input").focus();
    update();
  });
  update();
})();
