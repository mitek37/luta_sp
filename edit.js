// ============================================================
// Cloudflare Worker
// ============================================================

const WORKER_URL =
    "https://luta-sp-uploader.alamodemitek37.workers.dev/";


// 編集対象データ
let targetData = null;


// ============================================================
// ページ読み込み
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    // localStorageから編集対象データを取得
    const rawData = localStorage.getItem("edit_target_image");

    if (!rawData) {
        alert("編集対象の画像データが見つからナイヨ～");
        window.location.href = "index.html";
        return;
    }

    try {
        targetData = JSON.parse(rawData);
    } catch (err) {
        console.error("編集対象データのJSON解析に失敗:", err);

        alert("編集対象の画像データが壊れているらしい！！！");
        localStorage.removeItem("edit_target_image");
        window.location.href = "index.html";
        return;
    }


    // ========================================================
    // 画面へ反映
    // ========================================================

    const previewImg = document.getElementById("previewImg");
    const filenameDisplay = document.getElementById("filenameDisplay");
    const nameInput = document.getElementById("nameInput");
    const typeSelect = document.getElementById("typeSelect");
    const tagsInput = document.getElementById("tagsInput");


    // プレビュー画像
    if (previewImg) {
        previewImg.src =
            "image/" + encodeURIComponent(targetData.filename);

        previewImg.onerror = () => {
            console.warn(
                "プレビュー画像を読み込めませんでしたのだ...:",
                targetData.filename
            );
        };
    }


    // ファイル名
    if (filenameDisplay) {
        filenameDisplay.textContent =
            targetData.filename || "";
    }


    // 名前
    if (nameInput) {
        nameInput.value =
            targetData.name || "";
    }


    // タイプ
    if (typeSelect) {
        typeSelect.value =
            targetData.type || "資料";
    }


    // タグ
    if (tagsInput) {
        tagsInput.value =
            (targetData.tags || []).join("、");
    }
});


// ============================================================
// タグ入力文字列の分解
// ============================================================

function parseTags(text) {

    if (!text || !text.trim()) {
        return [];
    }

    return text
        .split("、")
        .map(t => t.trim())
        .filter(
            (t, idx, self) =>
                t.length > 0 &&
                self.indexOf(t) === idx
        );
}


// ============================================================
// 既存画像の編集
// ============================================================

async function saveEdit() {

    if (!targetData) {
        alert("編集対象のデータがありません。");
        return;
    }


    const nameInput =
        document.getElementById("nameInput");

    const typeSelect =
        document.getElementById("typeSelect");

    const tagsInput =
        document.getElementById("tagsInput");

    const saveBtn =
        document.getElementById("saveBtn");


    const newName =
        nameInput.value.trim();


    if (!newName) {
        alert("名前を入力してネ！");
        return;
    }


    const newType =
        typeSelect.value;


    const newTags =
        parseTags(tagsInput.value);


    if (!confirm("この内容で変えるデスカ？")) {
        return;
    }


    saveBtn.disabled = true;

    setStatus("GitHubへ反映中...");


    const pendingChanges = [
        {
            action: "edit",

            filename: targetData.filename,

            name: newName,

            image_type: newType,

            tags: newTags
        }
    ];


    await sendCommitToWorker({
        pendingChanges
    });
}


// ============================================================
// 既存画像の削除
// ============================================================

async function deleteImage() {

    if (!targetData) {
        alert("削除対象のデータがありません。");
        return;
    }


    const filename =
        targetData.filename;


    if (
        !confirm(
            `本当に「${filename}」消してまうのー？\n\n`
        )
    ) {
        return;
    }


    const deleteBtn =
        document.getElementById("deleteBtn");


    if (deleteBtn) {
        deleteBtn.disabled = true;
    }


    setStatus("削除処理を実行中...");


    const pendingChanges = [
        {
            action: "delete",

            filename: filename
        }
    ];


    await sendCommitToWorker({
        pendingChanges
    });
}


// ============================================================
// Cloudflare Workerへの送信
// ============================================================

async function sendCommitToWorker(payload) {

    try {

        console.log("========== Worker通信開始 ==========");
        console.log("Worker URL:", WORKER_URL);
        console.log("送信データ:", payload);


        // ----------------------------------------------------
        // fetch
        // ----------------------------------------------------

        let response;

        try {

            response = await fetch(
                WORKER_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify(payload)
                }
            );

        } catch (fetchError) {

            // ------------------------------------------------
            // Failed to fetch / Load failed
            // ------------------------------------------------

            console.error(
                "Workerへのfetchに失敗しました:",
                fetchError
            );


            throw new Error(
                "Cloudflare Workerへ接続できませんでした。\n\n" +
                "・Workerが正常に公開されているか\n" +
                "・Worker URLが正しいか\n" +
                "・CORS設定に問題がないか\n" +
                "・Worker側でエラーが発生していないか\n" +
                "を確認してください。\n\n" +
                `元のエラー: ${fetchError.message}`
            );
        }


        console.log(
            "HTTPステータス:",
            response.status
        );

        console.log(
            "HTTP OK:",
            response.ok
        );


        // ----------------------------------------------------
        // レスポンス本文をまずtextで取得
        // ----------------------------------------------------
        //
        // いきなり response.json() すると、
        // WorkerがJSON以外を返した場合に
        // 「Unexpected token ...」などになってしまうため、
        // まずtextとして取得します。
        //

        const responseText =
            await response.text();


        console.log(
            "Workerレスポンス:",
            responseText
        );


        // ----------------------------------------------------
        // HTTPエラー
        // ----------------------------------------------------

        if (!response.ok) {

            let errorMessage =
                `WorkerがHTTP ${response.status}を返しました。`;

            try {

                const errorData =
                    JSON.parse(responseText);

                if (errorData.error) {
                    errorMessage +=
                        `\n\n${errorData.error}`;
                }

            } catch (parseError) {

                if (responseText) {
                    errorMessage +=
                        `\n\n${responseText}`;
                }
            }


            throw new Error(errorMessage);
        }


        // ----------------------------------------------------
        // JSON解析
        // ----------------------------------------------------

        let result;

        try {

            result =
                JSON.parse(responseText);

        } catch (jsonError) {

            console.error(
                "WorkerレスポンスのJSON解析に失敗:",
                jsonError
            );

            throw new Error(
                "Cloudflare Workerから正常なJSONレスポンスが返ってきませんでした。\n\n" +
                "Workerの実行結果を確認してクレメンス\n\n" +
                "レスポンス:\n" +
                responseText.substring(0, 1000)
            );
        }


        console.log(
            "Worker解析結果:",
            result
        );


        // ----------------------------------------------------
        // Worker側のsuccess確認
        // ----------------------------------------------------

        if (!result.success) {

            throw new Error(
                result.error ||
                "Worker側で更新処理に失敗しました。"
            );
        }


        // ====================================================
        // 成功
        // ====================================================

        console.log(
            "========== Worker通信成功 =========="
        );


        setStatus(
            "反映が完了しました！元の画面に戻ります..."
        );


        alert(
            "更新が完了したze！"
        );


        // 一時データ削除
        localStorage.removeItem(
            "edit_target_image"
        );


        // 掲示板へ戻る
        window.history.back();


    } catch (err) {

        // ====================================================
        // エラー
        // ====================================================

        console.error(
            "========== Worker通信エラー =========="
        );

        console.error(err);


        setStatus(
            "エラーが発生しました。"
        );


        alert(
            "更新に失敗しました。トホホ...\n\n" +
            err.message
        );


        // ボタンを再び押せるようにする

        const saveBtn =
            document.getElementById("saveBtn");

        const deleteBtn =
            document.getElementById("deleteBtn");


        if (saveBtn) {
            saveBtn.disabled = false;
        }

        if (deleteBtn) {
            deleteBtn.disabled = false;
        }
    }
}

document
    .getElementById("backToViewerButton")
    .addEventListener("click", () => {
        window.history.back();
    });


// ============================================================
// キャンセル
// ============================================================

function cancelEdit() {

    localStorage.removeItem(
        "edit_target_image"
    );

    window.history.back();
}


// ============================================================
// ステータス表示
// ============================================================

function setStatus(msg) {

    const statusText =
        document.getElementById("statusText");

    if (statusText) {
        statusText.textContent = msg;
    }
}
