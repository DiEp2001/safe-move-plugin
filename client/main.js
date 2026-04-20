var resultBox = document.getElementById("resultBox");
var resultMode = document.getElementById("resultMode");
var statusBadge = document.getElementById("statusBadge");

function getEl(id) {
  return document.getElementById(id);
}

function clampCMYKValue(value) {
  if (value === "" || value === null || value === undefined) return "";

  var n = parseFloat(value);
  if (isNaN(n)) return "";

  if (n < 0) n = 0;
  if (n > 100) n = 100;

  return String(parseFloat(n.toFixed(2)));
}

function attachClampInput(id) {
  var el = getEl(id);
  if (!el) return;

  el.addEventListener("input", function () {
    var value = el.value;
    if (value === "") return;

    var n = parseFloat(value);
    if (isNaN(n)) {
      el.value = "";
      return;
    }

    if (n < 0) {
      el.value = "0";
      return;
    }

    if (n > 100) {
      el.value = "100";
      return;
    }
  });

  el.addEventListener("blur", function () {
    el.value = clampCMYKValue(el.value);
  });
}

function getNumber(id) {
  var el = getEl(id);
  if (!el) return 0;

  var val = el.value;
  if (val === "" || val === null) return 0;

  var n = parseFloat(val);
  if (isNaN(n)) return 0;
  if (n < 0) n = 0;
  if (n > 100) n = 100;

  return n;
}

function getExcludeList(id) {
  var el = getEl(id);
  var text = el ? (el.value || "") : "";
  var lines = text.split(/\r?\n/);
  var arr = [];

  for (var i = 0; i < lines.length; i++) {
    var t = String(lines[i]).replace(/^\s+|\s+$/g, "");
    if (t) arr.push(t);
  }

  return arr;
}

function buildRule(prefix) {
  return {
    fill: {
      c: getNumber(prefix + "FillC"),
      m: getNumber(prefix + "FillM"),
      y: getNumber(prefix + "FillY"),
      k: getNumber(prefix + "FillK")
    },
    stroke: {
      c: getNumber(prefix + "StrokeC"),
      m: getNumber(prefix + "StrokeM"),
      y: getNumber(prefix + "StrokeY"),
      k: getNumber(prefix + "StrokeK")
    },
    spot: getEl(prefix + "Spot").checked,
    pantone: getEl(prefix + "Pantone").checked,
    excludeList: getExcludeList(prefix + "Exclude"),
    tolerance: 0.2
  };
}

function buildPayload(mode, previewTarget) {
  return {
    mode: mode,
    previewTarget: previewTarget || "all",
    dieRule: buildRule("die"),
    dimRule: buildRule("dim"),
    dieLayerName: "Die Cut",
    dimLayerName: "Dimension",
    showDieLayer: getEl("showDieLayer").checked,
    showDimLayer: getEl("showDimLayer").checked
  };
}

function setStatus(type, text) {
  statusBadge.className = "status-badge " + type;
  statusBadge.textContent = text;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function setResultLines(lines) {
  var html = "";

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    html += '<div class="result-line ' + (line.type || "") + '">' + escapeHtml(line.text) + '</div>';
  }

  resultBox.innerHTML = html;
}

function renderSuccess(result) {
  var lines = [];

  if (result.mode === "move") {
    lines.push({ type: "success", text: "✔ Move thành công" });
  } else if (result.previewTarget === "die") {
    lines.push({ type: "success", text: "✔ Preview Die Cut thành công" });
  } else if (result.previewTarget === "dim") {
    lines.push({ type: "success", text: "✔ Preview Dimension thành công" });
  } else {
    lines.push({ type: "success", text: "✔ Preview thành công" });
  }

  if (typeof result.dieCount !== "undefined") {
    lines.push({ type: "info", text: "Die Cut: " + (result.dieCount || 0) + " objects" });
  }

  if (typeof result.dimCount !== "undefined") {
    lines.push({ type: "info", text: "Dimension: " + (result.dimCount || 0) + " objects" });
  }

  if (typeof result.selectedCount !== "undefined") {
    lines.push({ type: "info", text: "Selected: " + result.selectedCount + " objects" });
  }

  if (result.document) {
    lines.push({ type: "muted", text: "Document: " + result.document });
  }

  if (result.message) {
    lines.push({ type: "muted", text: result.message });
  }

  setResultLines(lines);
}

function renderError(message) {
  setResultLines([
    { type: "error", text: "✖ Có lỗi xảy ra" },
    { type: "muted", text: message || "Unknown error" }
  ]);
}

async function runPreviewTarget(target) {
  try {
    setStatus("running", "Running");

    if (target === "die") {
      resultMode.textContent = "Preview Die";
      setResultLines([{ type: "muted", text: "Đang highlight Die Cut..." }]);
    } else if (target === "dim") {
      resultMode.textContent = "Preview Dim";
      setResultLines([{ type: "muted", text: "Đang highlight Dimension..." }]);
    } else {
      resultMode.textContent = "Preview";
      setResultLines([{ type: "muted", text: "Đang highlight..." }]);
    }

    var payload = buildPayload("preview", target);
    var result = await runPreview(payload);

    if (result && result.status === "ok") {
      setStatus("success", "Success");
      renderSuccess(result);
    } else {
      setStatus("error", "Error");
      renderError(result && result.message ? result.message : "Preview failed");
    }
  } catch (e) {
    setStatus("error", "Error");
    renderError(String(e));
  }
}

async function onMove() {
  try {
    setStatus("running", "Running");
    resultMode.textContent = "Move";
    setResultLines([{ type: "muted", text: "Đang move object..." }]);

    var payload = buildPayload("move", "all");
    var result = await runMove(payload);

    if (result && result.status === "ok") {
      setStatus("success", "Success");
      renderSuccess(result);
    } else {
      setStatus("error", "Error");
      renderError(result && result.message ? result.message : "Move failed");
    }
  } catch (e) {
    setStatus("error", "Error");
    renderError(String(e));
  }
}

function clearInput(id) {
  var el = getEl(id);
  if (el) el.value = "";
}

function onReset() {
  var ids = [
    "dieFillC","dieFillM","dieFillY","dieFillK",
    "dieStrokeC","dieStrokeM","dieStrokeY","dieStrokeK",
    "dimFillC","dimFillM","dimFillY","dimFillK",
    "dimStrokeC","dimStrokeM","dimStrokeY","dimStrokeK"
  ];

  for (var i = 0; i < ids.length; i++) {
    clearInput(ids[i]);
  }

  getEl("dieSpot").checked = false;
  getEl("diePantone").checked = false;
  getEl("showDieLayer").checked = true;
  getEl("dieExclude").value = "";

  getEl("dimSpot").checked = false;
  getEl("dimPantone").checked = false;
  getEl("showDimLayer").checked = true;
  getEl("dimExclude").value = "";

  resultMode.textContent = "Idle";
  setStatus("ready", "Ready");
  setResultLines([{ type: "muted", text: "Đã reset UI." }]);
}

function initClampInputs() {
  var ids = [
    "dieFillC","dieFillM","dieFillY","dieFillK",
    "dieStrokeC","dieStrokeM","dieStrokeY","dieStrokeK",
    "dimFillC","dimFillM","dimFillY","dimFillK",
    "dimStrokeC","dimStrokeM","dimStrokeY","dimStrokeK"
  ];

  for (var i = 0; i < ids.length; i++) {
    attachClampInput(ids[i]);
  }
}

function initEvents() {
  var previewDieBtn = getEl("previewDieBtn");
  var previewDimBtn = getEl("previewDimBtn");
  var moveBtn = getEl("moveBtn");
  var resetBtn = getEl("resetBtn");

  if (previewDieBtn) {
    previewDieBtn.addEventListener("click", function () {
      runPreviewTarget("die");
    });
  }

  if (previewDimBtn) {
    previewDimBtn.addEventListener("click", function () {
      runPreviewTarget("dim");
    });
  }

  if (moveBtn) {
    moveBtn.addEventListener("click", onMove);
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", onReset);
  }
}

function init() {
  initClampInputs();
  initEvents();
  checkForUpdates();
}

init();

function compareVersion(a, b) {
  var pa = String(a).split(".");
  var pb = String(b).split(".");
  var len = Math.max(pa.length, pb.length);

  for (var i = 0; i < len; i++) {
    var na = parseInt(pa[i] || "0", 10);
    var nb = parseInt(pb[i] || "0", 10);

    if (na > nb) return 1;
    if (na < nb) return -1;
  }

  return 0;
}

function showUpdateBanner(info) {
  var banner = getEl("updateBanner");
  var text = getEl("updateText");
  var link = getEl("updateLink");

  if (!banner || !text || !link) return;

  text.textContent = "Bản mới: " + info.version + (info.notes ? " — " + info.notes : "");
  link.href = info.downloadUrl || "#";
  banner.classList.remove("hidden");
}

function checkForUpdates() {
  var url = "https://raw.githubusercontent.com/NgocDiep01112001/safe-move-plugin/main/version.json";

  fetch(url + "?t=" + Date.now())
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      if (!data || !data.version) return;

      if (compareVersion(data.version, CURRENT_VERSION) > 0) {
        showUpdateBanner(data);
      }
    })
    .catch(function () {
      // fail silently
    });
}