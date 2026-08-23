// ── 本機專用欄位處理：送給後端前要剔除 _pendingSync ──
function stripLocalFields(record) {
  const { _pendingSync, ...payload } = record;
  return payload;
}

// ── 離線佇列存取（原本兩處重複的邏輯，統一成一個函式）──
function queueOffline(record) {
  let offlineQueue = JSON.parse(localStorage.getItem(`tjcpm_offline_queue`) || `[]`);
  offlineQueue.push(record);
  localStorage.setItem(`tjcpm_offline_queue`, JSON.stringify(offlineQueue));
}

// ── 統一的「建立紀錄 + 嘗試同步」流程，取代 7 個 submit 函式裡重複的段落 ──
async function createAndSyncRecord(record, { onSuccessMsg } = {}) {
  record._pendingSync = true;
  records.unshift(record);
  saveRecords();
  renderAllList();

  if (!isOnline) {
    queueOffline(record);
    return { synced: false, queued: true };
  }

  const ok = await syncToSheet(record);
  if (ok) {
    delete record._pendingSync;
    saveRecords();
    if (onSuccessMsg) showToast(onSuccessMsg);
    return { synced: true, queued: false };
  } else {
    queueOffline(record);
    showToast(`⚠️ 同步失敗，已加入補傳佇列，將自動重試`);
    return { synced: false, queued: true };
  }
}

// ── 合併後端快照與本機紀錄（upsert），取代原本的整批覆蓋 ──
function mergeUserRecords(existingRecords, incomingRecords, empId) {
  const incomingKeys = new Set(incomingRecords.map(r => String(r.clientId || r.id)));
  const others = existingRecords.filter(r => !matchEmpId(r.empId, empId));
  const pendingLocal = existingRecords.filter(r =>
    matchEmpId(r.empId, empId) &&
    r._pendingSync &&
    !incomingKeys.has(String(r.clientId || r.id))
  );
  return [...others, ...incomingRecords, ...pendingLocal];
}
