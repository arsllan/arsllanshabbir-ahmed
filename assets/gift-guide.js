(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  // Modal elements
  const modal = $('#ggModal');
  if (!modal) return;

  const overlay = $('.gg-modal__overlay', modal);
  const btnClose = $('.gg-modal__close', modal);
  const imgEl = $('#ggModalImg', modal);
  const titleEl = $('#ggModalTitle', modal);
  const priceEl = $('#ggModalPrice', modal);
  const descEl = $('#ggModalDesc', modal);
  const variantSelect = $('#ggVariantSelect', modal);
  const addBtn = $('#ggAddBtn', modal);
  const msgEl = $('#ggModalMsg', modal);

  let currentProduct = null;

  function openModal(product) {
    currentProduct = product;

    imgEl.src = product.image || '';
    titleEl.textContent = product.title || '';
    priceEl.textContent = product.price || '';
    descEl.textContent = product.desc || '';

    // variants
    variantSelect.innerHTML = '';
    (product.variants || []).forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = v.title;
      variantSelect.appendChild(opt);
    });

    msgEl.textContent = '';
    modal.hidden = false;
    document.documentElement.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.hidden = true;
    document.documentElement.style.overflow = '';
  }

  overlay.addEventListener('click', closeModal);
  btnClose.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  // Click cards
  document.addEventListener('click', (e) => {
    const card = e.target.closest('[data-gg-product]');
    if (!card) return;

    const product = JSON.parse(card.getAttribute('data-gg-product') || '{}');
    openModal(product);
  });

  // Add to cart (Shopify AJAX)
  addBtn.addEventListener('click', async () => {
    try {
      addBtn.disabled = true;
      msgEl.textContent = 'Adding...';

      const variantId = variantSelect.value;
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: variantId, quantity: 1 })
      });

      if (!res.ok) throw new Error('Add to cart failed');

      msgEl.textContent = 'Added to cart';
      setTimeout(closeModal, 650);
    } catch (err) {
      msgEl.textContent = 'Could not add to cart. Please try again.';
    } finally {
      addBtn.disabled = false;
    }
  });
})();
