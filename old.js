/* 0916 function calculateCompensationBalance(refDateStr) {
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
}*/
// 💡 每次改版就把這行改掉（例如用日期或流水號），用來觸發「登出後清一次快取」
/*const APP_BUILD_VERSION = '2026-08-26-v1';

async function clearStaleCacheIfNeeded() {
  const savedVersion = localStorage.getItem('tjcpm_buildVersion');
  if (savedVersion === APP_BUILD_VERSION) {
    return false; // 版本相同，不需要清
  }

  try {
    // 1. 清除舊的 Service Worker 註冊
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) await reg.unregister();
    }
    // 2. 清除 Cache Storage（SW 底下實際存放檔案的地方）
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  } catch (e) {
    console.warn('清除快取時發生錯誤：', e);
  }

  // 3. 記下這個版本已經清過了，下次登出就不會再觸發
  localStorage.setItem('tjcpm_buildVersion', APP_BUILD_VERSION);
  return true;}
  */
/* 8/31 async function retractRecord(recordId, type, clientId) {
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
      if (data.status === `ok`) {
        // 1. 替換本機快取紀錄
      if (data.updates) {
        records = data.updates;
        saveRecords();
      }

        // 2. 💡 關鍵修復：更新 currentUser 的 quota 並同步回 sessionStorage
        if (data.quota) {
          currentUser.quota = data.quota;
          sessionStorage.setItem(`tjcpm_user`, JSON.stringify(currentUser));
        }

        // 3. 重新渲染畫面與更新上方額度卡片
        renderAllList();
        updateLeaveBalanceDisplay(); // 👈 重新計算並更新 UI
      }
    } else {
      showToast(`⚠️ ` + (res.message || `撤回失敗`));
    }
  } catch (e) {
    showToast(`⚠️ 連線失敗`);
  }
}*/
/* 8/31 async function checkApprovalUpdates() {
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
        }
      });
      renderAllList();

      // ★ 新增：同步更新最新的 quota，這樣才會反映扣除後的餘額
      if (data.quota) {
        currentUser.quota = data.quota;
        sessionStorage.setItem(`tjcpm_user`, JSON.stringify(currentUser));
      }
      updateLeaveBalanceDisplay();
    }
  } catch (e) {}
}*/
/*function formatDateTimeRange(r) {
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
  console.log(r.type, r.hours)
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
}*/
/*async function syncProfileAndAccumulatedLeaves() {
  try {
    const data = await callGAS({ action: `getMyStatus`, empId: currentUser.empId });
    if (data.status === `ok` && data.updates) {
      localStorage.setItem(storageKey('tjcpm_recordsLastSyncTime', currentUser.empId), new Date().toISOString());
      const snapshotKey = `tjcpm_lastSync_${currentUser.empId}`;
      localStorage.setItem(snapshotKey, JSON.stringify({ updates: data.updates, quota: data.quota || null }));

      records = data.updates;
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
          localStorage.setItem(storageKey('tjcpm_settledAccumulated', currentUser.empId), JSON.stringify(data.settledAccumulated));
        }
        if (data.hasOwnProperty(`isActiveProxy`)) currentUser.isActiveProxy = data.isActiveProxy;
        applyAdminSubTabVisibility();
        sessionStorage.setItem(`tjcpm_user`, JSON.stringify(currentUser));
      }

      //8/20 document.getElementById(`profileAnnualLeave`).textContent = `${data.quota ? data.quota.specialLeaveRemainingHours : '—'} 小時`;
      //8/20 document.getElementById(`profileCompensatoryLeave`).textContent = `${data.quota ? data.quota.compLeaveRemainingHours : '—'} 小時`;

     // document.getElementById(`accumAnnual`).textContent = `${data.quota ? data.quota.specialLeaveUsedHours : annualLeaveUsed}h`;
     // document.getElementById(`accumComp`).textContent = `${data.quota ? data.quota.compLeaveUsedHours : compLeaveUsed}h`;
      document.getElementById(`accumAnnual`).textContent = `${annualLeaveUsed}h`;
      document.getElementById(`accumComp`).textContent = `${compLeaveUsed}h`;
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
}*/
