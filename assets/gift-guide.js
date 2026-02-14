/* Gift Guide - Vanilla JS only (no jQuery) */
(function () {
  const root = document;
  const body = document.body;

  function money(cents) {
    // Shopify returns cents sometimes; product JSON includes price in cents
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format((cents || 0) / 100);
    } catch (e) {
      return ((cents || 0) / 100).toFixed(2);
    }
  }

  function findVariant(product, selectedOptions) {
    // selectedOptions = ["White","S"] etc matching option1/2/3 values
    return product.variants.find(v => {
      const vOpts = [v.option1, v.option2, v.option3].filter(Boolean);
      if (vOpts.length !== selectedOptions.length) return false;
      for (let i = 0; i < vOpts.length; i++) {
        if ((vOpts[i] || "").toLowerCase() !== (selectedOptions[i] || "").toLowerCase()) return false;
      }
      return true;
    }) || product.variants.find(v => v.available) || product.variants[0];
  }

  async function fetchProductByHandle(handle) {
    if (!handle) return null;
    const res = await fetch(`/products/${handle}.js`);
    if (!res.ok) return null;
    return await res.json();
  }

  async function addToCartItems(items) {
    const res = await fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ items })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Add to cart failed");
    }
    return await res.json();
  }

  function lockScroll(lock) {
    body.style.overflow = lock ? "hidden" : "";
  }

  function initSection(sectionEl) {
    const modal = sectionEl.querySelector(".gg-modal");
    if (!modal) return;

    const overlayCloseEls = modal.querySelectorAll("[data-gg-close]");
    const panel = modal.querySelector(".gg-modal__panel");

    const imgEl = modal.querySelector(".gg-modal__img img");
    const titleEl = modal.querySelector(".gg-modal__title");
    const priceEl = modal.querySelector(".gg-modal__price");
    const descEl = modal.querySelector(".gg-modal__desc");
    const optsEl = modal.querySelector(".gg-modal__options");
    const addBtn = modal.querySelector(".gg-btn--add");
    const msgEl = modal.querySelector(".gg-modal__msg");

    let currentProduct = null;
    let selectedOptions = [];

    function closeModal() {
      modal.hidden = true;
      lockScroll(false);
      currentProduct = null;
      selectedOptions = [];
      optsEl.innerHTML = "";
      msgEl.textContent = "";
    }

    overlayCloseEls.forEach(el => el.addEventListener("click", closeModal));
    root.addEventListener("keydown", (e) => {
      if (!modal.hidden && e.key === "Escape") closeModal();
    });

    function renderOptions(product) {
      // product.options = ["Color","Size"] etc
      // product.variants has option1/2/3
      optsEl.innerHTML = "";
      selectedOptions = [];

      const optionNames = product.options || [];
      const optionValues = optionNames.map((_, idx) => {
        const key = `option${idx + 1}`;
        const set = new Set();
        product.variants.forEach(v => {
          if (v[key]) set.add(v[key]);
        });
        return Array.from(set);
      });

      optionNames.forEach((name, idx) => {
        const values = optionValues[idx];
        const wrap = document.createElement("div");
        wrap.className = "gg-opt";

        const label = document.createElement("div");
        label.className = "gg-opt__label";
        label.textContent = name;
        wrap.appendChild(label);

        // If it's Color: use chips. If it's Size: use select like screenshot.
        if (name.toLowerCase().includes("size")) {
          const select = document.createElement("select");
          select.className = "gg-select";
          select.innerHTML = `<option value="">Choose your size</option>` + values.map(v => `<option value="${v}">${v}</option>`).join("");
          select.addEventListener("change", () => {
            selectedOptions[idx] = select.value || "";
          });
          wrap.appendChild(select);
        } else {
          const row = document.createElement("div");
          row.className = "gg-opt__row";

          values.forEach((v, vIdx) => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "gg-chip";
            chip.textContent = v;
            chip.setAttribute("aria-pressed", vIdx === 0 ? "true" : "false");

            chip.addEventListener("click", () => {
              row.querySelectorAll(".gg-chip").forEach(c => c.setAttribute("aria-pressed", "false"));
              chip.setAttribute("aria-pressed", "true");
              selectedOptions[idx] = v;
            });

            row.appendChild(chip);

            // default first value
            if (vIdx === 0) selectedOptions[idx] = v;
          });

          wrap.appendChild(row);
        }

        optsEl.appendChild(wrap);
      });
    }

    function openModal(product) {
      currentProduct = product;

      imgEl.src = product.featured_image || "";
      imgEl.alt = product.title || "";

      titleEl.textContent = product.title || "";
      priceEl.textContent = money(product.price);
      descEl.textContent = product.description ? product.description.replace(/<[^>]*>/g, "").slice(0, 120) : "";

      renderOptions(product);

      modal.hidden = false;
      lockScroll(true);
    }

    sectionEl.querySelectorAll(".gg-card[data-gg-product]").forEach(card => {
      card.addEventListener("click", () => {
        const raw = card.getAttribute("data-gg-product");
        if (!raw) return;
        const product = JSON.parse(raw);
        openModal(product);
      });
    });

    addBtn.addEventListener("click", async () => {
      msgEl.textContent = "";
      if (!currentProduct) return;

      // Ensure size is selected if size dropdown exists
      const sizeSelect = optsEl.querySelector(".gg-select");
      if (sizeSelect && !sizeSelect.value) {
        msgEl.textContent = "Please choose your size.";
        return;
      }

      const normalizedSelected = selectedOptions.filter(Boolean);
      const variant = findVariant(currentProduct, normalizedSelected);
      if (!variant || !variant.id) {
        msgEl.textContent = "Variant not found.";
        return;
      }

      const hasBlack = normalizedSelected.some(v => v.toLowerCase() === "black");
      const hasMedium = normalizedSelected.some(v => v.toLowerCase() === "medium");

      try {
        addBtn.disabled = true;
        addBtn.style.opacity = "0.7";
        msgEl.textContent = "Adding to cart...";

        const items = [{ id: variant.id, quantity: 1 }];

        if (hasBlack && hasMedium && window.GG_BONUS_PRODUCT_HANDLE) {
          const bonusProduct = await fetchProductByHandle(window.GG_BONUS_PRODUCT_HANDLE);
          if (bonusProduct && bonusProduct.variants && bonusProduct.variants.length) {
            const bonusVariant = bonusProduct.variants.find(v => v.available) || bonusProduct.variants[0];
            if (bonusVariant && bonusVariant.id) {
              items.push({ id: bonusVariant.id, quantity: 1 });
            }
          }
        }

        await addToCartItems(items);

        msgEl.textContent = "Added to cart";
        setTimeout(() => {
          addBtn.disabled = false;
          addBtn.style.opacity = "";
          closeModal();
        }, 600);
      } catch (err) {
        msgEl.textContent = "Could not add to cart. Please try again.";
        addBtn.disabled = false;
        addBtn.style.opacity = "";
      }
    });
  }

  // Init all gift-grid sections
  root.querySelectorAll(".gg-grid").forEach(initSection);
})();