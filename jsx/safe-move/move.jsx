function runMovePanel(payloadText) {
    try {
        if (app.documents.length === 0) {
            return '{"status":"error","mode":"move","message":"Chưa mở file Illustrator"}';
        }

        var payload = eval("(" + payloadText + ")");

        var dieRule = normalizeRule(payload.dieRule);
        var dimRule = normalizeRule(payload.dimRule);

        var result = runMove(dieRule, dimRule, {
            dieLayerName: payload.dieLayerName || "Die Cut",
            dimLayerName: payload.dimLayerName || "Dimension",
            showDieLayer: payload.showDieLayer,
            showDimLayer: payload.showDimLayer
        });

        return '{' +
            '"status":"ok",' +
            '"mode":"move",' +
            '"dieCount":' + result.dieCount + ',' +
            '"dimCount":' + result.dimCount + ',' +
            '"document":"' + app.activeDocument.name + '",' +
            '"message":"Move thành công"' +
        '}';
    } catch (e) {
        return '{"status":"error","mode":"move","message":"' + String(e).replace(/"/g, '\\"') + '"}';
    }
}