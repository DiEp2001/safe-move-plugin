function runBlackCheckPanel(payloadText) {
    try {
        if (app.documents.length === 0) {
            return '{"status":"error","mode":"scan","message":"Chua mo file Illustrator"}';
        }

        var payload = eval("(" + payloadText + ")");
        var mode = payload.mode || "scan";
        var options = getOptions(payload);
        var criteriaText = "Rule: K > " + options.minK + ", co it nhat 1 kenh C/M/Y > " + options.minCMY + ", va do lech CMY <= " + options.neutralTolerance;

        if (mode === "clear") {
            clearSelection();

            return '{' +
                '"status":"ok",' +
                '"mode":"clear",' +
                '"matchCount":0,' +
                '"fillCount":0,' +
                '"strokeCount":0,' +
                '"selectedCount":0,' +
                '"document":"' + escapeJsonString(app.activeDocument.name) + '",' +
                '"criteriaText":"' + escapeJsonString(criteriaText) + '",' +
                '"message":"Da clear selection"' +
            '}';
        }

        var result = collectBlack4CItems(options);

        if (mode === "preview") {
            selectItems(result.items);
        } else {
            clearSelection();
        }

        var message = result.matchCount > 0
            ? "Da phat hien object den bi 4 mau"
            : "Khong phat hien object den bi 4 mau";

        if (mode === "preview" && result.matchCount > 0) {
            message = "Da highlight object den bi 4 mau";
        }

        return '{' +
            '"status":"ok",' +
            '"mode":"' + escapeJsonString(mode) + '",' +
            '"matchCount":' + result.matchCount + ',' +
            '"fillCount":' + result.fillCount + ',' +
            '"strokeCount":' + result.strokeCount + ',' +
            '"selectedCount":' + (mode === "preview" ? result.items.length : 0) + ',' +
            '"document":"' + escapeJsonString(app.activeDocument.name) + '",' +
            '"criteriaText":"' + escapeJsonString(criteriaText) + '",' +
            '"message":"' + escapeJsonString(message) + '"' +
        '}';
    } catch (e) {
        return '{"status":"error","mode":"scan","message":"' + escapeJsonString(String(e)) + '"}';
    }
}
