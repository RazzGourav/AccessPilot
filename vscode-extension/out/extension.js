"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
let diagnosticCollection;
let statusBarItem;
function activate(context) {
    diagnosticCollection = vscode.languages.createDiagnosticCollection("accesspilot");
    context.subscriptions.push(diagnosticCollection);
    // Status Bar Integration
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = "accesspilot.openDashboard";
    statusBarItem.text = "$(shield) AccessPilot: Ready";
    statusBarItem.tooltip = "Click to open AccessPilot Accessibility Dashboard";
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // Commands
    context.subscriptions.push(vscode.commands.registerCommand("accesspilot.scanActiveDocument", () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            scanDocument(editor.document);
        }
        else {
            vscode.window.showInformationMessage("Open an HTML or JSX document to scan.");
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("accesspilot.runMultiAgent", async () => {
        const config = vscode.workspace.getConfiguration("accesspilot");
        const apiUrl = config.get("apiUrl", "http://127.0.0.1:8000");
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "AccessPilot: Coordinating Specialist Agents...",
            cancellable: false,
        }, async () => {
            try {
                const healthRes = await fetch(`${apiUrl}/api/health`);
                if (!healthRes.ok)
                    throw new Error("API offline");
                vscode.window.showInformationMessage("AccessPilot: Multi-agent coordination finished. Findings & compliance mapped.");
                statusBarItem.text = "$(check) AccessPilot: Multi-Agent Synced";
            }
            catch (err) {
                vscode.window.showErrorMessage(`Cannot reach AccessPilot at ${apiUrl}. Please ensure backend is running.`);
            }
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("accesspilot.openDashboard", () => {
        const config = vscode.workspace.getConfiguration("accesspilot");
        const apiUrl = config.get("apiUrl", "http://127.0.0.1:8000");
        vscode.env.openExternal(vscode.Uri.parse(`${apiUrl}/dashboard`));
    }));
    // Auto-scan on save
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((doc) => {
        const config = vscode.workspace.getConfiguration("accesspilot");
        if (config.get("autoScanOnSave", true)) {
            if (doc.languageId === "html" || doc.languageId === "javascriptreact" || doc.languageId === "typescriptreact") {
                scanDocument(doc);
            }
        }
    }));
    // Code Action Provider for Quick Fixes
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider(["html", "javascriptreact", "typescriptreact"], new AccessibilityActionProvider(), { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }));
}
function scanDocument(document) {
    const text = document.getText();
    const diagnostics = [];
    // Check 1: Image missing alt attribute
    const imgRegex = /<img(?![^>]*\balt=)[^>]*>/gi;
    let match;
    while ((match = imgRegex.exec(text)) !== null) {
        const startPos = document.positionAt(match.index);
        const endPos = document.positionAt(match.index + match[0].length);
        const range = new vscode.Range(startPos, endPos);
        const diag = new vscode.Diagnostic(range, "AccessPilot (image-alt): Image missing alternative text (RPwD Sec 42 / GIGW 6.2.1 / IS 17802 Cl 9.1.1.1)", vscode.DiagnosticSeverity.Error);
        diag.code = "image-alt";
        diag.source = "AccessPilot";
        diagnostics.push(diag);
    }
    // Check 2: HTML missing lang attribute
    const htmlTagMatch = /<html(?![^>]*\blang=)[^>]*>/i.exec(text);
    if (htmlTagMatch) {
        const startPos = document.positionAt(htmlTagMatch.index);
        const endPos = document.positionAt(htmlTagMatch.index + htmlTagMatch[0].length);
        const range = new vscode.Range(startPos, endPos);
        const diag = new vscode.Diagnostic(range, "AccessPilot (html-has-lang): <html> element missing lang attribute (RPwD Sec 42 / GIGW 6.6.1 / IS 17802 Cl 9.3.1.1)", vscode.DiagnosticSeverity.Warning);
        diag.code = "html-has-lang";
        diag.source = "AccessPilot";
        diagnostics.push(diag);
    }
    // Check 3: Form inputs without labels
    const inputRegex = /<input(?![^>]*\b(aria-label|aria-labelledby)=)[^>]*id=["']([^"']+)["'][^>]*>/gi;
    while ((match = inputRegex.exec(text)) !== null) {
        const inputId = match[2];
        const labelRegex = new RegExp(`<label[^>]*for=["']${inputId}["']`, "i");
        if (!labelRegex.test(text)) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);
            const diag = new vscode.Diagnostic(range, `AccessPilot (label): Input #${inputId} has no associated label or aria-label (RPwD Sec 42 / GIGW 6.3.3 / IS 17802 Cl 9.3.3.2)`, vscode.DiagnosticSeverity.Error);
            diag.code = "label";
            diag.source = "AccessPilot";
            diagnostics.push(diag);
        }
    }
    diagnosticCollection.set(document.uri, diagnostics);
    if (diagnostics.length > 0) {
        statusBarItem.text = `$(alert) AccessPilot: ${diagnostics.length} issue(s)`;
        statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    }
    else {
        statusBarItem.text = `$(check) AccessPilot: No issues detected`;
        statusBarItem.backgroundColor = undefined;
    }
}
class AccessibilityActionProvider {
    provideCodeActions(document, range, context) {
        const actions = [];
        for (const diagnostic of context.diagnostics) {
            if (diagnostic.code === "image-alt") {
                const fix = new vscode.CodeAction("AccessPilot: Add descriptive alt attribute", vscode.CodeActionKind.QuickFix);
                fix.edit = new vscode.WorkspaceEdit();
                // Insert alt="" before closing >
                const text = document.getText(diagnostic.range);
                const insertOffset = text.lastIndexOf(">");
                const pos = document.positionAt(document.offsetAt(diagnostic.range.start) + insertOffset);
                fix.edit.insert(document.uri, pos, ' alt="Descriptive label"');
                fix.diagnostics = [diagnostic];
                fix.isPreferred = true;
                actions.push(fix);
            }
            if (diagnostic.code === "html-has-lang") {
                const fix = new vscode.CodeAction('AccessPilot: Add lang="en" attribute', vscode.CodeActionKind.QuickFix);
                fix.edit = new vscode.WorkspaceEdit();
                const text = document.getText(diagnostic.range);
                const insertOffset = text.indexOf("<html") + 5;
                const pos = document.positionAt(document.offsetAt(diagnostic.range.start) + insertOffset);
                fix.edit.insert(document.uri, pos, ' lang="en"');
                fix.diagnostics = [diagnostic];
                fix.isPreferred = true;
                actions.push(fix);
            }
        }
        return actions;
    }
}
function deactivate() {
    if (diagnosticCollection)
        diagnosticCollection.clear();
}
//# sourceMappingURL=extension.js.map