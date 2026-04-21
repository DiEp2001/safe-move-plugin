function serializeValue(value) {
    var t = typeof value;

    if (value === null) return "null";
    if (t === "number") return isFinite(value) ? String(value) : "0";
    if (t === "boolean") return value ? "true" : "false";
    if (t === "string") return '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n") + '"';

    if (value instanceof Array) {
        var parts = [];
        for (var i = 0; i < value.length; i++) {
            parts.push(serializeValue(value[i]));
        }
        return "[" + parts.join(",") + "]";
    }

    var keys = [];
    for (var key in value) {
        if (value.hasOwnProperty(key)) {
            keys.push('"' + key.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '":' + serializeValue(value[key]));
        }
    }
    return "{" + keys.join(",") + "}";
}

function mmToPt(mm) {
    return Number(mm) * 72 / 25.4;
}

function ptToMm(pt) {
    return Number(pt) * 25.4 / 72;
}

function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

function round1(n) {
    return Math.round(Number(n) * 10) / 10;
}

function toNumber(v, fallback) {
    var n = parseFloat(v);
    if (isNaN(n)) return typeof fallback !== "undefined" ? fallback : 0;
    return n;
}

function toInt(v, fallback) {
    var n = parseInt(v, 10);
    if (isNaN(n)) return typeof fallback !== "undefined" ? fallback : 0;
    return n;
}

function getFileNameFromPath(pathText) {
    var text = String(pathText || "");
    var normalized = text.replace(/\\/g, "/");
    var parts = normalized.split("/");
    return parts.length ? parts[parts.length - 1] : text;
}

function normalizeGangPayload(payload) {
    var files = payload.files || [];
    var normalizedFiles = [];

    for (var i = 0; i < files.length; i++) {
        var item = files[i];
        if (!item || !item.path) continue;

        normalizedFiles.push({
            path: String(item.path),
            name: item.name ? String(item.name) : getFileNameFromPath(item.path),
            qty: Math.max(1, toInt(item.qty, 1))
        });
    }

    var sheet = payload.sheet || {};

    return {
        files: normalizedFiles,
        sheet: {
            widthMm: Math.max(1, toNumber(sheet.widthMm, 430)),
            heightMm: Math.max(1, toNumber(sheet.heightMm, 320)),
            gapXMm: Math.max(0, toNumber(sheet.gapXMm, 3)),
            gapYMm: Math.max(0, toNumber(sheet.gapYMm, 3)),
            marginTopMm: Math.max(0, toNumber(sheet.marginTopMm, 10)),
            marginRightMm: Math.max(0, toNumber(sheet.marginRightMm, 10)),
            marginBottomMm: Math.max(0, toNumber(sheet.marginBottomMm, 10)),
            marginLeftMm: Math.max(0, toNumber(sheet.marginLeftMm, 10))
        },
        allowRotate: payload.allowRotate !== false,
        addCropMarks: payload.addCropMarks !== false,
        addRegistrationMarks: payload.addRegistrationMarks !== false
    };
}

function createRegistrationColor(doc) {
    var swatchNames = ["[Registration]", "Registration"];

    for (var i = 0; i < swatchNames.length; i++) {
        try {
            var swatch = doc.swatches.getByName(swatchNames[i]);
            if (swatch && swatch.color) {
                return swatch.color;
            }
        } catch (e) {}
    }

    var color = new CMYKColor();
    color.cyan = 100;
    color.magenta = 100;
    color.yellow = 100;
    color.black = 100;
    return color;
}

function addLine(parent, x1, y1, x2, y2, strokeColor, strokeWidth) {
    var line = parent.pathItems.add();
    line.setEntirePath([[x1, y1], [x2, y2]]);
    line.stroked = true;
    line.strokeColor = strokeColor;
    line.strokeWidth = strokeWidth;
    line.filled = false;
    return line;
}

function addCircle(parent, cx, cy, radius, strokeColor, strokeWidth) {
    var ellipse = parent.pathItems.ellipse(cy + radius, cx - radius, radius * 2, radius * 2);
    ellipse.stroked = true;
    ellipse.strokeColor = strokeColor;
    ellipse.strokeWidth = strokeWidth;
    ellipse.filled = false;
    return ellipse;
}

function addCropMarksForPlacement(layer, artRect, placement, doc) {
    var color = createRegistrationColor(doc);
    var strokeWidth = 0.5;
    var offset = mmToPt(1.5);
    var markLen = mmToPt(4);
    var left = artRect[0] + placement.xPt;
    var top = artRect[1] - placement.yPt;
    var right = left + placement.widthPt;
    var bottom = top - placement.heightPt;

    addLine(layer, left - offset - markLen, top + offset, left - offset, top + offset, color, strokeWidth);
    addLine(layer, left - offset, top + offset + markLen, left - offset, top + offset, color, strokeWidth);

    addLine(layer, right + offset, top + offset, right + offset + markLen, top + offset, color, strokeWidth);
    addLine(layer, right + offset, top + offset + markLen, right + offset, top + offset, color, strokeWidth);

    addLine(layer, left - offset - markLen, bottom - offset, left - offset, bottom - offset, color, strokeWidth);
    addLine(layer, left - offset, bottom - offset, left - offset, bottom - offset - markLen, color, strokeWidth);

    addLine(layer, right + offset, bottom - offset, right + offset + markLen, bottom - offset, color, strokeWidth);
    addLine(layer, right + offset, bottom - offset, right + offset, bottom - offset - markLen, color, strokeWidth);
}

function addRegistrationMarksForSheet(layer, artRect, plan, doc) {
    var color = createRegistrationColor(doc);
    var strokeWidth = 0.5;
    var radius = mmToPt(3);
    var cross = mmToPt(5);
    var cxLeft = artRect[0] + plan.marginLeftPt / 2;
    var cxRight = artRect[2] - plan.marginRightPt / 2;
    var cyTop = artRect[1] - plan.marginTopPt / 2;
    var cyBottom = artRect[3] + plan.marginBottomPt / 2;
    var centerX = (artRect[0] + artRect[2]) / 2;
    var centerY = (artRect[1] + artRect[3]) / 2;

    function drawReg(cx, cy) {
        addCircle(layer, cx, cy, radius, color, strokeWidth);
        addLine(layer, cx - cross, cy, cx + cross, cy, color, strokeWidth);
        addLine(layer, cx, cy - cross, cx, cy + cross, color, strokeWidth);
    }

    drawReg(centerX, cyTop);
    drawReg(centerX, cyBottom);
    drawReg(cxLeft, centerY);
    drawReg(cxRight, centerY);
}

function applyPdfTrimBoxOptions() {
    var pdfOptions = app.preferences.PDFFileOptions;
    pdfOptions.pDFCropToBox = PDFBoxType.PDFTRIMBOX;
    pdfOptions.pageToOpen = 1;
}

function measurePdfFiles(files) {
    applyPdfTrimBoxOptions();

    var tempDoc = app.documents.add(DocumentColorSpace.CMYK, 1000, 1000);
    var measured = [];

    try {
        for (var i = 0; i < files.length; i++) {
            var fileRef = File(files[i].path);
            if (!fileRef.exists) {
                throw new Error("Khong tim thay file: " + files[i].path);
            }

            var placed = tempDoc.placedItems.add();
            placed.file = fileRef;

            measured.push({
                path: files[i].path,
                name: files[i].name,
                qty: files[i].qty,
                widthPt: placed.width,
                heightPt: placed.height,
                widthMm: round2(ptToMm(placed.width)),
                heightMm: round2(ptToMm(placed.height))
            });

            placed.remove();
        }
    } finally {
        tempDoc.close(SaveOptions.DONOTSAVECHANGES);
    }

    return measured;
}

function cloneMeasuredFiles(files) {
    var out = [];
    for (var i = 0; i < files.length; i++) {
        out.push({
            path: files[i].path,
            name: files[i].name,
            qty: files[i].qty,
            remainingQty: files[i].qty,
            widthPt: files[i].widthPt,
            heightPt: files[i].heightPt,
            widthMm: files[i].widthMm,
            heightMm: files[i].heightMm
        });
    }
    return out;
}

function hasRemainingQty(files) {
    for (var i = 0; i < files.length; i++) {
        if (files[i].remainingQty > 0) return true;
    }
    return false;
}

function cloneFreeRects(rects) {
    var out = [];
    for (var i = 0; i < rects.length; i++) {
        out.push({
            xPt: rects[i].xPt,
            yPt: rects[i].yPt,
            widthPt: rects[i].widthPt,
            heightPt: rects[i].heightPt
        });
    }
    return out;
}

function pruneFreeRects(rects) {
    var pruned = [];

    for (var i = 0; i < rects.length; i++) {
        var a = rects[i];
        var contained = false;

        if (a.widthPt <= 0 || a.heightPt <= 0) {
            continue;
        }

        for (var j = 0; j < rects.length; j++) {
            if (i === j) continue;
            var b = rects[j];

            if (
                a.xPt >= b.xPt &&
                a.yPt >= b.yPt &&
                a.xPt + a.widthPt <= b.xPt + b.widthPt &&
                a.yPt + a.heightPt <= b.yPt + b.heightPt
            ) {
                contained = true;
                break;
            }
        }

        if (!contained) {
            pruned.push(a);
        }
    }

    return pruned;
}

function splitFreeRect(freeRect, placement) {
    var rects = [];
    var rightWidth = freeRect.widthPt - placement.widthPt;
    var bottomHeight = freeRect.heightPt - placement.heightPt;

    if (rightWidth > 0.01) {
        rects.push({
            xPt: freeRect.xPt + placement.widthPt,
            yPt: freeRect.yPt,
            widthPt: rightWidth,
            heightPt: freeRect.heightPt
        });
    }

    if (bottomHeight > 0.01) {
        rects.push({
            xPt: freeRect.xPt,
            yPt: freeRect.yPt + placement.heightPt,
            widthPt: placement.widthPt,
            heightPt: bottomHeight
        });
    }

    return rects;
}

function chooseFreeRectCandidate(files, freeRects, allowRotate) {
    var best = null;

    for (var r = 0; r < freeRects.length; r++) {
        var freeRect = freeRects[r];

        for (var i = 0; i < files.length; i++) {
            var item = files[i];
            if (item.remainingQty <= 0) continue;

            var variants = [
                { rotated: false, widthPt: item.widthPt, heightPt: item.heightPt }
            ];

            if (allowRotate && Math.abs(item.widthPt - item.heightPt) > 0.01) {
                variants.push({ rotated: true, widthPt: item.heightPt, heightPt: item.widthPt });
            }

            for (var v = 0; v < variants.length; v++) {
                var variant = variants[v];
                if (variant.widthPt > freeRect.widthPt || variant.heightPt > freeRect.heightPt) {
                    continue;
                }

                var leftoverArea = (freeRect.widthPt * freeRect.heightPt) - (variant.widthPt * variant.heightPt);
                var shortSideFit = Math.min(
                    freeRect.widthPt - variant.widthPt,
                    freeRect.heightPt - variant.heightPt
                );
                var longSideFit = Math.max(
                    freeRect.widthPt - variant.widthPt,
                    freeRect.heightPt - variant.heightPt
                );

                if (
                    best === null ||
                    leftoverArea < best.leftoverArea - 0.01 ||
                    (Math.abs(leftoverArea - best.leftoverArea) <= 0.01 && shortSideFit < best.shortSideFit - 0.01) ||
                    (Math.abs(leftoverArea - best.leftoverArea) <= 0.01 && Math.abs(shortSideFit - best.shortSideFit) <= 0.01 && longSideFit < best.longSideFit - 0.01)
                ) {
                    best = {
                        freeRectIndex: r,
                        fileIndex: i,
                        rotated: variant.rotated,
                        widthPt: variant.widthPt,
                        heightPt: variant.heightPt,
                        leftoverArea: leftoverArea,
                        shortSideFit: shortSideFit,
                        longSideFit: longSideFit
                    };
                }
            }
        }
    }

    return best;
}

function buildGangPlan(measuredFiles, options) {
    var files = cloneMeasuredFiles(measuredFiles);
    var sheet = options.sheet;
    var sheetWidthPt = mmToPt(sheet.widthMm);
    var sheetHeightPt = mmToPt(sheet.heightMm);
    var gapXPt = mmToPt(sheet.gapXMm);
    var gapYPt = mmToPt(sheet.gapYMm);
    var marginTopPt = mmToPt(sheet.marginTopMm);
    var marginRightPt = mmToPt(sheet.marginRightMm);
    var marginBottomPt = mmToPt(sheet.marginBottomMm);
    var marginLeftPt = mmToPt(sheet.marginLeftMm);
    var usableWidthPt = sheetWidthPt - marginLeftPt - marginRightPt;
    var usableHeightPt = sheetHeightPt - marginTopPt - marginBottomPt;

    if (usableWidthPt <= 0 || usableHeightPt <= 0) {
        throw new Error("Khong con dien tich su dung tren sheet. Hay giam margin hoac tang kho giay.");
    }

    var totalArea = 0;
    for (var i = 0; i < files.length; i++) {
        totalArea += files[i].widthPt * files[i].heightPt * files[i].qty;
        if (files[i].widthPt > usableWidthPt && files[i].heightPt > usableWidthPt) {
            throw new Error("File qua rong so voi kho giay: " + files[i].name);
        }
        if (files[i].widthPt > usableHeightPt && files[i].heightPt > usableHeightPt) {
            throw new Error("File qua cao so voi kho giay: " + files[i].name);
        }
    }

    var sheets = [];

    while (hasRemainingQty(files)) {
        var placements = [];
        var placedOnSheet = false;
        var freeRects = [{
            xPt: marginLeftPt,
            yPt: marginTopPt,
            widthPt: usableWidthPt,
            heightPt: usableHeightPt
        }];

        while (true) {
            var candidate = chooseFreeRectCandidate(files, freeRects, options.allowRotate);
            if (!candidate) break;

            var item = files[candidate.fileIndex];
            var freeRect = freeRects[candidate.freeRectIndex];
            var placementWidth = candidate.widthPt;
            var placementHeight = candidate.heightPt;
            var placement = {
                path: item.path,
                name: item.name,
                rotated: candidate.rotated,
                xPt: freeRect.xPt,
                yPt: freeRect.yPt,
                widthPt: placementWidth,
                heightPt: placementHeight,
                widthMm: round2(ptToMm(placementWidth)),
                heightMm: round2(ptToMm(placementHeight))
            };

            placements.push(placement);
            item.remainingQty--;
            placedOnSheet = true;

            var replacementRects = splitFreeRect(freeRect, {
                widthPt: placementWidth + gapXPt,
                heightPt: placementHeight + gapYPt
            });

            freeRects.splice(candidate.freeRectIndex, 1);

            for (var rr = 0; rr < replacementRects.length; rr++) {
                freeRects.push(replacementRects[rr]);
            }

            freeRects = pruneFreeRects(freeRects);
        }

        if (!placedOnSheet) {
            throw new Error("Co file khong the dat vao sheet voi thong so hien tai.");
        }

        sheets.push({ placements: placements });
    }

    var sheetArea = usableWidthPt * usableHeightPt;
    var utilization = sheetArea > 0 ? (totalArea / (sheetArea * sheets.length)) * 100 : 0;
    var fileSummaries = [];

    for (i = 0; i < measuredFiles.length; i++) {
        fileSummaries.push({
            path: measuredFiles[i].path,
            name: measuredFiles[i].name,
            qty: measuredFiles[i].qty,
            placed: measuredFiles[i].qty,
            widthMm: measuredFiles[i].widthMm,
            heightMm: measuredFiles[i].heightMm
        });
    }

    var sheetSummaries = [];
    for (i = 0; i < sheets.length; i++) {
        var counts = {};
        for (var j = 0; j < sheets[i].placements.length; j++) {
            var placement = sheets[i].placements[j];
            counts[placement.name] = (counts[placement.name] || 0) + 1;
        }

        var parts = [];
        for (var key in counts) {
            if (counts.hasOwnProperty(key)) {
                parts.push(key + " x " + counts[key]);
            }
        }
        sheetSummaries.push("Sheet " + (i + 1) + ": " + parts.join(" | "));
    }

    return {
        files: measuredFiles,
        sheetWidthPt: sheetWidthPt,
        sheetHeightPt: sheetHeightPt,
        gapXPt: gapXPt,
        gapYPt: gapYPt,
        marginTopPt: marginTopPt,
        marginRightPt: marginRightPt,
        marginBottomPt: marginBottomPt,
        marginLeftPt: marginLeftPt,
        addCropMarks: options.addCropMarks,
        addRegistrationMarks: options.addRegistrationMarks,
        totalSheets: sheets.length,
        totalPlaced: function () {
            var n = 0;
            for (var s = 0; s < sheets.length; s++) n += sheets[s].placements.length;
            return n;
        }(),
        utilization: utilization,
        utilizationText: round1(utilization) + "%",
        sheets: sheets,
        fileSummaries: fileSummaries,
        sheetSummaries: sheetSummaries
    };
}

function createGangDocument(plan) {
    applyPdfTrimBoxOptions();

    var spacing = mmToPt(20);
    var cols = Math.ceil(Math.sqrt(plan.totalSheets));
    if (plan.totalSheets > 100) {
        throw new Error("So sheet vuot qua gioi han 100 artboards cua Illustrator.");
    }
    var doc = app.documents.add(DocumentColorSpace.CMYK, plan.sheetWidthPt, plan.sheetHeightPt);
    var gangLayer = doc.layers.add();
    gangLayer.name = "Gang PDF";
    var marksLayer = doc.layers.add();
    marksLayer.name = "Marks";
    var prototypeMap = {};

    for (var i = 0; i < plan.totalSheets; i++) {
        var row = Math.floor(i / cols);
        var col = i % cols;
        var left = col * (plan.sheetWidthPt + spacing);
        var top = plan.sheetHeightPt - row * (plan.sheetHeightPt + spacing);
        var rect = [left, top, left + plan.sheetWidthPt, top - plan.sheetHeightPt];

        if (i === 0) {
            doc.artboards[0].artboardRect = rect;
            doc.artboards[0].name = "Sheet 1";
        } else {
            var ab = doc.artboards.add(rect);
            ab.name = "Sheet " + (i + 1);
        }
    }

    for (i = 0; i < plan.sheets.length; i++) {
        var artboard = doc.artboards[i];
        var artRect = artboard.artboardRect;
        var sheetLayer = gangLayer.layers.add();
        sheetLayer.name = "Sheet " + (i + 1);
        var sheetMarksLayer = marksLayer.layers.add();
        sheetMarksLayer.name = "Sheet " + (i + 1);

        for (var j = 0; j < plan.sheets[i].placements.length; j++) {
            var placement = plan.sheets[i].placements[j];
            var item = null;
            var prototypeKey = placement.path + "|" + (placement.rotated ? "r" : "n");

            if (!prototypeMap[prototypeKey]) {
                item = sheetLayer.placedItems.add();
                item.file = File(placement.path);
                if (placement.rotated) {
                    item.rotate(-90);
                }
                prototypeMap[prototypeKey] = item;
            } else {
                item = prototypeMap[prototypeKey].duplicate(sheetLayer, ElementPlacement.PLACEATEND);
            }

            item.position = [artRect[0] + placement.xPt, artRect[1] - placement.yPt];
            item.name = placement.name;

            if (plan.addCropMarks) {
                addCropMarksForPlacement(sheetMarksLayer, artRect, placement, doc);
            }
        }

        if (plan.addRegistrationMarks) {
            addRegistrationMarksForSheet(sheetMarksLayer, artRect, plan, doc);
        }
    }

    doc.artboards.setActiveArtboardIndex(0);
    return doc;
}
