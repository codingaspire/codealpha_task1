let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentUser = null;
let selectedAddressId = null;
let appliedCoupon = null;

document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  checkAuthStatus();
  
  const currentPage = window.location.pathname;
  
  if (currentPage === '/' || currentPage === '/index.html') {
    loadProducts();
  } else if (currentPage.includes('product.html')) {
    loadProductDetail();
  } else if (currentPage.includes('cart.html')) {
    renderCart();
  } else if (currentPage.includes('auth.html')) {
    initAuthPage();
  } else if (currentPage.includes('checkout.html')) {
    initCheckoutPage();
  } else if (currentPage.includes('checkout-final.html')) {
    initCheckoutFinalPage();
  } else if (currentPage.includes('orders.html')) {
    loadOrders();
  } else if (currentPage.includes('order-success.html')) {
    loadOrderSuccess();
  }
});

function getCartTotalItems() {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

function getCartQuantity(productId) {
  const item = cart.find(i => i.productId === productId);
  return item ? item.quantity : 0;
}

function updateCartCount() {
  const countElements = document.querySelectorAll('.cart-count');
  const total = getCartTotalItems();
  countElements.forEach(el => {
    el.textContent = total;
    el.style.display = total > 0 ? 'inline-block' : 'none';
  });
}

function addToCart(productId, productName, productPrice, productImage) {
  const existingItem = cart.find(item => item.productId === productId);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      productId,
      productName,
      productPrice,
      productImage,
      quantity: 1
    });
  }
  
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  
  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    loadProducts();
  } else if (window.location.pathname.includes('product.html')) {
    loadProductDetail();
  }
}

function updateProductQuantity(productId, productName, productPrice, productImage, change) {
  let existingItem = cart.find(item => item.productId === productId);
  
  if (!existingItem && change > 0) {
    cart.push({
      productId,
      productName,
      productPrice,
      productImage,
      quantity: 1
    });
  } else if (existingItem) {
    existingItem.quantity += change;
    if (existingItem.quantity <= 0) {
      cart = cart.filter(item => item.productId !== productId);
    }
  }
  
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  
  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    loadProducts();
  } else if (window.location.pathname.includes('product.html')) {
    loadProductDetail();
  } else if (window.location.pathname.includes('cart.html')) {
    renderCart();
  }
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.productId !== productId);
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  if (window.location.pathname.includes('cart.html')) {
    renderCart();
  }
}

function updateQuantity(productId, change) {
  const item = cart.find(item => item.productId === productId);
  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      removeFromCart(productId);
    } else {
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartCount();
      renderCart();
    }
  }
}

function getCartTotal() {
  return cart.reduce((total, item) => total + (item.productPrice * item.quantity), 0);
}

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    const products = await response.json();
    renderProducts(products);
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

function renderProducts(products) {
  const container = document.getElementById('products-container');
  if (!container) return;
  
  container.innerHTML = products.map(product => {
    const cartQty = getCartQuantity(product.id);
    let buttonHTML = '';
    
    if (cartQty > 0) {
      buttonHTML = `
        <div class="quantity-control">
          <button class="quantity-btn" onclick="updateProductQuantity(${product.id}, '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.image_url}', -1)">-</button>
          <span class="quantity-value">${cartQty}</span>
          <button class="quantity-btn" onclick="updateProductQuantity(${product.id}, '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.image_url}', 1)">+</button>
        </div>
      `;
    } else {
      buttonHTML = `<button class="btn btn-primary" onclick="addToCart(${product.id}, '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.image_url}')">Add to Cart</button>`;
    }
    
    return `
      <div class="product-card">
        <a href="product.html?id=${product.id}">
          <img src="${product.image_url}" alt="${product.name}" class="product-image">
        </a>
        <div class="product-info">
          <h3 class="product-name">${product.name}</h3>
          <p class="product-description">${product.description}</p>
          <div class="product-price">$${product.price.toFixed(2)}</div>
          ${buttonHTML}
        </div>
      </div>
    `;
  }).join('');
}

async function loadProductDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  
  if (!productId) {
    window.location.href = '/';
    return;
  }
  
  try {
    const response = await fetch(`/api/products/${productId}`);
    const product = await response.json();
    renderProductDetail(product);
  } catch (error) {
    console.error('Error loading product:', error);
    window.location.href = '/';
  }
}

function renderProductDetail(product) {
  const container = document.getElementById('product-detail-container');
  if (!container) return;
  
  const cartQty = getCartQuantity(product.id);
  let buttonHTML = '';
  
  if (cartQty > 0) {
    buttonHTML = `
      <div class="quantity-control" style="margin-bottom: 1rem;">
        <button class="quantity-btn" onclick="updateProductQuantity(${product.id}, '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.image_url}', -1)">-</button>
        <span class="quantity-value">${cartQty}</span>
        <button class="quantity-btn" onclick="updateProductQuantity(${product.id}, '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.image_url}', 1)">+</button>
      </div>
    `;
  } else {
    buttonHTML = `<button class="btn btn-primary" style="margin-bottom: 1rem;" onclick="addToCart(${product.id}, '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.image_url}')">Add to Cart</button>`;
  }
  
  container.innerHTML = `
    <div class="product-detail-container">
      <img src="${product.image_url}" alt="${product.name}" class="product-detail-image">
      <div class="product-detail-info">
        <h1>${product.name}</h1>
        <p>${product.description}</p>
        <div class="product-price">$${product.price.toFixed(2)}</div>
        <p class="product-stock">${product.stock} in stock</p>
        ${buttonHTML}
        <a href="/" class="btn btn-secondary" style="display: inline-block;">Continue Shopping</a>
      </div>
    </div>
  `;
}

function renderCart() {
  const container = document.getElementById('cart-items-container');
  const emptyCart = document.getElementById('empty-cart');
  const cartSummary = document.getElementById('cart-summary');
  
  if (!container) return;
  
  if (cart.length === 0) {
    container.innerHTML = '';
    if (emptyCart) emptyCart.style.display = 'block';
    if (cartSummary) cartSummary.style.display = 'none';
    return;
  }
  
  if (emptyCart) emptyCart.style.display = 'none';
  if (cartSummary) cartSummary.style.display = 'block';
  
  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.productImage}" alt="${item.productName}" class="cart-item-image">
      <div class="cart-item-name">${item.productName}</div>
      <div class="quantity-control">
        <button class="quantity-btn" onclick="updateQuantity(${item.productId}, -1)">-</button>
        <span class="quantity-value">${item.quantity}</span>
        <button class="quantity-btn" onclick="updateQuantity(${item.productId}, 1)">+</button>
      </div>
      <div class="cart-item-price">$${(item.productPrice * item.quantity).toFixed(2)}</div>
      <button class="btn btn-danger" onclick="removeFromCart(${item.productId})">Remove</button>
    </div>
  `).join('');
  
  const totalElement = document.getElementById('cart-total');
  if (totalElement) {
    totalElement.textContent = `$${getCartTotal().toFixed(2)}`;
  }
}

async function checkout() {
  if (cart.length === 0) {
    showAlert('Your cart is empty!', 'error');
    return;
  }
  
  if (!currentUser) {
    await checkAuthStatus();
  }
  
  if (!currentUser) {
    window.location.href = '/auth.html';
    return;
  }
  
  window.location.href = '/checkout.html';
}

async function initCheckoutPage() {
  if (!currentUser) {
    await checkAuthStatus();
  }
  
  if (!currentUser) {
    window.location.href = '/auth.html';
    return;
  }
  
  if (cart.length === 0) {
    window.location.href = '/cart.html';
    return;
  }
  
  await loadAddresses();
  renderCheckoutSummary();
}

async function loadAddresses() {
  try {
    const response = await fetch('/api/addresses');
    const addresses = await response.json();
    renderAddresses(addresses);
  } catch (error) {
    console.error('Error loading addresses:', error);
  }
}

function renderAddresses(addresses) {
  const container = document.getElementById('addresses-container');
  if (!container) return;
  
  if (addresses.length > 0) {
    container.innerHTML = addresses.map(addr => `
      <div style="border: 1px solid #e5e7eb; padding: 1rem; border-radius: 0.375rem; margin-bottom: 1rem; cursor: pointer;" 
           onclick="selectAddress(${addr.id})" id="address-${addr.id}">
        <h4 style="margin-bottom: 0.5rem;">${addr.full_name}</h4>
        <p style="margin: 0.25rem 0;">${addr.address_line1}</p>
        ${addr.address_line2 ? `<p style="margin: 0.25rem 0;">${addr.address_line2}</p>` : ''}
        <p style="margin: 0.25rem 0;">${addr.city}, ${addr.state} ${addr.zip_code}</p>
        <p style="margin: 0.25rem 0;">Phone: ${addr.phone}</p>
      </div>
    `).join('');
  }
}

function selectAddress(addressId) {
  selectedAddressId = addressId;
  document.querySelectorAll('[id^="address-"]').forEach(el => {
    el.style.borderColor = '#e5e7eb';
    el.style.backgroundColor = 'white';
  });
  const selected = document.getElementById(`address-${addressId}`);
  if (selected) {
    selected.style.borderColor = '#2563eb';
    selected.style.backgroundColor = '#eff6ff';
  }
}

function renderCheckoutSummary() {
  const container = document.getElementById('checkout-summary-items');
  if (!container) return;
  
  container.innerHTML = cart.map(item => `
    <div class="order-item">
      <span>${item.productName} x ${item.quantity}</span>
      <span>$${(item.productPrice * item.quantity).toFixed(2)}</span>
    </div>
  `).join('');
  
  const totalEl = document.getElementById('checkout-summary-total');
  if (totalEl) {
    totalEl.textContent = `$${getCartTotal().toFixed(2)}`;
  }
}

async function saveAddress() {
  const fullName = document.getElementById('fullName').value;
  const addressLine1 = document.getElementById('addressLine1').value;
  const addressLine2 = document.getElementById('addressLine2').value;
  const city = document.getElementById('city').value;
  const state = document.getElementById('state').value;
  const zipCode = document.getElementById('zipCode').value;
  const phone = document.getElementById('phone').value;
  
  if (!fullName || !addressLine1 || !city || !state || !zipCode || !phone) {
    showAlert('Please fill in all required fields', 'error');
    return;
  }
  
  try {
    const response = await fetch('/api/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        fullName, addressLine1, addressLine2, city, state, zipCode, phone 
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      selectedAddressId = data.addressId;
      showAlert('Address saved successfully!', 'success');
      await loadAddresses();
      selectAddress(data.addressId);
    } else {
      showAlert(data.error || 'Failed to save address', 'error');
    }
  } catch (error) {
    console.error('Error saving address:', error);
    showAlert('Failed to save address', 'error');
  }
}

function proceedToFinal() {
  if (!selectedAddressId) {
    showAlert('Please select or add an address', 'error');
    return;
  }
  
  sessionStorage.setItem('checkoutAddressId', selectedAddressId);
  window.location.href = '/checkout-final.html';
}

async function initCheckoutFinalPage() {
  if (!currentUser) {
    await checkAuthStatus();
  }
  
  if (!currentUser) {
    window.location.href = '/auth.html';
    return;
  }
  
  if (cart.length === 0) {
    window.location.href = '/cart.html';
    return;
  }
  
  selectedAddressId = parseInt(sessionStorage.getItem('checkoutAddressId'));
  if (!selectedAddressId) {
    window.location.href = '/checkout.html';
    return;
  }
  
  await loadAddressForFinal();
  renderFinalCheckout();
}

async function loadAddressForFinal() {
  try {
    const response = await fetch('/api/addresses');
    const addresses = await response.json();
    const address = addresses.find(a => a.id === selectedAddressId);
    if (address) {
      renderAddressFinal(address);
    }
  } catch (error) {
    console.error('Error loading address:', error);
  }
}

function renderAddressFinal(address) {
  const container = document.getElementById('final-address');
  if (!container) return;
  container.innerHTML = `
    <h4>${address.full_name}</h4>
    <p style="margin: 0.25rem 0;">${address.address_line1}</p>
    ${address.address_line2 ? `<p style="margin: 0.25rem 0;">${address.address_line2}</p>` : ''}
    <p style="margin: 0.25rem 0;">${address.city}, ${address.state} ${address.zip_code}</p>
    <p style="margin: 0.25rem 0;">Phone: ${address.phone}</p>
  `;
}

function renderFinalCheckout() {
  const itemsContainer = document.getElementById('final-items');
  if (itemsContainer) {
    itemsContainer.innerHTML = cart.map(item => `
      <div class="order-item">
        <span>${item.productName} x ${item.quantity}</span>
        <span>$${(item.productPrice * item.quantity).toFixed(2)}</span>
      </div>
    `).join('');
  }
  
  updateFinalTotals();
}

async function applyCoupon() {
  const code = document.getElementById('coupon-code').value;
  if (!code) {
    showAlert('Please enter a coupon code', 'error');
    return;
  }
  
  try {
    const response = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    
    const data = await response.json();
    
    if (data.valid) {
      appliedCoupon = data;
      document.getElementById('coupon-applied').textContent = `Coupon applied! ${data.discountPercent}% off`;
      document.getElementById('coupon-applied').style.display = 'block';
      updateFinalTotals();
    } else {
      showAlert(data.error || 'Invalid coupon', 'error');
    }
  } catch (error) {
    console.error('Error applying coupon:', error);
    showAlert('Failed to apply coupon', 'error');
  }
}

function updateFinalTotals() {
  const subtotal = getCartTotal();
  let discount = 0;
  
  if (appliedCoupon) {
    discount = (subtotal * appliedCoupon.discountPercent) / 100;
  }
  
  const final = subtotal - discount;
  
  const subtotalEl = document.getElementById('final-subtotal');
  const discountEl = document.getElementById('final-discount');
  const finalEl = document.getElementById('final-total');
  
  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  if (discountEl) {
    discountEl.textContent = `- $${discount.toFixed(2)}`;
    discountEl.parentElement.style.display = discount > 0 ? 'flex' : 'none';
  }
  if (finalEl) finalEl.textContent = `$${final.toFixed(2)}`;
}

async function placeOrder() {
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        cartItems: cart, 
        addressId: selectedAddressId,
        couponCode: appliedCoupon ? appliedCoupon.code : null
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      cart = [];
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartCount();
      sessionStorage.removeItem('checkoutAddressId');
      appliedCoupon = null;
      window.location.href = `/order-success.html?orderId=${result.orderId}&total=${result.finalAmount}`;
    } else {
      showAlert(result.error || 'Order failed', 'error');
    }
  } catch (error) {
    console.error('Order error:', error);
    showAlert('Order failed. Please try again.', 'error');
  }
}

async function loadOrders() {
  if (!currentUser) {
    await checkAuthStatus();
  }
  
  if (!currentUser) {
    window.location.href = '/auth.html';
    return;
  }
  
  try {
    const response = await fetch('/api/orders');
    const orders = await response.json();
    renderOrders(orders);
  } catch (error) {
    console.error('Error loading orders:', error);
  }
}

function renderOrders(orders) {
  const container = document.getElementById('orders-container');
  const emptyOrders = document.getElementById('empty-orders');
  
  if (!container) return;
  
  if (orders.length === 0) {
    container.innerHTML = '';
    if (emptyOrders) emptyOrders.style.display = 'block';
    return;
  }
  
  if (emptyOrders) emptyOrders.style.display = 'none';
  
  container.innerHTML = orders.map(order => `
    <div class="order-card">
      <div class="order-header">
        <div>
          <span class="order-number">Order #${order.id}</span>
          <p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">
            ${new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <div style="display: flex; gap: 1rem; align-items: center;">
          <span class="order-status ${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
          ${(order.status === 'processing' || order.status === 'pending') ? 
            `<button class="btn btn-danger" onclick="cancelOrder(${order.id})">Cancel</button>` : ''}
        </div>
      </div>
      
      <div class="order-items-summary">
        ${order.items.map(item => `
          <div class="order-item">
            <span>Product #${item.product_id} x ${item.quantity}</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        `).join('')}
      </div>
      
      <div style="display: flex; justify-content: space-between; font-weight: 600; padding-top: 0.5rem;">
        <span>Total:</span>
        <span>$${order.final_amount.toFixed(2)}</span>
      </div>
      
      ${order.full_name ? `
        <div class="order-address">
          <h4>Shipping Address</h4>
          <p style="margin: 0.25rem 0;">${order.full_name}</p>
          <p style="margin: 0.25rem 0;">${order.address_line1}</p>
          ${order.address_line2 ? `<p style="margin: 0.25rem 0;">${order.address_line2}</p>` : ''}
          <p style="margin: 0.25rem 0;">${order.city}, ${order.state} ${order.zip_code}</p>
          <p style="margin: 0.25rem 0;">Phone: ${order.phone}</p>
        </div>
      ` : ''}
    </div>
  `).join('');
}

async function cancelOrder(orderId) {
  if (!confirm('Are you sure you want to cancel this order?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/orders/${orderId}/cancel`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success) {
      showAlert('Order cancelled successfully!', 'success');
      loadOrders();
    } else {
      showAlert(data.error || 'Failed to cancel order', 'error');
    }
  } catch (error) {
    console.error('Error cancelling order:', error);
    showAlert('Failed to cancel order', 'error');
  }
}

function loadOrderSuccess() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');
  const total = urlParams.get('total');
  
  const orderDetails = document.getElementById('order-details');
  if (orderDetails && orderId && total) {
    orderDetails.innerHTML = `
      <h2>Order Details</h2>
      <div class="order-detail-row">
        <span class="order-detail-label">Order ID:</span>
        <span class="order-detail-value">#${orderId}</span>
      </div>
      <div class="order-detail-row">
        <span class="order-detail-label">Status:</span>
        <span class="order-detail-value">Processing</span>
      </div>
      <div class="order-detail-row">
        <span class="order-detail-label">Total Amount:</span>
        <span class="order-detail-value">$${parseFloat(total).toFixed(2)}</span>
      </div>
    `;
  }
}

async function checkAuthStatus() {
  try {
    const response = await fetch('/api/user');
    const data = await response.json();
    
    if (data.loggedIn) {
      currentUser = data.user;
      updateAuthUI();
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
  }
}

function updateAuthUI() {
  const authLinks = document.getElementById('auth-links');
  if (!authLinks) return;
  
  if (currentUser) {
    authLinks.innerHTML = `
      <a href="/orders.html" class="nav-link">Orders</a>
      <span class="nav-link">Welcome, ${currentUser.name}</span>
      <button class="btn btn-secondary" style="padding: 0.375rem 0.75rem; font-size: 0.875rem;" onclick="logout()">Logout</button>
    `;
  }
}

async function logout() {
  try {
    await fetch('/api/logout', { method: 'POST' });
    currentUser = null;
    window.location.href = '/';
  } catch (error) {
    console.error('Logout error:', error);
  }
}

function initAuthPage() {
  const loginTab = document.getElementById('login-tab');
  const registerTab = document.getElementById('register-tab');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  
  if (loginTab && registerTab) {
    loginTab.addEventListener('click', () => {
      loginTab.classList.add('active');
      registerTab.classList.remove('active');
      if (loginForm) loginForm.style.display = 'block';
      if (registerForm) registerForm.style.display = 'none';
    });
    
    registerTab.addEventListener('click', () => {
      registerTab.classList.add('active');
      loginTab.classList.remove('active');
      if (registerForm) registerForm.style.display = 'block';
      if (loginForm) loginForm.style.display = 'none';
    });
  }
  
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
          currentUser = data.user;
          window.location.href = '/';
        } else {
          showAlert(data.error || 'Login failed', 'error');
        }
      } catch (error) {
        console.error('Login error:', error);
        showAlert('Login failed. Please try again.', 'error');
      }
    });
  }
  
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('register-name').value;
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      const confirmPassword = document.getElementById('register-confirm-password').value;
      
      if (password !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
      }
      
      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
          currentUser = data.user;
          window.location.href = '/';
        } else {
          showAlert(data.error || 'Registration failed', 'error');
        }
      } catch (error) {
        console.error('Registration error:', error);
        showAlert('Registration failed. Please try again.', 'error');
      }
    });
  }
}

function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    button.textContent = '🙈';
  } else {
    input.type = 'password';
    button.textContent = '👁️';
  }
}

function showAlert(message, type) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;
  
  document.body.appendChild(alertDiv);
  
  setTimeout(() => {
    alertDiv.remove();
  }, 3000);
}
