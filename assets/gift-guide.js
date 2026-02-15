(function () {
  const modal = document.querySelector(".gg-modal");
  if (!modal) return;

  const panel = modal.querySelector(".gg-modal__panel");
  const img = modal.querySelector(".gg-modal__img img");
  const titleEl = modal.querySelector(".gg-modal__title");
  const priceEl = modal.querySelector(".gg-modal__price");
  const descEl = modal.querySelector(".gg-modal__desc");
  const optsWrap = modal.querySelector(".gg-modal__opts");
  const msgEl = modal.querySelector(".gg-modal__msg");
  const addBtn = modal.querySelector("[data-gg-add]");

  let current = null; // product data
  let selectedVariantId = null;

  function openModal(product) {
    current = product;
    msgEl.textContent = "";

    img.src = product.image || "";
    img.alt = product.title || "";

    titleEl.textContent = product.title || "";
    priceEl.textContent = product.price || "";
    descEl.textContent = product.description || "";

    buildOptions(product);
    modal.hidden = false;
    document.documentElement.style.overflow = "hidden";
  }

  function closeModal() {
    modal.hidden = true;
    document.documentElement.style.overflow = "";
    current = null;
    selectedVariantId = null;
    optsWrap.innerHTML = "";
    msgEl.textContent = "";
  }

  function normalizeName(s) {
    return String(s || "").trim().toLowerCase();
  }

  function findVariantBySelections(product, selections) {
    // selections = ["Red","S"] etc in option order
    const v = product.variants.find(vr => {
      const vOpts = [vr.option1, vr.option2, vr.option3].filter(Boolean);
      if (vOpts.length !== selections.length) return false;
      for (let i = 0; i < selections.length; i++) {
        if (String(vOpts[i]) !== String(selections[i])) return false;
      }
      return true;
    });
    return v || product.variants[0];
  }

  function buildOptions(product) {
    optsWrap.innerHTML = "";

    const options = product.options || [];
    const selections = [];

    // default selections = first value from each option
    options.forEach((opt) => {
      selections.push(opt.values?.[0] || "");
    });

    function refreshVariant() {
      const v = findVariantBySelections(product, selections);
      selectedVariantId = v?.id;
      // keep price updated
      // (Shopify money formatting not available here, so keep original "product.price" or show variant price number)
      // If you want, you can fetch formatted price from cart later.
    }

    options.forEach((opt, idx) => {
      const optName = opt.name;
      const isColor = normalizeName(optName).includes("color") || normalizeName(optName).includes("colour");

      const block = document.createElement("div");
      block.className = "gg-opt";

      const label = document.createElement("div");
      label.className = "gg-opt__label";
      label.textContent = optName;
      block.appendChild(label);

      if (isColor) {
        // Figma-style chips (2 columns)
        const row = document.createElement("div");
        row.className = "gg-opt__row gg-opt__row--grid2";

        opt.values.forEach((val, vIdx) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "gg-chip";
          btn.setAttribute("aria-pressed", vIdx === 0 ? "true" : "false");
          btn.textContent = val;

          btn.addEventListener("click", () => {
            selections[idx] = val;
            // update pressed state
            row.querySelectorAll(".gg-chip").forEach((b) => b.setAttribute("aria-pressed", "false"));
            btn.setAttribute("aria-pressed", "true");
            refreshVariant();
          });

          row.appendChild(btn);
        });

        block.appendChild(row);
      } else {
        // Figma size dropdown
        const select = document.createElement("select");
        select.className = "gg-select";

        opt.values.forEach((val, vIdx) => {
          const o = document.createElement("option");
          o.value = val;
          o.textContent = val;
          if (vIdx === 0) o.selected = true;
          select.appendChild(o);
        });

        select.addEventListener("change", () => {
          selections[idx] = select.value;
          refreshVariant();
        });

        block.appendChild(select);
      }

      optsWrap.appendChild(block);
    });

    refreshVariant();
  }

  async function addToCart() {
    if (!selectedVariantId) {
      msgEl.textContent = "Please select options.";
      return;
    }

    addBtn.disabled = true;
    msgEl.textContent = "Adding...";

    try {
      const res = await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedVariantId, quantity: 1 })
      });

      if (!res.ok) throw new Error("Add to cart failed");
      msgEl.textContent = "Added to cart ✅";
    } catch (e) {
      msgEl.textContent = "Could not add to cart. Please try again.";
    } finally {
      addBtn.disabled = false;
    }
  }

  // open modal from cards
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".gg-card");
    if (!card) return;

    const raw = card.getAttribute("data-gg-product");
    if (!raw) return;

    try {
      const product = JSON.parse(raw);
      openModal(product);
    } catch (err) {}
  });

  // close handlers
  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-gg-close]")) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (!modal.hidden && e.key === "Escape") closeModal();
  });

  addBtn.addEventListener("click", addToCart);
})();
