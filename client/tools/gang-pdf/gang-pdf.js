window.ToolPages = window.ToolPages || {};

window.ToolPages["gang-pdf"] = function (ctx) {
  var resultBox = document.getElementById("resultBox");
  var resultMode = document.getElementById("resultMode");
  var statusBadge = document.getElementById("statusBadge");
  var fileList = document.getElementById("fileList");
  var fileSummary = document.getElementById("fileSummary");

  var filesState = [];

  function getEl(id) {
    return document.getElementById(id);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function setStatus(type, text) {
    statusBadge.className = "status-badge " + type;
    statusBadge.textContent = text;
  }

  function setResultLines(lines) {
    var html = "";
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      html += '<div class="result-line ' + (line.type || "") + '">' + escapeHtml(line.text) + "</div>";
    }
    resultBox.innerHTML = html;
  }

  function getNumber(id, fallback) {
    var el = getEl(id);
    if (!el) return fallback;
    var n = parseFloat(el.value);
    if (isNaN(n)) return fallback;
    return n;
  }

  function clampInput(id, minValue, fallback) {
    var el = getEl(id);
    if (!el) return;

    el.addEventListener("blur", function () {
      var n = parseFloat(el.value);
      if (isNaN(n)) {
        el.value = String(fallback);
        return;
      }
      if (n < minValue) n = minValue;
      el.value = String(parseFloat(n.toFixed(2)));
    });
  }

  function normalizeQty(value) {
    var n = parseInt(value, 10);
    if (isNaN(n) || n < 1) return 1;
    return n;
  }

  function updateSummary() {
    if (!filesState.length) {
      fileSummary.textContent = "Chua co file nao.";
      return;
    }

    var totalQty = 0;
    for (var i = 0; i < filesState.length; i++) {
      totalQty += normalizeQty(filesState[i].qty);
    }

    fileSummary.textContent = filesState.length + " file | Tong so luong: " + totalQty;
  }

  function renderFiles() {
    updateSummary();

    if (!filesState.length) {
      fileList.className = "file-list empty";
      fileList.innerHTML = "Hay chon file PDF de bat dau.";
      return;
    }

    fileList.className = "file-list";

    var html = "";
    for (var i = 0; i < filesState.length; i++) {
      var item = filesState[i];
      var meta = item.widthMm && item.heightMm
        ? (item.widthMm.toFixed(2) + " x " + item.heightMm.toFixed(2) + " mm")
        : "Chua do trim box";

      html += ''
        + '<div class="file-row">'
        +   '<div>'
        +     '<div class="file-name">' + escapeHtml(item.name) + '</div>'
        +     '<div class="file-meta">' + escapeHtml(meta) + '</div>'
        +   '</div>'
        +   '<div class="qty-box">'
        +     '<div class="qty-label">Qty</div>'
        +     '<input class="qty-input" data-index="' + i + '" type="number" min="1" step="1" value="' + normalizeQty(item.qty) + '">'
        +   '</div>'
        + '</div>';
    }

    fileList.innerHTML = html;

    var qtyInputs = fileList.querySelectorAll(".qty-input");
    for (var j = 0; j < qtyInputs.length; j++) {
      qtyInputs[j].addEventListener("input", function () {
        var index = parseInt(this.getAttribute("data-index"), 10);
        if (isNaN(index) || !filesState[index]) return;
        filesState[index].qty = normalizeQty(this.value);
        this.value = String(filesState[index].qty);
        updateSummary();
      });
    }
  }

  function uniqueFilesFromInput(fileListInput) {
    var seen = {};
    var next = [];
    var i;

    for (i = 0; i < filesState.length; i++) {
      seen[filesState[i].path] = true;
      next.push(filesState[i]);
    }

    for (i = 0; i < fileListInput.length; i++) {
      var file = fileListInput[i];
      var path = file.path || "";
      if (!path || seen[path]) continue;

      seen[path] = true;
      next.push({
        path: path,
        name: file.name || path.split(/[\\/]/).pop(),
        qty: 1,
        widthMm: null,
        heightMm: null
      });
    }

    return next;
  }

  function buildPayload() {
    var files = [];
    for (var i = 0; i < filesState.length; i++) {
      files.push({
        path: filesState[i].path,
        name: filesState[i].name,
        qty: normalizeQty(filesState[i].qty)
      });
    }

    return {
      files: files,
      sheet: {
        widthMm: getNumber("sheetWidthInput", 430),
        heightMm: getNumber("sheetHeightInput", 320),
        gapXMm: getNumber("gapXInput", 3),
        gapYMm: getNumber("gapYInput", 3),
        marginTopMm: getNumber("marginTopInput", 10),
        marginRightMm: getNumber("marginRightInput", 10),
        marginBottomMm: getNumber("marginBottomInput", 10),
        marginLeftMm: getNumber("marginLeftInput", 10)
      },
      allowRotate: getEl("allowRotate").checked,
      addCropMarks: getEl("addCropMarks").checked,
      addRegistrationMarks: getEl("addRegistrationMarks").checked
    };
  }

  function applyMeasuredFiles(measuredFiles) {
    var byPath = {};
    var i;

    for (i = 0; i < measuredFiles.length; i++) {
      byPath[measuredFiles[i].path] = measuredFiles[i];
    }

    for (i = 0; i < filesState.length; i++) {
      if (byPath[filesState[i].path]) {
        filesState[i].widthMm = byPath[filesState[i].path].widthMm;
        filesState[i].heightMm = byPath[filesState[i].path].heightMm;
      }
    }

    renderFiles();
  }

  function renderAnalyzeResult(result) {
    var lines = [];
    var i;

    lines.push({
      type: "success",
      text: result.mode === "layout" ? "Make Layout thanh cong" : "Analyze thanh cong"
    });
    lines.push({ type: "info", text: "Tong sheets: " + result.totalSheets });
    lines.push({ type: "info", text: "Tong placements: " + result.totalPlaced });
    lines.push({ type: "info", text: "Ty le dung dien tich: " + result.utilizationText });

    if (result.document) {
      lines.push({ type: "info", text: "Document: " + result.document });
    }

    for (i = 0; i < result.fileSummaries.length; i++) {
      lines.push({
        type: "muted",
        text: result.fileSummaries[i].name + ": " + result.fileSummaries[i].placed + "/" + result.fileSummaries[i].qty + " | " + result.fileSummaries[i].widthMm + " x " + result.fileSummaries[i].heightMm + " mm"
      });
    }

    if (result.sheetSummaries && result.sheetSummaries.length) {
      for (i = 0; i < result.sheetSummaries.length; i++) {
        lines.push({ type: "info", text: result.sheetSummaries[i] });
      }
    }

    if (result.message) {
      lines.push({ type: "muted", text: result.message });
    }

    setResultLines(lines);
  }

  async function runAnalyze() {
    if (!filesState.length) {
      setStatus("error", "Error");
      setResultLines([
        { type: "error", text: "Chua co file PDF" },
        { type: "muted", text: "Hay chon it nhat 1 file PDF." }
      ]);
      return;
    }

    try {
      setStatus("running", "Running");
      resultMode.textContent = "Analyze";
      setResultLines([{ type: "muted", text: "Dang do trim box va tinh layout..." }]);

      var result = await runGangPdfAnalyze(buildPayload());
      if (result && result.status === "ok") {
        setStatus("success", "Success");
        applyMeasuredFiles(result.files || []);
        renderAnalyzeResult(result);
      } else {
        setStatus("error", "Error");
        setResultLines([
          { type: "error", text: "Analyze that bai" },
          { type: "muted", text: result && result.message ? result.message : "Unknown error" }
        ]);
      }
    } catch (e) {
      setStatus("error", "Error");
      setResultLines([
        { type: "error", text: "Analyze that bai" },
        { type: "muted", text: String(e) }
      ]);
    }
  }

  async function runMakeLayout() {
    if (!filesState.length) {
      setStatus("error", "Error");
      setResultLines([
        { type: "error", text: "Chua co file PDF" },
        { type: "muted", text: "Hay chon it nhat 1 file PDF." }
      ]);
      return;
    }

    try {
      setStatus("running", "Running");
      resultMode.textContent = "Make Layout";
      setResultLines([{ type: "muted", text: "Dang tao document va place PDF len artboard..." }]);

      var result = await runGangPdfLayout(buildPayload());
      if (result && result.status === "ok") {
        setStatus("success", "Success");
        applyMeasuredFiles(result.files || []);
        renderAnalyzeResult(result);
      } else {
        setStatus("error", "Error");
        setResultLines([
          { type: "error", text: "Make Layout that bai" },
          { type: "muted", text: result && result.message ? result.message : "Unknown error" }
        ]);
      }
    } catch (e) {
      setStatus("error", "Error");
      setResultLines([
        { type: "error", text: "Make Layout that bai" },
        { type: "muted", text: String(e) }
      ]);
    }
  }

  function onReset() {
    filesState = [];
    getEl("pdfInput").value = "";
    getEl("sheetWidthInput").value = "430";
    getEl("sheetHeightInput").value = "320";
    getEl("gapXInput").value = "3";
    getEl("gapYInput").value = "3";
    getEl("marginTopInput").value = "10";
    getEl("marginRightInput").value = "10";
    getEl("marginBottomInput").value = "10";
    getEl("marginLeftInput").value = "10";
    getEl("allowRotate").checked = true;
    getEl("addCropMarks").checked = true;
    getEl("addRegistrationMarks").checked = true;
    resultMode.textContent = "Idle";
    setStatus("ready", "Ready");
    renderFiles();
    setResultLines([{ type: "muted", text: "Da reset UI." }]);
  }

  function bindEvents() {
    var backHomeBtn = getEl("backHomeBtn");
    var pickPdfBtn = getEl("pickPdfBtn");
    var pdfInput = getEl("pdfInput");
    var clearFilesBtn = getEl("clearFilesBtn");
    var analyzeBtn = getEl("analyzeBtn");
    var makeLayoutBtn = getEl("makeLayoutBtn");
    var resetBtn = getEl("resetBtn");

    if (backHomeBtn) {
      backHomeBtn.addEventListener("click", function () {
        ctx.goHome();
      });
    }

    if (pickPdfBtn) {
      pickPdfBtn.addEventListener("click", function () {
        pdfInput.click();
      });
    }

    if (pdfInput) {
      pdfInput.addEventListener("change", function (event) {
        filesState = uniqueFilesFromInput(event.target.files || []);
        renderFiles();
      });
    }

    if (clearFilesBtn) {
      clearFilesBtn.addEventListener("click", function () {
        filesState = [];
        pdfInput.value = "";
        renderFiles();
      });
    }

    if (analyzeBtn) {
      analyzeBtn.addEventListener("click", runAnalyze);
    }

    if (makeLayoutBtn) {
      makeLayoutBtn.addEventListener("click", runMakeLayout);
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", onReset);
    }
  }

  clampInput("sheetWidthInput", 1, 430);
  clampInput("sheetHeightInput", 1, 320);
  clampInput("gapXInput", 0, 3);
  clampInput("gapYInput", 0, 3);
  clampInput("marginTopInput", 0, 10);
  clampInput("marginRightInput", 0, 10);
  clampInput("marginBottomInput", 0, 10);
  clampInput("marginLeftInput", 0, 10);

  bindEvents();
  renderFiles();
};
