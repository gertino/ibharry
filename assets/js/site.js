/* iBharry Designs. Site behaviour. */
(function () {
  "use strict";

  /* keep one nav dropdown open at a time, close on outside click */
  var groups = Array.prototype.slice.call(document.querySelectorAll(".nav details"));
  groups.forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (!d.open) return;
      groups.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });
  document.addEventListener("click", function (e) {
    if (e.target.closest(".nav details")) return;
    groups.forEach(function (d) { d.open = false; });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") groups.forEach(function (d) { d.open = false; });
  });

  /* category filter on the shop page */
  var chips = Array.prototype.slice.call(document.querySelectorAll(".chip[data-filter]"));
  var cards = Array.prototype.slice.call(document.querySelectorAll(".grid .card[data-category]"));
  var empty = document.querySelector(".grid-empty");

  function applyFilter(value) {
    var shown = 0;
    cards.forEach(function (c) {
      var hit = value === "all" || c.getAttribute("data-category") === value;
      c.hidden = !hit;
      if (hit) shown += 1;
    });
    if (empty) empty.hidden = shown !== 0;
    chips.forEach(function (c) {
      c.setAttribute("aria-pressed", String(c.getAttribute("data-filter") === value));
    });
    /* the grid can get much shorter, which would otherwise leave the visitor
       looking at the footer wondering whether the click did anything */
    var grid = document.querySelector(".grid");
    if (grid) {
      var top = grid.getBoundingClientRect().top + window.scrollY;
      if (window.scrollY > top - 80) window.scrollTo({ top: Math.max(top - 80, 0), behavior: "smooth" });
    }
  }

  if (chips.length && cards.length) {
    chips.forEach(function (c) {
      c.addEventListener("click", function () { applyFilter(c.getAttribute("data-filter")); });
    });
    var preset = new URLSearchParams(location.search).get("category");
    if (preset) applyFilter(preset);
  }

  /* ---------- cart ----------
     Kept in localStorage because there is nothing to buy here. The cart is a
     list of interest that becomes a quote request. */

  var CART_KEY = "ibharry_cart_v1";

  function esc(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function readCart() {
    try {
      var list = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function countCart(list) {
    return (list || readCart()).reduce(function (n, it) { return n + (it.qty || 1); }, 0);
  }

  function writeCart(list) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(list)); } catch (e) {}
    paintCartCount();
    renderCartPage();
  }

  function paintCartCount() {
    var n = countCart();
    document.querySelectorAll("[data-cart-count]").forEach(function (el) {
      el.textContent = String(n);
      el.className = "cart-count" + (n > 0 ? " warm" : "");
    });
  }

  function addToCart(item, qty) {
    var list = readCart();
    var hit = null;
    list.forEach(function (it) { if (it.id === item.id) hit = it; });
    if (hit) hit.qty = Math.min(99, (hit.qty || 1) + qty);
    else { item.qty = qty; list.push(item); }
    writeCart(list);
  }

  function setQty(id, qty) {
    var list = readCart();
    list.forEach(function (it) { if (it.id === id) it.qty = Math.max(1, Math.min(99, qty)); });
    writeCart(list);
  }

  function removeFromCart(id) {
    writeCart(readCart().filter(function (it) { return it.id !== id; }));
  }

  function toast(html) {
    var el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.innerHTML = html;
    el.classList.add("show");
    clearTimeout(el.__timer);
    el.__timer = setTimeout(function () { el.classList.remove("show"); }, 3400);
  }

  function renderCartPage() {
    var host = document.querySelector("[data-cart-list]");
    if (!host) return;
    var list = readCart();
    var empty = document.querySelector("[data-cart-empty]");
    var checkout = document.querySelector("[data-cart-checkout]");
    var field = document.querySelector("[data-cart-items]");

    if (!list.length) {
      host.innerHTML = "";
      if (empty) empty.hidden = false;
      if (checkout) checkout.hidden = true;
      if (field) field.value = "";
      return;
    }
    if (empty) empty.hidden = true;
    if (checkout) checkout.hidden = false;

    var total = countCart(list);
    host.innerHTML = list.map(function (it) {
      var url = "piece-" + it.id + ".html";
      var img = it.photo ? "url('assets/photos/" + encodeURIComponent(it.photo) + "')" : "none";
      return '<div class="cart-row" data-id="' + esc(it.id) + '">\n' +
        '  <a class="cart-thumb" href="' + esc(url) + '" style="background-image:' + img + '" aria-label="' + esc(it.name) + '"></a>\n' +
        '  <div>\n' +
        '    <h3 class="cart-name"><a href="' + esc(url) + '">' + esc(it.name) + '</a></h3>\n' +
        '    <p class="cart-meta">' + esc(it.cat) + ' &middot; Quoted per order</p>\n' +
        '  </div>\n' +
        '  <div class="cart-side">\n' +
        '    <div class="qty">\n' +
        '      <button type="button" data-cart-down aria-label="One fewer">&minus;</button>\n' +
        '      <input type="text" inputmode="numeric" value="' + (it.qty || 1) + '" data-cart-qty aria-label="Quantity">\n' +
        '      <button type="button" data-cart-up aria-label="One more">+</button>\n' +
        '    </div>\n' +
        '    <button type="button" class="cart-remove" data-cart-remove>Remove</button>\n' +
        '  </div>\n' +
        '</div>';
    }).join("\n") +
      '\n<div class="cart-total"><span>' + total + (total === 1 ? " piece" : " pieces") +
      '</span><span>Quoted per order</span></div>';

    if (field) {
      field.value = list.map(function (it) {
        return (it.qty || 1) + " x " + it.name + (it.cat ? " (" + it.cat + ")" : "");
      }).join("\n");
    }
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var add = t.closest("[data-add-to-cart]");
    if (add) {
      e.preventDefault();
      var inPiece = add.closest(".piece");
      var qtyBox = document.querySelector("[data-qty-input]");
      var qty = (inPiece && qtyBox) ? (parseInt(qtyBox.value, 10) || 1) : 1;
      addToCart({
        id: add.getAttribute("data-id"),
        name: add.getAttribute("data-name"),
        cat: add.getAttribute("data-cat") || "",
        photo: add.getAttribute("data-photo") || ""
      }, qty);
      toast('Added to your list. <a href="cart.html">View cart</a>');
      return;
    }

    var row = t.closest(".cart-row");
    if (!row) return;
    var id = row.getAttribute("data-id");
    var box = row.querySelector("[data-cart-qty]");
    var now = box ? (parseInt(box.value, 10) || 1) : 1;
    if (t.closest("[data-cart-up]")) setQty(id, now + 1);
    else if (t.closest("[data-cart-down]")) setQty(id, now - 1);
    else if (t.closest("[data-cart-remove]")) removeFromCart(id);
  });

  document.addEventListener("change", function (e) {
    if (!e.target || !e.target.matches || !e.target.matches("[data-cart-qty]")) return;
    var row = e.target.closest(".cart-row");
    if (row) setQty(row.getAttribute("data-id"), parseInt(e.target.value, 10) || 1);
  });

  (function quantityStepper() {
    var input = document.querySelector("[data-qty-input]");
    if (!input) return;
    function bump(delta) {
      input.value = String(Math.max(1, Math.min(99, (parseInt(input.value, 10) || 1) + delta)));
    }
    var up = document.querySelector("[data-qty-up]");
    var down = document.querySelector("[data-qty-down]");
    if (up) up.addEventListener("click", function () { bump(1); });
    if (down) down.addEventListener("click", function () { bump(-1); });
  })();

  paintCartCount();
  renderCartPage();

  /* prefill the order form when arriving from a product card */
  var form = document.querySelector("form[data-inquiry]");
  if (form) {
    var params = new URLSearchParams(location.search);
    var want = params.get("want");
    var field = form.querySelector("[name=piece]");
    if (want && field) field.value = want;

    var endpoint = form.getAttribute("data-endpoint") || "";
    var isLocal = location.hostname === "127.0.0.1" || location.hostname === "localhost";
    var serviceUrl = /^https?:/i.test(endpoint) ? endpoint : "";

    /* where a submission goes:
       localhost                        the local server, which files it and saves the photos
       a form service URL set in panel   the browser posts the form itself, photos included
       anything else                     the visitor's email app, details filled in */
    var mode = isLocal ? "local" : (serviceUrl ? "service" : "mailto");

    var photoNote = form.querySelector("[data-photo-note]");
    if (photoNote) {
      if (mode === "mailto") {
        photoNote.textContent = "Your email app will open with the details filled in. Attach your photos to that email before you send it.";
      } else if (mode === "service") {
        photoNote.textContent = "Sent straight to us with your photos attached. Up to 10MB in total.";
      }
    }

    var MAX_UPLOAD = 10 * 1024 * 1024;

    function uploadBytes() {
      var total = 0;
      form.querySelectorAll("input[type=file]").forEach(function (input) {
        Array.prototype.forEach.call(input.files || [], function (f) { total += f.size; });
      });
      return total;
    }

    function showMessage(text, kind) {
      var msg = form.querySelector(".form-msg");
      if (!msg) return;
      msg.hidden = false;
      msg.className = "form-msg " + kind;
      msg.textContent = text;
      if (msg.scrollIntoView) msg.scrollIntoView({ block: "center", behavior: "smooth" });
    }

    function mailtoHref(data) {
      var to = form.getAttribute("data-email") || "Brandon@ibharry.com";
      var lines = [];
      Object.keys(data).forEach(function (k) {
        if (k === "photos" || k === "attachment") return;
        if (data[k]) lines.push(k + ": " + data[k]);
      });
      return "mailto:" + to +
        "?subject=" + encodeURIComponent("Website request from " + (data.name || "a customer")) +
        "&body=" + encodeURIComponent(lines.join("\n") + "\n\n(Attach your photos to this email.)");
    }

    if (mode === "service") {
      /* the browser posts this form itself so the attachments survive. The build
         already wrote action and enctype; this only fills in a missing action. */
      if (!form.getAttribute("action")) {
        form.setAttribute("action", serviceUrl);
        form.setAttribute("method", "post");
        form.setAttribute("enctype", "multipart/form-data");
      }
      form.addEventListener("submit", function (e) {
        var bytes = uploadBytes();
        if (bytes > MAX_UPLOAD) {
          e.preventDefault();
          showMessage("Those photos total about " + Math.round(bytes / 1048576) +
            "MB. The form takes 10MB at a time, so send fewer or smaller ones.", "bad");
        }
      });
    } else {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var msg = form.querySelector(".form-msg");
        var btn = form.querySelector("button[type=submit]");
        var fd = new FormData(form);
        var data = Object.fromEntries(fd.entries());
        var fileCount = form.querySelectorAll("input[type=file]").length
          ? Array.from(form.querySelector("input[type=file]").files || []).length : 0;

        if (mode === "mailto") {
          window.location.href = mailtoHref(data);
          msg.hidden = false;
          msg.className = "form-msg ok";
          msg.textContent = fileCount
            ? "Opening your email app with your details. Attach the photos you picked to that email."
            : "Opening your email app with the details filled in. Send it and we will reply within two business days.";
          return;
        }

        btn.disabled = true;
        btn.textContent = "Sending";
        fetch("/api/inquiry", { method: "POST", body: fd, headers: { "Accept": "application/json" } })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
          .then(function (res) {
            var bad = !res.ok || (res.body && res.body.ok === false);
            msg.hidden = false;
            msg.className = "form-msg " + (bad ? "bad" : "ok");
            var saved = res.body && res.body.photos ? res.body.photos : 0;
            msg.textContent = bad
              ? ((res.body && res.body.error) || "That did not send. Please try again or send us a DM on Instagram.")
              : "Thank you. Your request is saved" +
                (saved ? " with " + saved + (saved === 1 ? " photo" : " photos") : "") +
                ", and we will reply by email within two business days.";
            if (!bad) form.reset();
            /* a cart request replaces the list, so empty it rather than leave it
               sitting there to be sent twice */
            if (!bad && form.querySelector("[data-cart-items]")) {
              try { localStorage.removeItem(CART_KEY); } catch (e) {}
              paintCartCount();
              renderCartPage();
              msg.textContent = "Thank you. Your list is with us and we will reply by email within two business days.";
            }
          })
          .catch(function () {
            msg.hidden = false;
            msg.className = "form-msg bad";
            msg.textContent = "The form could not reach the site. Send us a DM on Instagram and we will pick it up there.";
          })
          .finally(function () {
            btn.disabled = false;
            btn.textContent = "Send request";
          });
      });
    }
  }
})();
