// ===================================================================
// 設定、顏色與儲存
// ===================================================================
            function applyDefaultSettings() { applyLayout(JSON.parse(JSON.stringify(userDefaultLayout))); saveCurrentSettings(); Weather.updateWeather(); }
            function applyAllSettings() {
                Object.values(settingsState).forEach(widgetState => {
                    if (widgetState && widgetState.colors) Object.entries(widgetState.colors).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
                });
                applyAllTransforms();
                updateSettingsUIFromState();
                Calendar.render();
                MoonPhaseWidget.render();
                AnalogClock.init();
                MarqueeManager.rebuildAllAnimations();
            }
            function saveCurrentSettings(isProgrammaticChange = false) {
                const serializedGroups = (groups || []).map(groupSet => Array.from(groupSet));
                localStorage.setItem(STORAGE_AUTOSAVE_KEY, JSON.stringify({
                    transforms: transformStates,
                    settings: settingsState,
                    groups: serializedGroups
                }));
                if (!isProgrammaticChange) {
                    currentLayoutIndex = -1;
                }
            }
            function updateSettingsUIFromState() {
                document.querySelectorAll('#modal-backdrop-settings input[data-setting-type="color"]').forEach(picker => {
                    const widget = picker.dataset.widget, cssVar = picker.dataset.var;
                    picker.value = settingsState[widget]?.colors?.[cssVar] || getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || '#ffffff';
                });
                document.querySelectorAll('input[data-widget-toggle]').forEach(toggle => { toggle.checked = transformStates[toggle.dataset.widgetToggle]?.visible ?? false; });
                document.querySelectorAll('#modal-backdrop-settings input[data-setting-type="toggle"]').forEach(toggle => {
                    const widget = toggle.dataset.widget, key = toggle.dataset.key;
                    if (settingsState[widget] && typeof settingsState[widget][key] !== 'undefined') toggle.checked = settingsState[widget][key];
                });
                updateLocationSelectors();
                updateMarqueeSelectorUI();
                loadMarqueeSettingsToUI(document.getElementById('marquee-selector').value);
                const teSettings = settingsState.timedEffect;
                if (teSettings) {
                    document.getElementById('timed-effect-enabled-toggle').checked = teSettings.enabled;
                    document.getElementById('timed-effect-interval-seconds').value = teSettings.intervalSeconds;
                    const effectTypeSelect = document.getElementById('timed-effect-type');
                    effectTypeSelect.value = teSettings.type || 'slide';
                    document.getElementById('transition-effect-enabled-toggle').checked = teSettings.transitionEnabled ?? false;

                    const layoutSwitchOptions = document.getElementById('layout-switch-options');
                    const randomToggle = document.getElementById('layout-switch-random-toggle');
                    if (teSettings.type === 'layoutSwitch') {
                        layoutSwitchOptions.style.display = 'flex';
                        randomToggle.checked = teSettings.isRandom ?? false;
                    } else {
                        layoutSwitchOptions.style.display = 'none';
                    }
                }
            }
            const marqueeSelector = document.getElementById('marquee-selector'), marqueeTextInput = document.getElementById('marquee-text-input'), marqueeSpeedInput = document.getElementById('marquee-speed-input'), marqueeVerticalToggle = document.getElementById('marquee-vertical-toggle'), marqueeEnabledToggle = document.getElementById('marquee-enabled-toggle'), marqueeColorInput = document.getElementById('marquee-default-color'), marqueeDirectionSelect = document.getElementById('marquee-direction-select');
            function updateMarqueeSelectorUI() {
                const currentVal = marqueeSelector.value;
                marqueeSelector.innerHTML = '';
                for (let i = 0; i < settingsState.marquees.length; i++) {
                    marqueeSelector.add(new Option(`${i + 1}`, i));
                }
                if (document.querySelector(`#marquee-selector option[value="${currentVal}"]`)) {
                    marqueeSelector.value = currentVal;
                }
                document.getElementById('remove-marquee-btn').disabled = marqueeSelector.value === '0' || settingsState.marquees.length <= 1;
            }
            ['left', 'right', 'up', 'down'].forEach(dir => marqueeDirectionSelect.add(new Option({ 'left': '左', 'right': '右', 'up': '上', 'down': '下' }[dir], dir)));
            function updateDirectionOptions(isVertical) {
                for (const option of marqueeDirectionSelect.options) {
                    const isVerticalOption = ['up', 'down'].includes(option.value);
                    option.disabled = isVertical ? !isVerticalOption : isVerticalOption;
                }
            }
            function loadMarqueeSettingsToUI(index) {
                const settings = settingsState.marquees[index]; if (!settings) return;
                marqueeTextInput.value = settings.text; marqueeSpeedInput.value = settings.speed;
                marqueeVerticalToggle.checked = settings.vertical; marqueeEnabledToggle.checked = transformStates[`marquee-container-${index}`]?.visible ?? false;
                marqueeDirectionSelect.value = settings.direction || (settings.vertical ? 'up' : 'left');
                marqueeColorInput.value = settings.colors?.default || '#FFFFFF';
                updateDirectionOptions(settings.vertical);
            }
            marqueeSelector.addEventListener('change', (e) => {
                loadMarqueeSettingsToUI(e.target.value);
                document.getElementById('remove-marquee-btn').disabled = e.target.value === '0' || settingsState.marquees.length <= 1;
            });
            function updateMarqueeSettingFromUI() {
                const index = marqueeSelector.value; if (!settingsState.marquees[index]) return;
                const s = settingsState.marquees[index];
                s.text = marqueeTextInput.value; s.speed = marqueeSpeedInput.value; s.vertical = marqueeVerticalToggle.checked;
                s.direction = marqueeDirectionSelect.value;
                if (!s.colors) s.colors = {};
                s.colors['default'] = marqueeColorInput.value;
                MarqueeManager.rebuildAnimationByIndex(index); saveCurrentSettings();
            }
            marqueeVerticalToggle.addEventListener('change', e => { const isVertical = e.target.checked; updateDirectionOptions(isVertical); marqueeDirectionSelect.value = isVertical ? 'up' : 'left'; updateMarqueeSettingFromUI(); });
            marqueeEnabledToggle.addEventListener('change', e => {
                const widgetId = `marquee-container-${marqueeSelector.value}`, isVisible = e.target.checked;
                if (transformStates[widgetId]) {
                    transformStates[widgetId].visible = isVisible;
                    document.getElementById(widgetId).style.display = isVisible ? 'flex' : 'none';
                    const mainToggle = document.querySelector(`input[data-widget-toggle="${widgetId}"]`);
                    if (mainToggle) mainToggle.checked = isVisible;
                    saveCurrentSettings();
                }
            });
            ['input', 'change'].forEach(evt => { ['marquee-text-input', 'marquee-speed-input', 'marquee-default-color', 'marquee-direction-select'].forEach(id => document.getElementById(id).addEventListener(evt, updateMarqueeSettingFromUI)); });
            document.getElementById('settings-btn').addEventListener('click', () => { updateSettingsUIFromState(); showModal('modal-backdrop-settings'); });
            document.querySelector('#modal-backdrop-settings').addEventListener('input', e => {
                if (e.target.dataset.settingType === 'color') {
                    const widget = e.target.dataset.widget, cssVar = e.target.dataset.var, color = e.target.value;
                    document.documentElement.style.setProperty(cssVar, color);
                    if (settingsState[widget]?.colors) settingsState[widget].colors[cssVar] = color;
                    if (widget === 'moonPhase') MoonPhaseWidget.render(); if (widget === 'calendar') Calendar.render(); if (widget === 'analogClock') AnalogClock.init();
                    MarqueeManager.rebuildAllAnimations(); saveCurrentSettings();
                }
            });
            document.querySelector('#modal-backdrop-settings').addEventListener('change', e => {
                const toggle = e.target.closest('input[data-widget-toggle]');
                if (toggle) {
                    const widgetId = toggle.dataset.widgetToggle, widgetEl = document.getElementById(widgetId);
                    if (widgetEl && transformStates[widgetId]) {
                        transformStates[widgetId].visible = toggle.checked; widgetEl.style.display = toggle.checked ? 'flex' : 'none';
                        if (widgetId.startsWith('marquee-container-') && widgetId === `marquee-container-${marqueeSelector.value}`) marqueeEnabledToggle.checked = toggle.checked;
                        saveCurrentSettings();
                    }
                }
                const settingToggle = e.target.closest('input[data-setting-type="toggle"]');
                if (settingToggle) {
                    const widget = settingToggle.dataset.widget, key = settingToggle.dataset.key;
                    if (settingsState[widget]) {
                        settingsState[widget][key] = settingToggle.checked; saveCurrentSettings();
                        if (widget === 'calendar') Calendar.render();
                        if (widget === 'analogClock') AnalogClock.init();
                        if (widget === 'ledClock') LedClock.init();
                        if (widget === 'moonPhase') MoonPhaseWidget.render();
                        if (widget === 'marqueeGlobal') MarqueeManager.rebuildAllAnimations();
                    }
                }
            });
            function getRandomHexColor() { return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'); }
            function applyRandomColors() { document.querySelectorAll('#modal-backdrop-settings .color-picker').forEach(p => { p.value = getRandomHexColor(); p.dispatchEvent(new Event('input', { bubbles: true })); }); }
            document.getElementById('random-colors-btn').addEventListener('click', applyRandomColors);
            document.getElementById('default-settings-btn').addEventListener('click', applyDefaultSettings);

// ===================================================================
// 版面配置儲存/載入
// ===================================================================
            const getCurrentLayout = () => {
                const settingsToSave = JSON.parse(JSON.stringify(settingsState));
                delete settingsToSave.timedEffect;
                delete settingsToSave.location;

                const serializedGroups = (groups || []).map(groupSet => Array.from(groupSet));

                return {
                    transforms: JSON.parse(JSON.stringify(transformStates)),
                    settings: settingsToSave,
                    groups: serializedGroups
                };
            };

            const applyLayout = (layout, options = {}) => {
                const layoutToApply = JSON.parse(JSON.stringify(layout));
                const { ignoreTimedEffect = false, ignoreLocation = false } = options;
                if (layoutToApply.transforms) transformStates = { ...transformStates, ...layoutToApply.transforms };

                if (layoutToApply.groups && Array.isArray(layoutToApply.groups)) {
                    groups = layoutToApply.groups.map(groupArray => new Set(groupArray));
                } else {
                    groups = [];
                }

                if (layoutToApply.settings) {
                    Object.keys(layoutToApply.settings).forEach(key => {
                        if (ignoreTimedEffect && key === 'timedEffect') return;
                        if (ignoreLocation && key === 'location') return;
                        if (key === 'marquees' && Array.isArray(layoutToApply.settings[key])) {
                            settingsState[key] = layoutToApply.settings[key].map(m => (typeof m.color === 'string' && !m.colors) ? { ...m, colors: { default: m.color }, color: undefined } : m);
                        } else if (typeof layoutToApply.settings[key] === 'object' && !Array.isArray(layoutToApply.settings[key]) && layoutToApply.settings[key] !== null) {
                            settingsState[key] = { ...(settingsState[key] || {}), ...layoutToApply.settings[key] };
                        } else {
                            settingsState[key] = layoutToApply.settings[key];
                        }
                    });
                }
                syncMarqueeDOMElements();
                MarqueeManager.syncInstances();
                applyAllSettings();
                renderAllPersistentGroupsUI();
            };
            function animateLayoutChange(targetLayout, duration = 1000, preserveTimedEffectSettings = false, callback = null) {
                if (!targetLayout || !targetLayout.transforms || Object.values(isWidgetAnimating).some(v => v)) return;
                const sourceTransforms = transformStates;
                const targetTransforms = targetLayout.transforms;
                const allWidgetIds = new Set([...Object.keys(sourceTransforms), ...Object.keys(targetTransforms)]);
                const transitionStyle = `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), width ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), height ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), left ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), top ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;

                allWidgetIds.forEach(id => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    el.style.willChange = 'transform, opacity';
                    el.style.transform += ' translateZ(0)';

                    const sourceState = sourceTransforms[id];
                    const targetState = targetTransforms[id];
                    const isVisibleSource = sourceState?.visible ?? false;
                    const isVisibleTarget = targetState?.visible ?? false;
                    isWidgetAnimating[id] = true;
                    if (isVisibleSource && !isVisibleTarget) {
                        el.style.transition = transitionStyle;
                        const newTransform = `scale(0) rotate(${sourceState.rotation || 0}deg)`;
                        el.style.transform = newTransform;
                        el.style.opacity = '0';
                    } else if (!isVisibleSource && isVisibleTarget) {
                        el.style.transition = 'none';
                        el.style.opacity = '0';
                        applyTransform(el, { ...targetState, scale: 0 });
                        el.style.display = 'flex';
                        void el.offsetWidth;
                        el.style.transition = transitionStyle;
                        el.style.opacity = '1';
                        applyTransform(el, targetState);
                    } else if (isVisibleSource && isVisibleTarget) {
                        el.style.transition = transitionStyle;
                        applyTransform(el, targetState);
                    }
                });
                setTimeout(() => {
                    applyLayout(targetLayout, { ignoreTimedEffect: preserveTimedEffectSettings, ignoreLocation: true });

                    if (callback) {
                        callback();
                    } else {
                        saveCurrentSettings(true);
                    }

                    allWidgetIds.forEach(id => {
                        const el = document.getElementById(id);
                        if (el) {
                            el.style.transition = '';
                            el.style.willChange = 'auto';
                            applyTransform(el, transformStates[id]);
                        }
                        isWidgetAnimating[id] = false;
                    });
                }, duration + 100);
            }
            const toolbarTitle = document.getElementById('toolbar-title');
            let toolbarMoving = false, toolbarOffsetX, toolbarOffsetY;
            const handleToolbarDragStart = (e) => { e.preventDefault(); toolbarMoving = true; const rect = editToolbar.getBoundingClientRect(); const clientX = e.touches ? e.touches[0].clientX : e.clientX; const clientY = e.touches ? e.touches[0].clientY : e.clientY; toolbarOffsetX = clientX - rect.left; toolbarOffsetY = clientY - rect.top; editToolbar.style.transition = 'none'; };
            const handleToolbarDragMove = (e) => { if (!toolbarMoving) return; const clientX = e.touches ? e.touches[0].clientX : e.clientX; const clientY = e.touches ? e.touches[0].clientY : e.clientY; let x = clientX - toolbarOffsetX, y = clientY - toolbarOffsetY; const rect = editToolbar.getBoundingClientRect(); x = Math.max(0, Math.min(x, window.innerWidth - rect.width)); y = Math.max(0, Math.min(y, window.innerHeight - rect.height)); editToolbar.style.left = `${x}px`; editToolbar.style.top = `${y}px`; editToolbar.style.bottom = 'auto'; editToolbar.style.transform = 'none'; };
            const handleToolbarDragEnd = () => { if (toolbarMoving) { toolbarMoving = false; editToolbar.style.transition = 'bottom 0.3s ease-in-out'; } };
            toolbarTitle.addEventListener('mousedown', handleToolbarDragStart); toolbarTitle.addEventListener('touchstart', handleToolbarDragStart, { passive: false });
            document.addEventListener('mousemove', handleToolbarDragMove); document.addEventListener('touchmove', handleToolbarDragMove, { passive: false });
            document.addEventListener('mouseup', handleToolbarDragEnd); document.addEventListener('touchend', handleToolbarDragEnd);
            const layoutSelector = document.getElementById('layout-selector');
            function updateLayoutSelector() {
                const currentVal = layoutSelector.value;
                layoutSelector.innerHTML = '';
                if (layouts.length === 0) {
                    layoutSelector.add(new Option('(無存檔)', -1));
                    layoutSelector.disabled = true;
                } else {
                    layouts.forEach((layout, index) => {
                        const option = document.createElement('option');
                        option.value = index;
                        option.textContent = `${index + 1}. ${layout.name || '(未命名)'}`;
                        layoutSelector.appendChild(option);
                    });
                    layoutSelector.disabled = false;
                }
                if (layoutSelector.querySelector(`option[value="${currentVal}"]`)) {
                    layoutSelector.value = currentVal;
                }
                document.getElementById('delete-layout-btn').disabled = layouts.length === 0;
                document.getElementById('load-layout-btn').disabled = layouts.length === 0;
                document.getElementById('export-layout-btn').disabled = layouts.length === 0;
                const effectTypeSelect = document.getElementById('timed-effect-type');
                const switchLayoutOption = effectTypeSelect.querySelector('option[value="layoutSwitch"]');
                if (switchLayoutOption) {
                    if (layouts.length < 2) {
                        switchLayoutOption.disabled = true;
                        switchLayoutOption.textContent = '版面切換 (需2組以上)';
                        if (effectTypeSelect.value === 'layoutSwitch') {
                            effectTypeSelect.value = 'slide';
                            if (settingsState.timedEffect) { settingsState.timedEffect.type = 'slide'; saveCurrentSettings(); }
                        }
                    } else {
                        switchLayoutOption.disabled = false;
                        switchLayoutOption.textContent = '版面切換';
                    }
                }
            }
            document.getElementById('save-layout-btn').addEventListener('click', () => {
                const defaultName = `版面 ${new Date().toLocaleString('sv').replace(' ', '_')}`;
                showPrompt("新增版面存檔", "請輸入備註:", defaultName, (name) => {
                    if (name === null || name.trim() === '') return;
                    const layout = getCurrentLayout();
                    layout.name = name.trim();
                    layouts.push(layout);
                    localStorage.setItem(STORAGE_LAYOUTS_KEY, JSON.stringify(layouts));
                    updateLayoutSelector();
                    const newIndex = layouts.length - 1;
                    layoutSelector.value = newIndex;
                    currentLayoutIndex = newIndex; // 將目前狀態對應到新的存檔
                });
            });
            document.getElementById('delete-layout-btn').addEventListener('click', () => {
                const index = parseInt(layoutSelector.value, 10);
                if (index < 0 || index >= layouts.length) return;
                const layoutName = layouts[index].name;
                showConfirm("確認刪除", `您確定要刪除存檔 "${layoutName}" 嗎？`, (confirmed) => {
                    if (confirmed) {
                        layouts.splice(index, 1);
                        localStorage.setItem(STORAGE_LAYOUTS_KEY, JSON.stringify(layouts));
                        updateLayoutSelector();
                        nextLayoutIndex = 0; // 重設循序索引
                        showAlert("成功", `存檔 "${layoutName}" 已被刪除。`);
                    }
                });
            });
            document.getElementById('load-layout-btn').addEventListener('click', () => {
                const index = parseInt(layoutSelector.value, 10);
                if (index >= 0 && layouts[index]) {
                    const layoutToLoad = layouts[index];
                    const useTransition = settingsState.timedEffect?.transitionEnabled ?? false;

                    const afterLoadCallback = () => {
                        currentLayoutIndex = -1;
                        saveCurrentSettings();
                        layoutSelector.value = index;
                    };

                    if (useTransition) {
                        animateLayoutChange(layoutToLoad, 1000, true, afterLoadCallback);
                    } else {
                        applyLayout(layoutToLoad, { ignoreTimedEffect: true, ignoreLocation: true });
                        afterLoadCallback();
                    }
                } else {
                    showAlert('提示', '此欄位沒有儲存設定。');
                }
            });
            document.getElementById('export-layout-btn').addEventListener('click', () => {
                if (layouts.length === 0) return showAlert("提示", "沒有可導出的設定！");
                try {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(new Blob([JSON.stringify(layouts, null, 2)], { type: 'application/json' }));
                    a.download = `widgets_settings_${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                } catch (error) {
                    showAlert("錯誤", "導出設定時發生錯誤。");
                }
            });
            document.getElementById('import-layout-btn').addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = e => {
                        try {
                            const importedLayouts = JSON.parse(e.target.result);
                            if (!Array.isArray(importedLayouts)) throw new Error('檔案格式無效');
                            const validLayouts = importedLayouts.filter(l => l && l.name && l.transforms && l.settings);
                            if (validLayouts.length === 0) throw new Error('檔案中未找到有效的版面設定');
                            showConfirm('導入設定', `此檔案包含 ${validLayouts.length} 組設定。確定要導入並覆蓋所有現有存檔嗎？`, (confirmed) => {
                                if (confirmed) {
                                    layouts = validLayouts;
                                    localStorage.setItem(STORAGE_LAYOUTS_KEY, JSON.stringify(layouts));
                                    updateLayoutSelector();
                                    showAlert("成功", `已成功導入 ${layouts.length} 組設定！`);
                                }
                            });
                        } catch (err) {
                            showAlert('錯誤', '導入失敗，檔案格式錯誤或內容無效！');
                        }
                    };
                    reader.readAsText(file);
                };
                input.click();
            });

// ===================================================================
// 編輯模式與拖曳縮放
// ===================================================================
            document.getElementById('edit-layout-btn').addEventListener('click', () => {
                isEditMode = !isEditMode;
                const timedEffectToggle = document.getElementById('timed-effect-enabled-toggle');
                const timedEffectInterval = document.getElementById('timed-effect-interval-seconds');
                if (isEditMode) {
                    MarqueeManager.setPlayState(false);
                    timedEffectToggle.disabled = true; timedEffectInterval.disabled = true;
                    renderAllPersistentGroupsUI(); // 進入編輯模式時顯示已儲存的群組
                } else {
                    clearGroupSelection();
                    MarqueeManager.setPlayState(true); saveCurrentSettings();
                    editToolbar.style.left = '50%'; editToolbar.style.top = 'auto'; editToolbar.style.bottom = ''; editToolbar.style.transform = 'translateX(-50%)';
                    timedEffectToggle.disabled = false; timedEffectInterval.disabled = false;
                    renderAllPersistentGroupsUI(); // 離開編輯模式時會清除群組UI
                }
                document.body.classList.toggle('edit-mode', isEditMode);
                allWidgetContainers().forEach(c => c.classList.toggle('edit-mode', isEditMode));
                document.getElementById('edit-icon').classList.toggle('display-none', isEditMode);
                document.getElementById('edit-exit-icon').classList.toggle('display-none', !isEditMode);
                editToolbar.classList.toggle('show', isEditMode);
                document.querySelectorAll('.calendar-day').forEach(d => d.classList.toggle('edit-mode-active', isEditMode));
                resetActivityTimeout();
            });
            const applyTransform = (widgetEl, state) => {
                if (!widgetEl || !state) return;
                const { left, top, width, height, scale, visible, rotation = 0 } = state;
                widgetEl.style.left = `${left}px`; widgetEl.style.top = `${top}px`;
                widgetEl.style.width = `${width}px`; widgetEl.style.height = `${height}px`;
                widgetEl.style.transformOrigin = 'center';
                widgetEl.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
                widgetEl.style.display = visible ? 'flex' : 'none';

                // ... (保留原本針對 calendar-widget, analog-clock 等字體大小調整邏輯) ...
                if (widgetEl.classList.contains('calendar-widget') && state.height > 0) {
                    widgetEl.querySelector('.background-month').style.fontSize = `${state.height * 0.7}px`;
                    widgetEl.style.fontSize = `${state.height / 40}px`;
                    const titleElement = widgetEl.querySelector('.calendar-title'), headerContainer = widgetEl.querySelector('.calendar-header'), navElement = widgetEl.querySelector('.calendar-nav');
                    if (titleElement && headerContainer && navElement) {
                        headerContainer.getBoundingClientRect();
                        const availableWidth = headerContainer.clientWidth - navElement.offsetWidth - 16;
                        if (titleElement.scrollWidth > availableWidth && availableWidth > 0) widgetEl.style.fontSize = `${parseFloat(getComputedStyle(widgetEl).fontSize) * (availableWidth / titleElement.scrollWidth)}px`;
                    }
                } else if (widgetEl.id === 'analog-clock-container') {
                    widgetEl.style.fontSize = `${state.width / 20}px`;
                } else if (widgetEl.classList.contains('marquee-widget')) {
                    widgetEl.style.fontSize = `${state.height * 0.75}px`;
                    MarqueeManager.rebuildAnimationByIndex(parseInt(widgetEl.id.split('-')[2]));
                }

                // 處理控制點與標籤在旋轉/縮放時的反向補償邏輯
                const inverseScale = 1 / scale;

                // 處理一般的控制點 (角落與邊緣)
                widgetEl.querySelectorAll('.control-handle, .group-select-handle').forEach(h => {
                    let transform = `scale(${inverseScale})`;
                    if (h.classList.contains('resize-handle-w')) {
                        transform = `translateY(-50%) ${transform}`;
                    } else if (h.classList.contains('resize-handle-h')) {
                        transform = `translateX(-50%) ${transform}`;
                    }
                    h.style.transform = transform;
                });

                // 處理跑馬燈標籤 (需要保持水平置中)
                const marqueeLabel = widgetEl.querySelector('.marquee-group-label');
                if (marqueeLabel) {
                    marqueeLabel.style.transform = `translateX(-50%) scale(${inverseScale})`;
                }
            };
            const applyAllTransforms = () => { Object.keys(transformStates).forEach(id => applyTransform(document.getElementById(id), transformStates[id])); };
            function checkAndClampWidgetBounds(state) {
                if (!state || !state.visible) return;
                const winW = window.innerWidth, winH = window.innerHeight;
                const renderedWidth = state.width * state.scale;
                const renderedHeight = state.height * state.scale;
                const offsetX = (state.width - renderedWidth) / 2;
                const offsetY = (state.height - renderedHeight) / 2;
                const renderedLeft = state.left + offsetX;
                const renderedTop = state.top + offsetY;
                const marginW = renderedWidth * 0.05;
                const marginH = renderedHeight * 0.05;
                const clampedRenderedLeft = Math.max(-marginW, Math.min(renderedLeft, winW - renderedWidth + marginW));
                const clampedRenderedTop = Math.max(-marginH, Math.min(renderedTop, winH - renderedHeight + marginH));
                state.left = clampedRenderedLeft - offsetX;
                state.top = clampedRenderedTop - offsetY;
            }
            const ensureWidgetsInBounds = () => { Object.values(transformStates).forEach(checkAndClampWidgetBounds); applyAllTransforms(); };
            const onDragStart = (e) => {
                if (!isEditMode) return;
                if (e.target.closest('.group-select-handle')) return;

                const targetWidget = e.target.closest('.widget-container');
                const pGroupRotateHandle = e.target.closest('[data-persistent-group-rotate]');
                const pGroupScaleHandle = e.target.closest('[data-persistent-group-scale]');
                const groupRotateHandleEl = e.target.closest('#group-rotate-handle');
                const groupScaleHandleEl = e.target.closest('#group-scale-handle');

                let isDragAction = false;
                activeHandle = null;

                if (pGroupRotateHandle) {
                    activeHandle = 'persistent-group-rotate';
                    const groupIndex = parseInt(pGroupRotateHandle.dataset.persistentGroupRotate, 10);
                    activeGroup = groups[groupIndex];
                    isDragAction = true;
                } else if (pGroupScaleHandle) {
                    activeHandle = 'persistent-group-scale';
                    const groupIndex = parseInt(pGroupScaleHandle.dataset.persistentGroupScale, 10);
                    activeGroup = groups[groupIndex];
                    isDragAction = true;
                } else if (groupRotateHandleEl) {
                    activeHandle = 'group-rotate'; isDragAction = true;
                } else if (groupScaleHandleEl) {
                    activeHandle = 'group-scale'; isDragAction = true;
                }
                else if (targetWidget) {
                    const individualHandle = e.target.closest('.control-handle');

                    if (individualHandle && !individualHandle.classList.contains('reset-handle')) {
                        if (individualHandle.classList.contains('rotate-handle')) activeHandle = 'rotate';
                        else if (individualHandle.classList.contains('scale-handle')) activeHandle = 'scale';
                        else if (individualHandle.classList.contains('resize-handle-w')) activeHandle = 'resize-w';
                        else if (individualHandle.classList.contains('resize-handle-h')) activeHandle = 'resize-h';
                        if (activeHandle) isDragAction = true;

                    } else if (!individualHandle) {
                        const persistentGroup = findGroupForWidget(targetWidget.id);
                        if (persistentGroup) {
                            activeHandle = 'persistent-group-move';
                            activeGroup = persistentGroup;
                            isDragAction = true;
                        } else {
                            const isPartOfTempGroup = selectedWidgets.has(targetWidget.id) && selectedWidgets.size >= 2;
                            activeHandle = isPartOfTempGroup ? 'group-move' : 'move';
                            isDragAction = true;
                        }
                    }
                }

                if (!isDragAction || !activeHandle) return;

                e.preventDefault(); e.stopPropagation();
                document.body.style.userSelect = 'none';
                startX = (e.touches ? e.touches[0] : e).clientX;
                startY = (e.touches ? e.touches[0] : e).clientY;

                if (activeHandle === 'persistent-group-move') {
                    initialGroupTransforms = {};
                    activeGroup.forEach(id => {
                        initialGroupTransforms[id] = { ...transformStates[id] };
                    });
                } else if (activeHandle.startsWith('persistent-group') || activeHandle.startsWith('group')) {
                    const groupSet = activeHandle.startsWith('persistent-group') ? activeGroup : selectedWidgets;
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    groupSet.forEach(id => {
                        const state = transformStates[id]; if (!state || !state.visible) return;
                        const w = state.width * state.scale, h = state.height * state.scale;
                        const cx = state.left + state.width / 2, cy = state.top + state.height / 2;
                        const angle = (state.rotation || 0) * Math.PI / 180;
                        const cosA = Math.cos(angle), sinA = Math.sin(angle);
                        [{ x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 }, { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }].forEach(corner => {
                            const rx = corner.x * cosA - corner.y * sinA + cx;
                            const ry = corner.x * sinA + corner.y * cosA + cy;
                            minX = Math.min(minX, rx); maxX = Math.max(maxX, rx);
                            minY = Math.min(minY, ry); maxY = Math.max(maxY, ry);
                        });
                    });

                    scaleCenterX = minX + (maxX - minX) / 2;
                    scaleCenterY = minY + (maxY - minY) / 2;
                    initialGroupTransforms = {};
                    groupSet.forEach(id => { initialGroupTransforms[id] = { ...transformStates[id] }; });

                    if (activeHandle.includes('scale')) {
                        initialDist = Math.hypot(startX - scaleCenterX, startY - scaleCenterY);
                    } else if (activeHandle.includes('rotate')) {
                        initialGroupTransforms.startAngle = Math.atan2(startY - scaleCenterY, startX - scaleCenterX);
                        if (activeHandle === 'group-rotate') {
                            if (groupRotateHandle) { initialGroupTransforms.rotateHandle = { left: groupRotateHandle.offsetLeft, top: groupRotateHandle.offsetTop }; }
                            if (groupScaleHandle) { initialGroupTransforms.scaleHandle = { left: groupScaleHandle.offsetLeft, top: groupScaleHandle.offsetTop }; }
                        }
                    }
                }
                else {
                    allWidgetContainers().forEach(w => w.style.zIndex = '10');
                    targetWidget.style.zIndex = '100';
                    const originalTransition = targetWidget.style.transition;
                    targetWidget.style.transition = 'none';
                    activeWidget = { el: targetWidget, state: transformStates[targetWidget.id], originalTransition: originalTransition };

                    let syncGroup = null;
                    if (selectedWidgets.has(targetWidget.id) && selectedWidgets.size >= 2) {
                        syncGroup = selectedWidgets;
                    } else {
                        const persistentGroup = findGroupForWidget(targetWidget.id);
                        if (persistentGroup) {
                            syncGroup = persistentGroup;
                        }
                    }
                    activeWidget.syncGroup = syncGroup;

                    if (syncGroup && (activeHandle === 'rotate' || activeHandle === 'scale')) {
                        initialGroupTransforms = {};
                        syncGroup.forEach(id => { initialGroupTransforms[id] = { ...transformStates[id] }; });
                    } else {
                        initialTransformState = { ...activeWidget.state };
                    }

                    if (activeHandle === 'scale' || activeHandle === 'rotate') {
                        const rect = activeWidget.el.getBoundingClientRect();
                        scaleCenterX = rect.left + rect.width / 2; scaleCenterY = rect.top + rect.height / 2;
                        if (activeHandle === 'scale') {
                            initialDist = Math.hypot(startX - scaleCenterX, startY - scaleCenterY);
                        } else { // 'rotate'
                            const startAngle = Math.atan2(startY - scaleCenterY, startX - scaleCenterX) * (180 / Math.PI);
                            if (syncGroup) {
                                initialGroupTransforms.startAngle = startAngle;
                            } else {
                                initialTransformState.startAngle = startAngle;
                            }
                        }
                    }
                }

                window.addEventListener('mousemove', onDragMove);
                window.addEventListener('touchmove', onDragMove, { passive: false });
                window.addEventListener('mouseup', onDragEnd);
                window.addEventListener('touchend', onDragEnd);
            };

            const onDragMove = (e) => {
                if (!activeHandle) return;

                // --- 為了解決 iOS 拖曳延遲問題 ---
                // 在 move 事件 (touchmove) 中呼叫 preventDefault()，
                // 可以立即告訴瀏覽器我們正在處理這個觸控手勢，
                // 從而阻止它嘗試滾動頁面或執行其他預設行為，這些行為正是造成延遲的原因。
                // 這對於在 iOS 上獲得流暢的拖曳體驗至關重要。
                if (e.touches && e.cancelable) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                const currentX = (e.touches ? e.touches[0] : e).clientX, currentY = (e.touches ? e.touches[0] : e).clientY;
                const dx = currentX - startX, dy = currentY - startY;

                if (activeHandle === 'persistent-group-move') {
                    document.body.style.cursor = 'grabbing';
                    activeGroup.forEach(id => {
                        const widgetEl = document.getElementById(id);
                        const initialState = initialGroupTransforms[id];
                        const state = transformStates[id];
                        if (initialState && state) {
                            state.left = initialState.left + dx;
                            state.top = initialState.top + dy;
                            applyTransform(widgetEl, state);
                        }
                    });
                    renderAllPersistentGroupsUI();
                    return;
                }

                if (activeHandle === 'group-move') {
                    document.body.style.cursor = 'grabbing';
                    selectedWidgets.forEach(id => {
                        const widgetEl = document.getElementById(id); const initialState = initialGroupTransforms[id]; const state = transformStates[id];
                        state.left = initialState.left + dx; state.top = initialState.top + dy;
                        applyTransform(widgetEl, state);
                    });
                    if (groupRotateHandle) groupRotateHandle.style.transform = `translate(${dx}px, ${dy}px)`;
                    if (groupScaleHandle) groupScaleHandle.style.transform = `translate(${dx}px, ${dy}px)`;
                    if (groupBoundingBox) groupBoundingBox.style.transform = `translate(${dx}px, ${dy}px)`;
                    return;
                }

                const updateDynamicGroupBounds = () => {
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    selectedWidgets.forEach(id => {
                        const state = transformStates[id];
                        if (!state || !state.visible) return;

                        const w = state.width * state.scale;
                        const h = state.height * state.scale;
                        const cx = state.left + state.width / 2;
                        const cy = state.top + state.height / 2;
                        const angle = (state.rotation || 0) * Math.PI / 180;
                        const cosA = Math.cos(angle);
                        const sinA = Math.sin(angle);

                        const corners = [
                            { x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 },
                            { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }
                        ];

                        corners.forEach(corner => {
                            const rx = corner.x * cosA - corner.y * sinA + cx;
                            const ry = corner.x * sinA + corner.y * cosA + cy;
                            minX = Math.min(minX, rx);
                            maxX = Math.max(maxX, rx);
                            minY = Math.min(minY, ry);
                            maxY = Math.max(maxY, ry);
                        });
                    });

                    if (isFinite(minX) && groupBoundingBox) {
                        groupBoundingBox.style.left = `${minX}px`;
                        groupBoundingBox.style.top = `${minY}px`;
                        groupBoundingBox.style.width = `${maxX - minX}px`;
                        groupBoundingBox.style.height = `${maxY - minY}px`;
                    }
                };

                if (activeHandle.includes('group-scale') || activeHandle.includes('group-rotate')) {
                    const groupSet = activeHandle.startsWith('persistent-group') ? activeGroup : selectedWidgets;
                    const isRotate = activeHandle.includes('rotate');
                    document.body.style.cursor = isRotate ? 'alias' : 'se-resize';

                    if (isRotate) {
                        const currentAngle = Math.atan2(currentY - scaleCenterY, currentX - scaleCenterX);
                        const angleDelta = currentAngle - initialGroupTransforms.startAngle;
                        const cosA = Math.cos(angleDelta); const sinA = Math.sin(angleDelta);

                        groupSet.forEach(id => {
                            const widgetEl = document.getElementById(id);
                            const initialState = initialGroupTransforms[id];
                            const state = transformStates[id];
                            const initialWidgetCenterX = initialState.left + (initialState.width / 2);
                            const initialWidgetCenterY = initialState.top + (initialState.height / 2);
                            const vecX = initialWidgetCenterX - scaleCenterX;
                            const vecY = initialWidgetCenterY - scaleCenterY;
                            const rotatedVecX = vecX * cosA - vecY * sinA;
                            const rotatedVecY = vecX * sinA + vecY * cosA;
                            state.left = (scaleCenterX + rotatedVecX) - (state.width / 2);
                            state.top = (scaleCenterY + rotatedVecY) - (state.height / 2);
                            state.rotation = (initialState.rotation || 0) + (angleDelta * 180 / Math.PI);
                            applyTransform(widgetEl, state);
                        });
                    } else { // isScale
                        const currentDist = Math.hypot(currentX - scaleCenterX, currentY - scaleCenterY);
                        const scaleFactor = initialDist > 0 ? (currentDist / initialDist) : 1;
                        groupSet.forEach(id => {
                            const widgetEl = document.getElementById(id);
                            const initialState = initialGroupTransforms[id];
                            const state = transformStates[id];
                            let newScale = initialState.scale * scaleFactor;
                            state.scale = Math.max(0.1, Math.min(newScale, 10));
                            const initialWidgetLayoutCenterX = initialState.left + initialState.width / 2;
                            const initialWidgetLayoutCenterY = initialState.top + initialState.height / 2;
                            const newWidgetLayoutCenterX = scaleCenterX + (initialWidgetLayoutCenterX - scaleCenterX) * scaleFactor;
                            const newWidgetLayoutCenterY = scaleCenterY + (initialWidgetLayoutCenterY - scaleCenterY) * scaleFactor;
                            state.left = newWidgetLayoutCenterX - state.width / 2;
                            state.top = newWidgetLayoutCenterY - state.height / 2;
                            applyTransform(widgetEl, state);
                        });
                    }

                    if (activeHandle.startsWith('persistent-group')) {
                        renderAllPersistentGroupsUI();
                    } else { // temporary group
                        if (activeHandle === 'group-rotate') {
                            const rotateHandle = (handle, initialPos) => {
                                if (!handle || !initialPos) return;
                                const currentAngle = Math.atan2(currentY - scaleCenterY, currentX - scaleCenterX);
                                const angleDelta = currentAngle - initialGroupTransforms.startAngle;
                                const cosA = Math.cos(angleDelta); const sinA = Math.sin(angleDelta);
                                const initialHandleCenterX = initialPos.left + handle.offsetWidth / 2;
                                const initialHandleCenterY = initialPos.top + handle.offsetHeight / 2;
                                const vecX = initialHandleCenterX - scaleCenterX;
                                const vecY = initialHandleCenterY - scaleCenterY;
                                const rotatedVecX = vecX * cosA - vecY * sinA;
                                const rotatedVecY = vecX * sinA + vecY * cosA;
                                handle.style.left = `${(scaleCenterX + rotatedVecX) - handle.offsetWidth / 2}px`;
                                handle.style.top = `${(scaleCenterY + rotatedVecY) - handle.offsetHeight / 2}px`;
                            };
                            rotateHandle(groupRotateHandle, initialGroupTransforms.rotateHandle);
                            rotateHandle(groupScaleHandle, initialGroupTransforms.scaleHandle);
                        }
                        updateDynamicGroupBounds();
                        updateGroupControls();
                    }
                    return;
                }

                if (!activeWidget) return;
                const isGroupSyncAction = !!activeWidget.syncGroup;

                switch (activeHandle) {
                    case 'move':
                        document.body.style.cursor = 'grabbing';
                        activeWidget.state.left = initialTransformState.left + dx;
                        activeWidget.state.top = initialTransformState.top + dy;
                        checkAndClampWidgetBounds(activeWidget.state);
                        applyTransform(activeWidget.el, activeWidget.state);
                        break;
                    case 'resize-w': {
                        document.body.style.cursor = 'ew-resize';
                        const newWidth = Math.max(50, initialTransformState.width + dx);
                        activeWidget.state.width = newWidth;
                        if (activeWidget.el.id === 'analog-clock-container') {
                            activeWidget.state.height = newWidth;
                        } else if (activeWidget.el.id === 'led-clock-container' && LedClock.aspectRatio > 0) {
                            activeWidget.state.height = newWidth / LedClock.aspectRatio;
                        }
                        checkAndClampWidgetBounds(activeWidget.state);
                        applyTransform(activeWidget.el, activeWidget.state);
                        break;
                    }
                    case 'resize-h': {
                        document.body.style.cursor = 'ns-resize';
                        const newHeight = Math.max(50, initialTransformState.height + dy);
                        activeWidget.state.height = newHeight;
                        if (activeWidget.el.id === 'analog-clock-container') {
                            activeWidget.state.width = newHeight;
                        } else if (activeWidget.el.id === 'led-clock-container' && LedClock.aspectRatio > 0) {
                            activeWidget.state.width = newHeight * LedClock.aspectRatio;
                        }
                        checkAndClampWidgetBounds(activeWidget.state);
                        applyTransform(activeWidget.el, activeWidget.state);
                        break;
                    }
                    case 'scale': {
                        document.body.style.cursor = 'se-resize';
                        const currentDist = Math.hypot(currentX - scaleCenterX, currentY - scaleCenterY);
                        const scaleFactor = initialDist > 0 ? (currentDist / initialDist) : 1;

                        if (isGroupSyncAction) {
                            activeWidget.syncGroup.forEach(id => {
                                const widgetEl = document.getElementById(id);
                                const initialState = initialGroupTransforms[id];
                                const state = transformStates[id];
                                let newScale = initialState.scale * scaleFactor;
                                state.scale = Math.max(0.2, Math.min(newScale, 5));
                                applyTransform(widgetEl, state);
                            });
                        } else {
                            let newScale = initialTransformState.scale * scaleFactor;
                            activeWidget.state.scale = Math.max(0.2, Math.min(newScale, 5));
                            checkAndClampWidgetBounds(activeWidget.state);
                            applyTransform(activeWidget.el, activeWidget.state);
                        }
                        break;
                    }
                    case 'rotate':
                        document.body.style.cursor = 'alias';
                        const angle = Math.atan2(currentY - scaleCenterY, currentX - scaleCenterX) * (180 / Math.PI);
                        if (isGroupSyncAction) {
                            const rotationDelta = angle - initialGroupTransforms.startAngle;
                            activeWidget.syncGroup.forEach(id => {
                                const widgetEl = document.getElementById(id);
                                const initialState = initialGroupTransforms[id];
                                const state = transformStates[id];
                                state.rotation = (initialState.rotation || 0) + rotationDelta;
                                applyTransform(widgetEl, state);
                            });
                        } else {
                            const rotationDelta = angle - initialTransformState.startAngle;
                            activeWidget.state.rotation = (initialTransformState.rotation || 0) + rotationDelta;
                            checkAndClampWidgetBounds(activeWidget.state);
                            applyTransform(activeWidget.el, activeWidget.state);
                        }
                        break;
                }
            };
            const onDragEnd = () => {
                if (!activeHandle) return;

                if (activeHandle.startsWith('persistent-group')) {
                    if (activeGroup) activeGroup.forEach(id => checkAndClampWidgetBounds(transformStates[id]));
                    applyAllTransforms();
                    renderAllPersistentGroupsUI();
                    activeGroup = null;
                } else if (activeHandle.startsWith('group')) {
                    if (groupMoveHandle) groupMoveHandle.style.transform = '';
                    if (groupRotateHandle) groupRotateHandle.style.transform = '';
                    if (groupScaleHandle) groupScaleHandle.style.transform = '';
                    if (groupBoundingBox) groupBoundingBox.style.transform = '';
                    selectedWidgets.forEach(id => checkAndClampWidgetBounds(transformStates[id]));
                    applyAllTransforms();
                    updateGroupControls();
                } else if (activeWidget?.el) {
                    activeWidget.el.style.transition = activeWidget.originalTransition;
                    ensureWidgetsInBounds();
                }
                document.body.style.cursor = 'default'; document.body.style.userSelect = 'auto'; activeHandle = null; activeWidget = null;
                window.removeEventListener('mousemove', onDragMove); window.removeEventListener('touchmove', onDragMove);
                window.removeEventListener('mouseup', onDragEnd); window.removeEventListener('touchend', onDragEnd);
                saveCurrentSettings();
            };
            document.body.addEventListener('mousedown', onDragStart); document.body.addEventListener('touchstart', onDragStart, { passive: false });

// ===================================================================
// 定時特效設定
// ===================================================================
            function setupTimedEffectControls() {
                const effectEnabled = document.getElementById('timed-effect-enabled-toggle');
                const effectInterval = document.getElementById('timed-effect-interval-seconds');
                const effectType = document.getElementById('timed-effect-type');
                const layoutSwitchOptions = document.getElementById('layout-switch-options');
                const randomToggle = document.getElementById('layout-switch-random-toggle');
                const transitionEnabledToggle = document.getElementById('transition-effect-enabled-toggle');

                [10, 15, 20, 30, 60].forEach(val => effectInterval.add(new Option(String(val), val)));

                const updateSetting = () => {
                    if (!settingsState.timedEffect) settingsState.timedEffect = JSON.parse(JSON.stringify(userDefaultLayout.settings.timedEffect));
                    settingsState.timedEffect.enabled = effectEnabled.checked;
                    settingsState.timedEffect.intervalSeconds = parseInt(effectInterval.value, 10);
                    settingsState.timedEffect.type = effectType.value;
                    settingsState.timedEffect.isRandom = randomToggle.checked;
                    settingsState.timedEffect.transitionEnabled = transitionEnabledToggle.checked;
                    saveCurrentSettings();
                };

                effectType.addEventListener('change', () => {
                    layoutSwitchOptions.style.display = (effectType.value === 'layoutSwitch') ? 'flex' : 'none';
                    updateSetting();
                });

                effectEnabled.addEventListener('change', updateSetting);
                effectInterval.addEventListener('change', updateSetting);
                randomToggle.addEventListener('change', updateSetting);
                transitionEnabledToggle.addEventListener('change', updateSetting);
            }