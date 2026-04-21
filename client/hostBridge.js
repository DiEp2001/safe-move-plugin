var cs = null;

try {
    cs = new CSInterface();
} catch (e) {
    cs = null;
}

function evalJSX(script, callback) {
    if (!cs) {
        if (callback) {
            callback('{"status":"error","message":"CSInterface chưa được load"}');
        }
        return;
    }

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
    if (!cs) {
        throw new Error("CSInterface chưa sẵn sàng");
    }

    if (typeof SystemPath === "undefined") {
        throw new Error("SystemPath chưa tồn tại");
    }

    return cs.getSystemPath(SystemPath.EXTENSION).replace(/\\/g, "/");
}

function runSafeMovePreview(payload) {
    var json = escapeForJSX(JSON.stringify(payload));
    var extPath = getExtensionPath();

    var script =
        '$.evalFile("' + extPath + '/jsx/safe-move/core.jsx");' +
        '$.evalFile("' + extPath + '/jsx/safe-move/preview.jsx");' +
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

function runSafeMove(payload) {
    var json = escapeForJSX(JSON.stringify(payload));
    var extPath = getExtensionPath();

    var script =
        '$.evalFile("' + extPath + '/jsx/safe-move/core.jsx");' +
        '$.evalFile("' + extPath + '/jsx/safe-move/move.jsx");' +
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

function runBlackCheck(payload) {
    var json = escapeForJSX(JSON.stringify(payload));
    var extPath = getExtensionPath();

    var script =
        '$.evalFile("' + extPath + '/jsx/check-black-4c/core.jsx");' +
        '$.evalFile("' + extPath + '/jsx/check-black-4c/scan.jsx");' +
        'runBlackCheckPanel("' + json + '");';

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
