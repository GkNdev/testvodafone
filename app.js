// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDVyltMWKJDnj_4u6VZW-YDKvE64Pe9e-0",
  authDomain: "vodafone-d8920.firebaseapp.com",
  projectId: "vodafone-d8920",
  storageBucket: "vodafone-d8920.firebasestorage.app",
  messagingSenderId: "819261814294",
  appId: "1:819261814294:web:fa4681223435cfe52e6737",
  measurementId: "G-0TYDNZWCNP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// DOM Elements
const productForm = document.getElementById('productForm');
const productName = document.getElementById('productName');
const productCategory = document.getElementById('productCategory');
const costPrice = document.getElementById('costPrice');
const kdv = document.getElementById('kdv');
const extraCost = document.getElementById('extraCost');
const priceMethodRadios = document.querySelectorAll('input[name="priceMethod"]');
const tlProfit = document.getElementById('tlProfit');
const percentageProfit = document.getElementById('percentageProfit');
const customPrice = document.getElementById('customPrice');
const calculatedPrice = document.getElementById('calculatedPrice');
const productsList = document.getElementById('productsList');
const categoryFilter = document.getElementById('categoryFilter');
const categoryList = document.getElementById('categoryList');
const searchFilter = document.getElementById('searchFilter');
const sortFilter = document.getElementById('sortFilter');

// State
let allProducts = [];
let categories = new Set();
let editingProductId = null;

// Price calculation methods
function calculatePrice() {
  const cost = parseFloat(costPrice.value) || 0;
  const kdvRate = parseFloat(kdv.value) || 0;
  const extraCostRate = parseFloat(extraCost.value) || 0;
  const selectedMethod = document.querySelector('input[name="priceMethod"]:checked').value;

  if (cost <= 0) {
    calculatedPrice.textContent = '0.00 TL';
    return;
  }

  let salePrice = 0;

  // Ekstra maliyeti ekle
  const costWithExtra = cost * (1 + extraCostRate / 100);

  switch (selectedMethod) {
    case 'tl':
      const profit = parseFloat(tlProfit.value) || 0;
      // Kar + KDV dahil satış fiyatı
      // salePrice = (costWithExtra + profit) / (1 - kdvRate / 100)
      // Ama kullanıcı KDV dahil kar istiyor, o yüzden:
      // salePrice = costWithExtra + profit
      // KDV'yi ekle
      salePrice = (costWithExtra + profit) * (1 + kdvRate / 100);
      break;

    case 'percentage':
      const profitPercent = parseFloat(percentageProfit.value) || 0;
      // Yüzdelik kar ekle, sonra KDV ekle
      salePrice = costWithExtra * (1 + profitPercent / 100) * (1 + kdvRate / 100);
      break;

    case 'custom':
      salePrice = parseFloat(customPrice.value) || 0;
      break;
  }

  calculatedPrice.textContent = salePrice.toFixed(2) + ' TL';
}

// Event listeners for price calculation
costPrice.addEventListener('input', calculatePrice);
kdv.addEventListener('input', calculatePrice);
extraCost.addEventListener('input', calculatePrice);
tlProfit.addEventListener('input', calculatePrice);
percentageProfit.addEventListener('input', calculatePrice);
customPrice.addEventListener('input', calculatePrice);

priceMethodRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    // Show/hide relevant input groups
    document.getElementById('tlProfitGroup').style.display = 
      radio.value === 'tl' ? 'flex' : 'none';
    document.getElementById('percentageProfitGroup').style.display = 
      radio.value === 'percentage' ? 'flex' : 'none';
    document.getElementById('customPriceGroup').style.display = 
      radio.value === 'custom' ? 'flex' : 'none';
    
    calculatePrice();
  });
});

// Form submission
productForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const cost = parseFloat(costPrice.value);
  const kdvRate = parseFloat(kdv.value) || 20;
  const extraCostRate = parseFloat(extraCost.value) || 0;
  const selectedMethod = document.querySelector('input[name="priceMethod"]:checked').value;
  const category = productCategory.value.trim().toLowerCase();

  // Calculate final price
  const costWithExtra = cost * (1 + extraCostRate / 100);
  let salePrice = 0;

  switch (selectedMethod) {
    case 'tl':
      const profit = parseFloat(tlProfit.value) || 0;
      salePrice = (costWithExtra + profit) * (1 + kdvRate / 100);
      break;
    case 'percentage':
      const profitPercent = parseFloat(percentageProfit.value) || 0;
      salePrice = costWithExtra * (1 + profitPercent / 100) * (1 + kdvRate / 100);
      break;
    case 'custom':
      salePrice = parseFloat(customPrice.value) || 0;
      break;
  }

  const productData = {
    name: productName.value.trim(),
    category: category,
    costPrice: cost,
    kdv: kdvRate,
    extraCost: extraCostRate,
    salePrice: salePrice,
    priceMethod: selectedMethod,
    createdAt: editingProductId ? allProducts.find(p => p.id === editingProductId)?.createdAt || new Date().toISOString() : new Date().toISOString()
  };

  try {
    if (editingProductId) {
      // Update existing product
      await updateDoc(doc(db, 'products', editingProductId), productData);
      alert('Ürün başarıyla güncellendi!');
      editingProductId = null;
    } else {
      // Add new product
      await addDoc(collection(db, 'products'), productData);
      alert('Ürün başarıyla eklendi!');
    }
    
    // Close modal
    closeModal('addProductModal');
    
    // Reset form
    productForm.reset();
    kdv.value = 20;
    extraCost.value = 0;
    document.querySelector('input[name="priceMethod"][value="tl"]').checked = true;
    document.getElementById('tlProfitGroup').style.display = 'flex';
    document.getElementById('percentageProfitGroup').style.display = 'none';
    document.getElementById('customPriceGroup').style.display = 'none';
    calculatedPrice.textContent = '0.00 TL';
    
    // Reload products
    await loadProducts();
  } catch (error) {
    console.error('Error saving product:', error);
    alert('Ürün kaydedilirken bir hata oluştu: ' + error.message);
  }
});

// Load products from Firestore
async function loadProducts() {
  try {
    productsList.innerHTML = '<div class="loading">Yükleniyor...</div>';
    
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    allProducts = [];
    categories.clear();

    if (querySnapshot.empty) {
      productsList.innerHTML = '<div class="empty-state"><p>Henüz ürün eklenmemiş.</p></div>';
      return;
    }

    querySnapshot.forEach((doc) => {
      const product = { id: doc.id, ...doc.data() };
      allProducts.push(product);
      categories.add(product.category);
    });

    // Update category filter dropdown
    updateCategoryFilter();
    
    // Render products
    renderProducts();
  } catch (error) {
    console.error('Error loading products:', error);
    productsList.innerHTML = '<div class="empty-state"><p>Ürünler yüklenirken bir hata oluştu.</p></div>';
  }
}

// Format category for display (uppercase)
function formatCategoryForDisplay(category) {
  if (!category) return '';
  return category.toUpperCase();
}

// Calculate profit percentage
function calculateProfitPercentage(product) {
  const cost = product.costPrice;
  const extraCostRate = product.extraCost;
  const kdvRate = product.kdv;
  const salePrice = product.salePrice;
  
  // Calculate cost with extra
  const costWithExtra = cost * (1 + extraCostRate / 100);
  
  // Calculate sale price without KDV
  const salePriceWithoutKDV = salePrice / (1 + kdvRate / 100);
  
  // Calculate profit
  const profit = salePriceWithoutKDV - costWithExtra;
  
  // Calculate profit percentage
  if (costWithExtra <= 0) return 0;
  const profitPercent = (profit / costWithExtra) * 100;
  
  return profitPercent;
}

// Update category filter dropdown
function updateCategoryFilter() {
  // Clear existing options except "Tümü"
  categoryFilter.innerHTML = '<option value="all">Tümü</option>';
  categoryList.innerHTML = '';

  const sortedCategories = Array.from(categories).sort();
  
  sortedCategories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat; // Store lowercase in value
    option.textContent = formatCategoryForDisplay(cat); // Display uppercase
    categoryFilter.appendChild(option);

    const datalistOption = document.createElement('option');
    datalistOption.value = formatCategoryForDisplay(cat); // Display uppercase in datalist
    categoryList.appendChild(datalistOption);
  });
}

// Filter and sort products
function getFilteredAndSortedProducts() {
  let filtered = [...allProducts];
  
  // Search filter
  const searchTerm = searchFilter.value.toLowerCase().trim();
  if (searchTerm) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(searchTerm) ||
      p.category.toLowerCase().includes(searchTerm)
    );
  }
  
  // Category filter
  const category = categoryFilter.value.toLowerCase();
  if (category !== 'all') {
    filtered = filtered.filter(p => p.category.toLowerCase() === category);
  }
  
  // Sort
  const sortValue = sortFilter.value;
  switch (sortValue) {
    case 'newest':
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case 'oldest':
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case 'name-asc':
      filtered.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      break;
    case 'name-desc':
      filtered.sort((a, b) => b.name.localeCompare(a.name, 'tr'));
      break;
    case 'price-asc':
      filtered.sort((a, b) => a.salePrice - b.salePrice);
      break;
    case 'price-desc':
      filtered.sort((a, b) => b.salePrice - a.salePrice);
      break;
  }
  
  return filtered;
}

// Render products
function renderProducts() {
  const filteredProducts = getFilteredAndSortedProducts();
  
  if (filteredProducts.length === 0) {
    productsList.innerHTML = '<div class="empty-state"><p>Ürün bulunamadı.</p></div>';
    return;
  }

  productsList.innerHTML = filteredProducts.map(product => `
    <div class="product-row">
      <div class="table-col col-name">
        <i class="fas fa-box"></i>
        <span>${escapeHtml(product.name)}</span>
      </div>
      <div class="table-col col-category">
        <span class="category-badge">${escapeHtml(formatCategoryForDisplay(product.category))}</span>
      </div>
      <div class="table-col col-cost">
        <span>${product.costPrice.toFixed(2)} TL</span>
      </div>
      <div class="table-col col-kdv">
        <span>%${product.kdv.toFixed(2)}</span>
      </div>
      <div class="table-col col-extra">
        <span>%${product.extraCost.toFixed(2)}</span>
      </div>
      <div class="table-col col-sale">
        <div class="sale-price-wrapper">
          <span class="sale-price">${product.salePrice.toFixed(2)} TL</span>
          <span class="profit-indicator">
            <i class="fas fa-arrow-up"></i>
            ${calculateProfitPercentage(product).toFixed(1)}%
          </span>
        </div>
      </div>
      <div class="table-col col-actions">
        <div class="actions-wrapper">
          <button class="btn btn-info" onclick="showProductDetails('${product.id}')" title="Detay"><i class="fas fa-info-circle"></i></button>
          <button class="btn btn-warning" onclick="editProduct('${product.id}')" title="Düzenle"><i class="fas fa-edit"></i></button>
          <button class="btn btn-success" onclick="calculateRevenue('${product.id}')" title="Gelir Hesapla"><i class="fas fa-calculator"></i></button>
          <button class="btn btn-danger" onclick="deleteProduct('${product.id}')" title="Sil"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>
    </div>
  `).join('');
}

// Show product details
window.showProductDetails = function(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById('detailModal');
  const modalContent = document.getElementById('detailModalContent');
  
  modalContent.innerHTML = `
    <div class="modal-header">
      <h3><i class="fas fa-info-circle"></i> Ürün Detayları</h3>
      <button class="modal-close" onclick="closeModal('detailModal')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="detail-item">
        <span class="detail-label"><i class="fas fa-box"></i> Ürün Adı:</span>
        <span class="detail-value">${escapeHtml(product.name)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fas fa-tag"></i> Kategori:</span>
        <span class="detail-value">${escapeHtml(formatCategoryForDisplay(product.category))}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fas fa-shopping-cart"></i> Geliş Fiyatı:</span>
        <span class="detail-value">${product.costPrice.toFixed(2)} TL</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fas fa-percent"></i> KDV:</span>
        <span class="detail-value">%${product.kdv.toFixed(2)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fas fa-chart-line"></i> Ekstra Maliyet:</span>
        <span class="detail-value">%${product.extraCost.toFixed(2)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fas fa-tags"></i> Satış Fiyatı:</span>
        <span class="detail-value price-highlight">${product.salePrice.toFixed(2)} TL</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fas fa-cog"></i> Fiyat Hesaplama Yöntemi:</span>
        <span class="detail-value">${getPriceMethodName(product.priceMethod)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fas fa-calendar"></i> Oluşturulma Tarihi:</span>
        <span class="detail-value">${new Date(product.createdAt).toLocaleString('tr-TR')}</span>
      </div>
    </div>
  `;
  
  modal.style.display = 'flex';
};

// Open add product modal
window.openAddProductModal = function() {
  editingProductId = null;
  
  // Reset form
  productForm.reset();
  kdv.value = 20;
  extraCost.value = 0;
  document.querySelector('input[name="priceMethod"][value="tl"]').checked = true;
  document.getElementById('tlProfitGroup').style.display = 'flex';
  document.getElementById('percentageProfitGroup').style.display = 'none';
  document.getElementById('customPriceGroup').style.display = 'none';
  calculatedPrice.textContent = '0.00 TL';
  
  // Update modal title
  document.getElementById('modalTitle').textContent = 'Yeni Ürün Ekle';
  
  // Update submit button
  const submitBtn = productForm.querySelector('button[type="submit"]');
  submitBtn.innerHTML = '<i class="fas fa-save"></i> Kaydet';
  submitBtn.classList.remove('btn-update');
  
  // Open modal
  document.getElementById('addProductModal').style.display = 'flex';
};

// Edit product
window.editProduct = function(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  editingProductId = productId;
  
  // Fill form with product data
  productName.value = product.name;
  productCategory.value = formatCategoryForDisplay(product.category); // Display uppercase in form
  costPrice.value = product.costPrice;
  kdv.value = product.kdv;
  extraCost.value = product.extraCost;
  
  // Set price method
  document.querySelector(`input[name="priceMethod"][value="${product.priceMethod}"]`).checked = true;
  
  // Show/hide relevant groups
  document.getElementById('tlProfitGroup').style.display = product.priceMethod === 'tl' ? 'flex' : 'none';
  document.getElementById('percentageProfitGroup').style.display = product.priceMethod === 'percentage' ? 'flex' : 'none';
  document.getElementById('customPriceGroup').style.display = product.priceMethod === 'custom' ? 'flex' : 'none';
  
  // Set values based on method
  if (product.priceMethod === 'tl') {
    // Calculate TL profit from sale price
    const costWithExtra = product.costPrice * (1 + product.extraCost / 100);
    const profit = (product.salePrice / (1 + product.kdv / 100)) - costWithExtra;
    tlProfit.value = profit.toFixed(2);
  } else if (product.priceMethod === 'percentage') {
    // Calculate percentage profit
    const costWithExtra = product.costPrice * (1 + product.extraCost / 100);
    const profitPercent = ((product.salePrice / (1 + product.kdv / 100)) / costWithExtra - 1) * 100;
    percentageProfit.value = profitPercent.toFixed(2);
  } else {
    customPrice.value = product.salePrice;
  }
  
  calculatePrice();
  
  // Update modal title
  document.getElementById('modalTitle').textContent = 'Ürün Düzenle';
  
  // Update submit button
  const submitBtn = productForm.querySelector('button[type="submit"]');
  submitBtn.innerHTML = '<i class="fas fa-save"></i> Güncelle';
  submitBtn.classList.add('btn-update');
  
  // Open modal
  document.getElementById('addProductModal').style.display = 'flex';
};

// Calculate revenue with different profit percentages
window.calculateRevenue = function(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const cost = product.costPrice;
  const kdvRate = product.kdv;
  const extraCostRate = product.extraCost;
  
  // Calculate cost with extra
  const costWithExtra = cost * (1 + extraCostRate / 100);
  
  // Calculate prices for different profit percentages
  const profitPercentages = [10, 20, 30, 50];
  const revenueData = profitPercentages.map(profitPercent => {
    // KDV dahil satış fiyatı
    const salePrice = costWithExtra * (1 + profitPercent / 100) * (1 + kdvRate / 100);
    // KDV'siz satış fiyatı (kar edebileceği miktar)
    const salePriceWithoutKDV = salePrice / (1 + kdvRate / 100);
    // KDV dahil kar
    const profit = salePrice - (costWithExtra * (1 + kdvRate / 100));
    // KDV'siz kar
    const profitWithoutKDV = salePriceWithoutKDV - costWithExtra;
    return {
      profitPercent,
      salePrice,
      salePriceWithoutKDV,
      profit,
      profitWithoutKDV
    };
  });

  const modal = document.getElementById('revenueModal');
  const modalContent = document.getElementById('revenueModalContent');
  
  modalContent.innerHTML = `
    <div class="modal-header">
      <h3><i class="fas fa-calculator"></i> Gelir Hesaplama - ${escapeHtml(product.name)}</h3>
      <button class="modal-close" onclick="closeModal('revenueModal')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="revenue-info">
        <div class="revenue-info-item">
          <span class="revenue-label">Geliş Fiyatı:</span>
          <span class="revenue-value">${cost.toFixed(2)} TL</span>
        </div>
        <div class="revenue-info-item">
          <span class="revenue-label">KDV:</span>
          <span class="revenue-value">%${kdvRate.toFixed(2)}</span>
        </div>
        <div class="revenue-info-item">
          <span class="revenue-label">Ekstra Maliyet:</span>
          <span class="revenue-value">%${extraCostRate.toFixed(2)}</span>
        </div>
      </div>
      <div class="revenue-table">
        <div class="revenue-header">
          <div class="revenue-col">Kar Oranı</div>
          <div class="revenue-col">KDV Dahil Satış</div>
          <div class="revenue-col">KDV'siz Satış</div>
          <div class="revenue-col">KDV'siz Kar</div>
        </div>
        ${revenueData.map(item => `
          <div class="revenue-row">
            <div class="revenue-col profit-badge profit-${item.profitPercent}">%${item.profitPercent}</div>
            <div class="revenue-col price-value">${item.salePrice.toFixed(2)} TL</div>
            <div class="revenue-col price-value-without-kdv">${item.salePriceWithoutKDV.toFixed(2)} TL</div>
            <div class="revenue-col profit-value">+${item.profitWithoutKDV.toFixed(2)} TL</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  modal.style.display = 'flex';
};

// Close modal
window.closeModal = function(modalId) {
  document.getElementById(modalId).style.display = 'none';
};

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  const addProductModal = document.getElementById('addProductModal');
  const detailModal = document.getElementById('detailModal');
  const revenueModal = document.getElementById('revenueModal');
  
  if (e.target === addProductModal) {
    closeModal('addProductModal');
  }
  if (e.target === detailModal) {
    closeModal('detailModal');
  }
  if (e.target === revenueModal) {
    closeModal('revenueModal');
  }
});

// Get price method name
function getPriceMethodName(method) {
  const methods = {
    'tl': 'TL Kar (KDV Dahil)',
    'percentage': 'Yüzdelik Kar',
    'custom': 'Özel Fiyat'
  };
  return methods[method] || method;
}

// Delete product
window.deleteProduct = async function(productId) {
  if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
    return;
  }

  try {
    await deleteDoc(doc(db, 'products', productId));
    await loadProducts();
    alert('Ürün başarıyla silindi!');
  } catch (error) {
    console.error('Error deleting product:', error);
    alert('Ürün silinirken bir hata oluştu: ' + error.message);
  }
};

// Filter and sort event listeners
categoryFilter.addEventListener('change', () => {
  renderProducts();
});

searchFilter.addEventListener('input', () => {
  renderProducts();
});

sortFilter.addEventListener('change', () => {
  renderProducts();
});

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initial load
loadProducts();

