function buildGangResult(payloadText, createLayout) {
    try {
        var payload = eval("(" + payloadText + ")");
        var options = normalizeGangPayload(payload);

        if (!options.files.length) {
            return serializeValue({
                status: "error",
                message: "Chua co file PDF."
            });
        }

        var measured = measurePdfFiles(options.files);
        var plan = buildGangPlan(measured, options);
        var docName = "";

        if (createLayout) {
            var doc = createGangDocument(plan);
            docName = doc.name || "Untitled";
        }

        return serializeValue({
            status: "ok",
            mode: createLayout ? "layout" : "analyze",
            files: plan.files,
            totalSheets: plan.totalSheets,
            totalPlaced: plan.totalPlaced,
            utilizationText: plan.utilizationText,
            addCropMarks: options.addCropMarks,
            addRegistrationMarks: options.addRegistrationMarks,
            fileSummaries: plan.fileSummaries,
            sheetSummaries: plan.sheetSummaries,
            document: docName,
            message: createLayout
                ? "Da tao layout len artboard."
                : "Da tinh xong so con va so sheet."
        });
    } catch (e) {
        return serializeValue({
            status: "error",
            message: String(e)
        });
    }
}

function runGangPdfAnalyze(payloadText) {
    return buildGangResult(payloadText, false);
}

function runGangPdfLayout(payloadText) {
    return buildGangResult(payloadText, true);
}
