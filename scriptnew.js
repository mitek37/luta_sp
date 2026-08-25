const WORKER_URL = "https://luta-sp-uploader.alamodemitek37.workers.dev/";

let pendingImages = [];
let editingIndex = null;

// ファイル選択時の自動読み込み & プレビュー表示
document.getElementById('fileInput').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) {
        resetPreview();
        return;
    }

    // ファイル名入力欄の自動更新 (未入力時のみ)
    const nameInput = document.getElementById('nameInput');
    if (!nameInput.value.trim()) {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        nameInput.value = nameWithoutExt;
    }

    // プレビュー表示
    const reader = new FileReader();
    reader.onload = function (event) {
        const previewImg = document.getElementById('previewImage');
        const placeholder = document.getElementById('previewPlaceholder');
        previewImg.src = event.target.result;
        previewImg.classList.remove('hidden');
        placeholder.classList.add('hidden');
    };
    reader.readAsDataURL(file);
});

function resetPreview() {
    const previewImg = document.getElementById('previewImage');
    const placeholder = document.getElementById('previewPlaceholder');
    previewImg.src = '';
    previewImg.classList.add('hidden');
    placeholder.classList.remove('hidden');
}

// タグ文字列の分割・整形処理
function parseTags(text) {
    if (!text || !text.trim()) return [];
    return text
        .split('、')
        .map(t => t.trim())
        .filter((t, index, self) => t.length > 0 && self.indexOf(t) === index);
}

// 待機リストへの追加
async function addPendingImage() {
    const fileInput = document.getElementById('fileInput');
    const nameInput = document.getElementById('nameInput');
    const typeInput = document.getElementById('typeInput');
    const tagsInput = document.getElementById('tagsInput');

    if (!fileInput.files[0]) return alert('画像ファイルを選択してください。');
    const name = nameInput.value.trim();
    if (!name) return alert('名前を入力してください。');

    const file = fileInput.files[0];
    const filename = file.name.replace(/[<>"\/\\|?*:]/g, '_');

    // リスト内での重複チェック
    if (pendingImages.some(img => img.filename.toLowerCase() === filename.toLowerCase())) {
        return alert('同じファイル名の画像が既に待機リストに追加されています。');
    }

    // DataURLおよびBase64化
    const dataUrl = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });

    const base64Content = dataUrl.split(',')[1];

    pendingImages.push({
        file_path: file,
        filename: filename,
        name: name,
        image_type: typeInput.value,
        tags: parseTags(tagsInput.value),
        previewUrl: dataUrl,
        base64Content: base64Content
    });

    renderList();

    // フォームクリア
    fileInput.value = '';
    nameInput.value = '';
    tagsInput.value = '';
    resetPreview();

    setStatus(`${pendingImages.length}枚の新規画像が登録待ちです。`);
}

// リストの再描画
function renderList() {
    const container = document.getElementById('pendingList');
    const itemCount = document.getElementById('itemCount');
    itemCount.textContent = pendingImages.length;

    if (pendingImages.length === 0) {
        container.innerHTML = '<div class="empty-state">待機中の画像はありません</div>';
        return;
    }

    container.innerHTML = '';
    pendingImages.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'list-item';

        const tagsHtml = item.tags.length > 0
            ? item.tags.map(t => `<span class="tag-badge">${t}</span>`).join('')
            : '<span class="tag-badge">タグなし</span>';

        el.innerHTML = `
            <img src="${item.previewUrl}" alt="サムネイル" class="item-thumb">
            <div class="item-details">
                <div class="item-title">${escapeHtml(item.name)} <span style="font-weight:normal; font-size:0.8em; color:#64748b;">(${escapeHtml(item.filename)})</span></div>
                <div class="item-meta">タイプ: ${escapeHtml(item.image_type)}</div>
                <div class="item-tags">${tagsHtml}</div>
            </div>
            <div class="item-actions">
                <button class="btn btn-primary btn-sm" onclick="openEditModal(${index})">編集</button>
                <button class="btn btn-danger btn-sm" onclick="removeItem(${index})">削除</button>
            </div>
        `;
        container.appendChild(el);
    });
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// 削除処理
function removeItem(index) {
    pendingImages.splice(index, 1);
    renderList();
    setStatus(`選択した項目を削除しました。(残り ${pendingImages.length} 件)`);
}

function clearPending() {
    if (pendingImages.length === 0) return;
    if (!confirm('待機リストをすべてクリアしますか？')) return;
    pendingImages = [];
    renderList();
    setStatus('登録待ちリストを全消ししました。');
}

// モーダル編集機能
function openEditModal(index) {
    editingIndex = index;
    const item = pendingImages[index];

    document.getElementById('editModalPreview').src = item.previewUrl;
    document.getElementById('editModalFilename').textContent = item.filename;
    document.getElementById('editNameInput').value = item.name;
    document.getElementById('editTypeInput').value = item.image_type;
    document.getElementById('editTagsInput').value = item.tags.join('、');

    document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
    editingIndex = null;
    document.getElementById('editModal').classList.add('hidden');
}

function saveModalEdit() {
    if (editingIndex === null) return;

    const newName = document.getElementById('editNameInput').value.trim();
    if (!newName) return alert('名前を入力してください。');

    pendingImages[editingIndex].name = newName;
    pendingImages[editingIndex].image_type = document.getElementById('editTypeInput').value;
    pendingImages[editingIndex].tags = parseTags(document.getElementById('editTagsInput').value);

    renderList();
    closeEditModal();
    setStatus('変更内容を待機リストに保存しました。');
}

// アップロード処理
async function startUpload() {
    if (pendingImages.length === 0) return alert('アップロード対象の画像がありません。');

    if (!confirm(`${pendingImages.length}件の画像をGitHubリポジトリへ反映しますか？`)) return;

    const uploadBtn = document.getElementById('uploadBtn');
    uploadBtn.disabled = true;
    setStatus('GitHubへの一括アップロードを実行中...');

    // payload生成
    const payloadImages = pendingImages.map(img => ({
        filename: img.filename,
        name: img.name,
        image_type: img.image_type,
        tags: img.tags,
        base64Content: img.base64Content
    }));

    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pendingImages: payloadImages,
                pendingChanges: []
            })
        });


        const responseText = await response.text();

        let result;

        try {

            result = JSON.parse(
                responseText
            );

        } catch {

            throw new Error(
                `WorkerからJSONではないレスポンスが返ってきました。\n\n` +
                `HTTP ${response.status}\n\n` +
                responseText
            );

        }


        if (!response.ok) {

            throw new Error(
                result.error ||
                `Workerエラー HTTP ${response.status}`
            );

        }


        if (!result.success) {

            throw new Error(
                result.error ||
                '不明なエラーが発生しました。'
            );

        }

        setStatus('サイトへの反映が完了しました！');
        alert('アップロード完了！データと画像が正常に反映されました。');

        pendingImages = [];
        renderList();

    } catch (err) {
        setStatus('アップロードに失敗しました。');
        alert(`エラーが発生しました:\n${err.message}`);
    } finally {
        uploadBtn.disabled = false;
    }
}

function setStatus(text) {
    document.getElementById('statusText').textContent = text;
}
