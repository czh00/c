// ===================================================================
// 群組功能相關函式
// ===================================================================
            const groupsUiLayer = document.createElement('div');
            groupsUiLayer.id = 'groups-ui-layer';
            document.body.appendChild(groupsUiLayer);

            groupsUiLayer.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('[data-group-delete]');
                if (deleteBtn) {
                    e.stopPropagation();
                    const index = parseInt(deleteBtn.dataset.groupDelete, 10);
                    disbandGroup(index);
                }
            });

            function renderAllPersistentGroupsUI() {
                if (!isEditMode) {
                    groupsUiLayer.innerHTML = '';
                    return;
                }
                groups = groups.filter(g => g.size > 0);
                groups.forEach((groupSet, index) => {
                    renderSinglePersistentGroupUI(groupSet, index);
                });
                const allContainers = groupsUiLayer.querySelectorAll('.persistent-group-container');
                allContainers.forEach(c => {
                    const idx = parseInt(c.dataset.groupIndex, 10);
                    if (idx >= groups.length) {
                        c.remove();
                    }
                });
            }

            function createGroupFromSelection(e) {
                if (e) e.stopPropagation();
                if (selectedWidgets.size < 2) {
                    showAlert('提示', '請至少勾選兩個元件來建立群組。');
                    return;
                }
                const newGroupMembers = Array.from(selectedWidgets);
                groups = groups.map(existingGroup => {
                    const remainingMembers = new Set([...existingGroup].filter(memberId => !selectedWidgets.has(memberId)));
                    return remainingMembers;
                });
                groups = groups.filter(group => group.size > 1);
                groups.push(new Set(newGroupMembers));
                clearGroupSelection();
                renderAllPersistentGroupsUI();
                saveCurrentSettings();
            }

            function renderSinglePersistentGroupUI(groupSet, index) {
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

                let container = groupsUiLayer.querySelector(`.persistent-group-container[data-group-index="${index}"]`);

                if (!isFinite(minX)) {
                    if (container) container.style.display = 'none';
                    return;
                }

                if (!container) {
                    container = document.createElement('div');
                    container.className = 'persistent-group-container';
                    container.dataset.groupIndex = index;
                    container.style.pointerEvents = 'none';

                    const box = document.createElement('div');
                    box.className = 'persistent-group-box';

                    const idDisplay = document.createElement('div');
                    idDisplay.className = 'persistent-group-id';
                    idDisplay.style.cssText = `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: rgba(255, 165, 0, 0.8); font-size: 48px; font-weight: bold; pointer-events: none; z-index: 200; text-shadow: 0 0 5px black;`;

                    const deleteButton = document.createElement('div');
                    deleteButton.className = 'persistent-group-delete';
                    deleteButton.innerHTML = '&times;';
                    deleteButton.style.cssText = `position: absolute; width: 28px; height: 28px; background-color: rgba(239, 68, 68, 0.8); border-radius: 50%; cursor: pointer; z-index: 201; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold; pointer-events: all; touch-action: none;`;

                    const rotateHandle = document.createElement('div');
                    rotateHandle.className = 'persistent-group-rotate control-handle';
                    rotateHandle.innerHTML = `<svg style="width:100%; height:100%;"><use href="#icon-rotate" stroke="black" stroke-width="1.5"></use></svg>`;
                    rotateHandle.style.cssText = `position: absolute; width: 28px; height: 28px; background-color: rgba(255, 165, 0, 0.8); border-radius: 50%; cursor: alias; z-index: 201; display: flex; align-items: center; justify-content: center; pointer-events: all; padding: 4px; touch-action: none;`;

                    const scaleHandle = document.createElement('div');
                    scaleHandle.className = 'persistent-group-scale control-handle';
                    scaleHandle.innerHTML = `<svg style="width:100%; height:100%;"><use href="#icon-scale" stroke="black" stroke-width="1.5"></use></svg>`;
                    scaleHandle.style.cssText = `position: absolute; width: 28px; height: 28px; background-color: rgba(255, 165, 0, 0.8); border-radius: 50%; cursor: se-resize; z-index: 201; display: flex; align-items: center; justify-content: center; pointer-events: all; padding: 4px; touch-action: none;`;

                    box.appendChild(idDisplay);
                    container.appendChild(box);
                    container.appendChild(deleteButton);
                    container.appendChild(rotateHandle);
                    container.appendChild(scaleHandle);
                    groupsUiLayer.appendChild(container);
                }

                container.style.display = '';

                const box = container.querySelector('.persistent-group-box');
                const idDisplay = container.querySelector('.persistent-group-id');
                const deleteButton = container.querySelector('.persistent-group-delete');
                const rotateHandle = container.querySelector('.persistent-group-rotate');
                const scaleHandle = container.querySelector('.persistent-group-scale');

                box.style.left = `${minX}px`;
                box.style.top = `${minY}px`;
                box.style.width = `${maxX - minX}px`;
                box.style.height = `${maxY - minY}px`;

                idDisplay.textContent = index + 1;

                deleteButton.dataset.groupDelete = index;
                deleteButton.title = `解散群組 ${index + 1}`;
                deleteButton.style.top = `${minY - 14}px`;
                deleteButton.style.left = `${minX - 14}px`;

                rotateHandle.dataset.persistentGroupRotate = index;
                rotateHandle.title = `旋轉群組 ${index + 1}`;
                rotateHandle.style.top = `${maxY - 14}px`;
                rotateHandle.style.left = `${maxX - 14}px`;

                scaleHandle.dataset.persistentGroupScale = index;
                scaleHandle.title = `縮放群組 ${index + 1}`;
                scaleHandle.style.top = `${maxY - 14}px`;
                scaleHandle.style.left = `${minX - 14}px`;
            }

            function findGroupForWidget(widgetId) {
                return (groups || []).find(groupSet => groupSet.has(widgetId));
            }

            function disbandGroup(index) {
                if (index < 0 || index >= groups.length) return;
                showConfirm("確認", `您確定要解散群組 ${index + 1} 嗎？元件將會保留。`, (confirmed) => {
                    if (confirmed) {
                        groups.splice(index, 1);
                        renderAllPersistentGroupsUI();
                        saveCurrentSettings();
                    }
                });
            }
            function toggleWidgetSelection(widgetEl) {
                const widgetId = widgetEl.id, uncheckedIcon = widgetEl.querySelector('.group-select-handle .unchecked'), checkedIcon = widgetEl.querySelector('.group-select-handle .checked');
                if (selectedWidgets.has(widgetId)) {
                    selectedWidgets.delete(widgetId); widgetEl.classList.remove('selected-for-group');
                    uncheckedIcon.style.display = 'block'; checkedIcon.style.display = 'none';
                } else {
                    selectedWidgets.add(widgetId); widgetEl.classList.add('selected-for-group');
                    uncheckedIcon.style.display = 'none'; checkedIcon.style.display = 'block';
                }
                updateGroupControls();
            }
            function updateGroupControls() {
                if (selectedWidgets.size < 2) {
                    if (groupRotateHandle) { groupRotateHandle.remove(); groupRotateHandle = null; }
                    if (groupScaleHandle) { groupScaleHandle.remove(); groupScaleHandle = null; }
                    if (groupAddHandle) { groupAddHandle.remove(); groupAddHandle = null; }
                    if (groupBoundingBox) groupBoundingBox.style.display = 'none';
                    return;
                }

                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                selectedWidgets.forEach(id => {
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

                if (!isFinite(minX)) return;

                if (groupBoundingBox) {
                    groupBoundingBox.style.display = 'block';
                    groupBoundingBox.style.left = `${minX}px`;
                    groupBoundingBox.style.top = `${minY}px`;
                    groupBoundingBox.style.width = `${maxX - minX}px`;
                    groupBoundingBox.style.height = `${maxY - minY}px`;
                }

                if (!groupRotateHandle) {
                    groupRotateHandle = document.createElement('div');
                    groupRotateHandle.id = 'group-rotate-handle';
                    groupRotateHandle.style.touchAction = 'none';
                    groupRotateHandle.innerHTML = `<svg class="width-full height-full" viewBox="0 0 24 24"><use href="#icon-rotate" stroke="black" stroke-width="1.5"></use></svg>`;
                    document.body.appendChild(groupRotateHandle);
                }

                if (!groupScaleHandle) {
                    groupScaleHandle = document.createElement('div');
                    groupScaleHandle.id = 'group-scale-handle';
                    groupScaleHandle.style.touchAction = 'none';
                    groupScaleHandle.innerHTML = `<svg class="width-full height-full" viewBox="0 0 24 24"><use href="#icon-scale" stroke="black" stroke-width="1.5"></use></svg>`;
                    document.body.appendChild(groupScaleHandle);
                }

                if (!groupAddHandle) {
                    groupAddHandle = document.createElement('div');
                    groupAddHandle.id = 'group-add-handle';
                    groupAddHandle.style.cssText = `position: absolute; width: 28px; height: 28px; z-index: 201; cursor: pointer; background-color: rgba(0, 255, 0, 0.8); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: black; font-size: 24px; font-weight: bold; touch-action: none;`;
                    groupAddHandle.textContent = '+';
                    groupAddHandle.title = '將選取項目建立為新群組';
                    groupAddHandle.addEventListener('click', createGroupFromSelection);
                    document.body.appendChild(groupAddHandle);
                }

                groupRotateHandle.style.left = `${maxX - groupRotateHandle.offsetWidth / 2}px`;
                groupRotateHandle.style.top = `${maxY - groupRotateHandle.offsetHeight / 2}px`;
                groupScaleHandle.style.left = `${minX - groupScaleHandle.offsetWidth / 2}px`;
                groupScaleHandle.style.top = `${maxY - groupScaleHandle.offsetHeight / 2}px`;
                groupAddHandle.style.left = `${maxX - groupAddHandle.offsetWidth / 2}px`;
                groupAddHandle.style.top = `${minY - groupAddHandle.offsetHeight / 2}px`;
            }

            function clearGroupSelection() {
                if (groupRotateHandle) { groupRotateHandle.remove(); groupRotateHandle = null; }
                if (groupScaleHandle) { groupScaleHandle.remove(); groupScaleHandle = null; }
                if (groupAddHandle) { groupAddHandle.remove(); groupAddHandle = null; }
                if (groupBoundingBox) groupBoundingBox.style.display = 'none';

                selectedWidgets.forEach(id => {
                    const widgetEl = document.getElementById(id); if (!widgetEl) return;
                    widgetEl.classList.remove('selected-for-group');
                    const uncheckedIcon = widgetEl.querySelector('.group-select-handle .unchecked'), checkedIcon = widgetEl.querySelector('.group-select-handle .checked');
                    if (uncheckedIcon) uncheckedIcon.style.display = 'block';
                    if (checkedIcon) checkedIcon.style.display = 'none';
                });
                selectedWidgets.clear();
            }