function runPreview(payloadText) {
    try {
        if (app.documents.length === 0) {
            return '{"status":"error","mode":"preview","message":"Chưa mở file Illustrator"}';
        }

        var payload = eval("(" + payloadText + ")");
        var dieRule = normalizeRule(payload.dieRule);
        var dimRule = normalizeRule(payload.dimRule);
        var target = payload.previewTarget || "all";

        clearSelection();

        if (target === "die") {
            var dieItems = collectMatchedItems(dieRule);
            selectItems(dieItems);

            return '{' +
                '"status":"ok",' +
                '"mode":"preview",' +
                '"previewTarget":"die",' +
                '"dieCount":' + dieItems.length + ',' +
                '"dimCount":0,' +
                '"selectedCount":' + dieItems.length + ',' +
                '"document":"' + app.activeDocument.name + '",' +
                '"message":"Đã highlight Die Cut"' +
            '}';
        }

        if (target === "dim") {
            var dimItems = collectMatchedItems(dimRule);
            selectItems(dimItems);

            return '{' +
                '"status":"ok",' +
                '"mode":"preview",' +
                '"previewTarget":"dim",' +
                '"dieCount":0,' +
                '"dimCount":' + dimItems.length + ',' +
                '"selectedCount":' + dimItems.length + ',' +
                '"document":"' + app.activeDocument.name + '",' +
                '"message":"Đã highlight Dimension"' +
            '}';
        }

        var dieItemsAll = collectMatchedItems(dieRule);
        var dimItemsAll = collectMatchedItems(dimRule);

        var allItems = [];
        var seen = {};

        function pushUnique(arr) {
            for (var i = 0; i < arr.length; i++) {
                try {
                    var key = String(arr[i].typename) + "_" + String(arr[i].zOrderPosition);
                    if (!seen[key]) {
                        seen[key] = true;
                        allItems.push(arr[i]);
                    }
                } catch (e) {
                    allItems.push(arr[i]);
                }
            }
        }

        pushUnique(dieItemsAll);
        pushUnique(dimItemsAll);

        selectItems(allItems);

        return '{' +
            '"status":"ok",' +
            '"mode":"preview",' +
            '"previewTarget":"all",' +
            '"dieCount":' + dieItemsAll.length + ',' +
            '"dimCount":' + dimItemsAll.length + ',' +
            '"selectedCount":' + allItems.length + ',' +
            '"document":"' + app.activeDocument.name + '",' +
            '"message":"Đã highlight tất cả object match"' +
        '}';

    } catch (e) {
        return '{"status":"error","mode":"preview","message":"' + String(e).replace(/"/g, '\\"') + '"}';
    }
}