// ===================================================================
// LED 數字 SVG 產生器
// ===================================================================
            function generateLedSvg(text, config = {}) {
                const { height = 24, color = '#FFFFFF', letterSpacing = 0, isStandalone = false, applyYOffset = false } = config;
                const id_suffix = Math.random().toString(36).substring(2, 9);
                const segmentId = `led-segment-${id_suffix}`, colonId = `led-colon-${id_suffix}`;
                const segmentMap = [[1, 1, 1, 1, 1, 1, 0], [0, 1, 1, 0, 0, 0, 0], [1, 1, 0, 1, 1, 0, 1], [1, 1, 1, 1, 0, 0, 1], [0, 1, 1, 0, 0, 1, 1], [1, 0, 1, 1, 0, 1, 1], [1, 0, 1, 1, 1, 1, 1], [1, 1, 1, 0, 0, 0, 0], [1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 0, 1, 1]];

                const digitXOffset = 26;
                const segmentTransforms = [
                    `translate(${0 + digitXOffset}, 0)`, `translate(${132 + digitXOffset}, 20) rotate(90)`,
                    `translate(${132 + digitXOffset}, 140) rotate(90)`, `translate(${0 + digitXOffset}, 240)`,
                    `translate(${12 + digitXOffset}, 140) rotate(90)`, `translate(${12 + digitXOffset}, 20) rotate(90)`,
                    `translate(${0 + digitXOffset}, 120)`
                ];

                const digitBaseWidth = 158, digitBaseHeight = 272, colonBaseWidth = 38;
                const internalSpacing = isStandalone ? letterSpacing : 0;

                let totalWidth = 0;
                const chars = String(text);
                for (let i = 0; i < chars.length; i++) {
                    const char = chars[i];
                    if (/\d/.test(char)) {
                        totalWidth += digitBaseWidth;
                    } else if (char === ':') {
                        totalWidth += colonBaseWidth;
                    } else if (['/', '-', '.'].includes(char)) {
                        totalWidth += 60;
                    }
                    if (i < chars.length - 1) {
                        totalWidth += internalSpacing;
                    }
                }
                if (totalWidth === 0) return '';

                let svgContent = '', currentX = 0;

                for (const char of chars) {
                    if (/\d/.test(char)) {
                        const digit = parseInt(char, 10);
                        if (digit >= 0 && digit <= 9) {
                            const pattern = segmentMap[digit];
                            let digitGroup = `<g transform="translate(${currentX}, 0)">`;
                            for (let i = 0; i < 7; i++) {
                                digitGroup += `<use href="#${segmentId}" opacity="${pattern[i] ? '1' : '0.1'}" transform="${segmentTransforms[i]}" />`;
                            }
                            digitGroup += `</g>`;
                            svgContent += digitGroup;
                        }
                        currentX += digitBaseWidth + internalSpacing;
                    } else if (char === ':') {
                        svgContent += `<g transform="translate(${currentX + 5}, 0)"><use href="#${colonId}" transform="translate(0, 60)" /><use href="#${colonId}" transform="translate(0, 180)" /></g>`;
                        currentX += colonBaseWidth + internalSpacing;
                    } else if (['/', '-', '.'].includes(char)) {
                        const separatorWidth = 60, entity = { '/': '/', '-': '—', '.': '.' }[char];
                        svgContent += `<text x="${currentX + separatorWidth / 2}" y="${digitBaseHeight / 2}" text-anchor="middle" dominant-baseline="central" font-size="${digitBaseHeight * 0.9}" font-family="'Courier New', Courier, monospace" font-weight="bold">${entity}</text>`;
                        currentX += separatorWidth + internalSpacing;
                    }
                }

                let yOffset = 0;
                if (applyYOffset) {
                    yOffset = 60;
                }

                const viewBoxHeight = digitBaseHeight + yOffset;
                const transformedContent = yOffset > 0 ? `<g transform="translate(0, ${yOffset})">${svgContent}</g>` : svgContent;

                const scaleFactor = height / digitBaseHeight;
                const finalHeight = viewBoxHeight * scaleFactor;
                const finalWidth = totalWidth * scaleFactor;

                return `<svg viewBox="0 0 ${totalWidth} ${viewBoxHeight}" data-text="${text}" height="${finalHeight}px" width="${finalWidth}px" fill="${color}" style="vertical-align: middle;"><defs><polygon id="${segmentId}" points="16 0, 96 0, 112 16, 96 32, 16 32, 0 16" /><rect id="${colonId}" x="0" y="0" width="32" height="32" rx="5" ry="5" /></defs>${transformedContent}</svg>`.replace(/\n\s*/g, '');
            }
            function getLedHTML(text, useLed, options = {}) {
                if (!useLed) return String(text).replace(/</g, "&lt;").replace(/>/g, "&gt;");
                const { color = '#FFFFFF', fontSize = 16, heightMultiplier = 1.1, defaultSpan = true } = options;
                let resultHTML = '';
                const parts = String(text).split(/(\d[\d:./-]*|\D+)/);

                parts.forEach(part => {
                    if (!part) return;
                    if (/^\d/.test(part)) {
                        resultHTML += generateLedSvg(part, { height: fontSize * heightMultiplier, color: color, isStandalone: true, letterSpacing: 8, applyYOffset: true });
                    } else {
                        const escapedPart = part.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        resultHTML += `<span style="color:${color}; display: inline-flex; align-items: center; height: ${fontSize * heightMultiplier}px;">${escapedPart}</span>`;
                    }
                });
                return resultHTML;
            }
            function applyLedToStaticContent(containerElement) {
                if (containerElement.dataset.ledProcessed) return;
                const walker = document.createTreeWalker(containerElement, NodeFilter.SHOW_TEXT, null, false);
                const nodesToProcess = [];
                let node;
                while (node = walker.nextNode()) {
                    if (node.parentElement.closest('script, style, svg, [data-led-processed]')) continue;
                    if (/\d/.test(node.nodeValue)) nodesToProcess.push(node);
                }
                nodesToProcess.forEach(node => {
                    const parent = node.parentNode;
                    if (!parent) return;
                    const parts = node.nodeValue.split(/(\d+[\d:./-]*)/);
                    if (parts.length <= 1) return;

                    const fragment = document.createDocumentFragment();
                    parts.forEach(part => {
                        if (/^\d+[\d:./-]*$/.test(part) && part.trim() !== '') {
                            const color = getComputedStyle(parent).color || '#FFFFFF';
                            const fontSize = parseFloat(getComputedStyle(parent).fontSize) || 16;
                            const template = document.createElement('template');
                            const svgHTML = generateLedSvg(part, { height: fontSize * 1.1, color: color, isStandalone: false, applyYOffset: true }).trim();
                            if (svgHTML) {
                                template.innerHTML = svgHTML;
                                if (template.content.firstChild) {
                                    template.content.firstChild.dataset.ledProcessed = 'true';
                                    fragment.appendChild(template.content.firstChild);
                                }
                            } else { fragment.appendChild(document.createTextNode(part)); }
                        } else if (part) { fragment.appendChild(document.createTextNode(part)); }
                    });
                    parent.replaceChild(fragment, node);
                });
                containerElement.dataset.ledProcessed = 'true';
            }

// ===================================================================
// 統一的日曆標題渲染函數
// ===================================================================
            function renderCalendarTitle(element, text, useLed, ledHeight, ledColor, defaultFontSize, defaultColor) {
                element.innerHTML = useLed
                    ? generateLedSvg(String(text), { height: ledHeight, color: ledColor })
                    : `<span style="font-size: ${defaultFontSize}; color: ${defaultColor}; line-height: 1; font-weight: 700;">${text}</span>`;
            }

// ===================================================================
// 月相 SVG 產生器
// ===================================================================
            function getMoonPhaseSVG(lunarDay, size = '100px', context = 'widget') {
                const phase = (lunarDay - 1) / 29.53, r = 50, cx = 50, cy = 50;
                const light = getComputedStyle(document.documentElement).getPropertyValue('--moon-light-color').trim() || '#f0e68c';
                const dark = getComputedStyle(document.documentElement).getPropertyValue('--moon-dark-color').trim() || '#222222';
                const cos_angle = Math.cos(phase * 2 * Math.PI + Math.PI);
                const base = phase > 0.5 ? `<rect x="0" y="0" width="${cx}" height="${r * 2}" fill="${light}" /><rect x="${cx}" y="0" width="${cx}" height="${r * 2}" fill="${dark}" />` : `<rect x="0" y="0" width="${cx}" height="${r * 2}" fill="${dark}" /><rect x="${cx}" y="0" width="${cx}" height="${r * 2}" fill="${light}" />`;
                const terminator = `<ellipse cx="${cx}" cy="${cy}" rx="${r * Math.abs(cos_angle)}" ry="${r}" fill="${cos_angle > 0 ? light : dark}" />`;
                const id = `moon-clip-${context}-${lunarDay}-${size.replace(/[^a-zA-Z0-9]/g, '')}`;
                return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" style="filter: drop-shadow(0 0 10px ${light}33);"><defs><clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}" /></clipPath></defs><g clip-path="url(#${id})">${base}${terminator}</g></svg>`;
            }