var cs = new CSInterface();

function evalJSX(script, callback) {
    cs.evalScript(script, function (res) {
        if (callback) callback(res);
    });
}

function escapeForJSX(text) {
    return String(text)
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n");
}

function getExtensionPath() {
    return cs.getSystemPath(SystemPath.EXTENSION).replace(/\\/g, "/");
}

function runPreview(payload) {
    var json = escapeForJSX(JSON.stringify(payload));
    var extPath = getExtensionPath();

    var script =
        '$.evalFile("' + extPath + '/jsx/core.jsx");' +
        '$.evalFile("' + extPath + '/jsx/preview.jsx");' +
        'runPreview("' + json + '");';

    return new Promise(function (resolve) {
        evalJSX(script, function (res) {
            try {
                resolve(JSON.parse(res));
            } catch (e) {
                resolve({ status: "error", message: res });
            }
        });
    });
}

function runMove(payload) {
    var json = escapeForJSX(JSON.stringify(payload));
    var extPath = getExtensionPath();

    var script =
        '$.evalFile("' + extPath + '/jsx/core.jsx");' +
        '$.evalFile("' + extPath + '/jsx/move.jsx");' +
        'runMovePanel("' + json + '");';

    return new Promise(function (resolve) {
        evalJSX(script, function (res) {
            try {
                resolve(JSON.parse(res));
            } catch (e) {
                resolve({ status: "error", message: res });
            }
        });
    });
}