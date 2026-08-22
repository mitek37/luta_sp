"use strict";


/* =========================================
    グローバル変数
========================================= */

let imageData = {};


// 現在の検索結果
let currentResults = [];


// 現在ビューしている画像の
// currentResults内での位置
let currentViewerIndex = -1;


// 現在の画面
let currentScreen = "main";


/* =========================================
    DOM
========================================= */

const mainScreen =
    document.getElementById("mainScreen");

const viewerScreen =
    document.getElementById("viewerScreen");


const searchInput =
    document.getElementById("searchInput");

const searchButton =
    document.getElementById("searchButton");

const imageGrid =
    document.getElementById("imageGrid");

const noResult =
    document.getElementById("noResult");

const topButton =
    document.getElementById("topButton");


const typeCheckboxes =
    document.querySelectorAll(
        ".type-checkbox"
    );


const matchRadios =
    document.querySelectorAll(
        'input[name="matchType"]'
    );


const viewerImage =
    document.getElementById("viewerImage");

const viewerTitle =
    document.getElementById("viewerTitle");

const viewerTags =
    document.getElementById("viewerTags");

const prevButton =
    document.getElementById("prevButton");

const nextButton =
    document.getElementById("nextButton");

const backButton =
    document.getElementById("backButton");


/* =========================================
    初期化
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadData();

        setupEvents();

        performSearch();

    }
);


/* =========================================
    data.jsonを読み込む
========================================= */

async function loadData() {

    try {

        const response =
            await fetch("data.json");

        if (!response.ok) {

            throw new Error(
                `data.jsonの読み込みに失敗しました: ${response.status}`
            );

        }

        imageData =
            await response.json();

    }
    catch (error) {

        console.error(error);

        imageGrid.innerHTML = "";

        noResult.textContent =
            "データの読み込みに失敗しました。";

        noResult.classList.remove("hidden");
    }
}


/* =========================================
    イベント設定
========================================= */

function setupEvents() {

    /*
        検索ボタン
    */

    searchButton.addEventListener(
        "click",
        () => {

            performSearch();

        }
    );


    /*
        Enterキーでも検索
    */

    searchInput.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Enter") {

                performSearch();

            }

        }
    );


    /*
        タイプチェックボックス変更
    */

    typeCheckboxes.forEach(
        checkbox => {

            checkbox.addEventListener(
                "change",
                () => {

                    performSearch();

                }
            );

        }
    );


    /*
        完全一致 / 部分一致
    */

    matchRadios.forEach(
        radio => {

            radio.addEventListener(
                "change",
                () => {

                    performSearch();

                }
            );

        }
    );


    /*
        TOPボタン
    */

    topButton.addEventListener(
        "click",
        () => {

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }
    );


    /*
        前の画像
    */

    prevButton.addEventListener(
        "click",
        () => {

            if (currentViewerIndex > 0) {

                currentViewerIndex--;

                updateViewer();

            }

        }
    );


    /*
        次の画像
    */

    nextButton.addEventListener(
        "click",
        () => {

            if (
                currentViewerIndex <
                currentResults.length - 1
            ) {

                currentViewerIndex++;

                updateViewer();

            }

        }
    );


    /*
        一覧へ戻る
    */

    backButton.addEventListener(
        "click",
        () => {

            showMainScreen();

        }
    );


    /*
        ブラウザの戻る・進む
    */

    window.addEventListener(
        "popstate",
        () => {

            const state =
                history.state;

            if (
                state &&
                state.screen === "viewer"
            ) {

                currentViewerIndex =
                    state.index;

                showViewerScreen(
                    false
                );

            }
            else {

                showMainScreen(
                    false
                );

            }

        }
    );


    /*
        キーボード左右キー
        PCで便利なので追加
    */

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                currentScreen !== "viewer"
            ) {
                return;
            }


            if (
                event.key === "ArrowLeft"
            ) {

                prevButton.click();

            }
            else if (
                event.key === "ArrowRight"
            ) {

                nextButton.click();

            }
            else if (
                event.key === "Escape"
            ) {

                showMainScreen();

            }

        }
    );
}


/* =========================================
    検索
========================================= */

function performSearch() {

    const searchText =
        searchInput.value.trim();


    /*
        半角スペース・全角スペース
        のどちらでも分割
    */

    const searchTags =
        searchText
            .split(/[\s\u3000]+/)
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);


    /*
        完全一致 or 部分一致
    */

    const matchType =
        document.querySelector(
            'input[name="matchType"]:checked'
        ).value;


    /*
        チェックされているタイプ
    */

    const selectedTypes =
        Array.from(typeCheckboxes)
            .filter(
                checkbox =>
                    checkbox.checked
            )
            .map(
                checkbox =>
                    checkbox.value
            );


    /*
        全画像を検索
    */

    currentResults =
        Object.entries(imageData)
            .filter(
                ([filename, data]) => {

                    /*
                        ---------------------
                        タイプによる絞り込み
                        ---------------------
                    */

                    if (
                        !selectedTypes.includes(
                            data.type
                        )
                    ) {

                        return false;

                    }


                    /*
                        ---------------------
                        タグ検索
                        ---------------------

                        検索文字が空なら
                        全画像を通す
                    */

                    if (
                        searchTags.length === 0
                    ) {

                        return true;

                    }


                    /*
                        データ側のタグ
                    */

                    const tags =
                        Array.isArray(data.tags)
                            ? data.tags
                            : [];


                    /*
                        AND検索

                        every()なので、
                        検索したタグを
                        全て満たす必要がある
                    */

                    return searchTags.every(
                        searchTag => {

                            if (
                                matchType ===
                                "exact"
                            ) {

                                /*
                                    完全一致
                                */

                                return tags.some(
                                    tag =>
                                        tag ===
                                        searchTag
                                );

                            }
                            else {

                                /*
                                    部分一致
                                */

                                return tags.some(
                                    tag =>
                                        tag.includes(
                                            searchTag
                                        )
                                );

                            }

                        }
                    );

                }
            );


    /*
        結果表示
    */

    renderResults();

}


/* =========================================
    検索結果を画面に表示
========================================= */

function renderResults() {

    imageGrid.innerHTML = "";


    /*
        0件の場合
    */

    if (
        currentResults.length === 0
    ) {

        noResult.classList.remove(
            "hidden"
        );

        return;

    }


    noResult.classList.add(
        "hidden"
    );


    /*
        検索結果を1つずつ作る
    */

    currentResults.forEach(
        ([filename, data], index) => {

            const card =
                document.createElement(
                    "article"
                );

            card.className =
                "image-card";


            /*
                画像
            */

            const image =
                document.createElement(
                    "img"
                );

            image.className =
                "thumbnail";

            image.src =
                getImagePath(filename);

            image.alt =
                data.name || filename;

            /*
                lazy loading

                大量の画像がある場合、
                画面に入るまで読み込まない
            */

            image.loading =
                "lazy";


            /*
                画像名
            */

            const name =
                document.createElement(
                    "div"
                );

            name.className =
                "image-name";

            name.textContent =
                data.name || filename;


            /*
                カードに追加
            */

            card.appendChild(
                image
            );

            card.appendChild(
                name
            );


            /*
                クリック
            */

            card.addEventListener(
                "click",
                () => {

                    openViewer(index);

                }
            );


            imageGrid.appendChild(
                card
            );

        }
    );
}


/* =========================================
    画像パス
========================================= */

function getImagePath(filename) {

    /*
        imageフォルダの中にあるため
        image/ファイル名
    */

    return (
        "image/" +
        encodeURIComponent(filename)
    );
}


/* =========================================
    画像ビューを開く
========================================= */

function openViewer(index) {

    if (
        index < 0 ||
        index >= currentResults.length
    ) {

        return;

    }


    currentViewerIndex =
        index;


    history.pushState(
        {
            screen: "viewer",
            index: index
        },
        "",
        "#viewer"
    );


    showViewerScreen(
        false
    );
}


/* =========================================
    ビュー画面表示
========================================= */

function showViewerScreen(
    updateHistory = true
) {

    if (
        currentViewerIndex < 0 ||
        currentViewerIndex >=
            currentResults.length
    ) {

        return;

    }


    mainScreen.classList.add(
        "hidden"
    );

    viewerScreen.classList.remove(
        "hidden"
    );


    currentScreen =
        "viewer";


    updateViewer();


    /*
        ページ最上部へ
    */

    window.scrollTo({
        top: 0,
        behavior: "instant"
    });


    if (updateHistory) {

        history.pushState(
            {
                screen: "viewer",
                index: currentViewerIndex
            },
            "",
            "#viewer"
        );

    }
}


/* =========================================
    ビュー内容更新
========================================= */

function updateViewer() {

    if (
        currentViewerIndex < 0 ||
        currentViewerIndex >=
            currentResults.length
    ) {

        return;

    }


    const [
        filename,
        data
    ] =
        currentResults[
            currentViewerIndex
        ];


    /*
        画像
    */

    viewerImage.src =
        getImagePath(filename);

    viewerImage.alt =
        data.name || filename;


    /*
        タイトル
    */

    viewerTitle.textContent =
        data.name || filename;


    /*
        前ボタン
    */

    prevButton.disabled =
        currentViewerIndex <= 0;


    /*
        次ボタン
    */

    nextButton.disabled =
        currentViewerIndex >=
        currentResults.length - 1;


    /*
        タグ
    */

    renderViewerTags(
        data.tags || []
    );
}


/* =========================================
    ビュー画面のタグ表示
========================================= */

function renderViewerTags(
    tags
) {

    viewerTags.innerHTML = "";


    tags.forEach(
        tag => {

            const button =
                document.createElement(
                    "button"
                );

            button.className =
                "tag-button";

            button.textContent =
                tag;


            /*
                タグをクリックしたら
                そのタグで検索
            */

            button.addEventListener(
                "click",
                () => {

                    searchByTag(
                        tag
                    );

                }
            );


            viewerTags.appendChild(
                button
            );

        }
    );
}


/* =========================================
    タグ検索
========================================= */

function searchByTag(tag) {

    /*
        メイン画面に戻す
    */

    showMainScreen();


    /*
        検索BOXにタグを入れる
    */

    searchInput.value =
        tag;


    /*
        タグ検索は完全一致にする
    */

    const exactRadio =
        document.querySelector(
            'input[name="matchType"][value="exact"]'
        );

    if (exactRadio) {

        exactRadio.checked =
            true;

    }


    /*
        タイプは全部ON
    */

    typeCheckboxes.forEach(
        checkbox => {

            checkbox.checked =
                true;

        }
    );


    /*
        検索
    */

    performSearch();


    /*
        画面上部へ
    */

    window.scrollTo({
        top: 0,
        behavior: "instant"
    });


    /*
        URL履歴を更新
    */

    history.pushState(
        {
            screen: "main"
        },
        "",
        "#search"
    );

}


/* =========================================
    メイン画面表示
========================================= */

function showMainScreen(
    updateHistory = true
) {

    viewerScreen.classList.add(
        "hidden"
    );

    mainScreen.classList.remove(
        "hidden"
    );


    currentScreen =
        "main";


    if (updateHistory) {

        history.pushState(
            {
                screen: "main"
            },
            "",
            "#main"
        );

    }

}