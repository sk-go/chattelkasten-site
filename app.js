(function () {
  "use strict";

  var root = document.documentElement;

  /* -----------------------------------------------------------------------
     1. Hell / Dunkel Umschalter (Standard: Dunkel, kompatibel mit Portfolio)
     ----------------------------------------------------------------------- */
  var themeBtn = document.getElementById("theme-toggle");
  var themeLabel = document.getElementById("theme-label");

  function currentTheme() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function applyTheme(theme) {
    var next = theme === "light" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    if (themeLabel) themeLabel.textContent = next === "light" ? "Dunkel" : "Hell";
  }

  try {
    var saved = localStorage.getItem("ck-site-thema");
    if (saved === "light" || saved === "dark") applyTheme(saved);
  } catch (_) {}

  /* -----------------------------------------------------------------------
     2. Statisches Zellautomat-Band (Wolfram Regel 30 & Regel 90)
        Kein Autoplay, bewegt sich nur bei ausdrücklichem Klick auf +1
     ----------------------------------------------------------------------- */
  var automatCanvas = document.getElementById("automat-canvas");
  var automatCtx = automatCanvas ? automatCanvas.getContext("2d") : null;
  var ruleBtns = document.querySelectorAll(".automat-btn[data-rule]");
  var stepBtn = document.getElementById("automat-step");
  var activeRuleMode = "split";
  var stepOffset = 0;

  function stepRow(row, rule) {
    var n = row.length;
    var next = new Uint8Array(n);
    for (var i = 0; i < n; i++) {
      var l = row[(i - 1 + n) % n];
      var m = row[i];
      var r = row[(i + 1) % n];
      next[i] = (rule >> ((l << 2) | (m << 1) | r)) & 1;
    }
    return next;
  }

  function seedRow(width, mode) {
    var row = new Uint8Array(width);
    if (mode === "90") {
      for (var i = 16; i < width; i += 32) row[i] = 1;
      if (width < 32) row[Math.floor(width / 2)] = 1;
    } else if (mode === "30") {
      row[Math.floor(width / 2)] = 1;
    } else {
      // Links Chaos (Regel 30), rechts Fraktal (Regel 90)
      var half = Math.floor(width / 2);
      row[Math.floor(half / 2)] = 1;
      for (var j = half + 16; j < width; j += 32) row[j] = 1;
      if (width - half < 32) row[half + Math.floor((width - half) / 2)] = 1;
    }
    return row;
  }

  function drawAutomat() {
    if (!automatCanvas || !automatCtx) return;
    var cell = 4;
    var wrap = automatCanvas.parentElement;
    var cssW = wrap ? wrap.clientWidth : window.innerWidth;
    var cssH = wrap ? wrap.clientHeight : 64;
    if (!cssW || !cssH) return;

    var cols = Math.max(24, Math.ceil(cssW / cell));
    var rows = Math.max(8, Math.ceil(cssH / cell));
    automatCanvas.width = cols * cell;
    automatCanvas.height = rows * cell;

    var styles = getComputedStyle(root);
    var ink = styles.getPropertyValue("--tinte").trim() || "#e9e9e6";
    var accent = styles.getPropertyValue("--akzent").trim() || "#ff4a1c";
    var muted = styles.getPropertyValue("--raster").trim() || "#232323";

    var totalGens = rows + stepOffset;
    var history = [];

    if (activeRuleMode === "split") {
      var leftW = Math.floor(cols / 2);
      var rightW = cols - leftW;
      var rL = seedRow(leftW, "30");
      var rR = seedRow(rightW, "90");

      for (var g = 0; g < totalGens; g++) {
        if (g >= stepOffset) history.push([rL, rR]);
        rL = stepRow(rL, 30);
        rR = stepRow(rR, 90);
      }

      automatCtx.clearRect(0, 0, automatCanvas.width, automatCanvas.height);
      for (var y = 0; y < history.length; y++) {
        var isLast = y === history.length - 1;
        automatCtx.fillStyle = isLast ? accent : ink;
        var pair = history[y];
        for (var xl = 0; xl < leftW; xl++) {
          if (pair[0][xl]) automatCtx.fillRect(xl * cell, y * cell, cell - 1, cell - 1);
        }
        for (var xr = 0; xr < rightW; xr++) {
          if (pair[1][xr]) automatCtx.fillRect((leftW + xr) * cell, y * cell, cell - 1, cell - 1);
        }
      }
      // Feine Trennlinie zwischen Chaos (R30) und Fraktal (R90)
      automatCtx.fillStyle = muted;
      automatCtx.fillRect(leftW * cell - 1, 0, 1, automatCanvas.height);
    } else {
      var ruleNum = activeRuleMode === "30" ? 30 : 90;
      var cur = seedRow(cols, activeRuleMode);
      for (var g2 = 0; g2 < totalGens; g2++) {
        if (g2 >= stepOffset) history.push(cur);
        cur = stepRow(cur, ruleNum);
      }

      automatCtx.clearRect(0, 0, automatCanvas.width, automatCanvas.height);
      for (var y2 = 0; y2 < history.length; y2++) {
        automatCtx.fillStyle = y2 === history.length - 1 ? accent : ink;
        var line = history[y2];
        for (var x = 0; x < cols; x++) {
          if (line[x]) automatCtx.fillRect(x * cell, y2 * cell, cell - 1, cell - 1);
        }
      }
    }
  }

  ruleBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      activeRuleMode = btn.getAttribute("data-rule") || "split";
      stepOffset = 0;
      ruleBtns.forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });
      drawAutomat();
    });
  });

  if (stepBtn) {
    stepBtn.addEventListener("click", function () {
      stepOffset += 1;
      drawAutomat();
    });
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "light" ? "dark" : "light";
      applyTheme(next);
      try {
        localStorage.setItem("ck-site-thema", next);
      } catch (_) {}
      drawAutomat();
    });
  }

  /* -----------------------------------------------------------------------
     3. Interaktives Flussdiagramm mit Hypergraph-Komponente
     ----------------------------------------------------------------------- */
  var FLOW_CAPTIONS = {
    all: "Klick auf eine Station hebt sie hervor. Alle Schritte laufen lokal auf offenen Markdown-Dateien.",
    eingang: "Eigene Notizen, Literatur-Exzerpte und KI-Gespräche kommen mit Herkunft herein. MCP-Vorschläge landen immer zuerst im Prüf-Eingang.",
    kasten: "Alle Zettel liegen im selben lokalen Markdown-Bestand. privacy.rs blockiert als privat markierte Ordner strikt vor Cloud-APIs und MCP.",
    hypergraph: "Im Hypergraphen zeigt das lokale czk-Backend Kapitel-Membranen, Außenbrücken (◌) aus anderen Perspektiven und offene Widersprüche (⚡).",
    schreiben: "Im CodeMirror-6-Editor entsteht der eigene Text direkt in Markdown. Kritiker und markierte G-Rohentwürfe laufen nur auf bewussten Klick."
  };

  var flowSvg = document.getElementById("flow-svg");
  var flowStages = document.querySelectorAll(".flow-stage");
  var flowEdges = document.querySelectorAll(".flow-edge");
  var flowBtns = document.querySelectorAll("[data-flow-select]");
  var flowCaption = document.getElementById("flow-caption");
  var activeFlowStage = "all";

  function selectFlowStage(stage) {
    activeFlowStage = stage;
    if (flowSvg) flowSvg.classList.toggle("has-filter", stage !== "all");
    flowStages.forEach(function (g) {
      g.classList.toggle("is-active", stage === "all" || g.getAttribute("data-stage") === stage);
    });
    flowEdges.forEach(function (edge) {
      var list = (edge.getAttribute("data-edges") || "").split(" ");
      edge.classList.toggle("is-active", stage === "all" || list.indexOf(stage) !== -1);
    });
    flowBtns.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-flow-select") === stage);
    });
    if (flowCaption && FLOW_CAPTIONS[stage]) {
      flowCaption.textContent = FLOW_CAPTIONS[stage];
    }
  }

  flowBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      selectFlowStage(btn.getAttribute("data-flow-select"));
    });
  });

  flowStages.forEach(function (g) {
    var st = g.getAttribute("data-stage");
    g.addEventListener("click", function () {
      selectFlowStage(activeFlowStage === st ? "all" : st);
    });
    g.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectFlowStage(activeFlowStage === st ? "all" : st);
      }
    });
  });

  /* -----------------------------------------------------------------------
     4. Interaktive 3D-Silhouetten-Projektion (1 Vektor, 3 Löcher als Zettel)
        Synchronisiert zudem die Hypergraph-Linse im oberen Flussdiagramm
     ----------------------------------------------------------------------- */
  var AXIS_DATA = {
    all: {
      status: "Alle Achsen",
      flowLens: "BEGRIFF",
      flowOps: [1, 0.72, 0.72],
      id: "3D-OBJEKT // VEKTOR",
      shape: "△ · □ · ○",
      title: "Ein Objekt, drei unterschiedliche Öffnungen",
      body: "Das 3D-Objekt in der Mitte steht für den geteilten Vektor. Jedes Loch in den drei Flächen ist ein Zettel mit eigener Kontur: derselbe Vektor passt als Dreieck, als Quadrat und als Kreis, je nachdem, aus welcher Richtung das System ihn betrachtet.",
      tags: [
        ["Geteilter Vektor", "marke-akzent"],
        ["3 Perspektiven", ""],
        ["ohne Hauptstimme", ""]
      ]
    },
    begriff: {
      status: "Achse A · Begriff",
      flowLens: "BEGRIFF",
      flowOps: [1, 0.55, 0.6],
      id: "LOCH △ // ZETTEL Z-011",
      shape: "SILHOUETTE: DREIECK",
      title: "Bildung als Weltverhältnis statt Kompetenzliste",
      body: "Blick entlang der Begriffs-Achse: sichtbar wird die spitze begriffliche Kontur des geteilten Vektors. Der Zettel schließt thematisch an, während andere Dimensionen desselben Vektors im Schatten liegen.",
      tags: [
        ["Loch △ · Z-011", "marke-akzent"],
        ["herkunft: ich", "marke-invert"],
        ["Perspektive: Begriff", ""]
      ]
    },
    struktur: {
      status: "Achse B · Struktur",
      flowLens: "STRUKTUR",
      flowOps: [0.55, 1, 0.7],
      id: "LOCH □ // ZETTEL Z-058",
      shape: "SILHOUETTE: QUADRAT",
      title: "Automations-Sog in generativen Sprachmodellen",
      body: "Blick entlang der Struktur-Achse: derselbe 3D-Vektor füllt exakt die quadratische Öffnung. Zwei Themen, die begrifflich weit auseinander liegen, teilen dieselbe argumentative Form.",
      tags: [
        ["Loch □ · Z-058", "marke-akzent"],
        ["herkunft: quelle", "marke-invert"],
        ["Perspektive: Struktur", ""]
      ]
    },
    motiv: {
      status: "Achse C · Motiv",
      flowLens: "MOTIV",
      flowOps: [0.55, 0.55, 1],
      id: "LOCH ○ // ZETTEL Z-089",
      shape: "SILHOUETTE: KREIS",
      title: "Zufall als produktive Störung im Denkraum",
      body: "Blick entlang der Motiv-Achse nach unten auf den Boden: derselbe geteilte Vektor wirft eine runde Silhouette und verbindet Zettel über Kapitelgrenzen hinweg als Außenbrücke (◌).",
      tags: [
        ["Loch ○ · Z-089", "marke-akzent"],
        ["◌ Außenbrücke", "marke-invert"],
        ["Perspektive: Motiv", ""]
      ]
    }
  };

  var projSvg = document.getElementById("proj-svg");
  var projStatus = document.getElementById("proj-status");
  var flowHgLens = document.getElementById("flow-hg-lens");
  var projAxes = document.querySelectorAll(".proj-axis");
  var projHoles = document.querySelectorAll(".proj-hole");
  var projSolid = document.querySelector(".proj-solid");
  var axisBtns = document.querySelectorAll(".axis-btn");
  var projCardId = document.getElementById("proj-card-id");
  var projCardShape = document.getElementById("proj-card-shape");
  var projCardTitle = document.getElementById("proj-card-title");
  var projCardBody = document.getElementById("proj-card-body");
  var projCardTags = document.getElementById("proj-card-tags");
  var activeAxis = "all";

  function selectAxis(axisKey) {
    var cfg = AXIS_DATA[axisKey];
    if (!cfg) return;
    activeAxis = axisKey;

    if (projSvg) projSvg.classList.toggle("has-axis", axisKey !== "all");
    if (projStatus) projStatus.textContent = cfg.status;
    if (flowHgLens) flowHgLens.textContent = cfg.flowLens;

    projAxes.forEach(function (g) {
      g.classList.toggle("is-active", axisKey !== "all" && g.getAttribute("data-axis") === axisKey);
    });
    projHoles.forEach(function (g) {
      g.classList.toggle("is-active", axisKey !== "all" && g.getAttribute("data-axis") === axisKey);
    });
    axisBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-axis-btn") === axisKey ? "true" : "false");
    });

    var fm1 = document.getElementById("flow-mem-1");
    var fm2 = document.getElementById("flow-mem-2");
    var fm3 = document.getElementById("flow-mem-3");
    [fm1, fm2, fm3].forEach(function (el, idx) {
      if (el) el.style.opacity = String(cfg.flowOps[idx]);
    });

    if (projCardId) projCardId.textContent = cfg.id;
    if (projCardShape) projCardShape.textContent = cfg.shape;
    if (projCardTitle) projCardTitle.textContent = cfg.title;
    if (projCardBody) projCardBody.textContent = cfg.body;
    if (projCardTags) {
      projCardTags.innerHTML = "";
      cfg.tags.forEach(function (t) {
        var span = document.createElement("span");
        span.className = "marke" + (t[1] ? " " + t[1] : "");
        span.textContent = t[0];
        projCardTags.appendChild(span);
      });
    }
  }

  axisBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      selectAxis(btn.getAttribute("data-axis-btn"));
    });
  });

  projHoles.forEach(function (hole) {
    var key = hole.getAttribute("data-axis");
    hole.addEventListener("click", function () {
      selectAxis(activeAxis === key ? "all" : key);
    });
    hole.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectAxis(activeAxis === key ? "all" : key);
      }
    });
  });

  if (projSolid) {
    projSolid.addEventListener("click", function () {
      selectAxis("all");
    });
    projSolid.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectAxis("all");
      }
    });
  }

  /* -----------------------------------------------------------------------
     5. Werkbank-Tabs (3 Arbeitsräume, Tastaturzugänglich)
     ----------------------------------------------------------------------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".werkbank-tab"));
  var panels = document.querySelectorAll(".werkbank-panel");

  function activateTab(tab) {
    var target = tab.getAttribute("data-tab");
    tabs.forEach(function (t) {
      t.setAttribute("aria-selected", t === tab ? "true" : "false");
    });
    panels.forEach(function (p) {
      if (p.getAttribute("data-panel") === target) {
        p.removeAttribute("hidden");
      } else {
        p.setAttribute("hidden", "");
      }
    });
  }

  tabs.forEach(function (tab, idx) {
    tab.addEventListener("click", function () {
      activateTab(tab);
    });
    tab.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        var nextIdx = (idx + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
        tabs[nextIdx].focus();
        activateTab(tabs[nextIdx]);
      }
    });
  });

  /* -----------------------------------------------------------------------
     6. Aktiver Kapitel-Hinweis in Navigation & Seitenleiste
     ----------------------------------------------------------------------- */
  var navLinks = document.querySelectorAll(".rahmen-nav ul a, .seiten-nav a");
  var spySections = Array.prototype.slice.call(document.querySelectorAll("section[id]"));

  function updateScrollSpy() {
    var activeId = "ablauf";
    for (var i = 0; i < spySections.length; i++) {
      var rect = spySections[i].getBoundingClientRect();
      if (rect.top <= 140) activeId = spySections[i].id;
    }
    navLinks.forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("href") === "#" + activeId);
    });
  }

  window.addEventListener("scroll", updateScrollSpy, { passive: true });
  window.addEventListener("resize", drawAutomat);

  /* Initialisieren */
  drawAutomat();
  selectFlowStage("all");
  selectAxis("all");
  updateScrollSpy();
})();
