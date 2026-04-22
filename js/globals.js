// --- 全域變數與常數 ---
        const STORAGE_AUTOSAVE_KEY = 'widgets_autosave';
        const STORAGE_LAYOUTS_KEY = 'widgets_layouts_v2';
        let weatherDataLoaded = false;
        let layouts = [];
        let groups = [];
        let currentLayoutIndex = -1; // -1 表示目前狀態未對應任何已儲存的版面，或是已被修改
        let nextLayoutIndex = 0; // 用於循序版面切換