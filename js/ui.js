// ===================================================================
// Modal 彈出視窗與 UI 互動 (Refactored)
// ===================================================================
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (modalId === 'modal-backdrop-explanation') {
        const useLed = settingsState.calendar?.useLedFont ?? true;
        if (useLed) applyLedToStaticContent(modal.querySelector('.modal-content'));
    }
    modal.classList.add('show');
}
function hideModal(modalId) { 
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show'); 
}

const promptModal = document.getElementById('modal-backdrop-prompt'), 
      promptTitle = document.getElementById('prompt-title'), 
      promptMessage = document.getElementById('prompt-message'), 
      promptInput = document.getElementById('prompt-input'), 
      promptOkBtn = document.getElementById('prompt-ok-btn'), 
      promptCancelBtn = document.getElementById('prompt-cancel-btn');

let promptCallback = null;

function _setPromptMessage(message) {
    const el = promptMessage;
    const useLed = true;
    el.innerHTML = getLedHTML(message, useLed, { fontSize: parseFloat(getComputedStyle(el).fontSize) || 16, color: getComputedStyle(el).color || '#d1d5db', defaultSpan: false });
    el.style.display = message ? 'block' : 'none';
}

function _configurePromptModal(config) {
    promptTitle.textContent = config.title;
    _setPromptMessage(config.message);
    promptInput.style.display = config.showInput ? 'block' : 'none';
    if (config.showInput) promptInput.value = config.defaultValue || '';
    promptCancelBtn.style.display = config.showCancel ? 'inline-block' : 'none';
    promptOkBtn.textContent = config.okText || '確定';
    promptCallback = config.callback;
    showModal('modal-backdrop-prompt');
    if (config.showInput) setTimeout(() => promptInput.focus(), 100);
}

function showAlert(title, message) { _configurePromptModal({ title, message, showInput: false, showCancel: false, okText: '確定' }); }
function showPrompt(title, message, defaultValue, callback) { _configurePromptModal({ title, message, defaultValue, callback, showInput: true, showCancel: true, okText: '確定' }); }
function showConfirm(title, message, callback) { _configurePromptModal({ title, message, callback: (result) => callback(result !== null), showInput: false, showCancel: true, okText: '確認' }); }

if (promptOkBtn) promptOkBtn.addEventListener('click', () => { if (promptCallback) promptCallback(promptInput.value); hideModal('modal-backdrop-prompt') });
if (promptCancelBtn) promptCancelBtn.addEventListener('click', () => { if (promptCallback) promptCallback(null); hideModal('modal-backdrop-prompt') });

function showDayDetailModal(dateString) {
    if (isEditMode) return;
    const date = new Date(dateString);
    const lunar = getLunarDate(date);
    const holiday = getHoliday(date);
    const solarTerm = getSolarTerm(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const constellationInfo = getConstellation(date);
    const useLed = settingsState.calendar?.useLedFont ?? true;
    
    const rocYear = date.getFullYear() - 1911;
    const rocYearHTML = useLed ? generateLedSvg(String(rocYear), { height: 20, color: '#a5b4fc' }) : rocYear;
    
    const modalGregDate = document.getElementById('modal-gregorian-date');
    if (useLed) {
        const yearSVG = generateLedSvg(String(date.getFullYear()), { height: 22, color: 'white' });
        const monthSVG = generateLedSvg(String(date.getMonth() + 1), { height: 22, color: 'white' });
        const daySVG = generateLedSvg(String(date.getDate()), { height: 22, color: 'white' });
        modalGregDate.innerHTML = `${yearSVG}<span class="led-text-unit">年</span>${monthSVG}<span class="led-text-unit">月</span>${daySVG}<span class="led-text-unit">日 星期${"日一二三四五六"[date.getDay()]}</span>`;
    } else {
        modalGregDate.innerHTML = `<span style="font-size: 1.5em; line-height:1.2;">${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 星期${"日一二三四五六"[date.getDay()]}</span>`;
    }
    
    document.getElementById('modal-lunar-date').innerHTML = `民國 ${rocYearHTML} 年 / 農曆 ${lunar.toString}`;
    
    const modalConstellationEl = document.getElementById('modal-constellation');
    if (constellationInfo) {
        const text = `星座 ${constellationInfo.sign} (${constellationInfo.range})`;
        const fontSize = parseFloat(getComputedStyle(modalConstellationEl).fontSize) || 16;
        const color = getComputedStyle(modalConstellationEl).color || 'white';
        modalConstellationEl.innerHTML = getLedHTML(text, useLed, { fontSize, color, defaultSpan: false });
        modalConstellationEl.style.display = 'block';
    } else { modalConstellationEl.style.display = 'none'; }
    
    const modalHolidayEl = document.getElementById('modal-holiday');
    modalHolidayEl.textContent = holiday || ''; modalHolidayEl.style.display = holiday ? 'block' : 'none';
    if (holiday) modalHolidayEl.dataset.key = holiday;
    
    const modalSolarTermEl = document.getElementById('modal-solarterm');
    modalSolarTermEl.textContent = solarTerm || ''; modalSolarTermEl.style.display = solarTerm ? 'block' : 'none';
    if (solarTerm) modalSolarTermEl.dataset.key = solarTerm;
    
    const formatTime = (dateStr) => dateStr ? new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '讀取中...';
    const sunriseTime = Weather.data?.daily?.sunrise?.[0] ? formatTime(Weather.data.daily.sunrise[0]) : '讀取中...';
    const sunsetTime = Weather.data?.daily?.sunset?.[0] ? formatTime(Weather.data.daily.sunset[0]) : '讀取中...';
    
    const isTimeFormat = (str) => /^[\d:]+$/.test(str);
    const formatTimeForDisplay = (timeStr) => useLed && isTimeFormat(timeStr) ? generateLedSvg(timeStr, { height: 26, color: 'white' }) : timeStr;
    
    document.getElementById('modal-sunrise-time').innerHTML = formatTimeForDisplay(sunriseTime);
    document.getElementById('modal-sunset-time').innerHTML = formatTimeForDisplay(sunsetTime);
    
    const moonDetails = moonPhaseData[lunar.day] || { n: '未知', a: '', d: '' };
    const moonName = moonDetails.a ? `${moonDetails.n}(${moonDetails.a})` : moonDetails.n;
    document.getElementById('modal-moon-icon').innerHTML = getMoonPhaseSVG(lunar.day, '64px', 'day-detail');
    document.getElementById('modal-moon-phase-name').textContent = moonName;
    
    const moonDescEl = document.getElementById('modal-moon-phase-desc');
    if (moonDetails.d) {
        const fontSize = parseFloat(getComputedStyle(moonDescEl).fontSize) || 16;
        const color = getComputedStyle(moonDescEl).color || 'white';
        moonDescEl.innerHTML = getLedHTML(moonDetails.d, useLed, { fontSize, color, defaultSpan: false });
        moonDescEl.style.display = 'block';
    } else { moonDescEl.style.display = 'none'; }
    
    updateCountdowns(date);
    showModal('modal-backdrop-day');
}

function showExplanationModal(title, content) { 
    if (isEditMode) return; 
    document.getElementById('explanation-title').textContent = title; 
    document.getElementById('explanation-content').textContent = content; 
    showModal('modal-backdrop-explanation');
}

function getAllSolarTermsForYear(year) { 
    if (!solarTermsCache[year]) calculateAndCacheSolarTerms(year); 
    return Object.entries(solarTermsCache[year]).map(([key, name]) => { 
        const [y, m, d] = key.split('-').map(Number); 
        return { date: new Date(y, m - 1, d), name } 
    }).sort((a, b) => a.date - b.date);
}

function getAllHolidaysForYear(year) {
    let holidays = [];
    Object.entries(lunarHolidays).forEach(([key, name]) => { 
        [year, year - 1].forEach(lunarYear => { 
            const [m, d] = key.split('-'); 
            const solarDate = lunarToSolar(lunarYear, parseInt(m), parseInt(d)); 
            if (solarDate && solarDate.getFullYear() === year) holidays.push({ date: solarDate, name }); 
        }); 
    });
    [year, year - 1].forEach(lunarYear => { 
        const eveDate = lunarToSolar(lunarYear, 12, getLunarMonthDays(lunarYear, 12)); 
        if (eveDate && eveDate.getFullYear() === year) holidays.push({ date: eveDate, name: "除夕" }); 
    });
    Object.entries(floatingHolidays).forEach(([key, name]) => { 
        const [m, week, dayOfWeek] = key.split('-').map(Number); 
        const month = m - 1; 
        let firstOfMonth = new Date(year, month, 1); 
        let holidayDate = new Date(year, month, 1 + ((dayOfWeek - firstOfMonth.getDay() + 7) % 7) + (week - 1) * 7); 
        if (holidayDate.getMonth() === month) holidays.push({ date: holidayDate, name }); 
    });
    return Array.from(new Map(holidays.map(h => [h.date.toISOString().split('T')[0], h])).values()).sort((a, b) => a.date - b.date);
}

function updateCountdowns(currentDate) {
    const today = new Date(currentDate); today.setHours(0, 0, 0, 0);
    const useLed = settingsState.calendar?.useLedFont ?? true;
    const formatCountdownText = (items, type) => {
        const futureEvents = items.filter(item => item.date >= today);
        if (futureEvents.length === 0) return `找不到${today.getFullYear() + 1}年的${type}資料`;
        const firstEvent = futureEvents[0];
        const diffDays = Math.ceil((firstEvent.date.getTime() - today.getTime()) / 86400000);
        const daysHTML = useLed ? generateLedSvg(String(diffDays), { height: 20, color: 'white' }) : `<span style="font-size: 1.2em;">${diffDays}</span>`;
        if (diffDays === 0) {
            if (futureEvents[1]) {
                const nextDiffDays = Math.ceil((futureEvents[1].date - today) / 86400000);
                const nextDaysHTML = useLed ? generateLedSvg(String(nextDiffDays), { height: 20, color: 'white' }) : `<span style="font-size: 1.2em;">${nextDiffDays}</span>`;
                return `<div class="countdown-text-container">今天是 ${firstEvent.name}，距離下個${type} [${futureEvents[1].name}] 還有 ${nextDaysHTML} 天</div>`;
            }
            return `今天是 ${firstEvent.name}！`;
        }
        return `<div class="countdown-text-container">距離 ${firstEvent.name} 還有 ${daysHTML} 天</div>`;
    };
    let allHolidays = [...getAllHolidaysForYear(today.getFullYear()), ...getAllHolidaysForYear(today.getFullYear() + 1)];
    let allSolarTerms = [...getAllSolarTermsForYear(today.getFullYear()), ...getAllSolarTermsForYear(today.getFullYear() + 1)];
    document.getElementById('countdown-holiday-text').innerHTML = formatCountdownText(allHolidays, '節日');
    document.getElementById('countdown-solarterm-text').innerHTML = formatCountdownText(allSolarTerms, '節氣');
}

const pickerMonthGridEl = document.getElementById('picker-month-grid');
let pickerTarget = null;

function renderPicker(year, month, targetDate) {
    if (!pickerMonthGridEl) return;
    pickerMonthGridEl.innerHTML = '';

    const yearSelect = document.createElement('select');
    yearSelect.id = 'picker-year-select';
    for (let y = 1901; y <= 2099; y++) {
        const option = new Option(y, y);
        if (y === year) option.selected = true;
        yearSelect.add(option);
    }

    const monthSelect = document.createElement('select');
    monthSelect.id = 'picker-month-select';
    for (let m = 0; m < 12; m++) {
        const option = new Option(`${m + 1}月`, m);
        if (m === month) option.selected = true;
        monthSelect.add(option);
    }

    const pickerNav = document.querySelector('#month-year-picker .year-nav');
    if (pickerNav) {
        pickerNav.innerHTML = '';
        pickerNav.style.justifyContent = 'center';
        pickerNav.style.gap = '1rem';
        pickerNav.appendChild(yearSelect);
        pickerNav.appendChild(monthSelect);
    }

    yearSelect.addEventListener('change', (e) => {
        if (pickerTarget) {
            const newYear = parseInt(e.target.value, 10);
            const currentMonth = parseInt(monthSelect.value, 10);
            pickerTarget.currentDate = new Date(newYear, currentMonth, 1);
            pickerTarget.render();
            renderPicker(newYear, currentMonth, pickerTarget.currentDate);
        }
    });

    monthSelect.addEventListener('change', (e) => {
        if (pickerTarget) {
            const newMonth = parseInt(e.target.value, 10);
            const currentYear = parseInt(yearSelect.value, 10);
            pickerTarget.currentDate = new Date(currentYear, newMonth, 1);
            pickerTarget.render();
            hideModal('modal-backdrop-picker');
        }
    });
}

function openPickerFor(targetWidget) {
    if (isEditMode) return;
    pickerTarget = targetWidget;
    renderPicker(pickerTarget.currentDate.getFullYear(), pickerTarget.currentDate.getMonth(), pickerTarget.currentDate);
    showModal('modal-backdrop-picker');
}

document.body.addEventListener('click', (e) => {
    const selectHandle = e.target.closest('.group-select-handle');
    if (isEditMode && selectHandle) {
        e.stopPropagation();
        const widget = selectHandle.closest('.widget-container');
        if (widget) toggleWidgetSelection(widget);
        return;
    }
    const resetHandle = e.target.closest('.reset-handle');
    if (isEditMode && resetHandle) {
        e.stopPropagation();
        const widgetEl = resetHandle.closest('.widget-container');
        if (widgetEl) {
            const widgetId = widgetEl.id;
            let defaultState = userDefaultLayout.transforms[widgetId];
            if (!defaultState && widgetId === 'led-clock-container') defaultState = userDefaultLayout.transforms['ledClock'];
            if (!defaultState && widgetId.startsWith('marquee-container-')) defaultState = userDefaultLayout.transforms['marquee-container-0'];
            if (transformStates[widgetId] && defaultState) {
                const state = transformStates[widgetId];
                const currentWidth = state.width * state.scale;
                const currentHeight = state.height * state.scale;
                const centerX = state.left + currentWidth / 2;
                const centerY = state.top + currentHeight / 2;
                state.width = defaultState.width;
                state.height = defaultState.height;
                state.scale = 1;
                state.rotation = 0;
                state.left = centerX - (state.width / 2);
                state.top = centerY - (state.height / 2);
                checkAndClampWidgetBounds(state);
                applyTransform(widgetEl, state);
                saveCurrentSettings();
            }
        }
    }
    const cell = e.target.closest('.calendar-day'); 
    const key = e.target.dataset.key; 
    if (key && explanations[key]) { e.stopPropagation(); showExplanationModal(key, explanations[key]); return; } 
    if (cell && cell.closest('#calendar-body') && cell.dataset.date) { showDayDetailModal(cell.dataset.date); } 
    const closeModalBtn = e.target.closest('[data-close-modal]'); 
    if (closeModalBtn) { hideModal(closeModalBtn.dataset.closeModal); } 
    if (e.target.classList.contains('modal-backdrop')) { hideModal(e.target.id); }
});

document.addEventListener('keydown', (e) => { 
    if (e.key === 'Escape') { 
        ['modal-backdrop-day', 'modal-backdrop-picker', 'modal-backdrop-explanation', 'modal-backdrop-settings', 'modal-backdrop-prompt'].forEach(hideModal); 
    } 
});

// ===================================================================
// 跑馬燈塊狀編輯器物件 (MarqueeEditor v2.2 - Drag & Drop Reorder)
// ===================================================================
const MarqueeEditor = {
    container: null,
    hiddenTextarea: null,
    library: null,
    colorPicker: null,
    blocks: [],
    paramLabelMap: {},
    lastSelection: null, // { blockIndex, offset }
    dropIndicator: null,

    init() {
        this.container = document.getElementById('marquee-editor-blocks');
        this.hiddenTextarea = document.getElementById('marquee-text-input');
        this.library = document.querySelector('.marquee-module-library');
        this.colorPicker = document.getElementById('tool-custom-text-color');
        if (!this.library || !this.container || !this.hiddenTextarea) return;

        this.buildParamMap();
        this.bindModuleLibrary();
        this.bindContainerEvents();
        this.initDropIndicator();
        
        const self = this;
        const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
        Object.defineProperty(this.hiddenTextarea, 'value', {
            get() { return descriptor.get.call(this); },
            set(val) {
                descriptor.set.call(this, val);
                self.loadTemplate(val);
            },
            configurable: true
        });

        if (this.hiddenTextarea.value) {
            this.loadTemplate(this.hiddenTextarea.value);
        }
    },

    buildParamMap() {
        this.library.querySelectorAll('.module-pill[data-code]').forEach(pill => {
            this.paramLabelMap[pill.dataset.code] = pill.textContent.trim();
        });
    },

    bindModuleLibrary() {
        this.library.querySelectorAll('.module-pill:not(.tool-pill)').forEach(pill => {
            const code = pill.dataset.code;
            pill.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/marquee-module', JSON.stringify({
                    code: code,
                    label: this.paramLabelMap[code]
                }));
            });
            pill.addEventListener('click', () => this.addModuleBlock(code, this.paramLabelMap[code]));
        });

        const customDragBtn = document.getElementById('tool-custom-text-drag');
        const customInput = document.getElementById('tool-custom-text-input');
        const customColor = document.getElementById('tool-custom-text-color');

        if (customDragBtn) {
            const getCustomData = () => {
                const text = customInput.value.trim() || "文字";
                const color = customColor.value;
                return {
                    code: `%C(${color}, ${text})%`,
                    label: text
                };
            };

            customDragBtn.addEventListener('dragstart', (e) => {
                const data = getCustomData();
                e.dataTransfer.setData('application/marquee-module', JSON.stringify(data));
            });

            customDragBtn.addEventListener('click', () => {
                const data = getCustomData();
                this.addModuleBlock(data.code, data.label);
            });
        }

        const resetBtn = document.getElementById('tool-reset-marquee');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                showConfirm('重置跑馬燈', '確定要將目前的跑馬燈內容恢復為預設值嗎？', (confirmed) => {
                    if (confirmed) {
                        const defaultTemplate = "%YYYY%/%ROC_YY%年%MM%月%DD%日%W_SHORT%%ap_c%%hh%%C(#00FF00, :)%%mm%%br%%C(#FFFF00, 農曆)%%LM_C%%LD_C%%br%%SHICHEN_NAME%%L_GZ%%L_SX%%MOON_ICON%%CONSTELLATION%%br%%WEATHER_LOC%%WEATHER_DESC%%TEMP%°C%br%日出%SUNRISE%%br%日落%SUNSET%";
                        const defaultText = (typeof userDefaultLayout !== 'undefined' && userDefaultLayout.settings && userDefaultLayout.settings.marquees && userDefaultLayout.settings.marquees[0]) 
                            ? userDefaultLayout.settings.marquees[0].text 
                            : defaultTemplate;
                        this.hiddenTextarea.value = defaultText;
                        this.loadTemplate(defaultText);
                        this.triggerChange();
                    }
                });
            });
        }

        const clearBtn = document.getElementById('tool-clear-marquee');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                showConfirm('清空內容', '確定要清空目前的跑馬燈內容嗎？', (confirmed) => {
                    if (confirmed) {
                        const emptyText = "";
                        this.hiddenTextarea.value = emptyText;
                        this.loadTemplate(emptyText);
                        this.triggerChange();
                    }
                });
            });
        }

        // 強制修補一些可能遺漏的標籤對照 (如 %YY%)
        if (!this.paramLabelMap['%YY%']) this.paramLabelMap['%YY%'] = "西元(2位)";
    },

    initDropIndicator() {
        this.dropIndicator = document.createElement('div');
        this.dropIndicator.className = 'editor-block-drop-indicator';
        this.container.appendChild(this.dropIndicator);
    },

    bindContainerEvents() {
        this.container.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.container.classList.add('drag-over');
            
            const targetIndex = this.getInsertIndexFromPoint(e.clientX, e.clientY);
            this.showDropIndicator(targetIndex);
        });

        this.container.addEventListener('dragleave', (e) => {
            // 只有當滑出容器邊界時才移除
            if (!this.container.contains(e.relatedTarget)) {
                this.container.classList.remove('drag-over');
                this.hideDropIndicator();
            }
        });

        this.container.addEventListener('drop', (e) => {
            e.preventDefault();
            this.container.classList.remove('drag-over');
            this.hideDropIndicator();
            
            const targetIndex = this.getInsertIndexFromPoint(e.clientX, e.clientY);
            const internalIndex = e.dataTransfer.getData('application/marquee-internal-index');
            const externalData = e.dataTransfer.getData('application/marquee-module');

            if (internalIndex !== "") {
                this.moveBlock(parseInt(internalIndex), targetIndex);
            } else if (externalData) {
                const module = JSON.parse(externalData);
                this.insertModuleAt(module.code, targetIndex, module.label);
            }
        });
        
        this.container.addEventListener('click', (e) => {
            if (e.target === this.container) {
                const lastText = this.container.querySelector('.editor-text-block:last-child');
                if (lastText) lastText.focus();
            }
        });
    },

    showDropIndicator(index) {
        const blockEls = Array.from(this.container.querySelectorAll('.editor-block'));
        if (index < blockEls.length) {
            this.container.insertBefore(this.dropIndicator, blockEls[index]);
        } else {
            this.container.appendChild(this.dropIndicator);
        }
        this.dropIndicator.style.display = 'inline-block';
    },

    hideDropIndicator() {
        if (this.dropIndicator) {
            this.dropIndicator.style.display = 'none';
        }
    },

    getInsertIndexFromPoint(x, y) {
        const blockEls = Array.from(this.container.querySelectorAll('.editor-block'));
        if (blockEls.length === 0) return 0;
        
        let closestIdx = blockEls.length;
        for (let i = 0; i < blockEls.length; i++) {
            const rect = blockEls[i].getBoundingClientRect();
            
            // 如果滑鼠 Y 小於該塊的底部，說明滑鼠在該行或以上
            if (y < rect.bottom) {
                // 如果滑鼠 X 小於該塊的中心，則插入到該塊之前
                if (x < rect.left + rect.width / 2) {
                    closestIdx = i;
                    break;
                }
                // 如果 Y 在該塊的高度範圍內且 X 已經超過中心，則繼續檢查下一個塊
                // 如果 Y 小於該塊的頂部，說明滑鼠在該行以上，也應該插入在這裡
                if (y < rect.top) {
                    closestIdx = i;
                    break;
                }
            }
        }
        return closestIdx;
    },

    loadTemplate(template) {
        this.blocks = [];
        const regex = /(%[^%]+%)/g;
        const parts = template.split(regex);
        parts.forEach(part => {
            if (part.startsWith('%') && part.endsWith('%')) {
                let label = this.paramLabelMap[part] || part;
                let customColor = null;
                
                if (part.startsWith('%C(')) {
                    const match = part.match(/%C\((#[0-9a-fA-F]{6}),\s*(.*?)\)%/);
                    if (match) {
                        customColor = match[1];
                        label = match[2];
                    }
                }
                
                this.blocks.push({ type: 'module', code: part, label: label, color: customColor });
            } else if (part) {
                this.blocks.push({ type: 'text', value: part });
            }
        });
        this.rebalanceBlocks();
        this.render();
    },

    rebalanceBlocks() {
        const newBlocks = [];
        let currentText = "";
        const pushText = () => {
            if (currentText !== "" || newBlocks.length === 0 || (newBlocks.length > 0 && newBlocks[newBlocks.length-1].type === 'module')) {
                newBlocks.push({ type: 'text', value: currentText });
                currentText = "";
            }
        };
        for (const block of this.blocks) {
            if (block.type === 'text') {
                currentText += block.value;
            } else {
                pushText();
                newBlocks.push(block);
            }
        }
        pushText();
        if (newBlocks.length === 0 || newBlocks[newBlocks.length-1].type !== 'text') {
            newBlocks.push({ type: 'text', value: '' });
        }
        this.blocks = newBlocks;
    },

    render() {
        this.container.innerHTML = '';
        this.blocks.forEach((block, index) => {
            const blockEl = document.createElement('div');
            blockEl.className = 'editor-block';
            blockEl.dataset.index = index;
            
            if (block.type === 'text') {
                const input = document.createElement('span');
                input.className = 'editor-text-block';
                input.contentEditable = true;
                input.textContent = block.value;
                input.addEventListener('input', () => {
                    block.value = input.textContent;
                    this.triggerChange();
                });
                const saveSelection = () => {
                    const sel = window.getSelection();
                    if (sel.rangeCount > 0 && sel.anchorNode && (sel.anchorNode === input || input.contains(sel.anchorNode))) {
                        this.lastSelection = { blockIndex: index, offset: sel.anchorOffset };
                    }
                };
                input.addEventListener('keyup', saveSelection);
                input.addEventListener('click', saveSelection);
                input.addEventListener('blur', saveSelection);
                blockEl.appendChild(input);
            } else {
                const pill = document.createElement('div');
                pill.className = 'editor-module-block';
                pill.draggable = true;
                pill.innerHTML = `<span>${block.label}</span><span class="remove-btn">&times;</span>`;
                pill.title = block.code;

                if (block.color) {
                    pill.style.background = block.color + '33'; // 20% opacity
                    pill.style.borderColor = block.color + '66'; // 40% opacity
                    pill.style.color = block.color;
                }
                
                pill.addEventListener('dragstart', (e) => {
                    pill.classList.add('dragging');
                    e.dataTransfer.setData('application/marquee-internal-index', index);
                });
                pill.addEventListener('dragend', () => pill.classList.remove('dragging'));
                pill.querySelector('.remove-btn').addEventListener('click', () => this.removeBlock(index));
                blockEl.appendChild(pill);
            }
            this.container.appendChild(blockEl);
        });
    },

    createBlockFromCode(code, label) {
        let finalLabel = label || this.paramLabelMap[code] || code;
        let color = null;
        if (code.startsWith('%C(')) {
            const match = code.match(/%C\((#[0-9a-fA-F]{6}),\s*(.*?)\)%/);
            if (match) {
                color = match[1];
                finalLabel = match[2];
            }
        }
        return { type: 'module', code: code, label: finalLabel, color: color };
    },

    moveBlock(fromIdx, toIdx) {
        if (fromIdx === toIdx || fromIdx === toIdx - 1) return;
        const block = this.blocks[fromIdx];
        this.blocks.splice(fromIdx, 1);
        const adjustedToIdx = fromIdx < toIdx ? toIdx - 1 : toIdx;
        this.blocks.splice(adjustedToIdx, 0, block);
        this.rebalanceBlocks();
        this.render();
        this.triggerChange();
    },

    insertModuleAt(code, index, label) {
        this.blocks.splice(index, 0, this.createBlockFromCode(code, label));
        this.rebalanceBlocks();
        this.render();
        this.triggerChange();
    },

    addModuleBlock(code, label) {
        if (this.lastSelection) {
            const { blockIndex, offset } = this.lastSelection;
            const targetBlock = this.blocks[blockIndex];
            if (targetBlock && targetBlock.type === 'text') {
                const textVal = targetBlock.value;
                const beforeText = textVal.substring(0, offset);
                const afterText = textVal.substring(offset);
                targetBlock.value = beforeText;
                this.blocks.splice(blockIndex + 1, 0, 
                    this.createBlockFromCode(code, label),
                    { type: 'text', value: afterText }
                );
                this.lastSelection = null;
                this.rebalanceBlocks();
                this.render();
                this.triggerChange();
                return;
            }
        }
        this.blocks.push(this.createBlockFromCode(code));
        this.rebalanceBlocks();
        this.render();
        this.triggerChange();
    },

    removeBlock(index) {
        this.blocks.splice(index, 1);
        this.rebalanceBlocks();
        this.render();
        this.triggerChange();
    },

    serialize() {
        return this.blocks.map(b => b.type === 'text' ? b.value : b.code).join('');
    },

    triggerChange() {
        const val = this.serialize();
        const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
        descriptor.set.call(this.hiddenTextarea, val);
        this.hiddenTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
};

MarqueeEditor.init();

function resetActivityTimeout() { 
    const actionButtons = document.getElementById('action-buttons');
    if (!actionButtons) return;
    actionButtons.classList.remove('hidden'); 
    clearTimeout(activityTimeout); 
    if (!isEditMode) { 
        activityTimeout = setTimeout(() => actionButtons.classList.add('hidden'), 3000); 
    } 
}
['mousemove', 'mousedown', 'touchstart', 'keydown'].forEach(event => document.addEventListener(event, resetActivityTimeout));
document.getElementById('fullscreen-btn').addEventListener('click', () => { if (!document.fullscreenElement) { document.documentElement.requestFullscreen() } else { document.exitFullscreen() } });
document.addEventListener('fullscreenchange', () => { const isFullscreen = !!document.fullscreenElement; document.getElementById('fullscreen-enter-icon').classList.toggle('display-none', isFullscreen); document.getElementById('fullscreen-exit-icon').classList.toggle('display-none', !isFullscreen) });
