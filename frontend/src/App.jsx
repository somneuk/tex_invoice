import React, { useState, useEffect, useRef } from 'react';
import {
  login,
  register,
  logout,
  getUser,
  getCustomers,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  getInvoices,
  addInvoice,
  updateInvoice,
  deleteInvoice,
  getDashboardStats,
  fetchLogs,
  formatCurrency,
  formatDate
} from './utils';
import logoSvg from './assets/logo.svg';
import './App.css';

function App() {
  const [user, setUserState] = useState(getUser());
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Authentication inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // App data state
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardPeriod, setDashboardPeriod] = useState('monthly');

  // Loading states
  const [loading, setLoading] = useState(false);

  // Modals state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);

  // Invoice form state
  const [invNumber, setInvNumber] = useState('');
  const [invType, setInvType] = useState('sale');
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);
  const [invCustomerId, setInvCustomerId] = useState('');
  const [invContactName, setInvContactName] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invVat, setInvVat] = useState('');
  const [invGrandTotal, setInvGrandTotal] = useState('');
  const [invNotes, setInvNotes] = useState('');
  const [invImageFile, setInvImageFile] = useState(null);
  const [invImagePreview, setInvImagePreview] = useState(null);
  const [invKeepImage, setInvKeepImage] = useState(true);
  const fileInputRef = useRef(null);

  // Customer form state
  const [custName, setCustName] = useState('');
  const [custTaxId, setCustTaxId] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custAddress, setCustAddress] = useState('');

  // Filters state
  const [filterType, setFilterType] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Fetch initial data on login
  useEffect(() => {
    if (user) {
      loadDashboard();
      loadInvoices();
      loadCustomers();
      loadLogs();
    }
  }, [user]);

  // Reload dashboard when period changes
  useEffect(() => {
    if (user) {
      loadDashboard();
    }
  }, [dashboardPeriod]);

  // Load Invoices when filters change
  useEffect(() => {
    if (user) {
      loadInvoices();
    }
  }, [filterType, filterStartDate, filterEndDate]);

  // Data Loading Helpers
  const loadDashboard = async () => {
    try {
      const data = await getDashboardStats(dashboardPeriod);
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    }
  };

  const loadInvoices = async () => {
    try {
      const filters = {};
      if (filterType) filters.type = filterType;
      if (filterStartDate) filters.startDate = filterStartDate;
      if (filterEndDate) filters.endDate = filterEndDate;
      const data = await getInvoices(filters);
      setInvoices(data);
    } catch (err) {
      console.error('Failed to load invoices', err);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers', err);
    }
  };

  const loadLogs = async () => {
    try {
      const data = await fetchLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load access logs', err);
    }
  };

  // Auth actions
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    try {
      const loggedUser = await login(username, password);
      setUserState(loggedUser);
      setCurrentPage('dashboard');
    } catch (err) {
      setAuthError(err.message || 'Login failed');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    try {
      await register(username, password, displayName);
      setAuthSuccess('สมัครใช้งานสำเร็จ! กรุณาเข้าสู่ระบบ');
      setIsLoginMode(true);
      setPassword('');
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
    }
  };

  const handleLogout = () => {
    logout();
    setUserState(null);
    setUsername('');
    setPassword('');
    setDisplayName('');
  };

  // Auto calculate VAT (7%) and Grand Total when Amount changes
  const handleAmountChange = (val) => {
    setInvAmount(val);
    const amountFloat = parseFloat(val);
    if (!isNaN(amountFloat)) {
      const calculatedVat = (amountFloat * 0.07).toFixed(2);
      const calculatedGrand = (amountFloat * 1.07).toFixed(2);
      setInvVat(calculatedVat);
      setInvGrandTotal(calculatedGrand);
    } else {
      setInvVat('');
      setInvGrandTotal('');
    }
  };

  // Handle invoice image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setInvImageFile(file);
      setInvKeepImage(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setInvImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedImage = () => {
    setInvImageFile(null);
    setInvImagePreview(null);
    setInvKeepImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Invoice Save
  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('invoice_number', invNumber);
      formData.append('type', invType);
      formData.append('date', invDate);
      formData.append('amount', invAmount);
      formData.append('vat', invVat);
      formData.append('grand_total', invGrandTotal);
      formData.append('notes', invNotes);

      if (invCustomerId) {
        formData.append('customer_id', invCustomerId);
        const selectedCust = customers.find(c => c.id === parseInt(invCustomerId));
        if (selectedCust) {
          formData.append('customer_name', selectedCust.name);
        }
      } else {
        formData.append('customer_name', invContactName);
      }

      if (invImageFile) {
        formData.append('image', invImageFile);
      } else {
        formData.append('keep_existing_image', invKeepImage ? 'true' : 'false');
      }

      if (editingInvoice) {
        await updateInvoice(editingInvoice.id, formData);
      } else {
        await addInvoice(formData);
      }

      setShowInvoiceModal(false);
      loadInvoices();
      loadDashboard();
      resetInvoiceForm();
    } catch (err) {
      alert(err.message || 'Failed to save bill');
    } finally {
      setLoading(false);
    }
  };

  const resetInvoiceForm = () => {
    setEditingInvoice(null);
    setInvNumber('');
    setInvType('sale');
    setInvDate(new Date().toISOString().split('T')[0]);
    setInvCustomerId('');
    setInvContactName('');
    setInvAmount('');
    setInvVat('');
    setInvGrandTotal('');
    setInvNotes('');
    setInvImageFile(null);
    setInvImagePreview(null);
    setInvKeepImage(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openAddInvoice = () => {
    resetInvoiceForm();
    setShowInvoiceModal(true);
  };

  const openEditInvoice = (inv) => {
    setEditingInvoice(inv);
    setInvNumber(inv.invoice_number);
    setInvType(inv.type);
    setInvDate(inv.date);
    setInvCustomerId(inv.customer_id ? inv.customer_id.toString() : '');
    setInvContactName(inv.customer_name || '');
    setInvAmount(inv.amount.toString());
    setInvVat(inv.vat.toString());
    setInvGrandTotal(inv.grand_total.toString());
    setInvNotes(inv.notes || '');
    setInvImageFile(null);
    setInvImagePreview(inv.image_url ? `http://localhost:5000${inv.image_url}` : null);
    setInvKeepImage(true);
    setShowInvoiceModal(true);
  };

  const handleDeleteInvoice = async (id) => {
    if (window.confirm('คุณต้องการลบข้อมูลบิลนี้ใช่หรือไม่?')) {
      try {
        await deleteInvoice(id);
        loadInvoices();
        loadDashboard();
      } catch (err) {
        alert(err.message || 'Failed to delete invoice');
      }
    }
  };

  // Customer Save
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        name: custName,
        tax_id: custTaxId,
        phone: custPhone,
        email: custEmail,
        address: custAddress
      };

      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, data);
      } else {
        await addCustomer(data);
      }

      setShowCustomerModal(false);
      loadCustomers();
      resetCustomerForm();
    } catch (err) {
      alert(err.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const resetCustomerForm = () => {
    setEditingCustomer(null);
    setCustName('');
    setCustTaxId('');
    setCustPhone('');
    setCustEmail('');
    setCustAddress('');
  };

  const openAddCustomer = () => {
    resetCustomerForm();
    setShowCustomerModal(true);
  };

  const openEditCustomer = (cust) => {
    setEditingCustomer(cust);
    setCustName(cust.name);
    setCustTaxId(cust.tax_id || '');
    setCustPhone(cust.phone || '');
    setCustEmail(cust.email || '');
    setCustAddress(cust.address || '');
    setShowCustomerModal(true);
  };

  const handleDeleteCustomer = async (id) => {
    if (window.confirm('คุณต้องการลบลูกค้าท่านนี้ใช่หรือไม่?')) {
      try {
        await deleteCustomer(id);
        loadCustomers();
      } catch (err) {
        alert(err.message || 'Failed to delete customer');
      }
    }
  };

  // Custom Line Chart Renderer using SVG
  const renderAnalyticsChart = () => {
    if (!dashboardData || !dashboardData.chartData || dashboardData.chartData.length === 0) {
      return (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          ไม่มีข้อมูลการทำรายการในช่วงเวลานี้
        </div>
      );
    }

    const data = dashboardData.chartData;
    const maxVal = Math.max(...data.map(d => Math.max(d.sales, d.purchases)), 1000);

    const svgWidth = 600;
    const svgHeight = 220;
    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const graphWidth = svgWidth - paddingLeft - paddingRight;
    const graphHeight = svgHeight - paddingTop - paddingBottom;

    // Generate path points
    const salesPoints = [];
    const purchasePoints = [];

    data.forEach((item, index) => {
      const x = paddingLeft + (index / Math.max(data.length - 1, 1)) * graphWidth;
      
      const ySales = svgHeight - paddingBottom - (item.sales / maxVal) * graphHeight;
      const yPurchases = svgHeight - paddingBottom - (item.purchases / maxVal) * graphHeight;
      
      salesPoints.push(`${x},${ySales}`);
      purchasePoints.push(`${x},${yPurchases}`);
    });

    const salesPath = `M ${salesPoints.join(' L ')}`;
    const purchasePath = `M ${purchasePoints.join(' L ')}`;

    // Filled Areas
    const salesArea = `${salesPath} L ${paddingLeft + graphWidth},${svgHeight - paddingBottom} L ${paddingLeft},${svgHeight - paddingBottom} Z`;
    const purchaseArea = `${purchasePath} L ${paddingLeft + graphWidth},${svgHeight - paddingBottom} L ${paddingLeft},${svgHeight - paddingBottom} Z`;

    // Y Grid values
    const gridCount = 4;
    const yGridValues = [];
    for (let i = 0; i <= gridCount; i++) {
      const val = (maxVal / gridCount) * i;
      const y = svgHeight - paddingBottom - (val / maxVal) * graphHeight;
      yGridValues.push({ val, y });
    }

    // X Grid values (show up to 6 labels)
    const labelStep = Math.max(Math.floor(data.length / 6), 1);
    const xLabels = data.map((d, i) => ({
      label: d.label.substring(5), // truncate YYYY-
      x: paddingLeft + (i / Math.max(data.length - 1, 1)) * graphWidth
    })).filter((_, idx) => idx % labelStep === 0);

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-emerald)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent-emerald)" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-rose)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent-rose)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {yGridValues.map((g, i) => (
          <g key={i}>
            <line
              x1={paddingLeft}
              y1={g.y}
              x2={svgWidth - paddingRight}
              y2={g.y}
              stroke="rgba(255, 255, 255, 0.05)"
              strokeDasharray="4,4"
            />
            <text
              x={paddingLeft - 8}
              y={g.y + 4}
              fill="var(--text-secondary)"
              fontSize="10"
              textAnchor="end"
            >
              {formatCurrency(g.val).replace('฿', '').split('.')[0]}
            </text>
          </g>
        ))}

        {/* X labels */}
        {xLabels.map((xl, i) => (
          <text
            key={i}
            x={xl.x}
            y={svgHeight - paddingBottom + 18}
            fill="var(--text-secondary)"
            fontSize="9"
            textAnchor="middle"
          >
            {xl.label}
          </text>
        ))}

        {/* Sales filled area & line */}
        {data.length > 1 && (
          <>
            <path d={salesArea} fill="url(#salesGrad)" />
            <path d={salesPath} fill="none" stroke="var(--accent-emerald)" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}

        {/* Purchases filled area & line */}
        {data.length > 1 && (
          <>
            <path d={purchaseArea} fill="url(#purchaseGrad)" />
            <path d={purchasePath} fill="none" stroke="var(--accent-rose)" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}

        {/* Render interactive dots */}
        {data.map((item, index) => {
          const x = paddingLeft + (index / Math.max(data.length - 1, 1)) * graphWidth;
          const yS = svgHeight - paddingBottom - (item.sales / maxVal) * graphHeight;
          const yP = svgHeight - paddingBottom - (item.purchases / maxVal) * graphHeight;

          return (
            <g key={index} className="chart-nodes">
              {item.sales > 0 && (
                <circle cx={x} cy={yS} r="4" fill="var(--accent-emerald)">
                  <title>{`ยอดขาย: ${formatCurrency(item.sales)} (${item.label})`}</title>
                </circle>
              )}
              {item.purchases > 0 && (
                <circle cx={x} cy={yP} r="4" fill="var(--accent-rose)">
                  <title>{`ยอดซื้อ: ${formatCurrency(item.purchases)} (${item.label})`}</title>
                </circle>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  // Render Authentication Forms
  if (!user) {
    return (
      <div className="login-container">
        <div className="glass-panel login-card">
          <div className="login-logo">
            <img src={logoSvg} alt="TexInvoice Logo" className="login-logo-image" />
            <div className="logo-text">TexInvoice</div>
          </div>

          <div className="login-title-section">
            <h1 className="login-title">{isLoginMode ? 'เข้าสู่ระบบ' : 'สมัครสมาชิกใหม่'}</h1>
            <p className="login-subtitle">ระบบบันทึกบิลซื้อบิลขายและข้อมูลลูกค้า</p>
          </div>

          {authError && <div className="auth-alert">{authError}</div>}
          {authSuccess && <div className="auth-alert auth-alert-success">{authSuccess}</div>}

          <form onSubmit={isLoginMode ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!isLoginMode && (
              <div className="form-group">
                <label>ชื่อผู้ใช้งาน (แสดงผล)</label>
                <input
                  type="text"
                  placeholder="เช่น สมชาย ใจดี"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>บัญชีผู้ใช้ (Username)</label>
              <input
                type="text"
                placeholder="ป้อนชื่อผู้ใช้งานระบบ"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>รหัสผ่าน (Password)</label>
              <input
                type="password"
                placeholder="ป้อนรหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.9rem' }}>
              {isLoginMode ? 'เข้าสู่ระบบ' : 'ลงทะเบียนบัญชี'}
            </button>
          </form>

          <div className="auth-footer">
            {isLoginMode ? (
              <>
                ยังไม่มีบัญชีผู้ใช้?{' '}
                <span className="auth-footer-link" onClick={() => { setIsLoginMode(false); setAuthError(''); }}>
                  สมัครสมาชิก
                </span>
              </>
            ) : (
              <>
                มีบัญชีอยู่แล้ว?{' '}
                <span className="auth-footer-link" onClick={() => { setIsLoginMode(true); setAuthError(''); }}>
                  เข้าสู่ระบบ
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render Authorized Layout
  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <nav className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">TX</div>
          <span className="logo-text">TexInvoice</span>
        </div>

        <ul className="nav-menu">
          <li className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('dashboard')}>
            <span className="nav-icon">📊</span>
            <span>แดชบอร์ด</span>
          </li>
          <li className={`nav-item ${currentPage === 'invoices' ? 'active' : ''}`} onClick={() => setCurrentPage('invoices')}>
            <span className="nav-icon">📄</span>
            <span>บันทึกบิล (บิลซื้อ/ขาย)</span>
          </li>
          <li className={`nav-item ${currentPage === 'customers' ? 'active' : ''}`} onClick={() => setCurrentPage('customers')}>
            <span className="nav-icon">👥</span>
            <span>ฐานข้อมูลลูกค้า</span>
          </li>
          <li className={`nav-item ${currentPage === 'logs' ? 'active' : ''}`} onClick={() => setCurrentPage('logs')}>
            <span className="nav-icon">🛡️</span>
            <span>ประวัติการเข้าใช้งาน</span>
          </li>
        </ul>

        <div className="user-profile-section">
          <div className="user-info">
            <div className="user-avatar">{user.name.charAt(0)}</div>
            <div className="user-details">
              <span className="user-name">{user.name}</span>
              <span className="user-role">@{user.username}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        
        {/* ==========================================
            PAGE: DASHBOARD
            ========================================== */}
        {currentPage === 'dashboard' && (
          <>
            <div className="page-header">
              <div>
                <h1 className="page-title">แดชบอร์ดสรุปผล</h1>
                <p className="page-subtitle">รายงานบิลซื้อบิลขายประจำสถานประกอบการ</p>
              </div>
              <div className="filter-tabs">
                <button
                  className={`filter-tab ${dashboardPeriod === 'daily' ? 'active' : ''}`}
                  onClick={() => setDashboardPeriod('daily')}
                >
                  รายวัน (30 วัน)
                </button>
                <button
                  className={`filter-tab ${dashboardPeriod === 'monthly' ? 'active' : ''}`}
                  onClick={() => setDashboardPeriod('monthly')}
                >
                  รายเดือน (ปีนี้)
                </button>
                <button
                  className={`filter-tab ${dashboardPeriod === 'yearly' ? 'active' : ''}`}
                  onClick={() => setDashboardPeriod('yearly')}
                >
                  รายปี (ทั้งหมด)
                </button>
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="kpi-grid">
              <div className="glass-panel kpi-card sales">
                <div className="kpi-header">
                  <span>ยอดขายสะสม (บิลขาย)</span>
                  <div className="kpi-icon-wrapper">📈</div>
                </div>
                <div className="kpi-value" style={{ color: 'var(--accent-emerald)' }}>
                  {dashboardData ? formatCurrency(dashboardData.stats.sales.total) : '฿0.00'}
                </div>
                <span className="kpi-subtext">มูลค่ารวม VAT: {dashboardData ? formatCurrency(dashboardData.stats.sales.vat) : '฿0.00'}</span>
              </div>

              <div className="glass-panel kpi-card purchases">
                <div className="kpi-header">
                  <span>ยอดซื้อสะสม (บิลซื้อ)</span>
                  <div className="kpi-icon-wrapper">📉</div>
                </div>
                <div className="kpi-value" style={{ color: 'var(--accent-rose)' }}>
                  {dashboardData ? formatCurrency(dashboardData.stats.purchases.total) : '฿0.00'}
                </div>
                <span className="kpi-subtext">มูลค่ารวม VAT: {dashboardData ? formatCurrency(dashboardData.stats.purchases.vat) : '฿0.00'}</span>
              </div>

              <div className="glass-panel kpi-card net">
                <div className="kpi-header">
                  <span>กำไร/ยอดคงเหลือสุทธิ</span>
                  <div className="kpi-icon-wrapper">💰</div>
                </div>
                <div className="kpi-value" style={{ color: dashboardData && dashboardData.stats.netTotal >= 0 ? 'var(--accent-cyan)' : 'var(--accent-rose)' }}>
                  {dashboardData ? formatCurrency(dashboardData.stats.netTotal) : '฿0.00'}
                </div>
                <span className="kpi-subtext">ก่อนหักภาษีสุทธิ: {dashboardData ? formatCurrency(dashboardData.stats.netAmount) : '฿0.00'}</span>
              </div>
            </div>

            {/* Analytics Graph Panel */}
            <div className="glass-panel">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>กราฟวิเคราะห์แนวโน้ม</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>เปรียบเทียบ ยอดขาย (<span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>สีเขียว</span>) และ ยอดซื้อ (<span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>สีแดง</span>)</p>
              <div className="chart-container">
                {renderAnalyticsChart()}
              </div>
            </div>

            {/* Latest Invoices Panel */}
            <div className="glass-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>รายการล่าสุด</h2>
                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => setCurrentPage('invoices')}>
                  ดูทั้งหมด
                </button>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>เลขที่บิล</th>
                      <th>ประเภท</th>
                      <th>ลูกค้า / คู่ค้า</th>
                      <th style={{ textAlign: 'right' }}>จำนวนเงินรวม</th>
                      <th>บิล</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.slice(0, 5).map((inv) => (
                      <tr key={inv.id}>
                        <td>{formatDate(inv.date)}</td>
                        <td style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                        <td>
                          <span className={`badge ${inv.type === 'sale' ? 'badge-sale' : 'badge-purchase'}`}>
                            {inv.type === 'sale' ? 'บิลขาย' : 'บิลซื้อ'}
                          </span>
                        </td>
                        <td>{inv.customer_name}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: inv.type === 'sale' ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                          {formatCurrency(inv.grand_total)}
                        </td>
                        <td>
                          {inv.image_url ? (
                            <img
                              src={`http://localhost:5000${inv.image_url}`}
                              alt="Thumbnail"
                              className="bill-thumbnail"
                              onClick={() => setViewingImage(`http://localhost:5000${inv.image_url}`)}
                            />
                          ) : (
                            <div className="no-image-placeholder">ไม่มีภาพ</div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>ไม่มีข้อมูลบิลในระบบ</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ==========================================
            PAGE: INVOICES
            ========================================== */}
        {currentPage === 'invoices' && (
          <>
            <div className="page-header">
              <div>
                <h1 className="page-title">รายการบิลซื้อบิลขาย</h1>
                <p className="page-subtitle">จัดการและบันทึกข้อมูลเอกสารบิล</p>
              </div>
              <button className="btn btn-primary" onClick={openAddInvoice}>
                <span>➕ บันทึกบิลใหม่</span>
              </button>
            </div>

            {/* Filters panel */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div className="form-row" style={{ alignItems: 'end', marginBottom: 0 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>ประเภทบิล</label>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="">ทั้งหมด</option>
                    <option value="sale">บิลขาย (Sales)</option>
                    <option value="purchase">บิลซื้อ (Purchases)</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>จากวันที่</label>
                  <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>ถึงวันที่</label>
                  <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" style={{ flexGrow: 1 }} onClick={() => {
                    setFilterType('');
                    setFilterStartDate('');
                    setFilterEndDate('');
                  }}>
                    ล้างตัวกรอง
                  </button>
                </div>
              </div>
            </div>

            {/* Invoices List Table */}
            <div className="glass-panel">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>เลขที่บิล</th>
                      <th>ประเภท</th>
                      <th>ลูกค้า / คู่ค้า</th>
                      <th style={{ textAlign: 'right' }}>ก่อน VAT</th>
                      <th style={{ textAlign: 'right' }}>VAT (7%)</th>
                      <th style={{ textAlign: 'right' }}>ยอดรวมสุทธิ</th>
                      <th>หลักฐานรูปภาพ</th>
                      <th style={{ textAlign: 'center' }}>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td>{formatDate(inv.date)}</td>
                        <td style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                        <td>
                          <span className={`badge ${inv.type === 'sale' ? 'badge-sale' : 'badge-purchase'}`}>
                            {inv.type === 'sale' ? 'บิลขาย' : 'บิลซื้อ'}
                          </span>
                        </td>
                        <td>{inv.customer_name}</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(inv.amount)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{formatCurrency(inv.vat)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: inv.type === 'sale' ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                          {formatCurrency(inv.grand_total)}
                        </td>
                        <td>
                          {inv.image_url ? (
                            <img
                              src={`http://localhost:5000${inv.image_url}`}
                              alt="Bill Preview"
                              className="bill-thumbnail"
                              onClick={() => setViewingImage(`http://localhost:5000${inv.image_url}`)}
                            />
                          ) : (
                            <div className="no-image-placeholder">ไม่มีภาพ</div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => openEditInvoice(inv)}>
                              แก้ไข
                            </button>
                            <button className="btn btn-danger" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleDeleteInvoice(inv.id)}>
                              ลบ
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>ไม่มีข้อมูลบิลในระบบ</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ==========================================
            PAGE: CUSTOMERS
            ========================================== */}
        {currentPage === 'customers' && (
          <>
            <div className="page-header">
              <div>
                <h1 className="page-title">ฐานข้อมูลลูกค้า / ผู้จำหน่าย</h1>
                <p className="page-subtitle">บันทึกประวัติการติดต่อค้าขาย</p>
              </div>
              <button className="btn btn-primary" onClick={openAddCustomer}>
                <span>➕ เพิ่มลูกค้าใหม่</span>
              </button>
            </div>

            {/* Customer List Table */}
            <div className="glass-panel">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ชื่อลูกค้า / บริษัท</th>
                      <th>เลขประจำตัวผู้เสียภาษี</th>
                      <th>เบอร์โทรศัพท์</th>
                      <th>อีเมล</th>
                      <th>ที่อยู่</th>
                      <th style={{ textAlign: 'center' }}>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((cust) => (
                      <tr key={cust.id}>
                        <td style={{ fontWeight: 600 }}>{cust.name}</td>
                        <td>{cust.tax_id || '-'}</td>
                        <td>{cust.phone || '-'}</td>
                        <td>{cust.email || '-'}</td>
                        <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cust.address}>
                          {cust.address || '-'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => openEditCustomer(cust)}>
                              แก้ไข
                            </button>
                            <button className="btn btn-danger" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleDeleteCustomer(cust.id)}>
                              ลบ
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {customers.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>ไม่มีรายชื่อลูกค้าในฐานข้อมูล</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ==========================================
            PAGE: LOGS
            ========================================== */}
        {currentPage === 'logs' && (
          <>
            <div className="page-header">
              <div>
                <h1 className="page-title">บันทึกการเข้าใช้งานระบบ</h1>
                <p className="page-subtitle">แสดงประวัติประวัติการล็อกอินระบบรักษาความปลอดภัย</p>
              </div>
              <button className="btn btn-secondary" onClick={loadLogs}>
                <span>🔄 อัปเดตข้อมูล</span>
              </button>
            </div>

            <div className="glass-panel">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ลำดับ</th>
                      <th>บัญชีผู้ใช้</th>
                      <th>สถานะ</th>
                      <th>IP Address</th>
                      <th>ข้อมูลเบราว์เซอร์ (User Agent)</th>
                      <th>วัน-เวลาเข้าใช้</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, index) => (
                      <tr key={log.id}>
                        <td>{logs.length - index}</td>
                        <td style={{ fontWeight: 600 }}>{log.username}</td>
                        <td>
                          <span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : 'badge-failed'}`}>
                            {log.status === 'SUCCESS' ? 'สำเร็จ' : 'ล้มเหลว'}
                          </span>
                        </td>
                        <td>{log.ip_address || 'local'}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.user_agent}>
                          {log.user_agent}
                        </td>
                        <td>{new Date(log.timestamp).toLocaleString('th-TH')}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>ไม่มีประวัติการเข้าใช้งาน</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </main>

      {/* ==========================================
          MODAL: ADD/EDIT INVOICE
          ========================================== */}
      {showInvoiceModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingInvoice ? 'แก้ไขบิลการเงิน' : 'บันทึกข้อมูลบิลใหม่'}</h3>
              <button className="modal-close" onClick={() => setShowInvoiceModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveInvoice}>
              <div className="form-row">
                <div className="form-group">
                  <label>ประเภทบิล *</label>
                  <select value={invType} onChange={(e) => setInvType(e.target.value)} required>
                    <option value="sale">บิลขาย (Sales Invoice)</option>
                    <option value="purchase">บิลซื้อ (Purchase Bill)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>เลขที่เอกสาร / บิล *</label>
                  <input
                    type="text"
                    placeholder="เช่น INV202606001"
                    value={invNumber}
                    onChange={(e) => setInvNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>วันที่ลงบิล *</label>
                  <input
                    type="date"
                    value={invDate}
                    onChange={(e) => setInvDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>เชื่อมโยงรายชื่อลูกค้า / คู่ค้า</label>
                  <select value={invCustomerId} onChange={(e) => {
                    setInvCustomerId(e.target.value);
                    if (e.target.value === '') setInvContactName('');
                  }}>
                    <option value="">-- ไม่เชื่อมโยง (ใช้พิมพ์ระบุชื่อเอง) --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!invCustomerId && (
                <div className="form-group">
                  <label>พิมพ์ระบุชื่อ ลูกค้า / คู่ค้า (กรณีไม่ได้ผูกฐานข้อมูล)</label>
                  <input
                    type="text"
                    placeholder="เช่น บจก. ซัพพลายเออร์ ไทยแลนด์"
                    value={invContactName}
                    onChange={(e) => setInvContactName(e.target.value)}
                  />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>จำนวนเงินก่อน VAT (บาท) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={invAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>VAT (7% อัตโนมัติ)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={invVat}
                    onChange={(e) => setInvVat(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>ยอดเงินสุทธิ (บาท) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={invGrandTotal}
                    onChange={(e) => setInvGrandTotal(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>อัปโหลดรูปภาพบิล (ใบเสร็จ/หลักฐาน)</label>
                <div className="file-upload-container" onClick={() => fileInputRef.current.click()}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageChange}
                  />
                  <span>📁 คลิกที่นี่เพื่อเลือกรูปภาพหลักฐานบิล</span>
                  {invImagePreview && (
                    <div className="file-preview" onClick={(e) => e.stopPropagation()}>
                      <img src={invImagePreview} alt="Bill Preview" />
                      <button type="button" className="remove-file-btn" onClick={removeSelectedImage}>×</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>หมายเหตุ</label>
                <textarea
                  rows="3"
                  placeholder="รายละเอียดเพิ่มเติม..."
                  value={invNotes}
                  onChange={(e) => setInvNotes(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'กำลังบันทึก...' : 'บันทึกเอกสาร'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: ADD/EDIT CUSTOMER
          ========================================== */}
      {showCustomerModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingCustomer ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มฐานข้อมูลลูกค้าใหม่'}</h3>
              <button className="modal-close" onClick={() => setShowCustomerModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveCustomer}>
              <div className="form-group">
                <label>ชื่อลูกค้า / บริษัทผู้ค้า *</label>
                <input
                  type="text"
                  placeholder="เช่น บจก. เอ็นจิเนียริ่ง ไทยแลนด์"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
                  <input
                    type="text"
                    placeholder="เลข 13 หลัก"
                    value={custTaxId}
                    onChange={(e) => setCustTaxId(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>เบอร์โทรศัพท์ติดต่อ</label>
                  <input
                    type="text"
                    placeholder="เช่น 02-xxx-xxxx"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>อีเมลติดต่อ</label>
                <input
                  type="email"
                  placeholder="contact@company.com"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>ที่อยู่ผู้เสียภาษี / จัดส่งบิล</label>
                <textarea
                  rows="3"
                  placeholder="ระบุที่อยู่ของบริษัทหรือผู้เสียภาษี..."
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCustomerModal(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: VIEW FULL IMAGE
          ========================================== */}
      {viewingImage && (
        <div className="modal-overlay" onClick={() => setViewingImage(null)}>
          <div className="glass-panel modal-content" style={{ maxWidth: '800px', background: 'rgba(10, 11, 18, 0.9)', border: 'none' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">รูปภาพหลักฐานบิล</h3>
              <button className="modal-close" onClick={() => setViewingImage(null)}>×</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '1rem' }}>
              <img
                src={viewingImage}
                alt="Full Invoice Bill"
                style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
