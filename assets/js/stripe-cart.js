// Stripe Cart for Jekyll Static Site
(function() {
  const CART_KEY = 'stripe_cart';

  let stripe;

  // Initialize Stripe using config from _config.yml
  function initStripe() {
    if (typeof Stripe !== 'undefined' && window.StripeConfig && window.StripeConfig.publishableKey) {
      stripe = Stripe(window.StripeConfig.publishableKey);
    }
  }

  // Get cart from localStorage
  function getCart() {
    const cart = localStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : [];
  }

  // Save cart to localStorage
  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartUI();
  }

  // Add item to cart
  function addToCart(priceId, name, price, image) {
    const cart = getCart();
    const existingItem = cart.find(item => item.priceId === priceId);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ priceId, name, price, image, quantity: 1 });
    }

    saveCart(cart);
    showNotification('Added to cart!');
  }

  // Remove item from cart
  function removeFromCart(priceId) {
    let cart = getCart();
    cart = cart.filter(item => item.priceId !== priceId);
    saveCart(cart);
  }

  // Update item quantity
  function updateQuantity(priceId, quantity) {
    const cart = getCart();
    const item = cart.find(item => item.priceId === priceId);

    if (item) {
      if (quantity <= 0) {
        removeFromCart(priceId);
      } else {
        item.quantity = quantity;
        saveCart(cart);
      }
    }
  }

  // Get cart total
  function getCartTotal() {
    const cart = getCart();
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  // Get cart count
  function getCartCount() {
    const cart = getCart();
    return cart.reduce((count, item) => count + item.quantity, 0);
  }

  // Update cart UI
  function updateCartUI() {
    const cart = getCart();
    const count = getCartCount();
    const total = getCartTotal();

    // Update cart count badge
    const countElements = document.querySelectorAll('.cart-count');
    countElements.forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'inline-flex' : 'none';
    });

    // Update cart items list
    const cartItemsContainer = document.getElementById('cart-items');
    if (cartItemsContainer) {
      if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="pa3 tc gray">Your cart is empty</p>';
      } else {
        cartItemsContainer.innerHTML = cart.map(item => `
          <div class="cart-item flex items-center pa2 bb b--light-gray">
            <img src="${item.image}" alt="${item.name}" class="w2 h2 mr2 object-cover">
            <div class="flex-auto">
              <div class="f6 b">${item.name}</div>
              <div class="f7 gray">$${item.price} x ${item.quantity}</div>
            </div>
            <div class="flex items-center">
              <button class="cart-qty-btn bn bg-light-gray pa1 pointer" onclick="StripeCart.updateQuantity('${item.priceId}', ${item.quantity - 1})">-</button>
              <span class="ph2 f6">${item.quantity}</span>
              <button class="cart-qty-btn bn bg-light-gray pa1 pointer" onclick="StripeCart.updateQuantity('${item.priceId}', ${item.quantity + 1})">+</button>
              <button class="cart-remove-btn bn bg-transparent red pointer ml2" onclick="StripeCart.removeFromCart('${item.priceId}')">&times;</button>
            </div>
          </div>
        `).join('');
      }
    }

    // Update cart total
    const totalElements = document.querySelectorAll('.cart-total');
    totalElements.forEach(el => {
      el.textContent = '$' + total.toFixed(2);
    });

    // Update checkout button state
    const checkoutBtns = document.querySelectorAll('.checkout-btn');
    checkoutBtns.forEach(btn => {
      btn.disabled = cart.length === 0;
    });
  }

  // Show notification
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'cart-notification fixed top-1 right-1 bg-green white pa3 br2 shadow-4 z-999';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 2000);
  }

  // Checkout with Stripe via Netlify Function
  async function checkout() {
    const cart = getCart();

    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    const lineItems = cart.map(item => ({
      price: item.priceId,
      quantity: item.quantity
    }));

    // Use configured checkout URL or default to relative path
    const checkoutUrl = (window.StripeConfig && window.StripeConfig.checkoutUrl)
      || '/.netlify/functions/create-checkout-session';

    try {
      const response = await fetch(checkoutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lineItems: lineItems,
          successUrl: window.location.origin + '/checkout-success/',
          cancelUrl: window.location.origin + '/checkout-cancel/'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Checkout failed');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Checkout failed: ' + err.message);
    }
  }

  // Clear cart (called after successful checkout)
  function clearCart() {
    localStorage.removeItem(CART_KEY);
    updateCartUI();
  }

  // Toggle cart dropdown
  function toggleCart() {
    const dropdown = document.getElementById('cart-dropdown');
    if (dropdown) {
      dropdown.classList.toggle('dn');
    }
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    initStripe();
    updateCartUI();
  });

  // Expose functions globally
  window.StripeCart = {
    addToCart,
    removeFromCart,
    updateQuantity,
    getCart,
    getCartCount,
    getCartTotal,
    checkout,
    clearCart,
    toggleCart,
    updateCartUI
  };
})();
