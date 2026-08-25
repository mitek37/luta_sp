"use strict";

// ★作成した Cloudflare Worker の URL を設定してください
const WORKER_URL = "https://luta-sp-uploader.alamodemitek37.workers.dev/";

let targetData = null;

document.addEventListener("DOMContentLoaded", () => {
    // localStorage から編集対象データを取得
    const rawData = localStorage.getItem("edit_target_image");
    
    if (!rawData) {
        alert("編集対象の画像データが見つかりません。");
        window.location.href = "index.html";
        return;
    }

    targetData = JSON.parse(rawData);

    // 画面項目へ反映
    document.getElementById("previewImg").src = "image/" + encodeURIComponent(targetData.filename);
    document.getElementById("filenameDisplay").textContent = targetData.filename;
    document.getElementById("nameInput").value = targetData.name;
    document.getElementById("typeSelect").value = targetData.type;
    document.getElementById("tagsInput").value = (targetData.tags || []).join("、");
});

// タグ入力文字列の分解
function parseTags(text) {
    if (!text || !text.trim()) return [];
    return text.split("、").map(t => t.trim()).filter((t, idx, self) => t.length > 0 && self.indexOf(t) === idx);
}

// 編集コミット（更新）
async function saveEdit() {
    const newName = document.getElementById("nameInput").value.trim();
    if (!newName) return alert("名前を入力してください。");

    const newType = document.getElementById("typeSelect").value;
    const newTags = parseTags(document.getElementById("tagsInput").value);

    if (!confirm("変更内容をコミット（反映）しますか？")) return;

    const saveBtn = document.getElementById("saveBtn");
    saveBtn.disabled = true;
    setStatus("GitHubへ反映中...");

    const pendingChanges = [{
        action: "edit",
        filename: targetData.filename,
        name: newName,
        image_type: newType,
        tags: newTags
    }];

    await sendCommitToWorker({ pendingChanges });
}

// 既存画像の削除コミット
async function deleteImage() {
    if (!confirm(`本当に「${targetData.filename}」を削除しますか？\n※サイト上から画像とデータが削除されます。`)) return;

    setStatus("削除処理を実行中...");

    const pendingChanges = [{
        action: "delete",
        filename: targetData.filename
    }];

    await sendCommitToWorker({ pendingChanges });
}

// Worker への送信共通処理
async function sendCommitToWorker(payload) {
    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || "更新に失敗しました。");
        }

        setStatus("反映が完了しました！元の画面に戻ります...");
        alert("コミットが完了しました！");

        // 一時データを消去して掲示板に戻る
        localStorage.removeItem("edit_target_image");
        window.location.href = "index.html";

    } catch (err) {
        setStatus("エラーが発生しました。");
        alert(`エラー: ${err.message}`);
        document.getElementById("saveBtn").disabled = false;
    }
}

// キャンセルして元の画面に戻る
function cancelEdit() {
    localStorage.removeItem("edit_target_image");
    window.location.href = "index.html";
}

function setStatus(msg) {
    document.getElementById("statusText").textContent = msg;
}