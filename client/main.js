var appView = document.getElementById("appView");

function getToolHtmlPath(toolName) {
  return "./tools/" + toolName + "/" + toolName + ".html";
}

function getToolCssPath(toolName) {
  return "./tools/" + toolName + "/" + toolName + ".css";
}

function getToolJsPath(toolName) {
  return "./tools/" + toolName + "/" + toolName + ".js";
}

function removeOldToolCss() {
  var old = document.getElementById("dynamic-tool-css");
  if (old) old.remove();
}

function removeOldToolJs() {
  var old = document.getElementById("dynamic-tool-js");
  if (old) old.remove();
}

function loadToolCss(toolName) {
  removeOldToolCss();

  var link = document.createElement("link");
  link.id = "dynamic-tool-css";
  link.rel = "stylesheet";
  link.href = getToolCssPath(toolName) + "?t=" + Date.now();
  document.head.appendChild(link);
}

function loadToolJs(toolName) {
  return new Promise(function (resolve, reject) {
    removeOldToolJs();

    var script = document.createElement("script");
    script.id = "dynamic-tool-js";
    script.src = getToolJsPath(toolName) + "?t=" + Date.now();
    script.onload = function () {
      resolve();
    };
    script.onerror = function () {
      reject(new Error("Không load được JS của tool: " + toolName));
    };
    document.body.appendChild(script);
  });
}

function renderHome() {
  appView.innerHTML = `
    <section class="hero">
      <div class="hero-top">
        <div class="brand">
          <div class="brand-dot"></div>
          <div>
            <div class="brand-name">TOOL ILLUSTRATOR</div>
            <div class="brand-sub">Internal tools panel</div>
          </div>
        </div>
      </div>

      <div class="hero-banner">
        <div class="hero-overlay">
          <div class="hero-title">Tool Illustrator</div>
          <div class="hero-desc">
            Chọn chức năng để mở công cụ tương ứng.
          </div>
        </div>
      </div>
    </section>

    <section class="tool-card">
      <div class="tool-title">TOOLS</div>

      <div class="tool-menu">
        <button id="openSafeMoveBtn" class="menu-tool-btn">
          <div class="menu-tool-title">Safe Move</div>
          <div class="menu-tool-desc">Preview và move object theo màu sang Die Cut / Dimension</div>
        </button>

        <button class="menu-tool-btn disabled" disabled>
          <div class="menu-tool-title">Color Scan</div>
          <div class="menu-tool-desc">Sắp thêm</div>
        </button>

        <button class="menu-tool-btn disabled" disabled>
          <div class="menu-tool-title">Layer Utility</div>
          <div class="menu-tool-desc">Sắp thêm</div>
        </button>
      </div>
    </section>
  `;

  var openSafeMoveBtn = document.getElementById("openSafeMoveBtn");
  if (openSafeMoveBtn) {
    openSafeMoveBtn.addEventListener("click", function () {
      openTool("safe-move");
    });
  }
}

function openTool(toolName) {
  fetch(getToolHtmlPath(toolName) + "?t=" + Date.now())
    .then(function (res) {
      return res.text();
    })
    .then(function (html) {
      appView.innerHTML = html;
      loadToolCss(toolName);

      return loadToolJs(toolName);
    })
    .then(function () {
      if (window.ToolPages && typeof window.ToolPages[toolName] === "function") {
        window.ToolPages[toolName]({
          goHome: renderHome
        });
      }
    })
    .catch(function (err) {
      appView.innerHTML = `
        <section class="tool-card">
          <div class="tool-title">ERROR</div>
          <div class="result-box">
            <div class="result-line error">${String(err.message || err)}</div>
          </div>
        </section>
      `;
    });
}

window.ToolPages = window.ToolPages || {};

renderHome();