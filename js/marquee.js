// ===================================================================
// 跑馬燈模組 (Class)
// ===================================================================
class MarqueeInstance {
    constructor(containerId, index) {
        this.container = document.getElementById(containerId);
        this.mainContainer = this.container.querySelector('main');
        this.innerDiv = this.container.querySelector('.marquee-inner');
        this.index = index;
        this.animationStyleTag = document.createElement('style');
        document.head.appendChild(this.animationStyleTag);
        this.rebuildTimeout = null;
        this.isScrolling = false;

        this.paramToFrequency = {
            s: ['%ss%', '%s%'],
            m: ['%mm%', '%m%', '%HH%', '%H%', '%hh%', '%h%', '%AP%', '%ap%', '%ap_c%', '%SHICHEN_GZ%', '%SHICHEN_NAME%', '%SHICHEN_CHAR%'],
            d: ['%YYYY%', '%YY%', '%ROC_YY%', '%MM%', '%M%', '%DD%', '%D%', '%WEEKDAY%', '%W_SHORT%', '%W_CHAR%', '%W_NUM%', '%CONSTELLATION%', '%L_GZ%', '%L_SX%', '%LM_C%', '%LD_C%', '%MOON_PHASE%', '%MOON_ICON%', '%MOON_DAY%'],
            w: ['%WEATHER_LOC%', '%WEATHER_DESC%', '%TEMP%', '%SUNRISE%', '%SUNSET%']
        };
        this.spansByFrequency = { s: [], m: [], d: [], w: [] };
    }

    _categorizeSpans() {
        this.spansByFrequency = { s: [], m: [], d: [], w: [] };
        this.innerDiv.querySelectorAll('[data-time-key]').forEach(span => {
            const key = span.dataset.timeKey;
            if (this.paramToFrequency.s.includes(key)) this.spansByFrequency.s.push(span);
            else if (this.paramToFrequency.m.includes(key)) this.spansByFrequency.m.push(span);
            else if (this.paramToFrequency.d.includes(key)) this.spansByFrequency.d.push(span);
            else if (this.paramToFrequency.w.includes(key)) this.spansByFrequency.w.push(span);
        });
    }

    buildInitialHTML(text) {
        const settings = settingsState.marquees[this.index], isVertical = settings.vertical, useLedGlobal = settingsState.marqueeGlobal?.useLedFont ?? true, defaultColor = (settings.colors && settings.colors.default) ? settings.colors.default : '#FFFFFF';
        const processMarqueeChunk = (chunk) => {
            if (!useLedGlobal) return `<span class="marquee-plain-text" style="color:${defaultColor}">${chunk.replace(/ /g, '\u00A0')}</span>`;
            let processedHTML = '';
            const parts = chunk.split(/(\d+[\d:.]*)/);
            for (const part of parts) {
                if (/^\d+[\d:.]*$/.test(part) && part.trim() !== '') {
                    const widgetState = transformStates[this.container.id];
                    const svgHeight = widgetState ? widgetState.height * 0.70 : 28;
                    processedHTML += generateLedSvg(part, { height: svgHeight, color: defaultColor, applyYOffset: true });
                } else if (part) {
                    processedHTML += `<span class="marquee-plain-text" style="color:${defaultColor}">${part.replace(/ /g, '\u00A0')}</span>`;
                }
            }
            return processedHTML;
        };
        const replacements = MarqueeManager._cachedReplacements;
        const paramRegex = new RegExp(`%C\\(([^,]+),\\s*(.*?)\\)%|${Object.keys(marqueeParamColorMap).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}|%br%`, 'g');
        let resultHTML = '', lastIndex = 0, match;
        const ledParams = ['%HH%', '%H%', '%hh%', '%h%', '%mm%', '%m%', '%ss%', '%s%', '%ROC_YY%', '%YYYY%', '%YY%', '%MM%', '%M%', '%DD%', '%D%', '%TEMP%', '%SUNRISE%', '%SUNSET%'];
        while ((match = paramRegex.exec(text)) !== null) {
            if (match.index > lastIndex) { resultHTML += processMarqueeChunk(text.substring(lastIndex, match.index)); }
            const param = match[0];

            if (param.startsWith('%C(')) {
                const propsStr = match[1];
                const colorText = match[2];
                const props = propsStr.split(';').map(p => p.trim());
                let color = defaultColor;
                let blinkDuration = 0;
                let finalStyle = '';
                let finalClass = 'marquee-plain-text';

                props.forEach(prop => {
                    if (prop.startsWith('#')) {
                        const hex = prop.substring(1);
                        if (hex.length === 8) { // RRGGBBAA
                            const r = parseInt(hex.substring(0, 2), 16);
                            const g = parseInt(hex.substring(2, 4), 16);
                            const b = parseInt(hex.substring(4, 6), 16);
                            const a = parseInt(hex.substring(6, 8), 16) / 255;
                            color = `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
                        } else if (hex.length === 6) {
                            color = prop;
                        }
                    } else if (prop.startsWith('blink:')) {
                        const duration = parseInt(prop.split(':')[1], 10);
                        if (!isNaN(duration) && duration > 0) {
                            blinkDuration = duration;
                        }
                    }
                });

                finalStyle += `color: ${color};`;
                if (blinkDuration > 0) {
                    finalClass += ' blinking-text';
                    finalStyle += ` animation-duration: ${blinkDuration / 1000}s;`;
                }

                if (useLedGlobal && /^[\d:]+$/.test(colorText)) {
                    const widgetState = transformStates[this.container.id];
                    const svgHeight = widgetState ? widgetState.height * 0.70 : 28;
                    let svgColor = color;
                    let spanStyle = '';

                    if (color.startsWith('rgba')) {
                        const parts = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                        svgColor = `rgb(${parts[1]}, ${parts[2]}, ${parts[3]})`;
                        const opacity = parts[4] !== undefined ? parts[4] : 1;
                        spanStyle += `opacity: ${opacity};`;
                    }

                    if (blinkDuration > 0) {
                        spanStyle += ` animation-duration: ${blinkDuration / 1000}s;`;
                    }

                    resultHTML += `<span class="${finalClass}" style="${spanStyle}">${generateLedSvg(colorText, { height: svgHeight, color: svgColor })}</span>`;
                } else {
                    resultHTML += `<span class="${finalClass}" style="${finalStyle}">${colorText.replace(/ /g, '\u00A0')}</span>`;
                }
            } else if (param === '%br%') {
                if (isVertical) resultHTML += '</div><div>';
            } else if (replacements[param] !== undefined) {
                const cssVar = marqueeParamColorMap[param];
                const color = cssVar ? getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() : defaultColor;
                const replacementContent = String(replacements[param] || '');
                if (useLedGlobal && ledParams.includes(param) && /^[\d:]+$/.test(replacementContent)) {
                    const widgetState = transformStates[this.container.id];
                    const svgHeight = widgetState ? widgetState.height * 0.70 : 28;
                    resultHTML += `<span data-time-key="${param}">${generateLedSvg(replacementContent, { height: svgHeight, color: color })}</span>`;
                } else if (param === '%MOON_ICON%') {
                    resultHTML += `<span data-time-key="${param}">${replacementContent}</span>`;
                } else {
                    resultHTML += `<span data-time-key="${param}" style="color:${color}">${replacementContent}</span>`;
                }
            }
            lastIndex = paramRegex.lastIndex;
        }
        if (lastIndex < text.length) { resultHTML += processMarqueeChunk(text.substring(lastIndex)); }
        return isVertical ? `<div>${resultHTML}</div>` : resultHTML;
    }

    updateContent(status, replacements) {
        const updateSpan = (span) => {
            const key = span.dataset.timeKey;
            if (replacements[key] === undefined) return;
            const useLed = settingsState.marqueeGlobal?.useLedFont ?? true;
            const ledParams = ['%HH%', '%H%', '%hh%', '%h%', '%mm%', '%m%', '%ss%', '%s%', '%ROC_YY%', '%YYYY%', '%YY%', '%MM%', '%M%', '%DD%', '%D%', '%TEMP%', '%SUNRISE%', '%SUNSET%'];
            const newText = String(replacements[key]);
            if (useLed && ledParams.includes(key) && /^[\d:]+$/.test(newText)) {
                const svgEl = span.querySelector('svg');
                if (!svgEl || svgEl.dataset.text !== newText) {
                    const widgetState = transformStates[this.container.id];
                    const svgHeight = widgetState ? widgetState.height * 0.70 : 28;
                    const color = svgEl ? svgEl.getAttribute('fill') : (marqueeParamColorMap[key] ? getComputedStyle(document.documentElement).getPropertyValue(marqueeParamColorMap[key]).trim() : '#FFFFFF');
                    span.innerHTML = generateLedSvg(newText, { height: svgHeight, color: color });
                }
            } else if (key === '%MOON_ICON%') {
                if (span.innerHTML !== newText) span.innerHTML = newText;
            } else {
                if (span.textContent !== newText) span.textContent = newText;
            }
        };

        if (status.s) this.spansByFrequency.s.forEach(updateSpan);
        if (status.m) this.spansByFrequency.m.forEach(updateSpan);
        if (status.d) this.spansByFrequency.d.forEach(updateSpan);
        if (status.w) this.spansByFrequency.w.forEach(updateSpan);
    }

    rebuildAnimation() {
        clearTimeout(this.rebuildTimeout);
        this.innerDiv.style.animation = ''; this.isScrolling = false;
        const settings = settingsState.marquees[this.index]; if (!settings) return;
        if (/^%WEATHER_|%SUNRISE%|%SUNSET%|%TEMP%/.test(settings.text) && !weatherDataLoaded) {
            this.innerDiv.style.transform = 'translateX(0) translateY(0)';
            this.innerDiv.innerHTML = `<div class="marquee-text-instance">${this.buildInitialHTML(settings.text)}</div>`;
            return;
        }
        this.rebuildTimeout = setTimeout(() => {
            this.animationStyleTag.innerHTML = ''; this.innerDiv.innerHTML = '';
            this.innerDiv.style.transform = 'translateX(0) translateY(0) translateZ(0)';
            if (!settings.text || !settings.text.trim()) return;
            const { text, vertical: isVertical, speed, direction } = settings;
            this.innerDiv.style.flexDirection = isVertical ? 'column' : 'row';
            this.innerDiv.style.width = isVertical ? '100%' : 'fit-content';
            this.mainContainer.style.alignItems = isVertical ? 'flex-start' : 'center';
            const instance1 = document.createElement('div');
            instance1.className = 'marquee-text-instance';
            instance1.style.whiteSpace = isVertical ? 'normal' : 'nowrap';
            instance1.style.textAlign = isVertical ? 'center' : 'left';
            if (isVertical) instance1.style.display = 'block';
            instance1.innerHTML = this.buildInitialHTML(text);
            this.innerDiv.appendChild(instance1);
            instance1.getBoundingClientRect();
            const contentMeasure = isVertical ? instance1.offsetHeight : instance1.offsetWidth;
            const containerMeasure = isVertical ? this.mainContainer.offsetHeight : this.mainContainer.offsetWidth;
            if (contentMeasure <= containerMeasure) {
                this.isScrolling = false;
                if (!isVertical && instance1.scrollWidth > this.mainContainer.clientWidth) {
                    this.container.style.fontSize = `${parseFloat(getComputedStyle(this.container).fontSize) * (this.mainContainer.clientWidth / instance1.scrollWidth) * 0.98}px`;
                }
            } else {
                this.isScrolling = true;
                this.innerDiv.appendChild(instance1.cloneNode(true));
            }
            this._categorizeSpans();

            if (!this.isScrolling) return;
            const travelDistance = contentMeasure; if (travelDistance <= 0) return;
            const duration = travelDistance / (parseInt(speed, 10) || 80);
            const animName = `marquee-${this.index}-${Date.now()}`;
            let fromTransform, toTransform;
            switch (direction) {
                case 'right': fromTransform = `translateX(-${travelDistance}px)`; toTransform = `translateX(0px)`; break;
                case 'up': fromTransform = `translateY(0px)`; toTransform = `translateY(-${travelDistance}px)`; break;
                case 'down': fromTransform = `translateY(-${travelDistance}px)`; toTransform = `translateY(0px)`; break;
                default: fromTransform = `translateX(0px)`; toTransform = `translateX(-${travelDistance}px)`; break;
            }
            this.animationStyleTag.innerHTML = `@keyframes ${animName} { from { transform: ${fromTransform} translateZ(0); } to { transform: ${toTransform} translateZ(0); }}`;
            this.innerDiv.style.animation = `${animName} ${duration}s linear infinite`;
            this.innerDiv.style.animationPlayState = isEditMode ? 'paused' : 'running';
        }, 50);
    }
    setPlayState(shouldPlay) { this.innerDiv.style.animationPlayState = shouldPlay ? 'running' : 'paused'; }
}

// ===================================================================
// 動態跑馬燈相關函式
// ===================================================================
function createMarqueeElement(index) {
    const template = document.getElementById('marquee-container-0');
    if (!template) { console.error("跑馬燈模板 'marquee-container-0' 找不到!"); return null; }
    const newMarquee = template.cloneNode(true);
    newMarquee.id = `marquee-container-${index}`;
    newMarquee.style.display = 'none';

    // 確保複製後的元素有正確的組別標籤
    let label = newMarquee.querySelector('.marquee-group-label');
    if (!label) {
        label = document.createElement('div');
        label.className = 'marquee-group-label';
        newMarquee.appendChild(label);
    }
    label.textContent = index + 1;

    document.body.appendChild(newMarquee);
    return newMarquee;
}

function initializeWidgetControls() {
    const resetHandleHTML = `<div class="reset-handle control-handle" title="還原尺寸與旋轉"><svg class="width-full height-full" viewBox="0 0 24 24"><use href="#icon-reset-size"></use></svg></div>`;
    const resizeHandlesHTML = `<div class="resize-handle-w control-handle"></div><div class="resize-handle-h control-handle"></div>`;
    const groupSelectHTML = `<div class="group-select-handle" title="加入/移出群組"><svg class="unchecked" style="display: block;" viewBox="0 0 24 24"><use href="#icon-checkbox-unchecked" stroke="white"></use></svg><svg class="checked" style="display: none;" viewBox="0 0 24 24"><use href="#icon-checkbox-checked" stroke="white"></use></svg></div>`;
    const rotateHandleHTML = `<div class="rotate-handle control-handle" title="旋轉"><svg class="width-full height-full" viewBox="0 0 24 24"><use href="#icon-rotate"></use></svg></div>`;
    const scaleHandleHTML = `<div class="scale-handle control-handle" title="縮放"><svg class="width-full height-full" viewBox="0 0 24 24"><use href="#icon-scale"></use></svg></div>`;

    document.querySelectorAll('.widget-container').forEach(widgetEl => {
        widgetEl.insertAdjacentHTML('afterbegin', groupSelectHTML);
        widgetEl.insertAdjacentHTML('beforeend', resetHandleHTML);
        widgetEl.insertAdjacentHTML('beforeend', rotateHandleHTML);
        widgetEl.insertAdjacentHTML('beforeend', scaleHandleHTML);
        if (widgetEl.id !== 'analog-clock-container') {
            widgetEl.insertAdjacentHTML('beforeend', resizeHandlesHTML);
        }

        // 為現有的跑馬燈加入組別標籤
        if (widgetEl.classList.contains('marquee-widget')) {
            const index = parseInt(widgetEl.id.split('-')[2]) || 0;
            const labelHTML = `<div class="marquee-group-label">${index + 1}</div>`;
            widgetEl.insertAdjacentHTML('beforeend', labelHTML);
        }
    });
}
function syncMarqueeDOMElements() {
    const desiredCount = settingsState.marquees.length;
    const existingWidgets = document.querySelectorAll('.marquee-widget');
    let currentCount = existingWidgets.length;
    while (currentCount < desiredCount) { createMarqueeElement(currentCount); currentCount++; }
    if (currentCount > desiredCount) { for (let i = desiredCount; i < currentCount; i++) { const elToRemove = document.getElementById(`marquee-container-${i}`); if (elToRemove) elToRemove.remove(); } }
}
document.getElementById('add-marquee-btn').addEventListener('click', () => {
    const selectedIndex = parseInt(marqueeSelector.value, 10) || 0;
    const newIndex = settingsState.marquees.length;
    const sourceSettings = settingsState.marquees[selectedIndex];
    const sourceTransform = transformStates[`marquee-container-${selectedIndex}`];
    const newSettings = JSON.parse(JSON.stringify(sourceSettings));
    const newTransform = JSON.parse(JSON.stringify(sourceTransform));
    newTransform.top += (sourceTransform.height * sourceTransform.scale) + 10;
    newTransform.visible = true;
    settingsState.marquees.push(newSettings);
    transformStates[`marquee-container-${newIndex}`] = newTransform;
    const newElement = createMarqueeElement(newIndex);
    MarqueeManager.syncInstances();
    updateMarqueeSelectorUI();
    marqueeSelector.value = newIndex;
    loadMarqueeSettingsToUI(newIndex);
    applyTransform(newElement, newTransform);
    MarqueeManager.rebuildAnimationByIndex(newIndex);
    saveCurrentSettings();
    showAlert('成功', `已新增跑馬燈組別 ${newIndex + 1}。`);
});
document.getElementById('remove-marquee-btn').addEventListener('click', () => {
    const selectedIndex = parseInt(marqueeSelector.value, 10);
    if (selectedIndex === 0 || settingsState.marquees.length <= 1) { showAlert('提示', '無法刪除預設的跑馬燈組別。'); return; }
    settingsState.marquees.splice(selectedIndex, 1);
    for (let i = selectedIndex; i < settingsState.marquees.length; i++) { transformStates[`marquee-container-${i}`] = transformStates[`marquee-container-${i + 1}`]; }
    delete transformStates[`marquee-container-${settingsState.marquees.length}`];
    syncMarqueeDOMElements();
    document.querySelectorAll('.marquee-widget').forEach((el, i) => { el.id = `marquee-container-${i}`; });
    MarqueeManager.syncInstances();
    MarqueeManager.rebuildAllAnimations();
    const newIndex = Math.max(0, selectedIndex - 1);
    marqueeSelector.value = newIndex;
    updateMarqueeSelectorUI();
    marqueeSelector.value = newIndex;
    loadMarqueeSettingsToUI(newIndex);
    saveCurrentSettings();
    showAlert('成功', `已刪除跑馬燈組別 ${selectedIndex + 1}。`);
});
// --- 農曆轉換核心演算法 ---
function getLunarYearDays(y) { let i, sum = 348; for (i = 0x8000; i > 0x8; i >>= 1)sum += (lunarInfo[y - 1900] & i) ? 1 : 0; return sum + getLunarLeapDays(y) }
function getLunarLeapMonth(y) { return lunarInfo[y - 1900] & 0xf }
function getLunarLeapDays(y) { return getLunarLeapMonth(y) ? ((lunarInfo[y - 1900] & 0x10000) ? 30 : 29) : 0 }
function getLunarMonthDays(y, m) { return (lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29 }
function toChinaDate(d) {
    if (d < 1 || d > 30) return "";
    const n1 = "一二三四五六七八九";
    if (d <= 10) return "初" + (d === 10 ? "十" : n1[d - 1]);
    if (d < 20) return "十" + n1[(d % 10) - 1];
    if (d === 20) return "二十";
    if (d < 30) return "廿" + n1[(d % 10) - 1];
    return "三十";
}
let lunarDateCache = {};
function getLunarDate(date) {
    const cleanDate = new Date(date);
    cleanDate.setHours(0, 0, 0, 0);
    const key = cleanDate.toISOString().split('T')[0];
    if (lunarDateCache[key]) return lunarDateCache[key];
    let i, temp = 0; const baseDate = new Date(1900, 0, 31);
    let offset = (cleanDate - baseDate) / 86400000;
    for (i = 1900; i < 2101 && offset > 0; i++) { temp = getLunarYearDays(i); offset -= temp } if (offset < 0) { offset += temp; i-- } const year = i; const leapMonth = getLunarLeapMonth(year); let isLeap = false; for (i = 1; i < 13 && offset > 0; i++) { temp = getLunarMonthDays(year, i); offset -= temp; if (offset < 0) { break } if (leapMonth > 0 && i === leapMonth) { temp = getLunarLeapDays(year); offset -= temp; if (offset < 0) { isLeap = true; break } } } if (offset < 0) { offset += temp } const month = i;
    const day = Math.round(offset) + 1;
    const monthStr = (isLeap ? '閏' : '') + "正二三四五六七八九十冬臘"[month - 1] + '月';
    const result = { year: year, month: month, day: day, isLeap: isLeap, toString: monthStr + toChinaDate(day), dayString: toChinaDate(day) };
    lunarDateCache[key] = result; return result
}
function lunarToSolar(lunarYear, lunarMonth, lunarDay, isLeap = false) { if (lunarYear < 1900 || lunarYear > 2100) return null; const leap = getLunarLeapMonth(lunarYear); if (isLeap && leap !== lunarMonth) return null; let daysOffset = 0; for (let y = 1900; y < lunarYear; y++) { daysOffset += getLunarYearDays(y) } for (let m = 1; m < lunarMonth; m++) { daysOffset += getLunarMonthDays(lunarYear, m); if (leap > 0 && m === leap) { daysOffset += getLunarLeapDays(lunarYear) } } if (isLeap) { daysOffset += getLunarMonthDays(lunarYear, lunarMonth) } daysOffset += lunarDay - 1; const baseDate = new Date(1900, 0, 31); return new Date(baseDate.getTime() + daysOffset * 86400000) }
let solarTermsCache = {};
function calculateAndCacheSolarTerms(year) { if (year < 2000 || year > 2099) { solarTermsCache[year] = {}; return } const yearMap = {}; const Y = year - 2000; solarTermConstants.forEach(([name, month, C]) => { const day = Math.floor(Y * 0.2422 + C) - Math.floor(Y / 4); yearMap[`${year}-${month}-${day}`] = name }); solarTermsCache[year] = yearMap }
function getSolarTerm(year, month, day) { if (!solarTermsCache[year]) { calculateAndCacheSolarTerms(year) } return solarTermsCache[year][`${year}-${month}-${day}`] || null }
function getHoliday(date) {
    const month = date.getMonth() + 1, dayOfMonth = date.getDate(), dayOfWeek = date.getDay();
    const gKey = `${month}-${dayOfMonth}`;
    if (gregorianHolidays[gKey]) return gregorianHolidays[gKey];
    const weekOfMonth = Math.ceil(dayOfMonth / 7);
    const fKey = `${month}-${weekOfMonth}-${dayOfWeek}`;
    if (floatingHolidays[fKey]) return floatingHolidays[fKey];
    const l = getLunarDate(date);
    if (l.day > 0) {
        if (l.month === 12 && l.day === getLunarMonthDays(l.year, 12)) return "除夕";
        const lKey = `${l.month}-${l.day}`;
        if (lunarHolidays[lKey]) return lunarHolidays[lKey];
    }
    return null;
}
function getDailyGanzhi(date) {
    const cleanDate = new Date(date); cleanDate.setHours(0, 0, 0, 0);
    const baseDate = new Date(1900, 0, 31);
    const offset = Math.floor((cleanDate - baseDate) / 86400000);
    const dayStemIndex = (6 + (offset + 60000)) % 10;
    return { stemIndex: dayStemIndex };
}
// --- 星座計算 ---
function getConstellation(date) { const m = date.getMonth() + 1, d = date.getDate(); for (let i = 0; i < signs.length; i++) { if (m < signs[i].m || (m === signs[i].m && d < signs[i].d)) return signs[i]; } return signs[0]; }
// --- 時間輔助工具 ---
const ShichenHelper = {
    hourStemStart: [0, 2, 4, 6, 8, 0, 2, 4, 6, 8],
    getData(date) {
        const h = date.getHours(); const branchIndex = Math.floor(((h + 1) % 24) / 2);
        const dayStemIndex = getDailyGanzhi(date).stemIndex;
        const hourStemIndex = (this.hourStemStart[dayStemIndex] + branchIndex) % 10;
        return { name: `${dizhi[branchIndex]}時`, char: dizhi[branchIndex], gz: `${tiangan[hourStemIndex]}${dizhi[branchIndex]}` };
    }
};
const TimeHelper = {
    timeRanges: [{ h: 23, p: '深夜' }, { h: 19, p: '夜晚' }, { h: 17, p: '傍晚' }, { h: 13, p: '下午' }, { h: 12, p: '中午' }, { h: 9, p: '上午' }, { h: 5, p: '清晨' }, { h: 0, p: '凌晨' }],
    getPeriodText(hour) { return this.timeRanges.find(range => hour >= range.h)?.p || ''; },
};
// --- 全域 DOM 元素與狀態 ---
const allWidgetContainers = () => document.querySelectorAll('.widget-container');
const actionButtons = document.getElementById('action-buttons');
const editToolbar = document.getElementById('edit-toolbar');
const groupBoundingBox = document.getElementById('group-bounding-box');
let isEditMode = false, activityTimeout, transformStates = {}, settingsState = {}, isWidgetAnimating = {};
let selectedWidgets = new Set(), groupMoveHandle = null, groupRotateHandle = null, groupScaleHandle = null, initialGroupTransforms = {};
let activeHandle = null, startX, startY, initialTransformState, scaleCenterX, scaleCenterY, initialDist, activeWidget, groupAddHandle = null, activeGroup = null;
// --- 預設佈局 ---
const userDefaultLayout = {
    "transforms": {
        "calendar-container": { "visible": true, "width": 500, "height": 400, "left": 310, "top": 90, "scale": 1, "rotation": 0 },
        "moon-phase-container": { "visible": false, "width": 500, "height": 400, "left": 10, "top": 90, "scale": 1, "rotation": 0 },
        // 預設佈局參數：包含各組件的顯示狀態、尺寸與座標
        "led-clock-container": { "visible": true, "width": 300, "height": 88, "left": 10, "top": 90, "scale": 1, "rotation": 0 },
        "analog-clock-container": { "visible": true, "width": 300, "height": 300, "left": 10, "top": 180, "scale": 1, "rotation": 0 },
        "marquee-container-0": { "visible": true, "width": 800, "height": 80, "left": 10, "top": 10, "scale": 1, "rotation": 0 }
    },
    "settings": {
        // ... (settings 部分保持不變，不用替換)
        "calendar": { "visible": true, "showMoonIcon": true, "useLedFont": true, "monthInBackground": true, "colors": { "--bg-primary": "#000000", "--year-color": "#FF7000", "--month-color": "#3070a0", "--week-color": "#8830d0", "--day-color": "#ffffff", "--lunar-color": "#FFFF00", "--bg-secondary": "transparent", "--bg-hover": "rgba(55, 65, 81, 0.5)", "--border-color": "#374151", "--text-primary": "#F3F4F6", "--text-secondary": "#9CA3AF", "--text-muted": "#6B7280", "--holiday-color": "#6ee7b7", "--solarterm-color": "#fcd34d", "--yi-color": "#34D399", "--ji-color": "#F87171" } },
        "ledClock": { "visible": true, "colonBlink": true, "colors": { "--led-hour-color": "#00ff00", "--led-minute-color": "#00ff00", "--led-second-color": "#00ff00", "--led-colon-color": "#00ff00", "--led-period-color": "#00ff00" } },
        "analogClock": { "visible": true, "useLedFont": true, "smoothSeconds": false, "colors": { "--analog-face-color": "transparent", "--analog-hand-color": "#ffffff", "--analog-second-hand-color": "#ff3333", "--analog-tick-color": "#cccccc", "--analog-number-color": "#ffffff" } },
        "moonPhase": { "visible": false, "useLedFont": true, "monthInBackground": true, "colors": { "--moon-light-color": "#f0e68c", "--moon-dark-color": "#222222", "--moon-header-color": "#a78bfa", "--moon-desc-color": "#d1d5db", "--moon-highlight-color": "#fcd34d" } },
        "marquees": [
            { "text": "%YYYY%%C(#ee6900, /)%%ROC_YY%%C(#ff7000, 年)%%MM%%C(#3070a0, 月)%%DD%%C(#ffffff, 日)%%W_SHORT%%ap_c%%hh%%C(#00FF00, :)%%mm%%br%%C(#FFFF00, 農曆)%%LM_C%%LD_C%%br%%SHICHEN_NAME%%L_GZ%%L_SX%%CONSTELLATION%%br%%WEATHER_LOC%%WEATHER_DESC%%TEMP%%C(#5ec69d, °C)%%br%%C(#fbd24d, 🌞)%%SUNRISE%%br%%MOON_ICON%%SUNSET%", "speed": 80, "vertical": false, "direction": "left", "colors": { "default": "#FFFFFF" } }
        ],
        "marqueeGlobal": { "useLedFont": true },
        "location": "taiwan",
        "timedEffect": { "enabled": true, "intervalSeconds": 10, "type": "slide", "isRandom": false, "transitionEnabled": false }
    }
};