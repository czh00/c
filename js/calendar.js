// ===================================================================
// 月曆與月相曆模組 (工廠模式)
// ===================================================================
            function createCalendarWidget(options) {
                const { bodyId, yearHeaderId, backgroundMonthId, prevBtnId, nextBtnId, todayBtnId, onCellRender, onHeaderClick, getSetting } = options;
                const body = document.getElementById(bodyId), yearHeader = document.getElementById(yearHeaderId), backgroundMonth = document.getElementById(backgroundMonthId);
                const widget = {
                    body: body, currentDate: new Date(),
                    init() {
                        document.getElementById(prevBtnId).addEventListener('click', () => { if (!isEditMode) { this.currentDate.setMonth(this.currentDate.getMonth() - 1); this.render(); } });
                        document.getElementById(nextBtnId).addEventListener('click', () => { if (!isEditMode) { this.currentDate.setMonth(this.currentDate.getMonth() + 1); this.render(); } });
                        document.getElementById(todayBtnId).addEventListener('click', () => { if (!isEditMode) { this.currentDate = new Date(); this.render(); } });
                        if (onHeaderClick) yearHeader.addEventListener('click', () => onHeaderClick(this));
                        this.render();
                    },
                    render() {
                        body.innerHTML = '';
                        const year = this.currentDate.getFullYear(), month = this.currentDate.getMonth();
                        const widgetSettings = getSetting() || {};
                        const useLedHeader = widgetSettings.useLedFont ?? true;

                        // 讀取背景顯示設定，預設為 true
                        const monthInBackground = widgetSettings.monthInBackground ?? true;

                        // 判斷是否為月相曆以選擇正確的顏色變數
                        const isMoonPhase = bodyId === 'moon-calendar-body';
                        const headerColorVar = isMoonPhase ? '--moon-header-color' : '--year-color';
                        const headerColor = getComputedStyle(document.documentElement).getPropertyValue(headerColorVar).trim() || '#FF7000';
                        const monthColor = getComputedStyle(document.documentElement).getPropertyValue('--month-color').trim() || '#3070a0';

                        // 處理標題顯示
                        yearHeader.innerHTML = ''; // 清空舊內容

                        if (monthInBackground) {
                            // 背景顯示模式：標題只顯示年份，使用年份顏色
                            renderCalendarTitle(yearHeader, String(year), useLedHeader, 26, headerColor, '26px', headerColor);
                        } else {
                            // 非背景顯示模式：標題顯示「年份 月份」，年份用年份顏色，月份用月份顏色
                            if (useLedHeader) {
                                const yearSvg = generateLedSvg(String(year), { height: 26, color: headerColor });
                                const monthSvg = generateLedSvg(String(month + 1), { height: 26, color: monthColor });
                                yearHeader.innerHTML = yearSvg + monthSvg; // Flex gap 會處理間距
                            } else {
                                const yearSpan = `<span style="font-size: 26px; color: ${headerColor}; line-height: 1; font-weight: 700;">${year}</span>`;
                                const monthSpan = `<span style="font-size: 26px; color: ${monthColor}; line-height: 1; font-weight: 700;">${month + 1}</span>`;
                                yearHeader.innerHTML = yearSpan + monthSpan;
                            }
                        }

                        const widgetId = body.closest('.widget-container').id;
                        const widgetState = transformStates[widgetId];

                        // 根據設定決定是否顯示背景月份
                        if (monthInBackground) {
                            backgroundMonth.style.display = 'block';
                            if (useLedHeader && widgetState) {
                                backgroundMonth.innerHTML = generateLedSvg(String(month + 1), { height: widgetState.height * 0.7, color: monthColor });
                            } else {
                                backgroundMonth.textContent = month + 1;
                            }
                        } else {
                            backgroundMonth.style.display = 'none';
                            backgroundMonth.innerHTML = '';
                        }

                        const firstDayOfMonth = new Date(year, month, 1);
                        const startDayOfWeek = firstDayOfMonth.getDay();
                        const startDate = new Date(year, month, 1 - startDayOfWeek);
                        const today = new Date(); today.setHours(0, 0, 0, 0);
                        for (let i = 0; i < 42; i++) {
                            const currentCellDate = new Date(startDate);
                            currentCellDate.setDate(startDate.getDate() + i);
                            const cell = document.createElement('div');
                            cell.className = `calendar-day ${currentCellDate.getMonth() !== month ? 'other-month' : ''} ${currentCellDate.getTime() === today.getTime() ? 'today' : ''}`;
                            onCellRender(cell, currentCellDate, widgetSettings);
                            body.appendChild(cell);
                        }
                    }
                };
                return widget;
            }
            const calendarCellRenderer = (cell, date, settings) => {
                const day = date.getDate(), lunar = getLunarDate(date), solarTerm = getSolarTerm(date.getFullYear(), date.getMonth() + 1, day), holiday = getHoliday(date);
                const showMoonIcon = settings.showMoonIcon ?? true, useLed = settings.useLedFont ?? true;
                const textDetailsHTML = `<div class="lunar-date">${lunar.day === 1 ? lunar.toString.substring(0, lunar.isLeap ? 3 : 2) : lunar.dayString}</div>
                    ${solarTerm ? `<div class="solarterm-text truncate" data-key="${solarTerm}">${solarTerm}</div>` : ''}
                    ${holiday ? `<div class="holiday-text truncate" data-key="${holiday}">${holiday}</div>` : ''}`;
                const dayColor = getComputedStyle(document.documentElement).getPropertyValue('--day-color').trim();
                const dayNumberHTML = useLed ? `<div class="day-number-wrapper">${generateLedSvg(String(day), { height: 20, color: dayColor })}</div>` : `<div class="day-number-wrapper" style="font-size: 1.5em; line-height: 1.2; color: ${dayColor}; display: flex; align-items: center; justify-content: center; height: 20px; font-weight: 700;">${day}</div>`;
                if (showMoonIcon) {
                    cell.classList.add('with-moon-icon');
                    cell.innerHTML = `<div class="day-text-content">${dayNumberHTML}<div class="space-y-px">${textDetailsHTML}</div></div><div class="day-moon-container">${MoonPhaseWidget.getMoonPhaseSVG(lunar.day, '28px', `main-cal-${Math.random()}`)}</div>`;
                } else {
                    cell.classList.remove('with-moon-icon');
                    cell.innerHTML = `${dayNumberHTML}<div class="space-y-px">${textDetailsHTML}</div>`;
                }
                cell.dataset.date = date.toISOString();
                if (isEditMode) cell.classList.add('edit-mode-active');
            };
            const moonPhaseCellRenderer = (cell, date, settings) => {
                const lunar = getLunarDate(date), useLed = settings.useLedFont ?? true, dayColor = getComputedStyle(document.documentElement).getPropertyValue('--day-color').trim() || '#ffffff', day = date.getDate();
                const dayNumberHTML = useLed ? `<div class="day-number-wrapper">${generateLedSvg(String(day), { height: 20, color: dayColor })}</div>` : `<div class="day-number-wrapper" style="font-size: 1.2em; line-height: 1; color: ${dayColor}; font-weight: bold;">${day}</div>`;
                const lunarDateText = lunar.day === 1 ? lunar.toString.substring(0, lunar.isLeap ? 3 : 2) : lunar.dayString;
                cell.innerHTML = `${dayNumberHTML}<div class="moon-icon-small">${MoonPhaseWidget.getMoonPhaseSVG(lunar.day, '100%', `grid-${Math.random()}`)}</div><div class="lunar-date">${lunarDateText}</div>`;
                cell.addEventListener('click', () => { if (!isEditMode) showDayDetailModal(date.toISOString()); });
            };