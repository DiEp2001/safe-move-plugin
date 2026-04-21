function toNumber(v, fallback) {
    var n = parseFloat(v);
    if (isNaN(n)) return typeof fallback !== "undefined" ? fallback : 0;
    return n;
}

function escapeJsonString(text) {
    return String(text).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function getOptions(payload) {
    return {
        minK: toNumber(payload.minK, 80),
        minCMY: toNumber(payload.minCMY, 0.1),
        neutralTolerance: toNumber(payload.neutralTolerance, 15),
        checkFill: payload.checkFill !== false,
        checkStroke: payload.checkStroke !== false,
        includeSpot: !!payload.includeSpot
    };
}

function isCMYK(color) {
    return color && color.typename === "CMYKColor";
}

function isSpot(color) {
    return color && color.typename === "SpotColor";
}

function getCMYK(color, includeSpot) {
    if (isCMYK(color)) {
        return {
            c: toNumber(color.cyan),
            m: toNumber(color.magenta),
            y: toNumber(color.yellow),
            k: toNumber(color.black)
        };
    }

    if (includeSpot && isSpot(color)) {
        try {
            var base = color.spot.color;
            if (base && base.typename === "CMYKColor") {
                return {
                    c: toNumber(base.cyan),
                    m: toNumber(base.magenta),
                    y: toNumber(base.yellow),
                    k: toNumber(base.black)
                };
            }
        } catch (e) {}
    }

    return null;
}

function isRichBlack(cmyk, options) {
    if (!cmyk) return false;

    var maxCMY = Math.max(cmyk.c, cmyk.m, cmyk.y);
    var minCMY = Math.min(cmyk.c, cmyk.m, cmyk.y);
    var spread = maxCMY - minCMY;

    return (
        cmyk.k > options.minK &&
        (
            cmyk.c > options.minCMY ||
            cmyk.m > options.minCMY ||
            cmyk.y > options.minCMY
        ) &&
        spread <= options.neutralTolerance
    );
}

function getItemColors(item) {
    if (item.typename === "TextFrame") {
        try {
            var attr = item.textRange.characterAttributes;
            return {
                fill: attr.fillColor,
                stroke: attr.strokeColor
            };
        } catch (e) {}
    }

    if (item.typename === "CompoundPathItem") {
        try {
            if (item.pathItems.length > 0) {
                return {
                    fill: item.pathItems[0].fillColor,
                    stroke: item.pathItems[0].strokeColor
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
        stroke: strokeColor
    };
}

function analyzeItemShallow(item, options) {
    var data = getItemColors(item);
    var fillHit = false;
    var strokeHit = false;

    if (options.checkFill && data.fill) {
        fillHit = isRichBlack(getCMYK(data.fill, options.includeSpot), options);
    }

    if (options.checkStroke && data.stroke) {
        strokeHit = isRichBlack(getCMYK(data.stroke, options.includeSpot), options);
    }

    return {
        matched: fillHit || strokeHit,
        fillHit: fillHit,
        strokeHit: strokeHit
    };
}

function analyzeItemDeep(item, options) {
    var result = analyzeItemShallow(item, options);

    if (item.typename === "GroupItem") {
        for (var i = 0; i < item.pageItems.length; i++) {
            try {
                var child = analyzeItemDeep(item.pageItems[i], options);
                if (child.fillHit) result.fillHit = true;
                if (child.strokeHit) result.strokeHit = true;
                if (child.matched) result.matched = true;
            } catch (e) {}
        }
    }

    return result;
}

function getTopLevelItems(doc) {
    var arr = [];
    for (var i = 0; i < doc.pageItems.length; i++) {
        try {
            var item = doc.pageItems[i];
            var parentType = item.parent && item.parent.typename ? item.parent.typename : "";
            if (parentType === "Layer" || parentType === "Document") {
                arr.push(item);
            }
        } catch (e) {}
    }
    return arr;
}

function clearSelection() {
    try {
        app.activeDocument.selection = null;
    } catch (e) {}
}

function selectItems(items) {
    clearSelection();

    for (var i = 0; i < items.length; i++) {
        try {
            items[i].selected = true;
        } catch (e) {}
    }
}

function collectBlack4CItems(options) {
    var doc = app.activeDocument;
    var items = getTopLevelItems(doc);
    var matchedItems = [];
    var fillCount = 0;
    var strokeCount = 0;

    for (var i = 0; i < items.length; i++) {
        try {
            var item = items[i];
            var result = analyzeItemDeep(item, options);

            if (result.matched) {
                matchedItems.push(item);
                if (result.fillHit) fillCount++;
                if (result.strokeHit) strokeCount++;
            }
        } catch (e) {}
    }

    return {
        items: matchedItems,
        matchCount: matchedItems.length,
        fillCount: fillCount,
        strokeCount: strokeCount
    };
}
