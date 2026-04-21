window.ToolPages = window.ToolPages || {};

window.ToolPages["check-black-4c"] = function (ctx) {
  var resultBox = document.getElementById("resultBox");
  var resultMode = document.getElementById("resultMode");
  var statusBadge = document.getElementById("statusBadge");

  function getEl(id) {
    return document.getElementById(id);
  }

  function clampPercentValue(value, fallback) {
    if (value === "" || value === null || value === undefined) {
      return String(typeof fallback === "number" ? fallback : 0);
    }

    var n = parseFloat(value);
    if (isNaN(n)) return String(typeof fallback === "number" ? fallback : 0);
    if (n < 0) n = 0;
    if (n > 100) n = 100;
    return String(parseFloat(n.toFixed(2)));
  }

  function attachClampInput(id, fallback) {
    var el = getEl(id);
    if (!el) return;

    el.addEventListener("input", function () {
      if (el.value === "") return;

      var n = parseFloat(el.value);
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
      }
    });

    el.addEventListener("blur", function () {
      el.value = clampPercentValue(el.value, fallback);
    });
  }

  function getNumber(id, fallback) {
    var el = getEl(id);
    if (!el) return typeof fallback === "number" ? fallback : 0;

    var n = parseFloat(el.value);
    if (isNaN(n)) return typeof fallback === "number" ? fallback : 0;
    if (n < 0) n = 0;
    if (n > 100) n = 100;
    return n;
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
      html += '<div class="result-line ' + (line.type || "") + '">' + escapeHtml(line.text) + "</div>";
    }

    resultBox.innerHTML = html;
  }

  function buildPayload(mode) {
    return {
      mode: mode,
      minK: getNumber("minKInput", 80),
      minCMY: getNumber("minCMYInput", 0.1),
      neutralTolerance: getNumber("neutralToleranceInput", 15),
      checkFill: getEl("checkFill").checked,
      checkStroke: getEl("checkStroke").checked,
      includeSpot: getEl("includeSpot").checked
    };
  }

  function renderSuccess(result) {
    var lines = [];
    var hasIssue = Number(result.matchCount || 0) > 0;

    if (result.mode === "clear") {
      lines.push({ type: "success", text: "Da clear selection" });
    } else if (hasIssue) {
      lines.push({
        type: "error",
        text: result.mode === "preview"
          ? "Phat hien object den bi 4 mau va da highlight"
          : "Phat hien object den bi 4 mau"
      });
    } else {
      lines.push({
        type: "success",
        text: result.mode === "preview"
          ? "Khong thay object den 4 mau de highlight"
          : "Khong phat hien object den 4 mau"
      });
    }

    if (typeof result.matchCount !== "undefined") {
      lines.push({ type: "info", text: "Matched objects: " + result.matchCount });
    }

    if (typeof result.fillCount !== "undefined") {
      lines.push({ type: "info", text: "Fill hits: " + result.fillCount });
    }

    if (typeof result.strokeCount !== "undefined") {
      lines.push({ type: "info", text: "Stroke hits: " + result.strokeCount });
    }

    if (typeof result.selectedCount !== "undefined") {
      lines.push({ type: "info", text: "Selected: " + result.selectedCount });
    }

    if (result.document) {
      lines.push({ type: "muted", text: "Document: " + result.document });
    }

    if (result.criteriaText) {
      lines.push({ type: "muted", text: result.criteriaText });
    }

    if (result.message) {
      lines.push({ type: "muted", text: result.message });
    }

    setResultLines(lines);
  }

  function renderError(message) {
    setResultLines([
      { type: "error", text: "Co loi xay ra" },
      { type: "muted", text: message || "Unknown error" }
    ]);
  }

  async function runMode(mode) {
    try {
      setStatus("running", "Running");

      if (mode === "scan") {
        resultMode.textContent = "Scan";
        setResultLines([{ type: "muted", text: "Dang quet object den bi 4 mau..." }]);
      } else if (mode === "preview") {
        resultMode.textContent = "Preview";
        setResultLines([{ type: "muted", text: "Dang highlight object den bi 4 mau..." }]);
      } else {
        resultMode.textContent = "Clear";
        setResultLines([{ type: "muted", text: "Dang clear selection..." }]);
      }

      var result = await runBlackCheck(buildPayload(mode));

      if (result && result.status === "ok") {
        setStatus("success", "Success");
        renderSuccess(result);
      } else {
        setStatus("error", "Error");
        renderError(result && result.message ? result.message : "Tool failed");
      }
    } catch (e) {
      setStatus("error", "Error");
      renderError(String(e));
    }
  }

  function onReset() {
    getEl("minKInput").value = "80";
    getEl("minCMYInput").value = "0.1";
    getEl("neutralToleranceInput").value = "15";
    getEl("checkFill").checked = true;
    getEl("checkStroke").checked = true;
    getEl("includeSpot").checked = false;

    resultMode.textContent = "Idle";
    setStatus("ready", "Ready");
    setResultLines([{ type: "muted", text: "Da reset UI." }]);
  }

  function bindEvents() {
    var backHomeBtn = getEl("backHomeBtn");
    var scanBtn = getEl("scanBtn");
    var previewBtn = getEl("previewBtn");
    var clearSelectionBtn = getEl("clearSelectionBtn");
    var resetBtn = getEl("resetBtn");

    if (backHomeBtn) {
      backHomeBtn.addEventListener("click", function () {
        ctx.goHome();
      });
    }

    if (scanBtn) {
      scanBtn.addEventListener("click", function () {
        runMode("scan");
      });
    }

    if (previewBtn) {
      previewBtn.addEventListener("click", function () {
        runMode("preview");
      });
    }

    if (clearSelectionBtn) {
      clearSelectionBtn.addEventListener("click", function () {
        runMode("clear");
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", onReset);
    }
  }

  attachClampInput("minKInput", 80);
  attachClampInput("minCMYInput", 0.1);
  attachClampInput("neutralToleranceInput", 15);
  bindEvents();
};
