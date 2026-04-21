// =========================
// SAFE MOVE CORE
// =========================

// -------------------------
// RULE NORMALIZE
// -------------------------
function normalizeRule(rule) {
    if (!rule) rule = {};

    function fixColor(c) {
        if (!c) c = {};
        return {
            c: toNumber(c.c),
            m: toNumber(c.m),
            y: toNumber(c.y),
            k: toNumber(c.k)
        };
    }

    return {
        fill: fixColor(rule.fill),
        stroke: fixColor(rule.stroke),
        spot: !!rule.spot,
        pantone: !!rule.pantone,
        excludeList: normalizeExcludeList(rule.excludeList || []),
        tolerance: toNumber(rule.tolerance, 0.2)
    };
}

function toNumber(v, fallback) {
    var n = parseFloat(v);
    if (isNaN(n)) return typeof fallback !== "undefined" ? fallback : 0;
    return n;
}

function normalizeExcludeList(arr) {
    var out = [];
    for (var i = 0; i < arr.length; i++) {
        var t = String(arr[i]).toLowerCase().replace(/^\s+|\s+$/g, "");
        if (t) out.push(t);
    }
    return out;
}

// -------------------------
// COLOR TYPE UTILS
// -------------------------
function isCMYK(color) {
    return color && color.typename === "CMYKColor";
}

function isSpot(color) {
    return color && color.typename === "SpotColor";
}

function isPantone(color) {
    if (!isSpot(color)) return false;

    try {
        var name = color.spot.name || "";
        return String(name).toLowerCase().indexOf("pantone") !== -1;
    } catch (e) {
        return false;
    }
}

function getColorName(color) {
    try {
        if (color && color.typename === "SpotColor" && color.spot && color.spot.name) {
            return String(color.spot.name).toLowerCase();
        }
    } catch (e) {}
    return "";
}

function getCMYK(color) {
    if (isCMYK(color)) {
        return {
            c: color.cyan,
            m: color.magenta,
            y: color.yellow,
            k: color.black
        };
    }

    // SpotColor có base CMYK thì lấy ra để so sánh
    if (isSpot(color)) {
        try {
            var base = color.spot.color;
            if (base && base.typename === "CMYKColor") {
                return {
                    c: base.cyan,
                    m: base.magenta,
                    y: base.yellow,
                    k: base.black
                };
            }
        } catch (e) {}
    }

    return null;
}

function isRuleActive(c) {
    if (!c) return false;

    return !(
        Number(c.c) === 0 &&
        Number(c.m) === 0 &&
        Number(c.y) === 0 &&
        Number(c.k) === 0
    );
}

function matchCMYK(a, b, tol) {
    if (!a || !b) return false;

    return (
        Math.abs(a.c - b.c) <= tol &&
        Math.abs(a.m - b.m) <= tol &&
        Math.abs(a.y - b.y) <= tol &&
        Math.abs(a.k - b.k) <= tol
    );
}

// -------------------------
// EXCLUDE BY COLOR NAME
// -------------------------
function isExcludedColor(color, excludeList) {
    if (!excludeList || excludeList.length === 0) return false;

    var colorName = getColorName(color);
    if (!colorName) return false;

    for (var i = 0; i < excludeList.length; i++) {
        var key = String(excludeList[i]).toLowerCase().replace(/^\s+|\s+$/g, "");
        if (key && colorName.indexOf(key) !== -1) {
            return true;
        }
    }

    return false;
}

// -------------------------
// GET ITEM COLORS
// -------------------------
function getItemColors(item) {
    // TextFrame
    if (item.typename === "TextFrame") {
        try {
            var attr = item.textRange.characterAttributes;
            return {
                fill: attr.fillColor,
                stroke: attr.strokeColor,
                filled: attr.fillColor !== null && attr.fillColor !== undefined,
                stroked: attr.strokeColor !== null && attr.strokeColor !== undefined
            };
        } catch (e) {}
    }

    // CompoundPathItem
    if (item.typename === "CompoundPathItem") {
        try {
            if (item.pathItems.length > 0) {
                var p = item.pathItems[0];
                return {
                    fill: p.fillColor,
                    stroke: p.strokeColor,
                    filled: !!p.filled,
                    stroked: !!p.stroked
                };
            }
        } catch (e) {}
    }

    var fillColor = null;
    var strokeColor = null;

    try { fillColor = item.fillColor; } catch (e) {}
    try { strokeColor = item.strokeColor; } catch (e) {}

    return {
        fill: fillColor,
        stroke: strokeColor,
        filled: fillColor !== null && fillColor !== undefined,
        stroked: strokeColor !== null && strokeColor !== undefined
    };
}

// -------------------------
// MATCH LOGIC
// -------------------------
function checkColor(color, rule, type) {
    if (!color) return false;

    // loại trừ theo tên màu
    if (isExcludedColor(color, rule.excludeList)) return false;

    var target = type === "fill" ? rule.fill : rule.stroke;

    // ƯU TIÊN match theo CMYK trước
    var cmyk = getCMYK(color);
    if (cmyk && isRuleActive(target)) {
        if (matchCMYK(cmyk, target, rule.tolerance)) {
            return true;
        }
    }

    // Pantone = chỉ Pantone
    if (rule.pantone && isPantone(color)) return true;

    // Spot = Spot nhưng không gồm Pantone
    if (rule.spot && isSpot(color) && !isPantone(color)) return true;

    return false;
}

function checkItem(item, rule) {
    var data = getItemColors(item);
    if (!data) return false;

    if (data.fill && checkColor(data.fill, rule, "fill")) return true;
    if (data.stroke && checkColor(data.stroke, rule, "stroke")) return true;

    return false;
}

// -------------------------
// DEEP MATCH
// -------------------------
function hasMatchDeep(item, rule) {
    if (checkItem(item, rule)) return true;

    if (item.typename === "GroupItem") {
        for (var i = 0; i < item.pageItems.length; i++) {
            if (hasMatchDeep(item.pageItems[i], rule)) return true;
        }
    }

    if (item.typename === "CompoundPathItem") {
        return checkItem(item, rule);
    }

    return false;
}

// -------------------------
// TOP LEVEL ITEMS
// -------------------------
function getTopLevelItems(doc) {
    var arr = [];
    for (var i = 0; i < doc.pageItems.length; i++) {
        arr.push(doc.pageItems[i]);
    }
    return arr;
}

// -------------------------
// PREVIEW COUNT
// -------------------------
function countObjects(rule) {
    var doc = app.activeDocument;
    var items = getTopLevelItems(doc);
    var count = 0;

    for (var i = 0; i < items.length; i++) {
        try {
            if (hasMatchDeep(items[i], rule)) count++;
        } catch (e) {}
    }

    return count;
}

// -------------------------
// PREVIEW HIGHLIGHT
// -------------------------
function clearSelection() {
    try {
        app.activeDocument.selection = null;
    } catch (e) {}
}

function collectMatchedItems(rule) {
    var doc = app.activeDocument;
    var items = getTopLevelItems(doc);
    var matched = [];

    for (var i = 0; i < items.length; i++) {
        try {
            if (hasMatchDeep(items[i], rule)) {
                matched.push(items[i]);
            }
        } catch (e) {}
    }

    return matched;
}

function selectItems(items) {
    clearSelection();

    for (var i = 0; i < items.length; i++) {
        try {
            items[i].selected = true;
        } catch (e) {}
    }
}

// -------------------------
// LAYER UTILS
// -------------------------
function getOrCreateLayer(name) {
    var doc = app.activeDocument;

    for (var i = 0; i < doc.layers.length; i++) {
        if (doc.layers[i].name === name) {
            return doc.layers[i];
        }
    }

    var layer = doc.layers.add();
    layer.name = name;
    return layer;
}

// -------------------------
// MOVE
// -------------------------
function runMove(dieRule, dimRule, options) {
    var doc = app.activeDocument;
    var items = getTopLevelItems(doc);

    var dieLayer = getOrCreateLayer(options.dieLayerName || "Die Cut");
    var dimLayer = getOrCreateLayer(options.dimLayerName || "Dimension");

    var dieCount = 0;
    var dimCount = 0;

    for (var i = items.length - 1; i >= 0; i--) {
        var item = items[i];

        try {
            if (hasMatchDeep(item, dieRule)) {
                item.move(dieLayer, ElementPlacement.PLACEATBEGINNING);
                dieCount++;
                continue;
            }

            if (hasMatchDeep(item, dimRule)) {
                item.move(dimLayer, ElementPlacement.PLACEATBEGINNING);
                dimCount++;
            }
        } catch (e) {}
    }

    try {
        dieLayer.visible = options.showDieLayer !== false;
    } catch (e) {}

    try {
        dimLayer.visible = options.showDimLayer !== false;
    } catch (e) {}

    return {
        dieCount: dieCount,
        dimCount: dimCount
    };
}