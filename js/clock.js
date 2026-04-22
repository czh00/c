// ===================================================================
// LED 時鐘模組
// ===================================================================
            const LedClock = {
                svg: document.getElementById('led-clock-svg'), digits: {}, colons: {}, periodTextElement: null,
                lastTime: { h: -1, m: -1, s: -1 },
                segmentMap: [[1, 1, 1, 1, 1, 1, 0], [0, 1, 1, 0, 0, 0, 0], [1, 1, 0, 1, 1, 0, 1], [1, 1, 1, 1, 0, 0, 1], [0, 1, 1, 0, 0, 1, 1], [1, 0, 1, 1, 0, 1, 1], [1, 0, 1, 1, 1, 1, 1], [1, 1, 1, 0, 0, 0, 0], [1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 0, 1, 1]],
                segmentTransforms: ['translate(0, 0)', 'translate(132, 20) rotate(90)', 'translate(132, 140) rotate(90)', 'translate(0, 240)', 'translate(12, 140) rotate(90)', 'translate(12, 20) rotate(90)', 'translate(0, 120)'],
                baseViewBoxWidth: 0, aspectRatio: 0, timer: null,
                createDigit(id, x, parentGroup, segmentClass) { const group = document.createElementNS('http://www.w3.org/2000/svg', 'g'); group.setAttribute('id', id); group.setAttribute('transform', `translate(${x}, 0)`); for (let i = 0; i < 7; i++) { const use = document.createElementNS('http://www.w3.org/2000/svg', 'use'); use.setAttribute('href', '#segment-shape'); use.setAttribute('class', `segment ${segmentClass}`); use.setAttribute('data-segment', String.fromCharCode(97 + i)); use.setAttribute('transform', this.segmentTransforms[i]); group.appendChild(use); } parentGroup.appendChild(group); return group; },
                createColon(id, x, parentGroup) { const group = document.createElementNS('http://www.w3.org/2000/svg', 'g'); group.setAttribute('id', id); group.setAttribute('transform', `translate(${x}, 0)`);['translate(0, 60)', 'translate(0, 180)'].forEach(transform => { const dot = document.createElementNS('http://www.w3.org/2000/svg', 'use'); dot.setAttribute('href', '#colon-dot-shape'); dot.setAttribute('class', 'colon'); dot.setAttribute('transform', transform); group.appendChild(dot); }); parentGroup.appendChild(group); return group; },
                init() {
                    this.svg.innerHTML = ''; const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs'); defs.innerHTML = `<polygon id="segment-shape" points="16 0, 96 0, 112 16, 96 32, 16 32, 0 16" /><rect id="colon-dot-shape" x="-16" y="0" width="32" height="32" rx="5" ry="5" />`; this.svg.appendChild(defs);

                    const showSeconds = settingsState.ledClock?.showSeconds ?? true;
                    const showPeriod = settingsState.ledClock?.showPeriod ?? true;

                    const digitWidth = 160, colonWidth = 48, digitSpacing = 2, hourMinuteSpacing = 0, secondsScale = 0.25, minuteSecondSpacing = 8;
                    const viewportGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g'); this.svg.appendChild(viewportGroup);

                    let currentX = 0;
                    this.digits.h1 = this.createDigit('digit-h1', currentX, viewportGroup, 'segment-h'); currentX += digitWidth + digitSpacing;
                    this.digits.h2 = this.createDigit('digit-h2', currentX, viewportGroup, 'segment-h'); currentX += digitWidth + hourMinuteSpacing;
                    this.colons.h = this.createColon('colon-h', currentX, viewportGroup); currentX += colonWidth + hourMinuteSpacing;
                    this.digits.m1 = this.createDigit('digit-m1', currentX, viewportGroup, 'segment-m'); currentX += digitWidth + digitSpacing;
                    this.digits.m2 = this.createDigit('digit-m2', currentX, viewportGroup, 'segment-m');

                    const mainDigitsWidth = currentX + digitWidth;
                    const mainDigitHeight = 240 + 32;
                    let extraWidth = 0;

                    this.digits.s1 = null; this.digits.s2 = null; this.periodTextElement = null;

                    if (showSeconds || showPeriod) {
                        const secondsContentWidth = (digitWidth * 2 + digitSpacing) * secondsScale;
                        // 若不顯示秒但顯示時段，給予 110px 空間，否則比較秒數寬度
                        const rightContentWidth = Math.max(showSeconds ? secondsContentWidth : 0, showPeriod ? 110 : 0);
                        extraWidth = minuteSecondSpacing + rightContentWidth;

                        if (showSeconds) {
                            const secondsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                            viewportGroup.appendChild(secondsGroup);
                            this.digits.s1 = this.createDigit('digit-s1', 0, secondsGroup, 'segment-s');
                            this.digits.s2 = this.createDigit('digit-s2', digitWidth + digitSpacing, secondsGroup, 'segment-s');
                            const scaledSecondsHeight = mainDigitHeight * secondsScale;
                            secondsGroup.setAttribute('transform', `translate(${mainDigitsWidth + minuteSecondSpacing}, ${mainDigitHeight - scaledSecondsHeight}) scale(${secondsScale})`);
                        }

                        if (showPeriod) {
                            this.periodTextElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                            this.periodTextElement.setAttribute('class', 'period-text');
                            this.periodTextElement.setAttribute('dominant-baseline', 'hanging');
                            viewportGroup.appendChild(this.periodTextElement);
                            this.periodTextElement.setAttribute('x', mainDigitsWidth + minuteSecondSpacing - 20);
                            this.periodTextElement.setAttribute('y', 0);
                        }
                    }

                    this.baseViewBoxWidth = mainDigitsWidth + extraWidth + 20;
                    this.aspectRatio = this.baseViewBoxWidth / mainDigitHeight;
                    this.svg.setAttribute('viewBox', `0 0 ${this.baseViewBoxWidth} ${mainDigitHeight}`);
                    viewportGroup.setAttribute('transform', 'translate(20, 0)');

                    this.lastTime = { h: -1, m: -1, s: -1 };
                    this.update();
                    if (!this.timer) this.timer = setInterval(() => this.update(), 1000);
                },
                updateDigit(digitElement, number) { if (!digitElement) return; const pattern = this.segmentMap[number]; digitElement.querySelectorAll('.segment').forEach((segment, i) => { segment.style.opacity = pattern[i] ? '1' : '0.1'; }); },
                update() {
                    const now = new Date();
                    const s = now.getSeconds();

                    if (s !== this.lastTime.s) {
                        const effectSettings = settingsState.timedEffect;
                        if (!isEditMode && effectSettings && effectSettings.enabled && s % effectSettings.intervalSeconds === 0) {
                            if (Object.values(isWidgetAnimating).some(v => v)) return;
                            if (effectSettings.type === 'layoutSwitch') {
                                if (layouts.length >= 2) {
                                    if (effectSettings.isRandom) {
                                        let randomIndex;
                                        do { randomIndex = Math.floor(Math.random() * layouts.length); } while (layouts.length > 1 && randomIndex === currentLayoutIndex);
                                        currentLayoutIndex = randomIndex;
                                    } else {
                                        currentLayoutIndex = nextLayoutIndex;
                                        nextLayoutIndex = (nextLayoutIndex + 1) % layouts.length;
                                    }
                                    const useTransition = settingsState.timedEffect?.transitionEnabled ?? false;
                                    if (useTransition) { animateLayoutChange(layouts[currentLayoutIndex], 1000, true); }
                                    else { applyLayout(layouts[currentLayoutIndex], { ignoreTimedEffect: true }); saveCurrentSettings(true); }
                                }
                            } else if (effectSettings.type === 'slide') {
                                this.triggerSlideEffect();
                            }
                        }

                        const sStr = String(s).padStart(2, '0');
                        if (this.digits.s1) this.updateDigit(this.digits.s1, parseInt(sStr[0]));
                        if (this.digits.s2) this.updateDigit(this.digits.s2, parseInt(sStr[1]));

                        const shouldBlink = settingsState.ledClock?.colonBlink ?? true;
                        const colonOpacity = shouldBlink ? (s % 2 === 0 ? '1' : '0.2') : '1';
                        this.colons.h.querySelectorAll('.colon').forEach(c => c.style.opacity = colonOpacity);
                        this.lastTime.s = s;
                    }

                    const m = now.getMinutes();
                    if (m !== this.lastTime.m) {
                        const mStr = String(m).padStart(2, '0');
                        this.updateDigit(this.digits.m1, parseInt(mStr[0]));
                        this.updateDigit(this.digits.m2, parseInt(mStr[1]));
                        this.lastTime.m = m;
                    }

                    const h = now.getHours();
                    if (h !== this.lastTime.h) {
                        if (this.periodTextElement) { this.periodTextElement.textContent = TimeHelper.getPeriodText(h); }

                        // 修改: 判斷是否顯示時段，若顯示則為12H，否則為24H
                        const showPeriod = settingsState.ledClock?.showPeriod ?? true;
                        let displayHour = h;

                        if (showPeriod) {
                            displayHour = h % 12;
                            if (displayHour === 0) displayHour = 12;
                        }

                        const hStr = String(displayHour).padStart(2, '0');
                        this.updateDigit(this.digits.h1, parseInt(hStr[0]));
                        this.updateDigit(this.digits.h2, parseInt(hStr[1]));
                        this.lastTime.h = h;
                    }
                },
                triggerSlideEffect() {
                    let targets = [];
                    allWidgetContainers().forEach(el => {
                        if (transformStates[el.id]?.visible && !el.classList.contains('marquee-widget')) targets.push(el.id);
                    });
                    MarqueeManager.instances.forEach(instance => {
                        if (transformStates[instance.container.id]?.visible && !instance.isScrolling) targets.push(instance.container.id);
                    });
                    if (targets.length === 0) return;
                    const move = { up: 'translateY(-100vh)', down: 'translateY(100vh)', left: 'translateX(-100vw)', right: 'translateX(100vw)' };
                    const directions = Object.keys(move);
                    const duration = 700;
                    targets.forEach(id => {
                        const el = document.getElementById(id);
                        if (!el || isWidgetAnimating[id]) return;
                        const direction = directions[Math.floor(Math.random() * directions.length)];
                        isWidgetAnimating[id] = true;
                        const originalTransform = el.style.transform;
                        const originalTransition = el.style.transition;
                        el.style.transition = `transform ${duration}ms ease-in-out`;
                        el.style.transform = `${originalTransform} ${move[direction]}`;
                        setTimeout(() => {
                            el.style.transition = 'none';
                            el.style.transform = originalTransform;
                            setTimeout(() => {
                                el.style.transition = originalTransition;
                                isWidgetAnimating[id] = false;
                            }, 50);
                        }, duration);
                    });
                }
            };

// ===================================================================
// 指針時鐘模組
// ===================================================================
            const AnalogClock = {
                lastSecond: -1,
                hourHand: document.querySelector('#analog-clock-container .hour-hand'),
                minuteHand: document.querySelector('#analog-clock-container .minute-hand'),
                secondHand: document.querySelector('#analog-clock-container .second-hand'),
                ticksContainer: document.getElementById('ticks-container'),
                animationFrameId: null,
                init() {
                    this.ticksContainer.innerHTML = '';
                    const useLed = settingsState.analogClock?.useLedFont ?? true;
                    for (let i = 1; i <= 60; i++) {
                        const isHour = i % 5 === 0, rotation = i * 6;
                        const wrapper = document.createElement('div');
                        wrapper.className = 'tick-wrapper'; wrapper.style.transform = `rotate(${rotation}deg)`;
                        const tick = document.createElement('div');
                        tick.className = isHour ? 'tick tick-hour' : 'tick tick-minute';
                        wrapper.appendChild(tick);
                        if (isHour) {
                            wrapper.style.setProperty('--rotation', `${rotation}deg`);
                            const numDiv = document.createElement('div'); numDiv.className = 'number';
                            const numberText = String(i / 5);
                            const numberColor = getComputedStyle(document.documentElement).getPropertyValue('--analog-number-color').trim() || '#ffffff';
                            if (useLed) {
                                const clockState = transformStates['analog-clock-container'];
                                const svgHeight = clockState ? clockState.width * 0.08 : 16;
                                numDiv.innerHTML = `<div>${generateLedSvg(numberText, { height: svgHeight, color: numberColor })}</div>`;
                            } else {
                                numDiv.innerHTML = `<div style="transform: rotate(calc(-1 * var(--rotation))); color: ${numberColor}; font-size: 1.2em; font-weight: bold;">${numberText}</div>`;
                            }
                            wrapper.appendChild(numDiv);
                        }
                        this.ticksContainer.appendChild(wrapper);
                    }
                    if (!this.animationFrameId) this.update();
                },
                update() {
                    const now = new Date();
                    const smooth = settingsState.analogClock?.smoothSeconds ?? false;

                    if (!smooth) {
                        const currentSecond = now.getSeconds();
                        if (currentSecond === this.lastSecond) {
                            this.animationFrameId = requestAnimationFrame(() => this.update());
                            return;
                        }
                        this.lastSecond = currentSecond;
                    }

                    const s = smooth ? now.getSeconds() + now.getMilliseconds() / 1000 : now.getSeconds();
                    const m = now.getMinutes() + s / 60;
                    const h = now.getHours() % 12 + m / 60;
                    this.hourHand.style.transform = `translateX(-50%) rotate(${(h / 12) * 360}deg)`;
                    this.minuteHand.style.transform = `translateX(-50%) rotate(${(m / 60) * 360}deg)`;
                    this.secondHand.style.transform = `translateX(-50%) rotate(${(s / 60) * 360}deg)`;
                    this.animationFrameId = requestAnimationFrame(() => this.update());
                }
            };