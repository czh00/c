// ===================================================================
// 自動每日重新整理模組
// ===================================================================
            const DailyRefresher = {
                timeoutId: null,

                start() {
                    this.scheduleNextRefresh();
                },

                scheduleNextRefresh() {
                    if (this.timeoutId) clearTimeout(this.timeoutId);
                    const now = new Date();
                    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
                    const msUntilTrigger = tomorrow - now;
                    this.timeoutId = setTimeout(() => {
                        this.refreshCalendars();
                    }, msUntilTrigger);
                },

                refreshCalendars() {
                    console.log('偵測到日期變更，自動重新整理日曆。');
                    Calendar.currentDate = new Date();
                    MoonPhaseWidget.currentDate = new Date();
                    Calendar.render();
                    MoonPhaseWidget.render();
                    this.scheduleNextRefresh();
                }
            };

// ===================================================================
// 應用程式初始化
// ===================================================================
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

                    // 為跑馬燈元件加入識別標籤
                    if (widgetEl.classList.contains('marquee-widget')) {
                        const index = parseInt(widgetEl.id.split('-')[2]) || 0;
                        const labelHTML = `<div class="marquee-group-label">${index + 1}</div>`;
                        widgetEl.insertAdjacentHTML('beforeend', labelHTML);
                    }
                });
            }
            const Calendar = createCalendarWidget({
                bodyId: 'calendar-body', yearHeaderId: 'year-header', backgroundMonthId: 'background-month',
                prevBtnId: 'prev-month', nextBtnId: 'next-month', todayBtnId: 'back-to-today',
                onCellRender: calendarCellRenderer, onHeaderClick: openPickerFor,
                getSetting: () => settingsState.calendar
            });
            const MoonPhaseWidget = createCalendarWidget({
                bodyId: 'moon-calendar-body', yearHeaderId: 'moon-phase-year-header', backgroundMonthId: 'moon-background-month',
                prevBtnId: 'moon-phase-prev-month', nextBtnId: 'moon-phase-next-month', todayBtnId: 'moon-phase-today',
                onCellRender: moonPhaseCellRenderer, onHeaderClick: openPickerFor,
                getSetting: () => settingsState.moonPhase
            });
            MoonPhaseWidget.getMoonPhaseSVG = getMoonPhaseSVG;
            const MarqueeManager = {
                instances: [],
                _lastUpdateTime: { s: -1, m: -1, d: -1 },
                _cachedReplacements: {},
                _weatherDataChanged: false,

                init() {
                    this.syncInstances();
                    this._updateCacheAndGetStatus();
                    setInterval(() => this.updateAllContent(), 1000);
                },

                _updateCacheAndGetStatus() {
                    const now = new Date();
                    const s = now.getSeconds(), m = now.getMinutes(), d = now.getDate();
                    const status = { s: false, m: false, d: false, w: this._weatherDataChanged };

                    if (d !== this._lastUpdateTime.d) status.d = true;
                    if (status.d || m !== this._lastUpdateTime.m) status.m = true;
                    if (status.m || s !== this._lastUpdateTime.s) status.s = true;

                    if (status.s) {
                        this._cachedReplacements['%ss%'] = String(s).padStart(2, '0');
                        this._cachedReplacements['%s%'] = s;
                        this._lastUpdateTime.s = s;
                    }

                    if (status.m) {
                        const h = now.getHours(), h12 = h % 12 || 12, amPm = h >= 12 ? 'PM' : 'AM';
                        const shichen = ShichenHelper.getData(now);
                        Object.assign(this._cachedReplacements, {
                            '%mm%': String(m).padStart(2, '0'), '%m%': m,
                            '%HH%': String(h).padStart(2, '0'), '%H%': h,
                            '%hh%': String(h12).padStart(2, '0'), '%h%': h12,
                            '%AP%': amPm, '%ap%': amPm.toLowerCase(), '%ap_c%': TimeHelper.getPeriodText(h),
                            '%SHICHEN_GZ%': shichen.gz, '%SHICHEN_NAME%': shichen.name, '%SHICHEN_CHAR%': shichen.char
                        });
                        this._lastUpdateTime.m = m;
                    }

                    if (status.d) {
                        const year = now.getFullYear(), month = now.getMonth() + 1, dayOfWeek = now.getDay();
                        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'], dayOfWeekChars = ['日', '一', '二', '三', '四', '五', '六'];
                        const lunar = getLunarDate(now);
                        const moonDetails = lunar ? (moonPhaseData[lunar.day] || { n: '未知', a: '' }) : { n: '', a: '' };
                        const moonName = moonDetails.a ? `${moonDetails.n}(${moonDetails.a})` : moonDetails.n;
                        const yearGZ = tiangan.charAt((lunar.year - 4) % 10) + dizhi.charAt((lunar.year - 4) % 12);
                        const yearSX = shengxiao.charAt((lunar.year - 4) % 12);
                        const constellationInfo = getConstellation(now);
                        Object.assign(this._cachedReplacements, {
                            '%YYYY%': year, '%ROC_YY%': year - 1911, '%YY%': String(year).slice(-2),
                            '%MM%': String(month).padStart(2, '0'), '%M%': month, '%DD%': String(d).padStart(2, '0'), '%D%': d,
                            '%WEEKDAY%': weekdays[dayOfWeek], '%W_NUM%': dayOfWeek, '%W_SHORT%': `週${dayOfWeekChars[dayOfWeek]}`, '%W_CHAR%': dayOfWeekChars[dayOfWeek],
                            '%L_GZ%': yearGZ, '%L_SX%': yearSX,
                            '%LM_C%': lunar ? lunar.toString.split(/月/)[0] + '月' : '', '%LD_C%': lunar ? lunar.dayString : '',
                            '%MOON_PHASE%': moonName,
                            '%MOON_ICON%': lunar ? MoonPhaseWidget.getMoonPhaseSVG(lunar.day, '1em', `marquee-manager`) : '',
                            '%MOON_DAY%': lunar ? lunar.day : '',
                            '%CONSTELLATION%': constellationInfo ? constellationInfo.sign : ''
                        });
                        this._lastUpdateTime.d = d;
                    }

                    if (status.w) {
                        let weatherReplacements = { '%WEATHER_LOC%': Weather.getChineseLocationName(settingsState.location), '%WEATHER_DESC%': '讀取中', '%TEMP%': '...', '%SUNRISE%': '...', '%SUNSET%': '...' };
                        if (Weather.data) {
                            const formatTime = (dateStr) => dateStr ? new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                            weatherReplacements = {
                                '%WEATHER_LOC%': Weather.getChineseLocationName(settingsState.location),
                                '%WEATHER_DESC%': Weather.getWeatherDescription(Weather.data.current.weather_code),
                                '%TEMP%': Math.round(Weather.data.current.temperature_2m),
                                '%SUNRISE%': formatTime(Weather.data.daily.sunrise[0]),
                                '%SUNSET%': formatTime(Weather.data.daily.sunset[0])
                            };
                        }
                        Object.assign(this._cachedReplacements, weatherReplacements);
                    }
                    this._weatherDataChanged = false;
                    return status;
                },

                updateAllContent() {
                    const status = this._updateCacheAndGetStatus();
                    if (status.s || status.m || status.d || status.w) {
                        this.instances.forEach(ins => ins.updateContent(status, this._cachedReplacements));
                    }
                },

                syncInstances() {
                    const count = settingsState.marquees.length;
                    while (this.instances.length < count) {
                        this.instances.push(new MarqueeInstance(`marquee-container-${this.instances.length}`, this.instances.length));
                    }
                    while (this.instances.length > count) {
                        const ins = this.instances.pop();
                        if (ins.animationStyleTag) ins.animationStyleTag.remove();
                    }
                },

                rebuildAllAnimations() { this.instances.forEach(ins => ins.rebuildAnimation()); },
                rebuildAnimationByIndex(index) { if (this.instances[index]) this.instances[index].rebuildAnimation(); }
            };

            // 初始化應用程式
            (async function () {
                const autoSavedLayout = localStorage.getItem('widgets_autosave');
                if (autoSavedLayout) {
                    applyLayout(JSON.parse(autoSavedLayout));
                } else {
                    applyLayout(JSON.parse(JSON.stringify(userDefaultLayout)));
                }

                if (!settingsState.location) {
                    settingsState.location = "taiwan";
                }

                const savedLayouts = localStorage.getItem('widgets_layouts_v2');
                if (savedLayouts) {
                    try { layouts = JSON.parse(savedLayouts); } catch (e) { console.error("無法從 localStorage 解析版面設定", e); layouts = []; }
                }

                initializeWidgetControls();
                Calendar.init();
                MoonPhaseWidget.init();
                LedClock.init();
                AnalogClock.init();
                Weather.init();
                MarqueeManager.init();
                DailyRefresher.start();

                updateLocationSelectors();
                await Weather.updateWeather();
                setupTimedEffectControls();
                resetActivityTimeout();
                updateLayoutSelector();
                saveCurrentSettings();

                window.addEventListener('resize', () => { ensureWidgetsInBounds(); MarqueeManager.rebuildAllAnimations(); saveCurrentSettings(); });
                document.fonts.ready.then(() => { ensureWidgetsInBounds(); MarqueeManager.rebuildAllAnimations(); });
            })();