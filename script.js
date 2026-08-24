// 💡 全域相容性大腦：集中定義請假與午休豁免計算
function isTimeExempted(min, leaves) {
  if (min >= 720 && min < 780) return true; // 午休固定豁免
  return leaves.some(l => min >= l.start && min < l.end);
}
// script.js 新增：欄位變更時觸發預覽
document.addEventListener('DOMContentLoaded', function() {
  const inputs = ['leaveStar', 'leaveEnd', 'leaveStartTime', 'leaveEndTime'];
  
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', previewLeaveHours);
    }
  });
});
// 【新增】切換審核狀態篩選
// ── 主類別切換（請假/加班/補打卡/班別調整） ──


// 全域目前篩選狀態變數 (統一命名與管理)
let currentApplyFilter = '請假';      // 第一層：主類別 (請假/加班/補打卡/班別調整)
let currentSubCategory = '特休';       // 第二層：假別細項 (特休/補休/公假/其他假別)
let currentStatus = '同意';           // 第三層：審核狀態 (同意/待審/拒絕/已撤回)

// ── 第一層：主類別切換 ──
function filterApplyMainCategory(type, chip) {
  currentApplyFilter = type;
  
  // 切換時重置第二層與第三層
  currentSubCategory = 'ALL';
  currentStatus = (type === '請假') ? '同意' : '';

  // 1. 主頁籤 (第一層) UI 高亮
  document.querySelectorAll('#record-apply-content .filter-chip').forEach(c => c.classList.remove('active'));
  if (chip) chip.classList.add('active');

  // 2. 控制第二層 (假別細項列) 顯示與重置
  const subBar = document.getElementById('leaveSubFilterBar');
  if (subBar) {
    subBar.style.display = (type === '請假') ? 'flex' : 'none';
    subBar.querySelectorAll('.segment-btn').forEach(btn => btn.classList.remove('active'));
  }

  // 3. 控制第三層 (狀態列) UI 重置
  const statusBar = document.getElementById('statusFilterBar');
  if (statusBar) {
    statusBar.querySelectorAll('.segment-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('onclick')?.includes("'同意'"));
      btn.classList.toggle('active', wantActive);   // ← 改這段：只有請假類別才高亮「同意」，其餘不高亮任何按鈕
    });
  }

  // 執行過濾
  renderAllList();   // ← 新增這行，取代原本只呼叫 applyCombinedFilter();
}

// ── 第二層：假別細項點擊 ──
function filterLeaveSubCategory(subTypeTarget, el) {
  // 切換 Active UI 樣式
  const parent = el.parentElement;
  if (parent) {
    parent.querySelectorAll('.segment-btn').forEach(btn => btn.classList.remove('active'));
  }
  el.classList.add('active');

  // 設定全域變數並過濾
  currentSubCategory = subTypeTarget;
  applyCombinedFilter();
}

// ── 第三層：審核狀態點擊 ──
function filterApplyStatus(statusTarget, el) {
  // 切換 Active UI 樣式
  const parent = el.parentElement;
  if (parent) {
    parent.querySelectorAll('.segment-btn').forEach(btn => btn.classList.remove('active'));
  }
  el.classList.add('active');

  // 設定全域變數並過濾
  currentStatus = statusTarget;
  applyCombinedFilter();
}

// ── 核心組合篩選邏輯 (三層連動) ──
function applyCombinedFilter() {
  const mainCategories = ['特休', '補休', '加班補休', '公假'];
  const recordItems = document.querySelectorAll('#leaveRecordList .record-item');

  let visibleCount = 0;

  recordItems.forEach(item => {
    const itemType = item.getAttribute('data-type') || '';     // 假別，如：特休、事假
    const itemStatus = item.getAttribute('data-status') || ''; // 狀態，如：同意、待審

    // (A) 第二層：假別條件判斷 —— 只有「請假」才需要細分假別
    let passType = true;
    if (currentApplyFilter === '請假') {
      if (currentSubCategory === 'ALL') {
        passType = true;
      } else if (currentSubCategory === '其他假別') {
        passType = !mainCategories.includes(itemType);
      } else if (currentSubCategory === '補休') {
        passType = (itemType === '補休' || itemType === '加班補休');
      } else {
        passType = (itemType === currentSubCategory);
      }
    }
    // 非請假分類（加班/補打卡/班別調整）不判斷假別，直接 true

    // (B) 第三層：審核狀態條件判斷
    let passStatus = false;
    if (currentStatus === '') {
      passStatus = false;   // ← 新增：尚未選擇狀態時，全部不顯示，畫面空白
     if (currentStatus === 'ALL') {
      passStatus = true;
    } else if (currentStatus === '同意') {
      passStatus = (itemStatus === '同意' || itemStatus === '同意_補件後');
    } else if (currentStatus === '待審') {
      passStatus = (itemStatus === '待審' || itemStatus === '補件' || itemStatus === '待第二次審查');
    } else if (currentStatus === '拒絕') {
      passStatus = (itemStatus === '拒絕' || itemStatus === '拒絕_補件後');
    } else if (currentStatus === '已撤回') {
      passStatus = (itemStatus === '已撤回');
    }

    // (C) 雙條件結合顯示控制
    if (passType && passStatus) {
      item.style.display = 'flex';
      visibleCount++;
    } else {
      item.style.display = 'none';
    }
  });

  // 無資料時的空狀態顯示
  showEmptyStateIfNeeded(visibleCount);
}



// 4. 動態渲染請假卡片函式 (從後端 API 取得資料後呼叫)
function renderLeaveRecords(leaveDataList) {
  const container = document.getElementById('leaveRecordList');
  if (!container) return;

  if (!leaveDataList || leaveDataList.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📂</div><div class="empty-text">尚無任何請假紀錄</div></div>';
    return;
  }

  let html = '';
  leaveDataList.forEach(item => {
    const status = item.status || '待審';
    const subType = item.subType || item.type || '';
    const hours = item.hours || 0;
    const clientId = item.clientId || '';
    
    // 判斷卡片樣式 Class 與標籤 Badge
    let cardClass = '';
    let badgeHtml = '';
    let hoursClass = '';
    let hoursPrefix = '';
    let detailHtml = '';

    if (status === '同意' || status === '同意_補件後') {
      cardClass = 'status-approved';
      badgeHtml = '<span class="badge badge-green">✓ 已同意</span>';
      hoursClass = 'approved-hours';
      detailHtml = `<span class="approver-tag">✓ 審核人：${item.approver || '主管'}</span><span class="record-time">簽核：${item.approveTime || ''}</span>`;
    } else if (status === '待審') {
      cardClass = 'status-pending';
      badgeHtml = '<span class="badge badge-waiting">⏳ 待審核</span>';
      hoursClass = 'pending-hours';
      hoursPrefix = '時數';
      detailHtml = `<span class="pending-tag">🕒 審核處理中</span><button class="btn-cancel-apply" onclick="retractRecord('${item.id}','${item.type}','${clientId}')">撤回</button>`;
    } else if (status === '待第二次審查') {
      cardClass = 'status-pending-second';
      badgeHtml = '<span class="badge badge-purple">🔄 待第二次審查</span>';
      hoursClass = 'pending-hours';
      hoursPrefix = '時數 ';
      detailHtml = `<span class="pending-tag">💬 補件審查中</span><span class="record-time">補件：${item.suppTime || ''}</span>`;
    } else if (status === '拒絕' || status === '拒絕_補件後') {
      cardClass = 'status-rejected';
      badgeHtml = '<span class="badge badge-red">✗ 已拒絕</span>';
      hoursClass = 'rejected-hours';
      detailHtml = `<span class="reject-tag">原因：${item.approveComment || '無'}</span><span class="record-time">${item.approveTime || ''}</span>`;
    } else if (status === '已撤回') {
      cardClass = 'status-withdrawn';
      badgeHtml = '<span class="badge badge-withdrawn">🔙 已撤回</span>';
      hoursClass = '';
      detailHtml = `<span class="record-time">撤回時間：${item.timestamp || ''}</span>`;
    } else if (status === '補件') {
  cardClass = 'status-supplement';
  badgeHtml = '<span class="badge" style="background:#eff6ff;color:#3b82f6;border:1px solid #3b82f6;border-radius:6px;padding:4px 8px;">🔄 需補件</span>';
  hoursClass = 'pending-hours';
  hoursPrefix = '時數 ';
  detailHtml = `
    <span class="reject-tag" style="width:100%;">💬 主管意見：${item.approveComment || '請補充說明'}</span>
    <button class="btn-cancel-apply" style="background:#ec4899;color:#fff;border:none;" onclick="toggleResubmitBox('${item.id}')">📝 補件重新申請</button>
    <div id="resubmitBox-${item.id}" style="display:none; margin-top:8px;">
      <textarea id="resubmitText-${item.id}" placeholder="請輸入補充說明或證明文件連結" style="width:100%; min-height:60px; border-radius:8px; padding:8px; font-size:13px;"></textarea>
      <button class="approve-btn ok" style="margin-top:6px; background:#2563eb; color:#ffffff; border:none; font-weight:600;" onclick="confirmResubmit('${item.id}', '${clientId}', '${item.type}')">送出補件</button>
    </div>
  `;
}

html += `
  <div class="record-item ${cardClass}" data-type="${subType}" data-status="${status}">
    <div class="record-header-row">
      <div class="record-title-group">
        <span class="record-dot ${getDotColorClass(subType)}"></span>
        <span class="record-type">${subType}</span>
        ${badgeHtml}
      </div>
      <span class="record-leave-hours ${hoursClass}">${hoursPrefix}${hours}h</span>
    </div>

    <div class="record-date-range">
      📅 ${item.date} ${item.startTime} ～ ${item.endDate || item.date} ${item.endTime}
    </div>

    <div class="record-apply-time" style="font-size:12px; color:var(--text-secondary); margin-top:4px;">
      🕐 申請時間：${formatApplyTimestamp(item.timestamp)}
    </div>

    <div class="record-approve-detail">
      ${detailHtml}
    </div>
  </div>
`;
  });

  container.innerHTML = html;
  
  // 渲染完成後自動套用當前篩選
  applyCombinedFilter();
}


// 格式化申請時間（YYYY-MM-DD HH:mm）
function formatApplyTimestamp(ts) {
  if (!ts) return '—';
  const d = safeNewDate(ts);
  if (isNaN(d.getTime())) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}
// 輔助點色工具
function getDotColorClass(subType) {
  if (subType === '特休') return 'dot-green';
  if (subType === '補休') return 'dot-blue';
  if (subType === '公假') return 'dot-purple';
  if (subType === '病假') return 'dot-orange';
  if (subType === '事假') return 'dot-red';
  return 'dot-yellow';
}

function showEmptyStateIfNeeded(visibleCount) {
  const container = document.getElementById('leaveRecordList');
  let emptyDiv = container.querySelector('.filter-empty');
  
  if (visibleCount === 0) {
    if (!emptyDiv) {
      emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state filter-empty';
      emptyDiv.innerHTML = '<div class="empty-icon">🔍</div><div class="empty-text">沒有符合該條件的請假單</div>';
      container.appendChild(emptyDiv);
    }
    emptyDiv.style.display = 'block';
  } else if (emptyDiv) {
    emptyDiv.style.display = 'none';
  }
}

// 渲染個人首頁與額度資料
function isRangeExempted(s, e, leaves) {
  for (let m = s; m < e; m++) {
    if (!isTimeExempted(m, leaves)) return false;
  }
  return true;
}

const GAS_URL = `https://script.google.com/macros/s/AKfycbzNaxh9-4JRaOf7nirPOX9gTWo4n9KrWsuZVlXI7ohamS0HAnKatUToiuDy09kKdSxP/exec`;

function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, `0`);
  const d = String(now.getDate()).padStart(2, `0`);
  return `${y}-${m}-${d}`;
}
// 初始化時間選擇器
function initTimeSelects() {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  
  const startSel = document.getElementById('leaveStartTime');
  const endSel = document.getElementById('leaveEndTime');
  
  if (startSel) {
    startSel.innerHTML = times.map(t => 
      `<option value="${t}" ${t === '09:00' ? 'selected' : ''}>${t}</option>`
    ).join('');
  }
  
  if (endSel) {
    endSel.innerHTML = times.map(t => 
      `<option value="${t}" ${t === '18:00' ? 'selected' : ''}>${t}</option>`
    ).join('');
  }
}


// 頁面載入時執行
window.addEventListener('load', () => {
  initFormDefaultValues();
  // ... 其他初始化邏輯
});

function parseLocalDate(d) { return safeNewDate(d); }
// ── 個人資料頁面：開關班別調整表單 ──
function toggleProfileAdjustForm() {
  const area = document.getElementById('profileAdjustArea');
  if (!area) return;
  const isOpen = area.classList.contains('open');
  area.classList.toggle('open', !isOpen);
  
  if (!isOpen) {
    // 開啟時預設設定日期為今天
    const dateInput = document.getElementById('profileAdjustDate');
    if (dateInput && !dateInput.value) dateInput.value = todayStr;
  }
}
function toggleCompDetail() {
  const area = document.getElementById(`compDetailArea`);
  if (!area) return;
  const isOpen = area.style.display === `block`;
  area.style.display = isOpen ? `none` : `block`;
  if (!isOpen) renderCompDetail();
}

function renderCompDetail() {
  if (!currentUser || !currentUser.quota) return;
  const q = currentUser.quota;
  document.getElementById(`compDetailOt`).textContent = `${q.totalOtHoursAcc || 0} h`;
  document.getElementById(`compDetailUsed`).textContent = `-${q.compLeaveUsedHours || 0} h`;

  const warnEl = document.getElementById(`compDetailWarning`);
  if (warnEl && q.compLeaveRemainingHours > 0) {
    warnEl.style.display = `block`;
  }
}  

function getYearRangeString(joinDateStr, quota) {
  if (!joinDateStr) return ``;
  const win = getCurrentAnniversaryWindow(joinDateStr);
  if (!win) return ``;
  const { start, end, prevMonthEnd } = win;

  let displayedStart = start;
  let displayedEnd = new Date(prevMonthEnd);
  let noteText = ``;
  
  if (displayedEnd > end) {
    displayedEnd = end;
  }
  
  if (quota && quota.correction && quota.correction.startDate) {
    const corrStart = safeNewDate(quota.correction.startDate);
    if (corrStart && !isNaN(corrStart.getTime())) {
      if (corrStart <= displayedEnd) {
        if (corrStart >= start) {
          displayedStart = corrStart;
        }
        if (quota.correction.note) {
          const parts = quota.correction.note.split(/[,，]/);
          noteText = parts[parts.length - 1].trim();
        }
      } else if (corrStart > displayedEnd && corrStart <= end) {
        noteText = `⏳ 校正將於 ${corrStart.getFullYear()}.${String(corrStart.getMonth() + 1)}.${String(corrStart.getDate())} 生效（本月尚未結算）`;
      }
    }
  }
  const sy = displayedStart.getFullYear();
  const sm = String(displayedStart.getMonth() + 1);
  const sd = String(displayedStart.getDate());
  const ey = displayedEnd.getFullYear();
  const em = String(displayedEnd.getMonth() + 1);
  const ed = String(displayedEnd.getDate());
  
  const appendNote = noteText ? ` (${noteText})` : ``;
  return `年度區間: ${sy}.${sm}.${sd} ~ ${ey}.${em}.${ed}${appendNote}`;
}

function updateAllYearRanges() {
  if (!currentUser || !currentUser.joinDate) return;
  const rangeStr = getYearRangeString(currentUser.joinDate, currentUser.quota);
  
  const applyRangeEl = document.getElementById(`apply-range-span`);
  if (applyRangeEl) applyRangeEl.textContent = `(${rangeStr})`;
  
  const profileRangeEl = document.getElementById(`profile-range-span`);
  if (profileRangeEl) profileRangeEl.textContent = `(${rangeStr})`;
}

function safeNewDate(str) {
  if (!str) return new Date();
  if (str instanceof Date) return str;
  if (typeof str === `number`) return new Date(str);
  if (String(str).includes(`T`)) return new Date(str);
  const clean = String(str).replace(/-/g, `/`);
  return new Date(clean);
}

let currentUser = JSON.parse(sessionStorage.getItem(`tjcpm_user`) || `null`);
let records = JSON.parse(localStorage.getItem(`tjcpm_records`) || `[]`);
let notifications = JSON.parse(localStorage.getItem(`tjcpm_notif`) || `[]`);
let adminPendingCache = [];
let pendingApproveDecision = {};
let gpsLat = null, gpsLng = null;
let currentFilter = `打卡`;
let currentRecordSubTab = `detail`;
let currentLeaveSubFilter = '特休';
const localNow = new Date();
const localYear = localNow.getFullYear();
const localMonth = String(localNow.getMonth() + 1).padStart(2, `0`);
const localDay = String(localNow.getDate()).padStart(2, `0`);
const todayStr = `${localYear}-${localMonth}-${localDay}`;

// ── Service Worker 註冊 ──
if (`serviceWorker` in navigator) {
  window.addEventListener(`load`, () => {
    navigator.serviceWorker.register(`sw-v90.js`)
      .then(reg => console.log(`SW-v90 註冊成功:`, reg.scope))
      .catch(err => console.error(`SW-v90 註冊失敗:`, err));
  });
}




// ── JSONP caller ──
function callGAS(params, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const cbName = `cb_` + Date.now() + `_` + Math.random().toString(36).slice(2);
    const url = GAS_URL + `?callback=` + cbName + `&data=` + encodeURIComponent(JSON.stringify(params));
    const script = document.createElement(`script`);
    const timer = setTimeout(() => {
      delete window[cbName];
      script.remove();
      reject(new Error(`timeout`));
    }, timeoutMs);
    window[cbName] = (res) => {
      clearTimeout(timer);
      delete window[cbName];
      script.remove();
      resolve(res);
    };
    script.onerror = () => {
      clearTimeout(timer);
      delete window[cbName];
      script.remove();
      reject(new Error(`network`));
    };
    script.src = url;
    document.head.appendChild(script);
  });
}

// ── 連線狀態偵測 ──
let isOnline = navigator.onLine;
let isGpsLocked = false;
let connectivityCheckInFlight = false;

function updateActionButtonsState() {
  const btnCheckin = document.getElementById(`btnCheckin`);
  const btnCheckout = document.getElementById(`btnCheckout`);
  const banner = document.getElementById(`offlineBanner`);
  const checkinSub = document.getElementById(`checkinSub`);
  const checkoutSub = document.getElementById(`checkoutSub`);
  if (!btnCheckin || !btnCheckout) return;
  const canPunch = isGpsLocked;
  btnCheckin.classList.toggle(`disabled`, !canPunch);
  btnCheckout.classList.toggle(`disabled`, !canPunch);
  let reason = ``;
  if (!isOnline) reason = `☁️ 離線打卡已就緒`;
  else if (!isGpsLocked) reason = `⚠️ 無 GPS 定位`;
  if (banner) {
    banner.classList.toggle(`show`, !isOnline || !isGpsLocked);
    if (!isOnline) {
      banner.textContent = `☁️ 離線狀態已啟用：您目前處於離線狀態，系統已為您開啟「離線打卡」保護，您的打卡資料將暫存於手機中，並於連線恢復時自動完成雲端同步！`;
      banner.style.backgroundColor = `var(--accent-orange-pale)`;
      banner.style.color = `var(--accent-orange)`;
      banner.style.borderColor = `var(--accent-orange)`;
    } else if (!isGpsLocked) {
      banner.textContent = `⚠️ 目前無法取得 GPS 定位，暫時無法打卡，請允許位置存取後再試`;
      banner.style.backgroundColor = `var(--accent-red-pale)`;
      banner.style.color = `var(--accent-red)`;
      banner.style.borderColor = `var(--accent-red)`;
    }
  }
  if (checkinSub) checkinSub.textContent = canPunch ? (isOnline ? `打卡上班` : `離線打卡`) : reason;
  if (checkoutSub) checkoutSub.textContent = canPunch ? (isOnline ? `打卡下班` : `離線打卡`) : reason;
}

function setOnlineStatus(online) {
  isOnline = online;
  updateActionButtonsState();
}
function setGpsLocked(locked) {
  isGpsLocked = locked;
  updateActionButtonsState();
}

async function checkConnectivity() {
  if (connectivityCheckInFlight) return;
  connectivityCheckInFlight = true;
  try {
    await callGAS({}, 6000);
    setOnlineStatus(true);
    await processOfflineQueue();
  } catch (e) {
    setOnlineStatus(false);
  } finally {
    connectivityCheckInFlight = false;
  }
}
window.addEventListener(`online`, () => { checkConnectivity(); });
window.addEventListener(`offline`, () => { setOnlineStatus(false); });

// ── Boot ──
if (currentUser) showApp();
else showLogin();

function showLogin() {
  document.getElementById(`loginScreen`).style.display = `flex`;
  document.getElementById(`mainApp`).style.display = `none`;
}

function showApp() {
  document.getElementById(`loginScreen`).style.display = `none`;
  document.getElementById(`mainApp`).style.display = `block`;
  
  const isAdmin = currentUser.role === `admin` || currentUser.role === `admin1` || currentUser.role === `admin2`;
  
  document.querySelectorAll(`.nav-tab`).forEach(tab => {
    const tName = tab.dataset.tab;
    if (isAdmin) {
      if (tName === `admin` || tName === `profile`) {
        tab.style.setProperty(`display`, `inline-flex`, `important`);
      } else {
        tab.style.setProperty(`display`, `none`, `important`);
      }
    } else {
      if (tName === `admin`) {
        tab.style.setProperty(`display`, `none`, `important`);
      } else {
        tab.style.setProperty(`display`, `inline-flex`, `important`);
      }
    }
  });

  applyAdminSubTabVisibility();
  rebuildAdminDropdownsAndTable();

  if (!isAdmin) {
    const adminPage = document.getElementById(`page-admin`);
    if (adminPage.classList.contains(`active`)) switchTab(`home`);
    switchTab(`home`);
  } else {
    switchTab(`admin`);
  }

  document.getElementById(`headerUser`).textContent = currentUser.name;
  document.getElementById(`clockUser`).innerHTML = `👤 ${currentUser.name} <span class="badge badge-blue">${currentUser.empId}</span>`;
  [`leaveStart`,`leaveEnd`,`otDate`,`suppDate`,`modalLeaveDate`,`adjustDate`,`adminAdjustDate`].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = todayStr;
  });
  
  initGPS();
  renderAllList();
  updateNotifBadge();
  
  const agentTab = document.getElementById(`adminSubTab-agent`);
  if (agentTab) {
    if (currentUser.role === `admin2`) {
      agentTab.style.setProperty(`display`, `none`, `important`);
    } else {
      agentTab.style.setProperty(`display`, `inline-flex`, `important`);
    }
  }
  
  if (currentUser.role !== `admin`) {
    setInterval(checkApprovalUpdates, 60000);
  }
  checkConnectivity();
  setInterval(checkConnectivity, 30000);
}

// ── Login / Logout ──
async function doLogin() {
  const empId = document.getElementById(`loginId`).value.trim();
  const password = document.getElementById(`loginPw`).value;
  if (!empId || !password) {
    showLoginErr(`請輸入員工編號和密碼`);
    return;
  }
  const btn = document.getElementById(`loginBtn`);
  btn.innerHTML = `<span class="spinner"></span>驗證中…`;
  btn.disabled = true;
  document.getElementById(`loginErr`).style.display = `none`;
  try {
    const data = await callGAS({ action: `login`, empId, password });
    if (data.status === `ok`) {
      currentUser = { empId: data.empId, name: data.name, role: data.role, joinDate: data.joinDate, empType: data.empType || `專任`, defaultShift: data.defaultShift || `09:00-18:00`, quota: data.quota || null, employeeList: data.employeeList || [], isActiveProxy: data.isActiveProxy || false,  
                     email: data.email || '',
                     seniorityText: data.seniorityText || `—`,                              // 【新增】
                   specialLeaveEntitlementHours: data.specialLeaveEntitlementHours || 0   // 【新增】 
                   };
      try {
        const cachedSettled = localStorage.getItem(`tjcpm_settledAccumulated`);
        if (cachedSettled) currentUser.settledAccumulated = JSON.parse(cachedSettled);
      } catch (e) {}
      sessionStorage.setItem(`tjcpm_user`, JSON.stringify(currentUser));
      showApp();
      syncProfileAndAccumulatedLeaves().then(() => renderAllList()); 
    } else {
      showLoginErr(data.message || `帳號或密碼錯誤，請再試一次`);
    }
  } catch (e) {
    showLoginErr(`連線失敗，請確認網路後再試`);
  }
  btn.innerHTML = `登入`;
  btn.disabled = false;
}

function showLoginErr(msg) {
  const el = document.getElementById(`loginErr`);
  el.textContent = msg;
  el.style.display = `block`;
}

function doLogout() {
  if (currentUser && currentUser.empId) {
    localStorage.removeItem(`tjcpm_lastSync_${currentUser.empId}`);
  }
  sessionStorage.removeItem(`tjcpm_user`);
  localStorage.removeItem(`tjcpm_records`);
  localStorage.removeItem(`tjcpm_notif`);
  localStorage.removeItem(`tjcpm_settledAccumulated`);
  localStorage.removeItem(`tjcpm_recordsLastSyncTime`);
  records = [];
  notifications = [];
  currentUser = null;
  isOnline = true;
  isGpsLocked = false;
  
  document.querySelectorAll(`.nav-tab`).forEach(tab => {
    tab.style.setProperty(`display`, `inline-flex`, `important`);
  });
  document.querySelectorAll(`.page`).forEach(p => p.classList.remove(`active`));
  document.getElementById(`page-home`).classList.add(`active`);
  document.querySelectorAll(`.nav-tab`).forEach(t => {
    t.classList.toggle(`active`, t.dataset.tab === `home`);
  });
  document.getElementById(`notifCount`).style.display = `none`;
  document.getElementById(`loginScreen`).style.display = `flex`;
  document.getElementById(`mainApp`).style.display = `none`;
  document.getElementById(`loginId`).value = ``;
  document.getElementById(`loginPw`).value = ``;
  document.getElementById(`loginErr`).style.display = `none`;
  setTimeout(() => document.getElementById(`loginId`).focus(), 100);
}

// ── Clock ──
function updateClock() {
  const now = new Date();
  document.getElementById(`mainClock`).textContent = now.toLocaleTimeString(`zh-TW`, { hour12: false });
  document.getElementById(`mainDate`).textContent = now.toLocaleDateString(`zh-TW`, { year:`numeric`, month:`long`, day:`numeric`, weekday:`long` });
  document.getElementById(`headerClock`).textContent = now.toLocaleTimeString(`zh-TW`, { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

// ── GPS ──
function initGPS() {
  if (!navigator.geolocation) {
    setGPS(`error`,`不支援 GPS`,``);
    setGpsLocked(false);
    return;
  }
  navigator.geolocation.watchPosition(
    p => {
      gpsLat = p.coords.latitude.toFixed(5);
      gpsLng = p.coords.longitude.toFixed(5);
      setGPS(`active`, `GPS 已定位`, `${gpsLat}, ${gpsLng}`);
      setGpsLocked(true);
    },
    () => {
      setGPS(`error`, `GPS 定位失敗`, `請允許位置存取`);
      setGpsLocked(false);
    }
  );
}

function setGPS(state, text, coords) {
  document.getElementById(`gpsDot`).className = `gps-dot` + (state === `active` ? ` active` : state === `error` ? ` error` : ``);
  document.getElementById(`gpsText`).textContent = text;
  document.getElementById(`gpsCoords`).textContent = coords;
}

// ── Sync ──
async function syncToSheet(record) {
  const el = document.getElementById(`syncStatus`);
  if (el) {
    el.textContent = `☁️ 同步中…`;
    el.style.color = `var(--blue-light)`;
  }
  try {
    const cbName = `cb_` + Date.now() + `_` + Math.random().toString(36).slice(2);
    const url = GAS_URL + `?callback=` + cbName + `&data=` + encodeURIComponent(JSON.stringify(record));
    
    const response = await new Promise((resolve, reject) => {
      const script = document.createElement(`script`);
      const timer = setTimeout(() => {
        delete window[cbName];
        script.remove();
        reject(new Error('timeout'));
      }, 15000);
      
      window[cbName] = (res) => {
        clearTimeout(timer);
        delete window[cbName];
        script.remove();
        resolve(res);
      };
      
      script.onerror = () => {
        clearTimeout(timer);
        delete window[cbName];
        script.remove();
        reject(new Error('network'));
      };
      
      script.src = url;
      document.head.appendChild(script);
    });
    
    if (response && response.status === 'ok') {
      if (el) {
        el.textContent = `✅ 已同步雲端`;
        el.style.color = `var(--green-main)`;
      }
      setTimeout(() => { if (el) el.textContent = ``; }, 3000);
    } else {
      throw new Error('Sync failed');
    }
  } catch (e) {
    if (el) {
      el.textContent = `⚠️ 離線（本機已儲存）`;
      el.style.color = `var(--accent-orange)`;
    }
    setTimeout(() => { if (el) el.textContent = ``; }, 4000);
  }
}

function sendPush(title, body) {
  if (Notification && Notification.permission === `granted`) new Notification(title, { body });
}

function addNotif(type, message) {
  notifications.unshift({ id: Date.now(), type, message, time: new Date().toISOString(), read: false });
  if (notifications.length > 50) notifications = notifications.slice(0, 50);
  localStorage.setItem(`tjcpm_notif`, JSON.stringify(notifications));
  updateNotifBadge();
}

function updateNotifBadge() {
  const unread = notifications.filter(n => !n.read).length;
  let hasPending = false;
  if (currentUser && (currentUser.role === `admin` || currentUser.role === `admin1` || currentUser.role === `admin2`)) {
    hasPending = records.some(r => (r.status === `待審` || r.status === `待第二次審查`) && (r.type === `請假` || r.type === `加班` || r.type === `補打卡` || r.type === `班別調整`));
  }
  const badge = document.getElementById(`notifCount`);
  const showBadge = unread > 0 || hasPending;
  if (showBadge) {
    badge.textContent = `!`;
    badge.style.display = `flex`;
  } else {
    badge.style.display = `none`;
  }
}

// ── Poll approval status ──
async function checkApprovalUpdates() {
  try {
    const data = await callGAS({ action: `getMyStatus`, empId: currentUser.empId });
    if (data.status === `ok` && data.updates) {
      data.updates.forEach(u => {
        const existing = records.find(r => r.clientId && String(r.clientId) === String(u.clientId));
        if (existing && existing.status !== u.status) {
          existing.status = u.status;
          let msg, notifType;
          if (isFinalApproved(u.status)) {
            msg = `您的${u.type}申請（${u.date}）已 核准`;
            notifType = `approve`;
          } else if (u.status === `補件`) {
            msg = `您的${u.type}申請（${u.date}）主管要求補件，請查看意見並補齊資料後重新送出`;
            notifType = `reject`;
          } else if (u.status === `待第二次審查`) {
            msg = `您的${u.type}申請（${u.date}）已補件送出，等待主管第二次審核`;
            notifType = `approve`;
          } else {
            msg = `您的${u.type}申請（${u.date}）已 拒絕`;
            notifType = `reject`;
          }
          addNotif(notifType, msg);
          sendPush(`TJCPM 審批結果`, msg);
          saveRecords();
          renderAllList();
          updateLeaveBalanceDisplay();   // ←8/20 新增
        }
      });
    }
  } catch (e) {}
}

// ── Actions ──
function handleAction(type) {
  if (!currentUser) return;
  if (!isGpsLocked) { showToast(`⚠️ 無法取得 GPS 定位，請允許位置存取後再試`); return; }
  const now = new Date();
  const remarkEl = document.getElementById(`punchRemark`);
  const remark = remarkEl ? remarkEl.value.trim() : ``;
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, `0`);
  const day = String(now.getDate()).padStart(2, `0`);
  const dateFormatted = `${year}-${month}-${day}`;
  const hours = String(now.getHours()).padStart(2, `0`);
  const minutes = String(now.getMinutes()).padStart(2, `0`);
  const timeFormatted = `${hours}:${minutes}`;
  const record = {
    id: Date.now(), type, empId: currentUser.empId, name: currentUser.name,
    time: timeFormatted, date: dateFormatted, timestamp: now.toISOString(),
    lat: gpsLat, lng: gpsLng, remark: remark
  };
  records.unshift(record);
  saveRecords();
  renderAllList();
  if (remarkEl) remarkEl.value = ``;

  if (!isOnline) {
    let offlineQueue = JSON.parse(localStorage.getItem(`tjcpm_offline_queue`) || `[]`);
    offlineQueue.push(record);
    localStorage.setItem(`tjcpm_offline_queue`, JSON.stringify(offlineQueue));
    addNotif(`system`, `${type}離線打卡成功 ${record.time} 📍 (待同步)`);
    showToast(`✅ 離線${type}打卡成功！已加入補傳佇列`);
  } else {
    syncToSheet(record);
    addNotif(`system`, `${type}打卡成功 ${record.time} 📍`);
    showToast(type === `上班` ? `✅ 上班打卡成功` : `👋 下班打卡成功`);
  }
}

async function processOfflineQueue() {
  let offlineQueue = JSON.parse(localStorage.getItem(`tjcpm_offline_queue`) || `[]`);
  if (offlineQueue.length === 0) return;
  const remaining = [];
  const statusEl = document.getElementById(`syncStatus`);
  if (statusEl) {
    statusEl.textContent = `🔄 正在自動同步離線打卡 ${offlineQueue.length} 筆…`;
    statusEl.style.color = `var(--accent-orange)`;
  }
  for (let i = 0; i < offlineQueue.length; i++) {
    const record = offlineQueue[i];
    try {
      await fetch(GAS_URL, {
        method: `POST`,
        mode: `no-cors`,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record)
      });
      addNotif(`system`, `☁️ 離線打卡 (${record.date} ${record.time} ${record.type}) 已成功自動補傳同步！`);
    } catch (err) {
      remaining.push(record);
    }
  }
  localStorage.setItem(`tjcpm_offline_queue`, JSON.stringify(remaining));
  if (statusEl) {
    if (remaining.length === 0) {
      statusEl.textContent = `✅ 所有離線打卡已同步雲端`;
      statusEl.style.color = `var(--green-main)`;
      setTimeout(() => { statusEl.textContent = ``; }, 3000);
    } else {
      statusEl.textContent = `⚠️ 賸餘 ${remaining.length} 筆離線打卡待同步`;
      statusEl.style.color = `var(--accent-orange)`;
    }
  }
}

function hasLocalOverlap(type, startDate, endDate, subTypeFilter) {
  const activeStatuses = [`待審`, `補件`, `待第二次審查`, `同意`, `同意_補件後`];
  const newStart = startDate;
  const newEnd = endDate || startDate;
  return records.some(r => {
    if (r.type !== type) return false;
    if (activeStatuses.indexOf(r.status) === -1) return false;
    if (subTypeFilter && r.subType !== subTypeFilter) return false;
    const rowStart = r.date;
    const rowEnd = r.endDate || r.date;
    if (!rowStart) return false;
    return newStart <= rowEnd && newEnd >= rowStart;
  });
}
// 補上缺失的 calculateLeaveHoursLocal 函式
function calculateLeaveHoursLocal(record, holidayStrings = []) {
  if (!record || !record.date) return 0;
  
  // 若 record 本身已有明確的 hours 數值，直接回傳
  if (record.hours !== undefined && record.hours !== null && record.hours !== '') {
    return parseFloat(record.hours) || 0;
  }

  const startDate = safeNewDate(record.date);
  const endDate = safeNewDate(record.endDate || record.date);
  const startTime = record.startTime || '09:00';
  const endTime = record.endTime || '18:00';

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;

  let totalHours = 0;
  let cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endLimit = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  while (cur <= endLimit) {
    const dayOfWeek = cur.getDay();
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const isHoliday = holidayStrings.includes(dateStr);

    // 排除週末與國定假日
    if (!isWeekend && !isHoliday) {
      let sMin = timeToMin(startTime);
      let eMin = timeToMin(endTime);

      // 若為跨多天請假，中間全天以 09:00 - 18:00 計算
      if (cur.getTime() !== startDate.getTime()) sMin = 540; // 09:00
      if (cur.getTime() !== endLimit.getTime()) eMin = 1080;  // 18:00

      let diffMin = eMin - sMin;
      if (diffMin > 0) {
        // 扣除 12:00 ~ 13:00 午休 60 分鐘
        if (sMin <= 720 && eMin >= 780) {
          diffMin -= 60;
        }
        totalHours += Math.max(0, diffMin / 60);
      }
    }
    cur.setDate(cur.getDate() + 1);
  }

  return totalHours;
}
async function submitLeave() {
  if (window.submitLeaveInFlight) return;
  window.submitLeaveInFlight = true;
  setTimeout(() => { window.submitLeaveInFlight = false; }, 3000);

  const leaveStartVal = document.getElementById(`leaveStart`).value;
  const leaveEndVal = document.getElementById(`leaveEnd`).value || leaveStartVal;
  if (hasLocalOverlap(`請假`, leaveStartVal, leaveEndVal)) {
    showToast(`⚠️ 這段期間已經有一筆待審或已核准的請假申請，請勿重複申請`);
    window.submitLeaveInFlight = false;
    return;
  }
  const subType = document.getElementById(`leaveType`).value;
  if (subType === `補休`) {
    const startTime = document.getElementById(`leaveStartTime`).value || `09:00`;
    const endTime = document.getElementById(`leaveEndTime`).value || `18:00`;
    const requestHours = calculateLeaveHoursLocal(
      { date: leaveStartVal, endDate: leaveEndVal, startTime, endTime, empId: currentUser.empId },
      currentUser?.holidayStrings || []
    );
    const compensationBalance = calculateCompensationBalance(leaveStartVal);
    if (requestHours > compensationBalance) {
      showToast(`⚠️ 補休餘額不足！申請時數：${requestHours}h，餘額：${compensationBalance}h`);
      window.submitLeaveInFlight = false;
      return;
    }
  } else if (subType === `特休`) {
    const startTime = document.getElementById(`leaveStartTime`).value || `09:00`;
    const endTime = document.getElementById(`leaveEndTime`).value || `18:00`;
    const requestHours = calculateLeaveHoursLocal(
      { date: leaveStartVal, endDate: leaveEndVal, startTime, endTime, empId: currentUser.empId },
      currentUser?.holidayStrings || []
    );
    const annualBalance = currentUser?.quota?.specialLeaveRemainingHours || 0;
    
    if (requestHours > annualBalance) {
      showToast(`⚠️ 特休餘額不足！申請時數：${requestHours}h，餘額：${annualBalance}h`);
      window.submitLeaveInFlight = false;
      return;
    }
  }
  
  const id = Date.now();
  const clientId = pendingClientId || String(id);
  pendingClientId = null;
  const filesToUpload = pendingProofFiles.slice();
  clearProofFileSelection(`leave`);
  
  const record = {
    id, clientId: clientId, type: `請假`, subType: document.getElementById(`leaveType`).value,
    empId: currentUser.empId, name: currentUser.name,
    date: document.getElementById(`leaveStart`).value, startTime: document.getElementById(`leaveStartTime`).value,
    endDate: document.getElementById(`leaveEnd`).value, endTime: document.getElementById(`leaveEndTime`).value,
    reason: document.getElementById(`leaveReason`).value, status: `待審`, timestamp: new Date().toISOString()
  };
  records.unshift(record);
  saveRecords();
  renderAllList();

  if (filesToUpload.length > 0) {
    showToast(`📤 證明文件上傳中…`);
    await uploadProofFiles(clientId, filesToUpload);
  }

  await syncToSheet(record);
  addNotif(`pending`, `請假申請已送出（${record.subType} ${record.date}），等待主管審核`);
  showToast(`📝 請假申請已送出`);
  updateLeaveBalanceDisplay();   // 8/20 ← 新增
  window.submitLeaveInFlight = false;
}

function calculateCompensationBalance(refDateStr) {
  const baseBalance = currentUser?.quota?.compLeaveRemainingHours || 0;
  const activeStatuses = [`待審`, `補件`, `待第二次審查`, `同意`, `同意_補件後`];

  const refDate = refDateStr ? safeNewDate(refDateStr) : new Date();
  const y = refDate.getFullYear();
  const m = refDate.getMonth();

  const approvedOTsThisMonth = records.filter(r => {
    if (r.empId !== currentUser.empId) return false;
    if (r.type !== `加班` || !isFinalApproved(r.status)) return false;
    const d = safeNewDate(r.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });

  let totalOTHours = 0;
  approvedOTsThisMonth.forEach(r => {
    const startMin = timeToMin(r.startTime || `09:00`);
    const endMin = timeToMin(r.endTime || `18:00`);
    let diffMin = endMin - startMin;
    if (diffMin > 0) {
      if (startMin <= 720 && endMin >= 780) diffMin -= 60;
      totalOTHours += diffMin / 60;
    }
  });

  const usedCompThisMonth = records.filter(r => {
    if (r.empId !== currentUser.empId) return false;
    if (r.type !== `請假` || r.subType !== `補休`) return false;
    if (activeStatuses.indexOf(r.status) === -1) return false;
    const d = safeNewDate(r.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });

  let totalUsedHours = 0;
  usedCompThisMonth.forEach(r => {
    const startMin = timeToMin(r.startTime || `09:00`);
    const endMin = timeToMin(r.endTime || `18:00`);
    let diffMin = endMin - startMin;
    if (diffMin > 0) {
      if (startMin <= 720 && endMin >= 780) diffMin -= 60;
      totalUsedHours += diffMin / 60;
    }
  });

  return baseBalance + totalOTHours - totalUsedHours;
}
  
async function submitOvertime() {
  if (window.submitOvertimeInFlight) return;
  window.submitOvertimeInFlight = true;
  setTimeout(() => { window.submitOvertimeInFlight = false; }, 3000);

  const otDateVal = document.getElementById(`otDate`).value;
  if (hasLocalOverlap(`加班`, otDateVal, otDateVal)) {
    showToast(`⚠️ 這一天已經有一筆待審或已核准的加班申請，請勿重複申請`);
    window.submitOvertimeInFlight = false;
    return;
  }
  const id = Date.now();
  const clientId = String(id); 
  const filesToUpload = pendingProofFiles.slice();
  clearProofFileSelection(`overtime`);

  const record = {
    id, clientId: clientId, type: `加班`, empId: currentUser.empId, name: currentUser.name,
    date: document.getElementById(`otDate`).value, startTime: document.getElementById(`otStart`).value,
    endTime: document.getElementById(`otEnd`).value, reason: document.getElementById(`otReason`).value,
    status: `待審`, timestamp: new Date().toISOString()
  };
  records.unshift(record);
  saveRecords();
  renderAllList();

  if (filesToUpload.length > 0) {
    showToast(`📤 證明文件上傳中…`);
    await uploadProofFiles(clientId, filesToUpload, `加班`);
  }
    
  await syncToSheet(record);
  addNotif(`pending`, `加班申請已送出（${record.date}），等待主管審核`);
  showToast(`🌙 加班申請已送出`);
}

async function submitSupp() {
  if (window.submitSuppInFlight) return;
  window.submitSuppInFlight = true;
  setTimeout(() => { window.submitSuppInFlight = false; }, 3000);

  const suppDateVal = document.getElementById(`suppDate`).value;
  const suppTypeVal = document.getElementById(`suppType`).value;
  if (hasLocalOverlap(`補打卡`, suppDateVal, suppDateVal, suppTypeVal)) {
    showToast(`⚠️ 這天的「${suppTypeVal}」補打卡已經申請過了，請勿重複申請`);
    window.submitSuppInFlight = false;
    return;
  }

  const id = Date.now();
  const clientId = String(id); 
  const filesToUpload = pendingProofFiles.slice();
  clearProofFileSelection(`punchfix`);

  const record = {
    id, clientId: clientId, type: `補打卡`, subType: document.getElementById(`suppType`).value,
    empId: currentUser.empId, name: currentUser.name,
    date: document.getElementById(`suppDate`).value, time: document.getElementById(`suppTime`).value,
    reason: document.getElementById(`suppReason`).value, status: `待審`, timestamp: new Date().toISOString()
  };
  records.unshift(record);
  saveRecords();
  renderAllList();

  if (filesToUpload.length > 0) {
    showToast(`📤 證明文件上傳中…`);
    await uploadProofFiles(clientId, filesToUpload, `補打卡`);
  }
    
  await syncToSheet(record);
  addNotif(`pending`, `補打卡申請已送出（${record.subType} ${record.date} ${record.time}），等待主管審核`);
  showToast(`🔄 補打卡申請已送出`);
}

async function submitAdjust() {
  if (window.submitAdjustInFlight) return;
  window.submitAdjustInFlight = true;
  setTimeout(() => { window.submitAdjustInFlight = false; }, 3000);
  
  const adjustDateVal = document.getElementById(`adjustDate`).value;
  const adjustShiftVal = document.getElementById(`adjustShiftType`).value;
  if (!adjustDateVal) {
    showToast(`⚠️ 請選擇調整日期`);
    window.submitAdjustInFlight = false;
    return;
  }
  if (!adjustShiftVal) {
    showToast(`⚠️ 請選擇調整班別`);
    window.submitAdjustInFlight = false;
    return;
  }
  if (hasLocalOverlap(`班別調整`, adjustDateVal, adjustDateVal)) {
    showToast(`⚠️ 這一天已經有一筆待審或已核准的班別調整申請，請勿重複申請`);
    window.submitAdjustInFlight = false;
    return;
  }
  
  const id = Date.now();
  const clientId = String(id);
  const filesToUpload = pendingProofFiles.slice();
  clearProofFileSelection(`schedule`);

  const record = {
    id, clientId: clientId, type: `班別調整`, subType: adjustShiftVal,
    empId: currentUser.empId, name: currentUser.name,
    date: adjustDateVal,
    reason: document.getElementById(`adjustReason`).value, status: `待審`, timestamp: new Date().toISOString()
  };
  records.unshift(record);
  saveRecords();
  renderAllList();

  if (filesToUpload.length > 0) {
    showToast(`📤 證明文件上傳中…`);
    await uploadProofFiles(clientId, filesToUpload, `班別調整`);
  }
    
  await syncToSheet(record);
  addNotif(`pending`, `班別調整申請已送出（${record.date} ${record.subType}），等待主管審核`);
  showToast(`⚙️ 班別調整申請已送出`);
}

function submitAdminAgent() {
  if (window.submitAdminAgentInFlight) return;
  window.submitAdminAgentInFlight = true;
  setTimeout(() => { window.submitAdminAgentInFlight = false; }, 3000);
  const empSelect = document.getElementById(`adminAgentEmpId`);
  const agentId = empSelect.value;
  if (!agentId) {
    showToast(`⚠️ 請選擇要指定的代理人`);
    return;
  }
  const agentName = empSelect.options[empSelect.selectedIndex].textContent.split(` - `)[1] || ``;
  const startDate = document.getElementById(`adminAgentStartDate`).value;
  const endDate = document.getElementById(`adminAgentEndDate`).value;
  if (!startDate || !endDate) {
    showToast(`⚠️ 請選擇完整的代理起迄日期`);
    return;
  }
  const status = document.getElementById(`adminAgentStatus`).value;
  
  showLoading();
  callGAS({
    action: `setAgent`,
    managerId: currentUser.empId,
    agentId: agentId,
    agentName: agentName,
    startDate: startDate,
    endDate: endDate,
    status: status
  }).then(res => {
    hideLoading();
    if (res.status === `ok`) {
      showToast(`👥 主管代理人設定儲存成功！`);
      document.getElementById(`adminAgentStartDate`).value = ``;
      document.getElementById(`adminAgentEndDate`).value = ``;
    } else {
      showToast(`⚠️ 儲存失敗：` + (res.message || `未知錯誤`));
    }
  }).catch(e => {
    hideLoading();
    showToast(`⚠️ 連線失敗，請檢查網路`);
  });
}

function toggleResubmitBox(id) {
  const box = document.getElementById(`resubmitBox-${id}`);
  if (box) box.style.display = box.style.display === `none` ? `block` : `none`;
}

async function confirmResubmit(id, clientId, type) {
  const textEl = document.getElementById(`resubmitText-${id}`);
  const text = textEl ? textEl.value.trim() : ``;
  if (!text) {
    showToast(`⚠️ 請填寫補充說明或證明文件連結`);
    return;
  }
  try {
    const res = await callGAS({
      action: `resubmit`,
      type: type,
      clientId: clientId,
      empId: currentUser.empId,
      name: currentUser.name,
      suppMark: text
    });
    if (res.status === `ok`) {
      showToast(`✅ 補件已送出，等待主管第二次審核`);
      const rec = records.find(r => r.id === id);
      if (rec) rec.status = `待第二次審查`;
      saveRecords();
      renderAllList();
      updateLeaveBalanceDisplay();   // ← 8/20新增
    } else {
      showToast(`⚠️ 補件送出失敗：` + (res.message || `請稍後再試`));
    }
  } catch (e) {
    showToast(`🛑 補件送出失敗，請確認網路連線`);
  }
}

async function retractRecord(recordId, type, clientId) {
  if (!confirm(`確認要撤回這筆 ${type} 記錄嗎？`)) return;
  try {
    const res = await callGAS({
      action: `cancel`,
      recordId: recordId,
      type: type,
      clientId: clientId
    });
    
    if (res.status === `ok`) {
      showToast(`✅ 已撤回`);
      const data = await callGAS({ action: `getMyStatus`, empId: currentUser.empId });
      if (data.status === `ok` && data.updates) {
        data.updates.forEach(u => {
          const existing = records.find(r => r.clientId && String(r.clientId) === String(u.clientId));
          if (existing) {
            Object.assign(existing, u);
          } else {
            records.push(u);
          }
        });
        saveRecords();
        renderAllList();
      }
    } else {
      showToast(`⚠️ ` + (res.message || `撤回失敗`));
    }
  } catch (e) {
    showToast(`⚠️ 連線失敗`);
  }
}

function submitAdminAdjust() {
  if (window.submitAdminAdjustInFlight) return;
  window.submitAdminAdjustInFlight = true;
  setTimeout(() => { window.submitAdminAdjustInFlight = false; }, 3000);
  const empSelect = document.getElementById(`adminAdjustEmpId`);
  const empId = empSelect.value;
  if (!empId) {
    showToast(`⚠️ 請選擇要調整班別的同仁`);
    return;
  }
  const empName = empSelect.options[empSelect.selectedIndex].textContent.split(` - `)[1] || ``;
  const dateVal = document.getElementById(`adminAdjustDate`).value;
  if (!dateVal) {
    showToast(`⚠️ 請選擇調整日期`);
    return;
  }
  const shiftType = document.getElementById(`adminAdjustShiftType`).value;
  const reason = document.getElementById(`adminAdjustReason`).value.trim();
  
  const id = Date.now();
  const record = {
    id: id,
    clientId: String(id),
    type: `班別調整`,
    subType: shiftType,
    empId: empId,
    name: empName,
    date: dateVal,
    reason: reason || `主管直接指派`,
    status: `同意`,
    approverName: currentUser.name,
    approverId: currentUser.empId,
    timestamp: new Date().toISOString()
  };
  
  records.unshift(record);
  saveRecords();
  renderAllList();
  syncToSheet(record);
  
  showToast(`✓ 班別異動指派成功並已直接生效！`);
  document.getElementById(`adminAdjustReason`).value = ``;
}

function quickLeave() {
  const id = Date.now();
  const clientId = pendingClientId || String(id);
  const record = {
    id, clientId: clientId, type: `請假`, subType: document.getElementById(`modalLeaveType`).value,
    empId: currentUser.empId, name: currentUser.name, 
    date: document.getElementById(`modalLeaveDate`).value,
    endDate: document.getElementById(`modalLeaveDate`).value,           // ← 補上，跟 date 一樣（單日請假）
    startTime: `09:00`,         // ← 補上預設開始時間
    endTime: `18:00`,           // ← 補上預設結束時間
    status: `待審`, timestamp: new Date().toISOString()
  };
  records.unshift(record);
  saveRecords();
  renderAllList();
  syncToSheet(record);
  addNotif(`pending`, `請假申請已送出（${record.subType} ${record.date}），等待主管審核`);
  closeModal(`leave`);
  showToast(`📝 請假申請已送出`);
}

function quickOvertime() {
  const id = Date.now();
  const clientId = pendingClientId || String(id);
  const record = {
    id, clientId: clientId, type: `加班`, empId: currentUser.empId, name: currentUser.name,
    hours: document.getElementById(`modalOTHours`).value, reason: document.getElementById(`modalOTReason`).value,
    date: todayStr, status: `待審`, timestamp: new Date().toISOString()
  };
  records.unshift(record);
  saveRecords();
  renderAllList();
  syncToSheet(record);
  addNotif(`pending`, `加班申請已送出（${record.date} ${record.hours}），等待主管審核`);
  closeModal(`overtime`);
  showToast(`🌙 加班申請已送出`);
}

// ── Render / Filtering ──
function switchRecordSubTab(sub) {
  currentRecordSubTab = sub;
  [`month`, `year`, `detail`, `apply`].forEach(s => {
    const elTab = document.getElementById(`subtab-` + s);
    const elCont = document.getElementById(`record-` + s + `-content`);
    if (elTab) elTab.classList.toggle(`active`, s === sub);
    if (elCont) elCont.style.display = s === sub ? `block` : `none`;
  });

  if (sub === `year`) {
    renderEmploymentYearSummary();
    initYearMonthQuerySelectors();
    const resultArea = document.getElementById(`queryResultArea`);
    if (resultArea) resultArea.style.display = `none`;
    const monthSel = document.getElementById(`queryMonthSelect`);
    if (monthSel) monthSel.value = ``;
  }

  renderAllList();
}

function filterApplyRecords(type, chip) {
  currentApplyFilter = type;
  document.querySelectorAll(`#record-apply-content .filter-chip`).forEach(c => c.classList.remove(`active`));
  if (chip) chip.classList.add(`active`);
  renderAllList();
}

function getEarliestCheckDate(userObj) {
  const user = userObj || currentUser;
  if (!user) return null;
  let earliest = null;
  if (user.joinDate) {
    const jD = safeNewDate(user.joinDate);
    if (!isNaN(jD.getTime())) earliest = jD;
  }
  const correction = user.quota && user.quota.correction;
  if (correction && correction.startDate) {
    const corrD = parseLocalDate(correction.startDate);
    if (corrD && !isNaN(corrD.getTime())) {
      if (!earliest || corrD > earliest) earliest = corrD;
    }
  }
  if (earliest) earliest.setHours(0,0,0,0);
  return earliest;
}

function getCurrentEmploymentYearRange() {
  if (!currentUser || !currentUser.joinDate) {
    return { start: new Date(2000, 0, 1), end: new Date(2099, 11, 31) };
  }
  const joinParts = currentUser.joinDate.split(/[-/]/);
  const jYear = parseInt(joinParts[0], 10);
  const jMonth = parseInt(joinParts[1], 10) - 1;
  const jDay = parseInt(joinParts[2], 10);
  const now = new Date();
  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let y = jYear;
  while (true) {
    const start = new Date(y, jMonth, jDay);
    const end = new Date(y + 1, jMonth, jDay - 1, 23, 59, 59, 999);
    if (todayZero >= start && todayZero <= end) return { start, end };
    if (todayZero < start) return { start: new Date(jYear, jMonth, jDay), end: new Date(jYear + 1, jMonth, jDay - 1, 23, 59, 59, 999) };
    y++;
    if (y > jYear + 100) break;
  }
  return { start: new Date(2000, 0, 1), end: new Date(2099, 11, 31) };
}

function renderAllList() {
  if (!currentUser) return;
  calcAttendance();
  updateAllYearRanges();
  
  if (currentRecordSubTab === 'detail') {
    renderCalendarTable();
  } else if (currentRecordSubTab === 'apply') {
    const el = document.getElementById('applyRecordsList');
    if (!el) return;
    
    // 1. 取得登入者的全量紀錄
    let mine = records.filter(r => matchEmpId(r.empId, currentUser?.empId));
    
    // 2. 過濾主要類型 (請假 / 加班 / 補打卡 / 班別調整)
    mine = mine.filter(r => r.type === currentApplyFilter);
    
    // 3. 限制在目前到職年度區間內
    const range = getCurrentEmploymentYearRange();
    mine = mine.filter(r => {
      const dStr = r.date || r.timestamp;
      if (!dStr) return false;
      const d = safeNewDate(dStr);
      return d >= range.start && d <= range.end;
    });

    // 4. 💡 關鍵修正：將過濾後的資料送入渲染函式，讓假別卡片完整產生！
    renderLeaveRecords(mine);
  }
}

function getGpsDistanceMeters(l1, n1, l2, n2) {
  const R = 6371e3;
  const phi1 = l1 * Math.PI / 180;
  const phi2 = l2 * Math.PI / 180;
  const deltaPhi = (l2 - l1) * Math.PI / 180;
  const deltaLambda = (n2 - n1) * Math.PI / 180;
  const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function buildPunchRemarkParts(dayPunches) {
  return dayPunches
    .map(p => {
      const badge = p.type === `上班` ? `<span class="badge badge-green">上班</span>` : `<span class="badge badge-red">下班</span>`;
      const hasRemark = p.remark && String(p.remark).trim() !== ``;
      if (hasRemark) return `${badge} 💬 ${String(p.remark).trim()}`;

      const latVal = parseFloat(p.lat), lngVal = parseFloat(p.lng);
      if (!isNaN(latVal) && !isNaN(lngVal)) {
        const distShuangho = getGpsDistanceMeters(latVal, lngVal, 24.99230, 121.49410);
        if (distShuangho > 150) {
          return `${badge} <span style="color:var(--accent-purple);font-weight:bold;">📍 異地打卡</span>`;
        }
      }
      return null;
    })
    .filter(x => x !== null);
}

function buildOutOfOfficeParts(dayPunches) {
  const out = [];
  dayPunches.forEach(p => {
    const hasRemark = p.remark && String(p.remark).trim() !== ``;
    let isOutsideShuangho = false, distShuangho = 0, distChongqing = 0;
    const latVal = parseFloat(p.lat), lngVal = parseFloat(p.lng);
    if (!isNaN(latVal) && !isNaN(lngVal)) {
      distShuangho = getGpsDistanceMeters(latVal, lngVal, 24.99230, 121.49410);
      distChongqing = getGpsDistanceMeters(latVal, lngVal, 25.04459, 121.51373);
      if (distShuangho > 150) isOutsideShuangho = true;
    }
    if (hasRemark || isOutsideShuangho) {
      const typeBadge = p.type === `上班` ? `<span class="badge badge-green">上班</span>` : `<span class="badge badge-red">下班</span>`;
      let locationText;
      if (!isNaN(latVal) && !isNaN(lngVal)) {
        if (isOutsideShuangho) {
          const chongqingLabel = distChongqing <= 300 ? `重慶南路` : `異地`;
          locationText = `距雙和 ${distShuangho.toFixed(0)}米 (${chongqingLabel})`;
        } else {
          locationText = `距雙和 ${distShuangho.toFixed(0)}米 (院內)`;
        }
      } else {
        locationText = `無GPS定位`;
      }
      const remarkText = p.remark ? ` · 💬 備註: ${p.remark}` : ``;
      out.push(`<div style="margin-top:2px;">${typeBadge} 異地: ${locationText}${remarkText}</div>`);
    }
  });
  return out;
}

function renderAdminQueryCalendarTable(empId, empRecords, res, empInfo) {
  const container = document.getElementById(`aq-calendar-container`);
  if (!container) return;
  const empType = empInfo ? (empInfo.empType || `專任`) : `專任`;
  const holidayStrings = res.holidayStrings || [];
  const specialShifts = res.specialShifts || [];

  if (empType === `兼任`) {
    const currentYear = new Date().getFullYear();
    const minePunch = empRecords.filter(r => {
      if (r.type !== `上班` && r.type !== `下班`) return false;
      const d = safeNewDate(r.date || r.timestamp);
      return d.getFullYear() === currentYear;
    });

    const mineSupp = empRecords.filter(r => {
      if (r.type !== `補打卡` || !isFinalApproved(r.status)) return false;
      const d = safeNewDate(r.date || r.timestamp);
      return d.getFullYear() === currentYear;
    });

    const mineLeave = empRecords.filter(r => {
      if (r.type !== `請假` || !isFinalApproved(r.status)) return false;
      const d = safeNewDate(r.date || r.timestamp);
      return d.getFullYear() === currentYear;
    });

    const dailyMap = {};
    minePunch.forEach(r => {
      const d = safeNewDate(r.date || r.timestamp);
      const key = formatLocalDateStr(d);
      if (!dailyMap[key]) dailyMap[key] = { in: null, out: null, dateObj: d };
      if (r.type === `上班`) { if (!dailyMap[key].in || r.time < dailyMap[key].in) dailyMap[key].in = r.time; }
      else if (r.type === `下班`) { if (!dailyMap[key].out || r.time > dailyMap[key].out) dailyMap[key].out = r.time; }
    });

    mineSupp.forEach(r => {
      const d = safeNewDate(r.date || r.timestamp);
      const key = formatLocalDateStr(d);
      if (!dailyMap[key]) dailyMap[key] = { in: null, out: null, dateObj: d };
      if (r.subType === `上班`) dailyMap[key].in = r.time;
      if (r.subType === `下班`) dailyMap[key].out = r.time;
    });

    const sortedKeys = Object.keys(dailyMap).sort((a, b) => b.localeCompare(a));
    let html = `<div class="calendar-table-container"><table class="calendar-table"><thead><tr><th>📅 出勤日期</th><th>🟢 上班簽到</th><th>🏁 下班簽退</th><th>💬 備註</th></tr></thead><tbody>`;

    if (sortedKeys.length === 0) {
      html += `<tr><td colspan="4" style="text-align:center; color:var(--text-secondary); padding:20px;">尚無年度打卡紀錄</td></tr>`;
    } else {
      sortedKeys.forEach(key => {
        const item = dailyMap[key];
        const dateObj = item.dateObj;
        const weekdayStr = [`日`, `一`, `二`, `三`, `四`, `五`, `六`][dateObj.getDay()];
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        const formattedDate = `${key.slice(5)} (${weekdayStr})`;
        
        const dayLeavesForDay = mineLeave.filter(r => {
          const startD = safeNewDate(r.date);
          const endD = safeNewDate(r.endDate || r.date);
          return dateObj >= startD && dateObj <= endD;
        });

        const leaveStrings = dayLeavesForDay.map(r => {
          const hoursLabel = r.hours ? `${r.hours}h` : ``;
          return `<span style="color:var(--accent-orange);font-weight:bold;">🌴 ${r.subType || `請假`}${hoursLabel ? ` (`+hoursLabel+`)` : ``}</span>`;
        });

        const dayPunches = empRecords.filter(r => {
          if (r.type !== `上班` && r.type !== `下班`) return false;
          const d = safeNewDate(r.date || r.timestamp);
          return formatLocalDateStr(d) === key;
        });

        const outOfOfficeStrings = buildOutOfOfficeParts(dayPunches);
        const col4Items = [];
        if (leaveStrings.length > 0) col4Items.push(leaveStrings.join(`<br>`));
        if (outOfOfficeStrings.length > 0) col4Items.push(outOfOfficeStrings.join(``));
        
        html += `<tr><td style="color:${isWeekend?`var(--accent-orange)`:`var(--text-primary)`}">${formattedDate}</td><td>${item.in || `—`}</td><td>${item.out || `—`}</td><style="font-size:12px; line-height:1.5;">${col4Items.length > 0 ? col4Items.join(`<br>`) : `—`}</td></tr>`;
      });
    }
    html += `</tbody></table></div>`;
    container.innerHTML = html;
    return;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  
  const minePunch = empRecords.filter(r => {
    if (r.type !== `上班` && r.type !== `下班`) return false;
    const d = safeNewDate(r.date || r.timestamp);
    return d.getFullYear() === year && (d.getMonth() + 1) === month;
  });

  const mineLeave = empRecords.filter(r => {
    if (r.type !== `請假` || !isFinalApproved(r.status)) return false;
    const d = safeNewDate(r.date || r.timestamp);
    return d.getFullYear() === year && (d.getMonth() + 1) === month;
  });

  const punchMap = {};
  minePunch.forEach(r => {
    const d = safeNewDate(r.date || r.timestamp);
    const dayKey = d.getDate();
    if (!punchMap[dayKey]) punchMap[dayKey] = { 上班: `—`, 下班: `—` };
    if (r.type === `上班`) punchMap[dayKey].上班 = r.time || `—`;
    if (r.type === `下班`) punchMap[dayKey].下班 = r.time || `—`;
  });

  const leaveMap = {};
  mineLeave.forEach(r => {
    const dStart = safeNewDate(r.date);
    const dEnd = safeNewDate(r.endDate || r.date);
    for (let day = dStart.getDate(); day <= dEnd.getDate(); day++) {
      leaveMap[day] = `🌴 已${r.subType === `加班補休` ? `補休` : (r.subType || `請假`)}`;
    }
  });

  let html = `<div class="calendar-table-container"><table class="calendar-table"><thead><tr><th>📅 日期</th><th>🟢 上班簽到</th><th>🏁 下班簽退</th><th>💬 備註</th></tr></thead><tbody>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month - 1, day);
    let isBeforeJoin = false;
    const earliestD = getEarliestCheckDate();
    if (earliestD) {
      const curD = new Date(year, month - 1, day);
      curD.setHours(0,0,0,0);
      if (curD < earliestD) isBeforeJoin = true;
    }
    const weekdayStr = [`日`, `一`, `二`, `三`, `四`, `五`, `六`][dateObj.getDay()];
    const dateStr = `${year}/${String(month).padStart(2,`0`)}/${String(day).padStart(2,`0`)}`;
    const dateStrHyphen = `${year}-${String(month).padStart(2,`0`)}-${String(day).padStart(2,`0`)}`;
    const formattedDate = `${String(month).padStart(2,`0`)}-${String(day).padStart(2,`0`)} (${weekdayStr})`;
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
    const isHoliday = holidayStrings.includes(dateStrHyphen) && !isWeekend;

    let punch = punchMap[day] || { 上班: `—`, 下班: `—` };
    let leaveLabel = leaveMap[day];

    let checkinHTML = punch.上班;
    let checkoutHTML = punch.下班;

    if (isBeforeJoin) {
      checkinHTML = checkoutHTML = `<span style="color:var(--text-muted);font-size:14px;">—</span>`;
    } else if (day > now.getDate()) {
      if (punch.上班 === `—`) checkinHTML = `<span style="color:var(--text-muted);font-size:14px;">-</span>`;
      if (punch.下班 === `—`) checkoutHTML = `<span style="color:var(--text-muted);font-size:14px;">-</span>`;
    } else if (isWeekend || isHoliday) {
      if (punch.上班 === `—`) checkinHTML = `<span style="color:var(--text-muted);font-size:13px;">${isHoliday ? `國定假日` : `休假日`}</span>`;
      if (punch.下班 === `—`) checkoutHTML = `<span style="color:var(--text-muted);font-size:13px;">${isHoliday ? `國定假日` : `休假日`}</span>`;
    } else {
      const dayLeaves = mineLeave.filter(r => {
        const startD = safeNewDate(r.date);
        const endD = safeNewDate(r.endDate || r.date);
        return dateObj >= startD && dateObj <= endD;
      }).map(r => ({ start: 540, end: 1080 }));

      const shift = getShiftMinutesForDate(dateStr, empId, specialShifts);
      const isMorningExempted = isRangeExempted(shift.start, 720, dayLeaves);
      const isAfternoonExempted = isRangeExempted(780, shift.end, dayLeaves);

      if (punch.上班 === `—`) {
        checkinHTML = isMorningExempted ? `<span style="color:var(--text-muted);font-size:13px;">${leaveLabel || "🌴 已請假"}</span>` : (day !== now.getDate() ? `<span style="color:#ef4444;font-weight:bold;font-size:13px;">⚠️ 漏打卡</span>` : `<span style="color:var(--text-muted);font-size:14px;">—</span>`);
      } else {
        const punchInMin = timeToMin(punch.上班);
        if (punchInMin > shift.start && !isRangeExempted(shift.start, punchInMin, dayLeaves)) {
          checkinHTML = `<span style="color:var(--accent-orange);font-weight:bold;">${punch.上班} ⚠️遲到</span>`;
        }
      }
      
      if (punch.下班 === `—`) {
        checkoutHTML = isAfternoonExempted ? `<span style="color:var(--text-muted);font-size:13px;">${leaveLabel || "🌴 已請假"}</span>` : (day !== now.getDate() ? `<span style="color:#ef4444;font-weight:bold;font-size:13px;">⚠️ 漏打卡</span>` : `<span style="color:var(--text-muted);font-size:14px;">—</span>`);
      } else {
        const punchOutMin = timeToMin(punch.下班);
        if (punchOutMin < shift.end && !isRangeExempted(punchOutMin, shift.end, dayLeaves)) {
          checkoutHTML = `<span style="color:var(--accent-orange);font-weight:bold;">${punch.下班} ⚠️早退</span>`;
        }
      }
    }

    const dayPunches = empRecords.filter(r => {
      if (r.type !== `上班` && r.type !== `下班`) return false;
      const d = safeNewDate(r.date || r.timestamp);
      return d.getDate() === day && (d.getMonth() + 1) === month && d.getFullYear() === year;
    });

    const outOfOfficeStrings = buildOutOfOfficeParts(dayPunches);
    const col4HTML = outOfOfficeStrings.length > 0 ? outOfOfficeStrings.join(``) : `—`;

    html += `<tr ${day === now.getDate() ? `style="background:var(--card-bg-soft);font-weight:bold;"` : ``}>
      <td style="color:${isWeekend?`var(--accent-orange)`:`var(--text-primary)`}">${formattedDate}</td>
      <td>${checkinHTML}</td><td>${checkoutHTML}</td>
      <td style="font-size:12px; line-height:1.5;">${col4HTML}</td></tr>`;
  }

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function renderCalendarTable() {
  const el = document.getElementById(`allRecordsList`);
  if (!el) return;

  if (currentUser && currentUser.empType === `兼任`) {
    const currentYear = new Date().getFullYear();
    const minePunch = records.filter(r => matchEmpId(r.empId, currentUser?.empId) && (r.type === `上班` || r.type === `下班`) && safeNewDate(r.date || r.timestamp).getFullYear() === currentYear);
    const mineSupp = records.filter(r => matchEmpId(r.empId, currentUser?.empId) && r.type === `補打卡` && isFinalApproved(r.status) && safeNewDate(r.date || r.timestamp).getFullYear() === currentYear);

    const dailyMap = {};
    minePunch.forEach(r => {
      const d = safeNewDate(r.date || r.timestamp);
      const key = formatLocalDateStr(d);
      if (!dailyMap[key]) dailyMap[key] = { in: null, out: null, dateObj: d };
      if (r.type === `上班`) { if (!dailyMap[key].in || r.time < dailyMap[key].in) dailyMap[key].in = r.time; }
      else if (r.type === `下班`) { if (!dailyMap[key].out || r.time > dailyMap[key].out) dailyMap[key].out = r.time; }
    });

    mineSupp.forEach(r => {
      const d = safeNewDate(r.date || r.timestamp);
      const key = formatLocalDateStr(d);
      if (!dailyMap[key]) dailyMap[key] = { in: null, out: null, dateObj: d };
      if (r.subType === `上班`) dailyMap[key].in = r.time;
      if (r.subType === `下班`) dailyMap[key].out = r.time;
    });

    const sortedKeys = Object.keys(dailyMap).sort((a, b) => b.localeCompare(a));
    let html = `<div class="calendar-table-container"><table class="calendar-table"><thead><tr><th>📅 出勤日期</th><th>🟢 上班簽到</th><th>🏁 下班簽退</th><th>📝 備註</th></tr></thead><tbody>`;

    if (sortedKeys.length === 0) {
      html += `<tr><td colspan="4" style="text-align:center; color:var(--text-secondary); padding:20px;">尚無年度打卡紀錄</td></tr>`;
    } else {
      sortedKeys.forEach(key => {
        const item = dailyMap[key];
        const dateObj = item.dateObj;
        const weekdayStr = [`日`, `一`, `二`, `三`, `四`, `五`, `六`][dateObj.getDay()];
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        const formattedDate = `${key.slice(5)} (${weekdayStr})`;
        
        const dayPunches = minePunch.filter(r => formatLocalDateStr(safeNewDate(r.date || r.timestamp)) === key);
        const remarkParts = buildPunchRemarkParts(dayPunches);
        const remarksHTML = remarkParts.length > 0 ? `<span style="color:var(--green-main);font-size:12px;font-weight:600;line-height:1.6;">${remarkParts.join(`<br>`)}</span>` : `—`;

        html += `<tr><td style="color:${isWeekend?`var(--accent-orange)`:`var(--text-primary)`}">${formattedDate}</td><td>${item.in || `—`}</td><td>${item.out || `—`}</td><td style="font-size:12px; line-height:1.5;">${remarksHTML}</td></tr>`;
      });
    }

    html += `</tbody></table></div>`;
    el.innerHTML = html;
    return;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  
  const minePunch = records.filter(r => matchEmpId(r.empId, currentUser?.empId) && (r.type === `上班` || r.type === `下班`) && safeNewDate(r.date || r.timestamp).getFullYear() === year && (safeNewDate(r.date || r.timestamp).getMonth() + 1) === month);
  const mineLeave = records.filter(r => matchEmpId(r.empId, currentUser?.empId) && r.type === `請假` && isFinalApproved(r.status) && safeNewDate(r.date || r.timestamp).getFullYear() === year && (safeNewDate(r.date || r.timestamp).getMonth() + 1) === month);
  const mineSupp = records.filter(r => matchEmpId(r.empId, currentUser?.empId) && r.type === `補打卡` && isFinalApproved(r.status) && safeNewDate(r.date || r.timestamp).getFullYear() === year && (safeNewDate(r.date || r.timestamp).getMonth() + 1) === month);

  const punchMap = {};
  minePunch.forEach(r => {
    const dayKey = safeNewDate(r.date || r.timestamp).getDate();
    if (!punchMap[dayKey]) punchMap[dayKey] = { 上班: `—`, 下班: `—` };
    if (r.type === `上班`) punchMap[dayKey].上班 = r.time || `—`;
    if (r.type === `下班`) punchMap[dayKey].下班 = r.time || `—`;
  });

  const leaveMap = {};
  mineLeave.forEach(r => {
    const dStart = safeNewDate(r.date);
    const dEnd = safeNewDate(r.endDate || r.date);
    for (let day = dStart.getDate(); day <= dEnd.getDate(); day++) {
      leaveMap[day] = `🌴 已${r.subType === `加班補休` ? `補休` : (r.subType || `請假`)}`;
    }
  });

  let html = `<div class="calendar-table-container"><table class="calendar-table"><thead><tr><th>📅 日期</th><th>🟢 上班簽到</th><th>🏁 下班簽退</th><th>📝 備註</th></tr></thead><tbody>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month - 1, day);
    let isBeforeJoin = false;
    const earliestD = getEarliestCheckDate();
    if (earliestD) {
      const curD = new Date(year, month - 1, day);
      curD.setHours(0,0,0,0);
      if (curD < earliestD) isBeforeJoin = true;
    }
    const weekdayStr = [`日`, `一`, `二`, `三`, `四`, `五`, `六`][dateObj.getDay()];
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
    const isToday = day === now.getDate();
    const isFuture = day > now.getDate();
    
    const formattedDate = `${String(month).padStart(2,`0`)}-${String(day).padStart(2,`0`)} (${weekdayStr})`;
    const dateQueryStr = `${year}-${String(month).padStart(2,`0`)}-${String(day).padStart(2,`0`)}`;
    
    let punch = punchMap[day] || { 上班: `—`, 下班: `—` };
    let leaveLabel = leaveMap[day];

    let checkinHTML = punch.上班;
    let checkoutHTML = punch.下班;
    const isHoliday = currentUser?.holidayStrings && currentUser.holidayStrings.includes(dateQueryStr) && !isWeekend;
    
    if (isBeforeJoin) {
      checkinHTML = checkoutHTML = `<span style="color:var(--text-muted);font-size:14px;">—</span>`;
    } else if (isFuture) { 
      if (punch.上班 === `—`) checkinHTML = `<span style="color:var(--text-muted);font-size:14px;">-</span>`;
      if (punch.下班 === `—`) checkoutHTML = `<span style="color:var(--text-muted);font-size:14px;">-</span>`;
    } else if (isWeekend || isHoliday) {
      if (punch.上班 === `—`) checkinHTML = `<span style="color:var(--text-muted);font-size:13px;">${isHoliday ? `國定假日` : `休假日`}</span>`;
      if (punch.下班 === `—`) checkoutHTML = `<span style="color:var(--text-muted);font-size:13px;">${isHoliday ? `國定假日` : `休假日`}</span>`;
    } else {
      const dayLeaves = mineLeave.filter(r => {
        const startD = safeNewDate(r.date);
        const endD = safeNewDate(r.endDate || r.date);
        return dateObj >= startD && dateObj <= endD;
      }).map(r => ({ start: 540, end: 1080 }));

      const isMorningExempted = isRangeExempted(540, 720, dayLeaves);
      const isAfternoonExempted = isRangeExempted(780, 1080, dayLeaves);
      const isFullDayExempted = isMorningExempted && isAfternoonExempted;

      if (punch.上班 === `—`) {
        checkinHTML = isFullDayExempted ? `<span style="color:var(--text-muted);font-size:14px;">-</span>` : (!isToday ? `<span style="color:#ef4444;font-weight:bold;font-size:13px;" onclick="autoFillSupp('${dateQueryStr}','上班',event)">⚠️ 漏打卡</span>` : `<span style="color:var(--text-muted);font-size:14px;">—</span>`);
      }
      
      if (punch.下班 === `—`) {
        checkoutHTML = isFullDayExempted ? `<span style="color:var(--text-muted);font-size:14px;">-</span>` : (!isToday ? `<span style="color:#ef4444;font-weight:bold;font-size:13px;" onclick="autoFillSupp('${dateQueryStr}','下班',event)">⚠️ 漏打卡</span>` : `<span style="color:var(--text-muted);font-size:14px;">—</span>`);
      }
    }

    const dayPunches = minePunch.filter(r => safeNewDate(r.date || r.timestamp).getDate() === day);
    const remarkParts = buildPunchRemarkParts(dayPunches);
    const dayLeavesForRemark = mineLeave.filter(r => {
      const startD = safeNewDate(r.date);
      const endD = safeNewDate(r.endDate || r.date);
      return dateObj >= startD && dateObj <= endD;
    });
    const leaveParts = dayLeavesForRemark.map(r => `<span style="color:var(--accent-orange);font-weight:bold;">🌴 ${r.subType || `請假`} ${r.startTime || `09:00`}-${r.endTime || `18:00`}</span>`);

    const daySupps = mineSupp.filter(r => safeNewDate(r.date).getDate() === day);
    const suppParts = daySupps.map(r => `<span class="badge ${r.subType === `上班` ? `badge-green` : `badge-red`}">${r.subType}</span> <span style="color:var(--blue-light);font-weight:bold;">🔄已補打卡${r.time ? `（` + r.time + `）` : ``}</span>`);

    const allRemarkParts = [...leaveParts, ...remarkParts];
    const remarksHTML = allRemarkParts.length > 0 ? `<span style="font-size:12px;font-weight:600;line-height:1.6;">${allRemarkParts.join(`<br>`)}</span>` : `—`;

    html += `<tr ${isToday ? `style="background:var(--card-bg-soft);font-weight:bold;"` : ``}>
      <td style="color:${isWeekend?`var(--accent-orange)`:`var(--text-primary)`}">${formattedDate}</td>
      <td>${checkinHTML}</td><td>${checkoutHTML}</td>
      <td style="font-size:12px; line-height:1.5;">${remarksHTML}</td></tr>`;
  }

  html += `</tbody></table></div>`;
  el.innerHTML = html;
}

window.autoFillSupp = function(dateStr, type, event) {
  event.stopPropagation();
  switchTab(`supp`);
  document.getElementById(`suppType`).value = type;
  document.getElementById(`suppDate`).value = dateStr;
  document.getElementById(`suppReason`).placeholder = `請說明 ${dateStr} 漏打${type}卡原因`;
  showToast(`🔄 已為您自動填入 ${dateStr} ${type} 漏卡資訊！`);
}

function getShiftMinutesForDate(dateStr, empId, shiftsList) {
  const shifts = shiftsList || currentUser?.specialShifts || [];
  const targetDateStr = formatLocalDateStr(dateStr);
  const targetEmpId = String(empId).trim();
  
  let match = null;
  for (let i = 0; i < shifts.length; i++) {
    const s = shifts[i];
    if (formatLocalDateStr(s.date) === targetDateStr) {
      if (matchEmpId(s.empId, targetEmpId)) {
        return { start: timeToMin(s.start), end: timeToMin(s.end) };
      } else if (String(s.empId).trim() === "") {
        match = { start: timeToMin(s.start), end: timeToMin(s.end) };
      }
    }
  }
  let defaultStart = 540, defaultEnd = 1080;
  if (currentUser && currentUser.defaultShift) {
    const parts = currentUser.defaultShift.split(`-`);
    if (parts.length === 2) {
      defaultStart = timeToMin(parts[0].trim());
      defaultEnd = timeToMin(parts[1].trim());
    }
  }
  return match || { start: defaultStart, end: defaultEnd };
}

function isApproveCommentBoxOpen() {
  const textareas = document.querySelectorAll(`.approve-comment-input`);
  for (let i = 0; i < textareas.length; i++) {
    if (textareas[i].parentElement.style.display === `block`) return true;
  }
  return false;
}

function matchEmpId(id1, id2) {
  var s1 = String(id1 || "").trim();
  var s2 = String(id2 || "").trim();
  if (s1 === s2) return true;
  var n1 = parseInt(s1, 10);
  var n2 = parseInt(s2, 10);
  return (!isNaN(n1) && !isNaN(n2)) ? (n1 === n2) : false;
}

function formatLocalDateStr(str) {
  if (!str) return ``;
  const d = safeNewDate(str);
  if (isNaN(d.getTime())) return String(str);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, `0`)}-${String(d.getDate()).padStart(2, `0`)}`;
}

function formatLocalTimeStr(str) {
  if (!str) return ``;
  if (typeof str === `string` && str.match(/^\d{2}:\d{2}/)) return str.slice(0,5);
  const d = safeNewDate(str);
  if (isNaN(d.getTime())) return String(str).slice(0,5) || `—`;
  return `${String(d.getHours()).padStart(2, `0`)}:${String(d.getMinutes()).padStart(2, `0`)}`;
}

function formatDateTimeRange(r) {
  const dateStr = formatLocalDateStr(r.date);
  const endDateStr = r.endDate ? formatLocalDateStr(r.endDate) : dateStr;
  const startT = formatLocalTimeStr(r.startTime || r.time || ``);
  const endT = formatLocalTimeStr(r.endTime || ``);

  let hoursVal = ``;
  if (r.hours) {
    const h = parseFloat(r.hours);
    hoursVal = isNaN(h) ? r.hours : String(h).replace(/\.0$/, ``);
  }

  let hoursText = ``;
  if (startT && endT && (r.type === `請假` || r.type === `加班`)) {
    const [sh, sm] = startT.split(':').map(Number);
    const [eh, em] = endT.split(':').map(Number);
    let diffMin = (eh * 60 + em) - (sh * 60 + sm);
    if ((sh * 60 + sm) < 720 && (eh * 60 + em) > 780) diffMin -= 60;
    const rawHours = Math.max(0, diffMin / 60);
    if (r.type === `請假`) {
      const cleanHours = Math.round(rawHours * 100) / 100;
      hoursText = ` (${cleanHours > 0 ? Math.ceil(cleanHours) : 0}h)`;
    } else {
      hoursText = ` (${parseFloat(rawHours.toFixed(1))}h)`;
    }
  } else if (hoursVal) {
    hoursText = ` (${hoursVal}h)`;
  }

  if (r.type === `請假` || r.type === `加班`) {
    return (dateStr === endDateStr || !r.endDate) ? `${dateStr} ${startT}～${endT}${hoursText}` : `${dateStr} ${startT}～${endDateStr} ${endT}${hoursText}`;
  } else if (r.type === `補打卡`) {
    return `${dateStr} ${formatLocalTimeStr(r.time || ``)}`;
  } else if (r.type === `班別調整`) {
    return `${dateStr} ${r.subType || ``}`;
  } else {
    return `${dateStr} ${r.time || ``}`;
  }
}

function buildAttachmentLinksHTML(attachmentText) {
  if (!attachmentText) return ``;
  const parts = String(attachmentText).split(`【補件新增】`);
  const links = [];
  parts.forEach((part, idx) => {
    const lines = part.split(`\n`).map(l => l.trim()).filter(l => l.indexOf(`📁`) === 0);
    if (lines.length === 0) return;
    const label = idx === 0 ? `附件` : `補件${idx}`;
    lines.forEach((line, i) => {
      const sep = line.indexOf(`: `);
      if (sep === -1) return;
      const url = line.slice(sep + 2).trim();
      const num = lines.length > 1 ? String(i + 1) : ``;
      links.push(`<a href="${url}" target="_blank" onclick="event.stopPropagation()">📁${label}${num}</a>`);
    });
  });
  return links.join(` `);
}

function recordHTML(r, showName = false, showApprove = false) {
  let dotClass = `dot-green`;
  let badge = ``;
  let remarksHTML = ``;
  const subTypeLabel = r.subType === `加班補休` ? `補休` : (r.subType || ``);

  if (r.type === `上班`) { dotClass = `dot-green`; badge = `<span class="badge badge-green">上班</span>`; }
  else if (r.type === `下班`) { dotClass = `dot-red`; badge = `<span class="badge badge-red">下班</span>`; }
  else if (r.type === `請假`) { dotClass = `dot-orange`; badge = `<span class="badge badge-orange">${subTypeLabel || `請假`}</span>`; }
  else if (r.type === `加班`) { dotClass = `dot-purple`; badge = `<span class="badge badge-purple">加班</span>`; }
  else if (r.type === `補打卡`) { dotClass = `dot-blue`; badge = `<span class="badge badge-blue">補打卡${subTypeLabel ? `·` + subTypeLabel : ``}</span>`; }
  else if (r.type === `班別調整`) { dotClass = `dot-green`; badge = `<span class="badge badge-green">班別調整${r.subType ? `·` + r.subType : ``}</span>`; }

  let statusBadge = ``;
  if (r.status === `待審`) statusBadge = `<span class="badge badge-waiting" style="margin-left:4px;">待審</span>`;
  else if (r.status === `補件`) statusBadge = `<span class="badge" style="margin-left:4px; background:#eff6ff; color:#3b82f6; border:1px solid #3b82f6; border-radius:6px; padding:4px 8px;">🔄 需補件</span>`;
  else if (r.status === `待第二次審查`) statusBadge = `<span class="badge badge-orange" style="margin-left:4px;">⏳ 待第二次審查</span>`;

  const showGPS = r.lat ? `📍 位置已驗證` : ``;
  const timeInfo = formatDateTimeRange(r);

  const meta = [
    timeInfo, showGPS,
    (r.type === `上班` || r.type === `下班`) ? `` : (r.reason || ``),
    r.approveComment ? `💬 簽核意見：${r.approveComment}` : ``,
    r.attachment ? buildAttachmentLinksHTML(r.attachment) : ``
  ].filter(Boolean).join(` · `);

  const who = showName ? `${r.name || r.empId}（${r.empId}）` : ``;

  const approveRow = (showApprove && (r.status === `待審` || r.status === `待第二次審查`)) ? `
    <div class="approve-row" id="approveBtns-${r.id}">
      <button class="approve-btn ok" onclick="toggleApproveComment('${r.id}', '同意')">✓ 核准</button>
      <button class="approve-btn" onclick="toggleApproveComment('${r.id}', '補件')">🔄 退回補件</button>
      <button class="approve-btn reject" onclick="toggleApproveComment('${r.id}', '拒絕')">✗ 拒絕</button>
    </div>
    <div class="approve-comment-area" id="approveArea-${r.id}">
      <textarea class="approve-comment-input" id="approveComment-${r.id}" placeholder="簽核意見（選填）"></textarea>
      <div class="approve-confirm-row">
        <button class="approve-btn ok" id="approveConfirmBtn-${r.id}" onclick="confirmApprove(${r.id})">確認送出</button>
        <button class="approve-btn reject" onclick="cancelApproveComment(${r.id})">取消</button>
      </div>
    </div>
  ` : ``;

  let actionOrStatusHtml = ``;
  if (!showApprove && r.status === `待審`) {
    actionOrStatusHtml = `<button class="retract-btn" style="background:transparent; color:#dc2626; border:1.5px solid #dc2626; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer; font-size:14px;" onclick="retractRecord('${r.id}','${r.type}','${r.clientId || ''}')">🔙 撤回</button>`;
  } else if (!showApprove && r.status === `補件`) {
    actionOrStatusHtml = `<div><button class="approve-btn ok" style="background:#ec4899; color:#ffffff; border:none; font-weight:600;" onclick="toggleResubmitBox('${r.id}')">📝 補件重新申請</button><div id="resubmitBox-${r.id}" style="display:none; margin-top:8px;"><textarea id="resubmitText-${r.id}" placeholder="請輸入補充說明或證明文件連結" style="width:100%; min-height:60px; border-radius:8px; padding:8px; font-size:13px;"></textarea><button class="approve-btn ok" style="margin-top:6px; background:#2563eb; color:#ffffff; border:none; font-weight:600;" onclick="confirmResubmit('${r.id}', '${r.clientId || ''}', '${r.type}')">送出補件</button></div></div>`;
  } else if (!showApprove && r.status) {
    let badgeClass = `badge-gray`;
    if (r.status === `同意` || r.status === `同意_補件後`) badgeClass = `badge-green`;
    else if (r.status === `拒絕` || r.status === `拒絕_補件後`) badgeClass = `badge-red`;
    else if (r.status === `已撤回`) badgeClass = `badge-withdrawn`;
    else if (r.status === `補件` || r.status === `待第二次審查`) badgeClass = `badge-orange`;

    actionOrStatusHtml = `<span class="badge ${badgeClass}" style="margin-left:auto;">${r.status}</span>`;
  }

  return `
    <div class="record-item">
      <div class="record-row" style="display:flex; align-items:flex-start; width:100%; gap:12px;">
        <div class="record-dot ${dotClass}"></div>
        <div class="record-info" style="flex:1; min-width:0;">
          <div class="record-type" style="font-weight:700;">${badge}${statusBadge}${who ? ` ` + who : ``}</div>
          <div class="record-meta">${meta || `${r.date || ``} ${r.time || ``}`}</div>
        </div>
        ${actionOrStatusHtml ? `<div class="record-status-area" style="display:flex; align-items:center;">${actionOrStatusHtml}</div>` : ``}
      </div>
      ${approveRow}
      ${(!showApprove && r.approveComment) ? `<div class="record-meta" style="color:#7c3aed; background:#f5f3ff; margin-top:8px; border-top:2px solid #7c3aed; border-radius:6px; padding:10px 12px;">💬 意見：${r.approveComment}</div>` : ``}
    </div>
  `;
}

// ── Admin Functions ──
async function loadAdminData() {
  window.adminOutOfOfficeStats = {};
  if (!currentUser || (currentUser.role !== `admin` && currentUser.role !== `admin1` && currentUser.role !== `admin2`)) return;
  applyAdminSubTabVisibility();
  if (currentUser.role === `admin2` && !currentUser.isActiveProxy) {
    switchAdminSubTab(`board`);
  }
  rebuildAdminDropdownsAndTable();
  document.getElementById(`pendingLoading`).textContent = `載入中…`;
  
  let pending = records.filter(r => (r.status === `待審` || r.status === `待第二次審查`) && (r.type === `請假` || r.type === `加班` || r.type === `補打卡`));
  pending.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  adminPendingCache = pending;
  document.getElementById(`statLeave`).innerHTML = records.filter(r => r.type === `請假` && (r.status === `待審` || r.status === `待第二次審查`)).length + `<span>筆</span>`;
  document.getElementById(`statOT`).innerHTML = records.filter(r => (r.type === `加班` || r.type === `補打卡` || r.type === `班別調整`) && (r.status === `待審` || r.status === `待第二次審查`)).length + `<span>筆</span>`;
  document.getElementById(`pendingList`).innerHTML = pending.length ? pending.map(r => recordHTML(r, true, true)).join(``) : `<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">沒有待審項目</div></div>`;
  
  try {
    const data = await callGAS({ action: `getAll` });
    document.getElementById(`pendingLoading`).textContent = ``;
    if (data && data.status === `ok` && data.employeeList) {
      currentUser.employeeList = data.employeeList;
      sessionStorage.setItem(`tjcpm_user`, JSON.stringify(currentUser));
      rebuildAdminDropdownsAndTable();
    }
    
    if (data && data.pending) {
      const pendingList = data.pending;
      pendingList.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      adminPendingCache = pendingList;
      document.getElementById(`statLeave`).innerHTML = pendingList.filter(r => r.type === `請假`).length + `<span>筆</span>`;
      document.getElementById(`statOT`).innerHTML = pendingList.filter(r => r.type === `加班` || r.type === `補打卡`).length + `<span>筆</span>`;
      document.getElementById(`statSupp`).innerHTML = pendingList.filter(r => r.type === `補打卡`).length + `<span>筆</span>`;
      document.getElementById(`statAdjust`).innerHTML = pendingList.filter(r => r.type === `班別調整`).length + `<span>筆</span>`;
      if (!isApproveCommentBoxOpen()) {
        document.getElementById(`pendingList`).innerHTML = pendingList.length 
          ? pendingList.map(r => recordHTML(r, true, true)).join(``) 
          : `<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">沒有待審項目</div></div>`;
      }
    }
  } catch (e) {
    document.getElementById(`pendingLoading`).textContent = `（離線）`;
  }
}

async function handleAdminQueryChange() {
  const empId = document.getElementById(`adminQueryUserSelect`).value;
  const resultsDiv = document.getElementById(`adminQueryResults`);
  if (!empId) { resultsDiv.style.display = `none`; return; }
  
  resultsDiv.style.display = `block`;
  document.getElementById(`aq-y-ot`).textContent = `計算中…`;
  document.getElementById(`aq-y-miss`).textContent = `計算中…`;
  document.getElementById(`aq-y-late`).textContent = `計算中…`;
  
  try {
    const res = await callGAS({ action: `getMyStatus`, empId: empId });
    if (res.status === `ok`) {
      const empInfo = currentUser.employeeList.find(e => matchEmpId(e.empId, empId));
      const queryJoinDateStr = empInfo ? empInfo.joinDate : `2025/12/01`;
      
      const aqIntervalEl = document.getElementById(`aq-interval`);
      if (aqIntervalEl) aqIntervalEl.textContent = getYearRangeString(queryJoinDateStr, res.quota);
      
      const empRecords = res.updates || [];
      let otHoursAcc = 0, missedCount = 0, lateEarlyCount = 0;
      
      if (res.settledAccumulated) {
        otHoursAcc = res.settledAccumulated.yOtHours || 0;
        missedCount = res.settledAccumulated.yMissedCount || 0;
        lateEarlyCount = res.settledAccumulated.yLateEarlyCount || 0;
      }
      
      document.getElementById(`aq-y-ot`).textContent = otHoursAcc.toFixed(1) + ` h`;
      document.getElementById(`aq-y-miss`).textContent = missedCount + ` 次`;
      document.getElementById(`aq-y-late`).textContent = lateEarlyCount + ` 次`;

      renderAdminQueryCalendarTable(empId, empRecords, res, empInfo);
    }
  } catch (e) {
    document.getElementById(`aq-y-ot`).textContent = `⚠️ 錯誤`;
  }
}

function switchAdminSubTab(subTab) {
  [`pending`, `board`, `adjust`, `agent`].forEach(tab => {
    const chip = document.getElementById(`adminSubTab-` + tab);
    const subPage = document.getElementById(`adminSubPage-` + tab);
    if (chip) chip.classList.toggle(`active`, tab === subTab);
    if (subPage) subPage.style.display = tab === subTab ? `block` : `none`;
  });
}

function rebuildAdminDropdownsAndTable() {
  const selectEl = document.getElementById(`adminQueryUserSelect`);
  const adjustSelectEl = document.getElementById(`adminAdjustEmpId`);
  const agentSelectEl = document.getElementById(`adminAgentEmpId`);
  if (currentUser && currentUser.employeeList) {
    if (selectEl) selectEl.innerHTML = `<option value="">-- 請選擇員工 --</option>`;
    if (adjustSelectEl) adjustSelectEl.innerHTML = `<option value="">-- 請選擇員工 --</option>`;
    if (agentSelectEl) agentSelectEl.innerHTML = `<option value="">-- 請選擇代理主管 --</option>`;
    currentUser.employeeList.forEach(emp => {
      if (emp.role !== `admin` && emp.role !== `admin1` && emp.role !== `admin2`) {
        if (selectEl) selectEl.appendChild(new Option(`${emp.empId} - ${emp.name}`, emp.empId));
        if (adjustSelectEl) adjustSelectEl.appendChild(new Option(`${emp.empId} - ${emp.name}`, emp.empId));
      }
      const isAgentOptionAllowed = (currentUser.role === `admin1` && emp.role === `admin2`) || (currentUser.role === `admin` && (emp.role === `admin` || emp.role === `admin1` || emp.role === `admin2`) && String(emp.empId) !== String(currentUser.empId));
      if (isAgentOptionAllowed && agentSelectEl) {
        agentSelectEl.appendChild(new Option(`${emp.empId} - ${emp.name}`, emp.empId));
      }
    });
  }
  renderAdminEmployeeOverviewTable();
}

function renderAdminEmployeeOverviewTable() {
  const body = document.getElementById(`adminEmployeeOverviewBody`);
  if (!body) return;
  if (!currentUser || !currentUser.employeeList || currentUser.employeeList.length === 0) {
    body.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:12px; color:var(--text-muted);">無資料</td></tr>`;
    return;
  }
  const ftEmployees = currentUser.employeeList.filter(emp => emp.role !== `admin` && emp.empType === `專任`);
  if (ftEmployees.length === 0) {
    body.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:12px; color:var(--text-muted);">尚無專任員工資料</td></tr>`;
    return;
  }
  body.innerHTML = ftEmployees.map(emp => {
    const stats = (window.adminOutOfOfficeStats && window.adminOutOfOfficeStats[String(emp.empId).trim()]) || { checkin: 0, checkout: 0 };
    return `
      <tr style="border-bottom:1px solid var(--card-border); text-align:center;">
        <td style="padding:8px; font-weight:bold; color:var(--text-primary);">${emp.empId}</td>
        <td style="padding:8px; font-weight:bold; color:var(--blue-light);">${emp.name}</td>
        <td style="padding:8px; color:var(--text-secondary);">${emp.joinDate || `—`}</td>
        <td style="padding:8px; color:var(--text-secondary);">${emp.seniorityText || `—`}</td>
        <td style="padding:8px; color:var(--text-secondary);">${emp.specialLeaveTotalHours || 0} h</td>
        <td style="padding:8px; color:var(--accent-orange); font-weight:bold;">${emp.specialLeaveUsedHours || 0} h</td>
        <td style="padding:8px; color:var(--green-light); font-weight:bold;">${emp.specialLeaveRemainingHours || 0} h</td>
        <td style="padding:8px; color:var(--accent-purple); font-weight:bold;">${emp.compLeaveRemainingHours || 0} h</td>
        <td style="padding:8px;">${stats.checkin > 0 ? `🟢 ${stats.checkin} 次` : `—`}</td>
        <td style="padding:8px;">${stats.checkout > 0 ? `🏁 ${stats.checkout} 次` : `—`}</td>
        <td style="padding:8px;"><button class="pw-toggle-btn" onclick="triggerEmployeeQuery('${emp.empId}')">🔍 穿透對帳</button></td>
      </tr>
    `;
  }).join(``);
}

window.triggerEmployeeQuery = function(empId) {
  const selectEl = document.getElementById(`adminQueryUserSelect`);
  if (selectEl) {
    selectEl.value = empId;
    handleAdminQueryChange();
    const resultDiv = document.getElementById(`adminQueryResults`);
    if (resultDiv) resultDiv.scrollIntoView({ behavior: `smooth` });
  }
};

function applyAdminSubTabVisibility() {
  if (!currentUser) return;
  const agentTab = document.getElementById(`adminSubTab-agent`);
  if (agentTab) agentTab.style.setProperty(`display`, currentUser.role === `admin2` ? `none` : `inline-flex`, `important`);
  
  const pendingTab = document.getElementById(`adminSubTab-pending`);
  if (pendingTab) pendingTab.style.setProperty(`display`, (currentUser.role === `admin2` && !currentUser.isActiveProxy) ? `none` : `inline-flex`, `important`);
}

function saveRecords() {
  localStorage.setItem(`tjcpm_records`, JSON.stringify(records));
}

let pendingClientId = null;
let pendingProofFiles = [];

function handleProofFilesSelected(event, formKey) {
  const files = Array.from(event.target.files || []);
  const listEl = document.getElementById(`${formKey}ProofFileList`);
  const oversized = files.filter(f => f.size > MAX_PROOF_FILE_SIZE);
  if (oversized.length > 0) {
    showToast(`⚠️ 檔案超過限制，請壓縮後再選`);
    event.target.value = ``;
    pendingProofFiles = [];
    if (listEl) listEl.textContent = ``;
    return;
  }
  pendingProofFiles = files;
  if (listEl) {
    listEl.textContent = files.length ? `已選擇 ${files.length} 個檔案：` + files.map(f => `${f.name}（${(f.size / 1024 / 1024).toFixed(1)}MB）`).join(`、`) : ``;
  }
}

function clearProofFileSelection(formKey) {
  pendingProofFiles = [];
  const listEl = document.getElementById(`${formKey}ProofFileList`);
  if (listEl) listEl.textContent = ``;
  const inputEl = document.getElementById(`${formKey}ProofFiles`);
  if (inputEl) inputEl.value = ``;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(`,`)[1] || ``);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadProofFiles(clientId, files) {
  if (!files || files.length === 0) return true;
  try {
    const payload = await Promise.all(files.map(async f => ({
      name: f.name, mimeType: f.type || `application/octet-stream`, data: await fileToBase64(f)
    })));
    await fetch(GAS_URL, {
      method: `POST`,
      mode: `no-cors`,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: `uploadProofFile`, clientId: clientId, name: currentUser.name, files: payload })
    });
    return true;
  } catch (e) {
    showToast(`⚠️ 證明文件上傳失敗，請之後用補件功能上傳`);
    return false;
  }
}

function switchTab(tab) {
  if (tab === `admin` && (!currentUser || (currentUser.role !== `admin` && currentUser.role !== `admin1` && currentUser.role !== `admin2`))) return;
  document.querySelectorAll(`.nav-tab`).forEach(t => t.classList.toggle(`active`, t.dataset.tab === tab));
  document.querySelectorAll(`.page`).forEach(p => p.classList.remove(`active`));
  document.getElementById(`page-` + tab).classList.add(`active`);
  
  if (tab === `records`) {
    renderAllList();
    if (shouldSyncRecordsNow()) {
      syncProfileAndAccumulatedLeaves().then(result => {
        if (result && result.ok && result.changed) renderAllList();
      });
    }
  }
  if (tab === `admin`) loadAdminData();
  if (tab === `profile`) renderProfile();
  if (tab === `leave`) {
    updateLeaveBalanceDisplay();
    syncProfileAndAccumulatedLeaves().then(() => updateLeaveBalanceDisplay());
  }
}

const RECORDS_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const MAX_PROOF_FILE_SIZE = 5 * 1024 * 1024;

function closeModal(type) {
  document.getElementById(`modal-` + type).classList.remove(`open`);
}

let toastTimer;
function showToast(msg) {
  const el = document.getElementById(`toast`);
  el.textContent = msg;
  el.classList.add(`show`);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove(`show`), 2800);
}

function showLoading() {
  let el = document.getElementById(`globalLoadingOverlay`);
  if (!el) {
    el = document.createElement(`div`);
    el.id = `globalLoadingOverlay`;
    el.style.cssText = `position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,0.35);display:flex;align-items:center;justify-content:center;`;
    el.innerHTML = `<div style="background:var(--card-bg,#fff);padding:16px 22px;border-radius:12px;display:flex;align-items:center;gap:10px;font-size:14px;color:var(--text-primary,#0f172a);box-shadow:0 4px 16px rgba(0,0,0,0.15);"><span class="spinner" style="border-top-color:var(--blue-main,#1a6fc4);border-color:rgba(26,111,196,0.25);"></span>處理中…</div>`;
    document.body.appendChild(el);
  }
  el.style.display = `flex`;
}

function hideLoading() {
  const el = document.getElementById(`globalLoadingOverlay`);
  if (el) el.style.display = `none`;
}

document.querySelectorAll(`.modal-overlay`).forEach(o => {
  o.addEventListener(`click`, e => {
    if (e.target === o) o.classList.remove(`open`);
  });
});

(function initTimeSelects() {
  const ids = [`leaveStartTime`, `leaveEndTime`, `otStart`, `otEnd`, `suppTime`];
  const options = [];
  for (let h = 0; h < 24; h++) {
    const hh = String(h).padStart(2, `0`);
    options.push(`<option value="${hh}:00">${hh}:00</option>`);
    options.push(`<option value="${hh}:30">${hh}:30</option>`);
  }
  const html = options.join(``);
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  });
  [`leaveStartTime`,`otStart`].forEach(id => { const el = document.getElementById(id); if (el) el.value = `09:00`; });
  [`leaveEndTime`,`otEnd`].forEach(id => { const el = document.getElementById(id); if (el) el.value = `18:00`; });
  const suppEl = document.getElementById(`suppTime`);
  if (suppEl) suppEl.value = `09:00`;
})();

function toggleApproveComment(id, decision) {
  document.querySelectorAll(`.approve-comment-area.open`).forEach(el => {
    const rid = el.id.replace(`approveArea-`,``);
    if (String(rid) !== String(id)) {
      el.classList.remove(`open`);
      const btns = document.getElementById(`approveBtns-` + rid);
      if (btns) btns.style.display = `flex`;
    }
  });
  const area = document.getElementById(`approveArea-` + id);
  const btns = document.getElementById(`approveBtns-` + id);
  if (!area) { approveRecord(id, decision); return; }
  pendingApproveDecision[id] = decision;
  area.classList.add(`open`);
  if (btns) btns.style.display = `none`;
  const confirmBtn = document.getElementById(`approveConfirmBtn-` + id);
  if (confirmBtn) {
    confirmBtn.textContent = decision === `同意` ? `✓ 確認核准` : (decision === `補件` ? `🔄 確認退回補件` : `✗ 確認拒絕`);
    confirmBtn.className = `approve-btn ` + (decision === `同意` ? `ok` : (decision === `補件` ? `` : `reject`));
  }
  const ta = document.getElementById(`approveComment-` + id);
  if (ta) setTimeout(() => ta.focus(), 100);
}

function cancelApproveComment(id) {
  const area = document.getElementById(`approveArea-` + id);
  if (area) area.classList.remove(`open`);
  const btns = document.getElementById(`approveBtns-` + id);
  if (btns) btns.style.display = `flex`;
  delete pendingApproveDecision[id];
}

function confirmApprove(id) {
  const decision = pendingApproveDecision[id];
  if (!decision) return;
  const commentEl = document.getElementById(`approveComment-` + id);
  const comment = commentEl ? commentEl.value.trim() : ``;
  approveRecord(id, decision, comment);
  delete pendingApproveDecision[id];
}

async function approveRecord(id, decision, comment) {
  if (!currentUser || (currentUser.role !== `admin` && currentUser.role !== `admin1` && currentUser.role !== `admin2`)) {
    showToast(`⚠️ 您沒有審核權限`);
    return;
  }
  const rec = adminPendingCache.find(r => r.id === id) || records.find(r => r.id === id);
  if (!rec) { showToast(`⚠️ 找不到此筆申請資料`); return; }
  rec.status = decision;
  if (comment) rec.approveComment = comment;
  saveRecords();
  
  try {
    const res = await callGAS({
      action: `approve`, clientId: rec.clientId || String(rec.id),
      empId: rec.empId, type: rec.type, date: rec.date, decision,
      approverName: currentUser.name, approverId: currentUser.empId,
      comment: comment || ``
    });
    showToast(res.status === `ok` ? `✅ 已完成審核作業` : `⚠️ 審核失敗`);
  } catch (e) {
    showToast(`✅ 已標記審核（離線）`);
  }
  loadAdminData();
  renderAdminEmployeeOverviewTable();
}

function renderProfile() {
  if (!currentUser) return;
  document.getElementById(`profileNameVal`).textContent = currentUser.name || `—`;
  document.getElementById(`profileEmpIdVal`).textContent = currentUser.empId || `—`;
  document.getElementById(`profileJoinDate`).textContent = currentUser.joinDate || `—`;
  
  const empTypeEl = document.getElementById(`profileEmpType`);
  if (empTypeEl) empTypeEl.textContent = currentUser.empType || `專任`;
  const defaultShiftEl = document.getElementById(`profileDefaultShift`);
  if (defaultShiftEl) defaultShiftEl.textContent = currentUser.defaultShift || `09:00-18:00`;
  const emailEl = document.getElementById(`profileEmailVal`);
  if (emailEl) emailEl.textContent = currentUser.email || `—`;
  // 【修改】改成直接顯示 Sheet I/J 欄的值，不再前端計算
  const seniorityEl = document.getElementById(`profileSeniority`);
  if (seniorityEl) seniorityEl.textContent = currentUser.seniorityText || `—`;
  const entitlementEl = document.getElementById(`profileAnnualEntitlement`);
  if (entitlementEl) entitlementEl.textContent = (currentUser.specialLeaveEntitlementHours !== undefined) 
    ? `${currentUser.specialLeaveEntitlementHours} 小時` 
    : `—`;
  calcAttendance();
  //8/20 if (currentUser.quota) {
  //  document.getElementById(`profileAnnualLeave`).textContent = `${currentUser.quota.specialLeaveRemainingHours} 小時`;
  //  document.getElementById(`profileCompensatoryLeave`).textContent = `${currentUser.quota.compLeaveRemainingHours} 小時`;
  //}
  syncProfileAndAccumulatedLeaves();
  updateAllYearRanges();
}

function shouldSyncRecordsNow() {
  const lastSyncStr = localStorage.getItem(`tjcpm_recordsLastSyncTime`);
  if (!lastSyncStr) return true;
  return (Date.now() - new Date(lastSyncStr).getTime()) > RECORDS_SYNC_INTERVAL_MS;
}

async function syncProfileAndAccumulatedLeaves() {
  try {
    const data = await callGAS({ action: `getMyStatus`, empId: currentUser.empId });
    if (data.status === `ok` && data.updates) {
      const snapshotKey = `tjcpm_lastSync_${currentUser.empId}`;
      localStorage.setItem(snapshotKey, JSON.stringify({ updates: data.updates, quota: data.quota || null }));

      const keepRecords = records.filter(r => !matchEmpId(r.empId, currentUser.empId));
      records = [...keepRecords, ...data.updates];
      saveRecords();

      let annualLeaveUsed = 0, compLeaveUsed = 0, sickLeaveUsed = 0, personalLeaveUsed = 0, officialLeaveUsed = 0, marriageLeaveUsed = 0, funeralLeaveUsed = 0;
      let anniversaryStartStr = null;
      if (currentUser && currentUser.joinDate) {
        const win = getCurrentAnniversaryWindow(currentUser.joinDate);
        if (win && win.start) anniversaryStartStr = `${win.start.getFullYear()}-${String(win.start.getMonth() + 1).padStart(2, `0`)}-${String(win.start.getDate()).padStart(2, `0`)}`;
      }

      records.forEach(r => {
        if (r.type === `請假` && isFinalApproved(r.status) && r.date && (!anniversaryStartStr || r.date >= anniversaryStartStr)) {
          const leaveType = r.subType === `加班補休` ? `補休` : (r.subType || ``);
          const hours = parseFloat(r.hours) || 0;
          if (leaveType === `特休`) annualLeaveUsed += hours;
          else if (leaveType === `補休`) compLeaveUsed += hours;
          else if (leaveType === `病假`) sickLeaveUsed += hours;
          else if (leaveType === `事假`) personalLeaveUsed += hours;
          else if (leaveType === `公假`) officialLeaveUsed += hours;
          else if (leaveType === `婚假`) marriageLeaveUsed += hours;
          else if (leaveType === `喪假`) funeralLeaveUsed += hours;
        }
      });

      if (data.quota) {
        currentUser.quota = data.quota;
        if (data.holidayStrings) currentUser.holidayStrings = data.holidayStrings;
        if (data.specialShifts) currentUser.specialShifts = data.specialShifts;
        if (data.defaultShift) currentUser.defaultShift = data.defaultShift;
        if (data.hasOwnProperty(`seniorityText`)) currentUser.seniorityText = data.seniorityText;                              // 【新增】
        if (data.hasOwnProperty(`specialLeaveEntitlementHours`)) currentUser.specialLeaveEntitlementHours = data.specialLeaveEntitlementHours; // 【新增】
 
        if (data.settledAccumulated) {
          currentUser.settledAccumulated = data.settledAccumulated;
          localStorage.setItem(`tjcpm_settledAccumulated`, JSON.stringify(data.settledAccumulated));
        }
        if (data.hasOwnProperty(`isActiveProxy`)) currentUser.isActiveProxy = data.isActiveProxy;
        applyAdminSubTabVisibility();
        sessionStorage.setItem(`tjcpm_user`, JSON.stringify(currentUser));
      }

      //8/20 document.getElementById(`profileAnnualLeave`).textContent = `${data.quota ? data.quota.specialLeaveRemainingHours : '—'} 小時`;
      //8/20 document.getElementById(`profileCompensatoryLeave`).textContent = `${data.quota ? data.quota.compLeaveRemainingHours : '—'} 小時`;

      document.getElementById(`accumAnnual`).textContent = `${data.quota ? data.quota.specialLeaveUsedHours : annualLeaveUsed}h`;
      document.getElementById(`accumComp`).textContent = `${data.quota ? data.quota.compLeaveUsedHours : compLeaveUsed}h`;
      document.getElementById(`accumSick`).textContent = `${sickLeaveUsed}h`;
      document.getElementById(`accumPersonal`).textContent = `${personalLeaveUsed}h`;
      document.getElementById(`accumOfficial`).textContent = `${officialLeaveUsed}h`;
      document.getElementById(`accumMarriage`).textContent = `${marriageLeaveUsed}h`;
      document.getElementById(`accumFuneral`).textContent = `${funeralLeaveUsed}h`;
      
      calcAttendance();
      return { ok: true, changed: true };
    }
    return { ok: true, changed: false };
  } catch (e) {
    return { ok: false, changed: false };
  }
}

function normalizeDate(str) {
  if (!str) return null;
  let date;
  if (typeof str === 'number') date = new Date(str);
  else if (typeof str === 'string') {
    if (str.match(/^\d{4}-\d{2}-\d{2}/)) date = new Date(str + 'T00:00:00');
    else if (str.match(/^\d{4}\/\d{1,2}\/\d{1,2}/)) {
      const [y, m, d] = str.split('/').map(Number);
      date = new Date(y, m - 1, d);
    }
  }
  if (!(date instanceof Date) || isNaN(date)) return null;
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function timeToMin(timeStr) {
  if (!timeStr) return 540;
  const parts = timeStr.split(`:`);
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || 0, 10);
}

// script.js 新增：向後端請求預覽時數
async function previewLeaveHours() {
  const startDate = document.getElementById('leaveStart').value;
  const endDate = document.getElementById('leaveEnd').value || startDate;
  const startTime = document.getElementById('leaveStartTime').value;
  const endTime = document.getElementById('leaveEndTime').value;
  const empId = currentUser?.empId; // 取得當前登入者的工號

  // 欄位未填完整前不發送請求
  if (!startDate || !startTime || !endTime) return;

  const displayEl = document.getElementById('previewHoursDisplay');
  if (displayEl) displayEl.innerText = '計算中...';

  // 透過 callGAS（fetch/JSONP）呼叫後端 previewLeaveHours action，
  // 由後端的 getLeaveHoursFromRow 計算權威時數（不能用 google.script.run，
  // 因為前端是架在 GitHub Pages，跟後端 Apps Script 是不同網域）
  try {
    const res = await callGAS({
      action: `previewLeaveHours`,
      empId: empId,
      date: startDate,
      endDate: endDate,
      startTime: startTime,
      endTime: endTime
    });
    if (res && res.status === `ok`) {
      if (displayEl) displayEl.innerText = `預計扣除時數：${res.hours} 小時`;
    } else {
      if (displayEl) displayEl.innerText = `時數計算失敗`;
    }
  } catch (err) {
    console.error('預覽時數失敗:', err);
    if (displayEl) displayEl.innerText = '時數計算失敗';
  }
}

function renderEmploymentYearSummary() {
  if (!currentUser) return;
  const rangeStr = getYearRangeString(currentUser.joinDate, currentUser.quota);
  const rangeSpan = document.getElementById(`emp-range-span`);
  if (rangeSpan) rangeSpan.textContent = rangeStr ? `(${rangeStr})` : ``;

  let otHours = 0, missedCount = 0, lateEarlyCount = 0;
  if (currentUser.settledAccumulated) {
    otHours = currentUser.settledAccumulated.yOtHours || 0;
    missedCount = currentUser.settledAccumulated.yMissedCount || 0;
    lateEarlyCount = currentUser.settledAccumulated.yLateEarlyCount || 0;
  }

  document.getElementById(`emp-ot`).textContent = otHours.toFixed(1) + ` h`;
  document.getElementById(`emp-miss`).textContent = missedCount + ` 次`;
  document.getElementById(`emp-lateearly`).textContent = lateEarlyCount + ` 次`;
}

function renderAttendanceIssuesForRangeByMonth(startDate, endDate, targetElId) {
  const el = document.getElementById(targetElId || `yearIssueList`);
  if (!el) return;
  if (!currentUser || currentUser.empType === `兼任`) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">兼任同仁不計算出勤異常</div></div>`;
    return;
  }

  const earliestD = getEarliestCheckDate();
  const now = new Date();
  const settleEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
  settleEndDate.setHours(23, 59, 59, 999);
  const endCheckDate = endDate < settleEndDate ? endDate : settleEndDate;

  if (earliestD && (new Date(earliestD)).setHours(0,0,0,0) > endCheckDate) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">此期間無出勤異常！</div></div>`;
    return;
  }

  let dIndex = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const issues = [];
  const myPunches = records.filter(r => matchEmpId(r.empId, currentUser?.empId) && (r.type === `上班` || r.type === `下班`));
  const mySupps = records.filter(r => matchEmpId(r.empId, currentUser?.empId) && r.type === `補打卡`);
  const myLeaves = records.filter(r => matchEmpId(r.empId, currentUser?.empId) && r.type === `請假` && isFinalApproved(r.status));

  const dailyPunches = {};
  myPunches.forEach(r => {
    const normD = normalizeDate(r.date);
    if (!dailyPunches[normD]) dailyPunches[normD] = { in: null, out: null };
    if (r.type === `上班`) { if (!dailyPunches[normD].in || r.time < dailyPunches[normD].in) dailyPunches[normD].in = r.time; }
    else { if (!dailyPunches[normD].out || r.time > dailyPunches[normD].out) dailyPunches[normD].out = r.time; }
  });
  mySupps.filter(r => isFinalApproved(r.status)).forEach(r => {
    const normD = normalizeDate(r.date);
    if (!dailyPunches[normD]) dailyPunches[normD] = { in: null, out: null };
    if (r.subType === `上班`) dailyPunches[normD].in = r.time;
    if (r.subType === `下班`) dailyPunches[normD].out = r.time;
  });

  let loopCount = 0;
  while (dIndex <= endCheckDate && loopCount < 400) {
    loopCount++;
    if (earliestD && (new Date(dIndex)).setHours(0,0,0,0) < earliestD) { dIndex.setDate(dIndex.getDate() + 1); continue; }
    
    const dayOfWeek = dIndex.getDay();
    const dateStr = `${dIndex.getFullYear()}-${String(dIndex.getMonth() + 1).padStart(2, `0`)}-${String(dIndex.getDate()).padStart(2, `0`)}`;
    const dateQueryStr = `${dIndex.getFullYear()}/${dIndex.getMonth() + 1}/${dIndex.getDate()}`;
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const isHoliday = currentUser.holidayStrings && currentUser.holidayStrings.includes(dateStr);

    if (!isWeekend && !isHoliday) {
      const punch = dailyPunches[dateQueryStr] || dailyPunches[dateStr] || { in: null, out: null };
      const dayLeaves = myLeaves.filter(r => dIndex >= safeNewDate(r.date) && dIndex <= safeNewDate(r.endDate || r.date)).map(r => ({ start: 540, end: 1080 }));
      const shift = getShiftMinutesForDate(dateQueryStr, currentUser.empId);

      if (!isRangeExempted(shift.start, shift.end, dayLeaves)) {
        let isProblem = false, reason = [];
        let checkinHTML = punch.in || `—`, checkoutHTML = punch.out || `—`;

        if (!punch.in && !punch.out) {
          isProblem = true; reason.push(`雙簽漏卡`);
          checkinHTML = `<span style="color:#ef4444;font-weight:bold;cursor:pointer;" onclick="autoFillSupp('${dateStr}','上班',event)">⚠️ 漏上班</span>`;
          checkoutHTML = `<span style="color:#ef4444;font-weight:bold;cursor:pointer;" onclick="autoFillSupp('${dateStr}','下班',event)">⚠️ 漏下班</span>`;
        } else {
          if (!punch.in) {
            isProblem = true; reason.push(`上班漏卡`);
            checkinHTML = `<span style="color:#ef4444;font-weight:bold;cursor:pointer;" onclick="autoFillSupp('${dateStr}','上班',event)">⚠️ 漏上班</span>`;
          } else if (timeToMin(punch.in) > shift.start && !isRangeExempted(shift.start, timeToMin(punch.in), dayLeaves)) {
            isProblem = true; reason.push(`遲到`);
            checkinHTML = `<span style="color:var(--accent-orange);font-weight:bold;">${punch.in} ⚠️遲到</span>`;
          }
          if (!punch.out) {
            isProblem = true; reason.push(`下班漏卡`);
            checkoutHTML = `<span style="color:#ef4444;font-weight:bold;cursor:pointer;" onclick="autoFillSupp('${dateStr}','下班',event)">⚠️ 漏下班</span>`;
          } else if (timeToMin(punch.out) < shift.end && !isRangeExempted(timeToMin(punch.out), shift.end, dayLeaves)) {
            isProblem = true; reason.push(`早退`);
            checkoutHTML = `<span style="color:var(--accent-orange);font-weight:bold;">${punch.out} ⚠️早退</span>`;
          }
        }

        if (isProblem) issues.push({ date: dateStr, inHTML: checkinHTML, outHTML: checkoutHTML, reason: reason.join(`、`) });
      }
    }
    dIndex.setDate(dIndex.getDate() + 1);
  }

  if (issues.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">此期間無出勤異常！</div></div>`;
    return;
  }

  const groups = {};
  issues.forEach(item => {
    const ym = item.date.slice(0, 7);
    if (!groups[ym]) groups[ym] = [];
    groups[ym].push(item);
  });

  let html = ``;
  Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(ym => {
    const [yy, mm] = ym.split(`-`);
    const monthIssues = groups[ym].sort((a,b) => b.date.localeCompare(a.date));
    html += `
      <p class="section-title" style="margin-top:16px; font-size:14px;">📅 ${yy}年${parseInt(mm,10)}月（共 ${monthIssues.length} 筆異常）</p>
      <div class="calendar-table-container"><table class="calendar-table">
      <thead><tr><th>📅 日期</th><th>🟢 上班時間</th><th>🏁 下班時間</th><th>⚠️ 異常類別</th></tr></thead><tbody>
    `;
    monthIssues.forEach(item => {
      const weekdayStr = [`日`,`一`,`二`,`三`,`四`,`五`,`六`][new Date(item.date).getDay()];
      html += `<tr><td style="font-weight:bold; color:var(--text-secondary);">${item.date.slice(5)} (${weekdayStr})</td><td>${item.inHTML}</td><td>${item.outHTML}</td><td><span class="badge ${item.reason.includes(`漏卡`) ? `badge-red` : `badge-orange`}">${item.reason}</span></td></tr>`;
    });
    html += `</tbody></table></div>`;
  });

  el.innerHTML = html;
}

function calcAttendance() {
  if (!currentUser) return;
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  const todayDate = now.getDate();
  const daysInMonth = new Date(thisYear, thisMonth, 0).getDate();
  
  let endDayCheck = daysInMonth;
  if (thisYear === now.getFullYear() && thisMonth === (now.getMonth() + 1)) endDayCheck = todayDate - 1;

  const myRecords = records.filter(r => matchEmpId(r.empId, currentUser?.empId) && safeNewDate(r.date || r.timestamp).getFullYear() === thisYear && (safeNewDate(r.date || r.timestamp).getMonth() + 1) === thisMonth);

  let otHours = 0;
  myRecords.filter(r => r.type === `加班` && isFinalApproved(r.status)).forEach(r => {
    if (r.hours) otHours += parseFloat(r.hours);
    else if (r.startTime && r.endTime) {
      const sh = parseInt(r.startTime.split(`:`)[0], 10), sm = parseInt(r.startTime.split(`:`)[1] || 0, 10);
      const eh = parseInt(r.endTime.split(`:`)[0], 10), em = parseInt(r.endTime.split(`:`)[1] || 0, 10);
      otHours += Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
    }
  });

  const suppCount = myRecords.filter(r => r.type === `補打卡` && isFinalApproved(r.status)).length;
  let leaveHours = 0;
  myRecords.filter(r => r.type === `請假` && isFinalApproved(r.status)).forEach(r => {
    leaveHours += calculateLeaveHoursLocal(r, currentUser?.holidayStrings || []);
  });

  const dailyPunches = {};
  myRecords.forEach(r => {
    if (r.type === `上班` || r.type === `下班`) {
      const normD = normalizeDate(r.date);
      if (!dailyPunches[normD]) dailyPunches[normD] = { in: null, out: null };
      if (r.type === `上班`) { if (!dailyPunches[normD].in || r.time < dailyPunches[normD].in) dailyPunches[normD].in = r.time; }
      else if (r.type === `下班`) { if (!dailyPunches[normD].out || r.time > dailyPunches[normD].out) dailyPunches[normD].out = r.time; }
    }
  });

  myRecords.filter(r => r.type === `補打卡` && isFinalApproved(r.status)).forEach(r => {
    const normD = normalizeDate(r.date);
    if (!dailyPunches[normD]) dailyPunches[normD] = { in: null, out: null };
    if (r.subType === `上班`) dailyPunches[normD].in = r.time;
    if (r.subType === `下班`) dailyPunches[normD].out = r.time;
  });

  let missedCount = 0, lateCount = 0, earlyCount = 0;

  if (currentUser.empType !== `兼任`) {
    for (let d = 1; d <= endDayCheck; d++) {
      const dateObj = new Date(thisYear, thisMonth - 1, d);
      const earliestD = getEarliestCheckDate();
      if (earliestD && (new Date(thisYear, thisMonth - 1, d)).setHours(0,0,0,0) < earliestD) continue;
      
      const dayOfWeek = dateObj.getDay();
      const dateStr = `${thisYear}/${thisMonth}/${d}`;
      
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const punch = dailyPunches[dateStr];
        const dayLeaves = myRecords.filter(r => r.type === `請假` && isFinalApproved(r.status) && dateObj >= safeNewDate(r.date) && dateObj <= safeNewDate(r.endDate || r.date)).map(r => ({ start: 540, end: 1080 }));
        const shift = getShiftMinutesForDate(dateStr, currentUser.empId);

        if (!isRangeExempted(shift.start, shift.end, dayLeaves)) {
          if (!punch || (!punch.in && !punch.out)) missedCount += 2;
          else {
            if (!punch.in) missedCount += 1;
            else if (timeToMin(punch.in) > shift.start && !isRangeExempted(shift.start, timeToMin(punch.in), dayLeaves)) lateCount++;
            
            if (!punch.out) missedCount += 1;
            else if (timeToMin(punch.out) < shift.end && !isRangeExempted(timeToMin(punch.out), shift.end, dayLeaves)) earlyCount++;
          }
        }
      }
    }
  }

  const mOtEl = document.getElementById(`m-ot`), mMissEl = document.getElementById(`m-miss`), mSuppEl = document.getElementById(`m-supp`), mLateEl = document.getElementById(`m-late`), mEarlyEl = document.getElementById(`m-early`), mLeaveEl = document.getElementById(`m-leave`);
  if (mOtEl) mOtEl.textContent = otHours.toFixed(1) + ` h`;
  if (mMissEl) mMissEl.textContent = missedCount + ` 次`;
  if (mSuppEl) mSuppEl.textContent = suppCount + ` 次`;
  if (mLateEl) mLateEl.textContent = lateCount + ` 次`;
  if (mEarlyEl) mEarlyEl.textContent = earlyCount + ` 次`;
  if (mLeaveEl) mLeaveEl.textContent = leaveHours.toFixed(1) + ` h`;
}

function getCurrentAnniversaryWindow(joinDateStr) {
  if (!joinDateStr) return null;
  const joinParts = joinDateStr.split(/[-/]/);
  const jYear = parseInt(joinParts[0], 10), jMonth = parseInt(joinParts[1], 10) - 1, jDay = parseInt(joinParts[2], 10);
  const now = new Date();
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  prevMonthEnd.setHours(0, 0, 0, 0);

  let y = jYear, start = null, end = null;
  while (true) {
    const s = new Date(y, jMonth, jDay);
    const e = new Date(y + 1, jMonth, jDay - 1, 23, 59, 59, 999);
    if (prevMonthEnd >= s && prevMonthEnd <= e) { start = s; end = e; break; }
    if (prevMonthEnd < s) { start = new Date(jYear, jMonth, jDay); end = new Date(jYear + 1, jMonth, jDay - 1, 23, 59, 59, 999); break; }
    y++;
    if (y > jYear + 100) break;
  }
  return { start, end, prevMonthEnd };
}

function isFinalApproved(status) {
  return status === `同意` || status === `同意_補件後`;
}

function togglePwChange() {
  const area = document.getElementById(`pwChangeArea`);
  area.classList.toggle(`open`);
  if (area.classList.contains(`open`)) document.getElementById(`pwOld`).focus();
  else [`pwOld`, `pwNew`, `pwConfirm`].forEach(id => document.getElementById(id).value = ``);
}

async function changePassword() {
  const oldPw = document.getElementById(`pwOld`).value;
  const newPw = document.getElementById(`pwNew`).value;
  const confirm = document.getElementById(`pwConfirm`).value;
  if (!oldPw || !newPw || !confirm) { showToast(`⚠️ 請填寫所有密碼欄位`); return; }
  if (newPw !== confirm) { showToast(`⚠️ 新密碼與確認密碼不一致`); return; }
  if (newPw.length < 4) { showToast(`⚠️ 新密碼至少需要 4 個字元`); return; }
  try {
    const res = await callGAS({ action: `changePassword`, empId: currentUser.empId, oldPassword: oldPw, newPassword: newPw });
    if (res.status === `ok`) {
      showToast(`✅ 密碼已成功修改`);
      togglePwChange();
    } else {
      showToast(`⚠️ ` + (res.message || `舊密碼不正確`));
    }
  } catch (e) {
    showToast(`⚠️ 連線失敗，請確認網路後再試`);
  }
}

function updateLeaveBalanceDisplay() {
  const annualEl = document.getElementById(`leaveAnnualBalance`);
  const compEl = document.getElementById(`leaveCompBalance`);
  if (!annualEl || !compEl) return;
  if (currentUser && currentUser.quota) {
    annualEl.textContent = `${currentUser.quota.specialLeaveRemainingHours} 小時`;
    compEl.textContent = `${currentUser.quota.compLeaveRemainingHours} 小時`;
  } else {
    annualEl.textContent = `— 小時`;
    compEl.textContent = `— 小時`;
  }

  const annualPendingEl = document.getElementById(`leaveAnnualPending`);
  const compPendingEl = document.getElementById(`leaveCompPending`);
  const annualPending = calculatePendingLeaveHours(`特休`);
  const compPending = calculatePendingLeaveHours(`補休`);

  if (annualPendingEl) {
    if (annualPending > 0) {
      annualPendingEl.textContent = `審核中：${annualPending.toFixed(1)} 小時`;
      annualPendingEl.style.display = `block`;
    } else {
      annualPendingEl.style.display = `none`;
    }
  }
  if (compPendingEl) {
    if (compPending > 0) {
      compPendingEl.textContent = `審核中：${compPending.toFixed(1)} 小時`;
      compPendingEl.style.display = `block`;
    } else {
      compPendingEl.style.display = `none`;
    }
  }
}

function initYearMonthQuerySelectors() {
  const yearSel = document.getElementById(`queryYearSelect`);
  if (!yearSel || !currentUser) return;
  const nowYear = new Date().getFullYear();
  let joinYear = nowYear;
  if (currentUser.joinDate) {
    const jY = parseInt(String(currentUser.joinDate).split(/[-/]/)[0], 10);
    if (!isNaN(jY)) joinYear = jY;
  }
  let html = ``;
  for (let y = nowYear; y >= joinYear; y--) {
    html += `<option value="${y}">${y} 年</option>`;
  }
  yearSel.innerHTML = html;
  yearSel.value = nowYear;
}

function getQueryDateRange(year, month) {
  if (!month) return { start: new Date(year, 0, 1), end: new Date(year, 11, 31, 23, 59, 59, 999) };
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 0, 23, 59, 59, 999) };
}

function sumApprovedHoursInRange(type, start, end) {
  let total = 0;
  records.forEach(r => {
    if (!matchEmpId(r.empId, currentUser?.empId) || r.type !== type || !isFinalApproved(r.status)) return;
    const d = safeNewDate(r.date);
    if (d < start || d > end) return;
    if (r.hours !== undefined && r.hours !== null && r.hours !== ``) {
      total += parseFloat(r.hours) || 0;
    } else if (r.startTime && r.endTime) {
      const s = timeToMin(r.startTime), e = timeToMin(r.endTime);
      let diff = e - s;
      if (s <= 720 && e >= 780) diff -= 60;
      total += Math.max(0, diff / 60);
    }
  });
  return total;
}

function countMissedLateEarlyInRange(start, end) {
  if (!currentUser || currentUser.empType === `兼任`) return { missedCount: 0, lateEarlyCount: 0 };

  const earliestD = getEarliestCheckDate();
  const now = new Date();
  const endCheckDate = end < (new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)) ? end : (new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59));

  const myPunches = records.filter(r => matchEmpId(r.empId, currentUser.empId) && (r.type === `上班` || r.type === `下班`));
  const mySupps = records.filter(r => matchEmpId(r.empId, currentUser.empId) && r.type === `補打卡`);
  const myLeaves = records.filter(r => matchEmpId(r.empId, currentUser.empId) && r.type === `請假` && isFinalApproved(r.status));

  const dailyPunches = {};
  myPunches.forEach(r => {
    const normD = normalizeDate(r.date);
    if (!dailyPunches[normD]) dailyPunches[normD] = { in: null, out: null };
    if (r.type === `上班`) { if (!dailyPunches[normD].in || r.time < dailyPunches[normD].in) dailyPunches[normD].in = r.time; }
    else { if (!dailyPunches[normD].out || r.time > dailyPunches[normD].out) dailyPunches[normD].out = r.time; }
  });
  mySupps.filter(r => isFinalApproved(r.status)).forEach(r => {
    const normD = normalizeDate(r.date);
    if (!dailyPunches[normD]) dailyPunches[normD] = { in: null, out: null };
    if (r.subType === `上班`) dailyPunches[normD].in = r.time;
    if (r.subType === `下班`) dailyPunches[normD].out = r.time;
  });

  let missedCount = 0, lateEarlyCount = 0;
  let dIndex = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  let loops = 0;

  while (dIndex <= endCheckDate && loops < 400) {
    loops++;
    if (earliestD && (new Date(dIndex)).setHours(0,0,0,0) < earliestD) { dIndex.setDate(dIndex.getDate() + 1); continue; }
    
    const dow = dIndex.getDay();
    const dateStr = `${dIndex.getFullYear()}-${String(dIndex.getMonth()+1).padStart(2,`0`)}-${String(dIndex.getDate()).padStart(2,`0`)}`;
    const dateQueryStr = `${dIndex.getFullYear()}/${dIndex.getMonth()+1}/${dIndex.getDate()}`;
    const isWeekend = (dow === 0 || dow === 6);
    const isHoliday = currentUser.holidayStrings && currentUser.holidayStrings.includes(dateStr);

    if (!isWeekend && !isHoliday) {
      const punch = dailyPunches[dateQueryStr] || { in: null, out: null };
      const dayLeaves = myLeaves.filter(r => dIndex >= safeNewDate(r.date) && dIndex <= safeNewDate(r.endDate || r.date)).map(r => ({ start: 540, end: 1080 }));
      const shift = getShiftMinutesForDate(dateQueryStr, currentUser.empId);

      if (!isRangeExempted(shift.start, shift.end, dayLeaves)) {
        if (!punch.in && !punch.out) missedCount += 2;
        else {
          if (!punch.in) missedCount += 1;
          else if (timeToMin(punch.in) > shift.start && !isRangeExempted(shift.start, timeToMin(punch.in), dayLeaves)) lateEarlyCount++;
          if (!punch.out) missedCount += 1;
          else if (timeToMin(punch.out) < shift.end && !isRangeExempted(timeToMin(punch.out), shift.end, dayLeaves)) lateEarlyCount++;
        }
      }
    }
    dIndex.setDate(dIndex.getDate() + 1);
  }
  return { missedCount, lateEarlyCount };
}

function calculatePendingLeaveHours(subType) {
  if (!currentUser) return 0;
  
  // 1. 嚴格定義審核中狀態（未包含 '已撤回'、'同意'、'拒絕'）
  const pendingStatuses = ['待審', '補件', '待第二次審查'];
  
  let total = 0;
  records.forEach(r => {
    // 2. 條件檢查：工號符合 + 類型為請假 + 假別符合 + 狀態屬於審核中
    if (!matchEmpId(r.empId, currentUser.empId) || 
        r.type !== '請假' || 
        r.subType !== subType || 
        !pendingStatuses.includes(r.status)) {
      return; // 狀態為 '已撤回' 會在這裡直接被剔除
    }
    
    // 3. 加總審核中時數
    total += (r.hours !== undefined && r.hours !== null && r.hours !== '') 
      ? (parseFloat(r.hours) || 0) 
      : calculateLeaveHoursLocal(r, currentUser?.holidayStrings || []);
  });
  
  return total;
}
function hasAnyRecordInRange(start, end) {
  if (!currentUser) return false;
  return records.some(r => {
    if (!matchEmpId(r.empId, currentUser.empId) || ![`上班`, `下班`, `補打卡`, `請假`, `加班`].includes(r.type)) return false;
    const d = safeNewDate(r.date || r.timestamp);
    return !isNaN(d.getTime()) && d >= start && d <= end;
  });
}          

function queryYearMonthRecords() {
  if (!currentUser) return;
  const yearVal = document.getElementById(`queryYearSelect`).value;
  const year = yearVal ? parseInt(yearVal, 10) : new Date().getFullYear();
  const monthVal = document.getElementById(`queryMonthSelect`).value;
  const month = monthVal ? parseInt(monthVal, 10) : null;
  const { start, end } = getQueryDateRange(year, month);

  const rangeSpan = document.getElementById(`y-range-span`);
  if (rangeSpan) rangeSpan.textContent = month ? `(${year}/${month} 全月)` : `(${year} 全年)`;

  document.getElementById(`queryResultArea`).style.display = `block`;

  const otHours = sumApprovedHoursInRange(`加班`, start, end);
  const leaveHours = sumApprovedHoursInRange(`請假`, start, end);
  const { missedCount, lateEarlyCount } = countMissedLateEarlyInRange(start, end);

  document.getElementById(`y-ot`).textContent = otHours.toFixed(1) + ` h`;
  document.getElementById(`y-miss`).textContent = missedCount + ` 次`;
  document.getElementById(`y-lateearly`).textContent = lateEarlyCount + ` 次`;
  document.getElementById(`y-leave`).textContent = leaveHours.toFixed(1) + ` h`;

  renderAttendanceIssuesForRangeByMonth(start, end, `yearIssueList`);
}
