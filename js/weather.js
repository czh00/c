// ===================================================================
// 地區選擇器
// ===================================================================
            const countySelect = document.getElementById('countySelect'), districtSelect = document.getElementById('districtSelect'), manualLocationInput = document.getElementById('manualLocationInput');
            Object.keys(taiwanLocations).forEach(county => countySelect.add(new Option(county, county)));
            function updateDistrictOptions() { districtSelect.innerHTML = ''; const districts = taiwanLocations[countySelect.value]?.districts || {}; Object.keys(districts).forEach(dist => districtSelect.add(new Option(dist, dist))); }
            function updateLocationSelectors() { const loc = settingsState.location; manualLocationInput.value = loc; for (const county in taiwanLocations) { for (const district in taiwanLocations[county].districts) { if (taiwanLocations[county].districts[district].toLowerCase() === loc.toLowerCase()) { countySelect.value = county; updateDistrictOptions(); districtSelect.value = district; return; } } } countySelect.selectedIndex = 0; updateDistrictOptions(); }
            function handleLocationChange(newLocation) { settingsState.location = newLocation; manualLocationInput.value = newLocation; Weather.updateWeather(); saveCurrentSettings(); }
            countySelect.addEventListener('change', () => { updateDistrictOptions(); handleLocationChange(taiwanLocations[countySelect.value].districts[districtSelect.value]); });
            districtSelect.addEventListener('change', () => handleLocationChange(taiwanLocations[countySelect.value].districts[districtSelect.value]));
            manualLocationInput.addEventListener('change', () => handleLocationChange(manualLocationInput.value.trim()));
            document.getElementById('useCurrentLocationBtn').addEventListener('click', () => { if (navigator.geolocation) navigator.geolocation.getCurrentPosition(pos => { fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`).then(r => r.json()).then(geo => { const city = geo.locality || geo.city; if (city) { handleLocationChange(city); updateLocationSelectors() } }) }); });

// ===================================================================
// 天氣模組
// ===================================================================
            const Weather = {
                data: null,
                init() {
                    setInterval(() => this.updateWeather(), 3 * 60 * 60 * 1000);
                },
                async fetchAPI(url) { try { const response = await fetch(url); if (!response.ok) throw new Error('API請求失敗'); return await response.json(); } catch (error) { console.error(`獲取資料失敗: ${url}`, error); return null; } },
                async fetchCoordinates(name) { const data = await this.fetchAPI(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`); return data?.results?.[0] || null; },
                async fetchWeather(lat, lon) { const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,sunrise,sunset&timezone=auto`; return await this.fetchAPI(url); },
                async updateWeather() {
                    const locationName = settingsState.location?.trim();

                    if (!locationName) {
                        this.data = null;
                    } else {
                        const coords = await this.fetchCoordinates(locationName);
                        this.data = coords ? await this.fetchWeather(coords.latitude, coords.longitude) : null;
                    }
                    weatherDataLoaded = true;

                    MarqueeManager._weatherDataChanged = true;
                    MarqueeManager._updateCacheAndGetStatus();
                    MarqueeManager.rebuildAllAnimations();
                },
                getWeatherDescription(code) { const map = { 0: "晴", 1: "多雲時晴", 2: "局部多雲", 3: "陰", 45: "霧", 48: "凍霧", 51: "毛毛雨", 53: "毛毛雨", 55: "毛毛雨", 56: "凍毛毛雨", 57: "凍毛毛雨", 61: "雨", 63: "雨", 65: "大雨", 66: "凍雨", 67: "凍雨", 71: "雪", 73: "雪", 75: "大雪", 77: "冰雹", 80: "陣雨", 81: "陣雨", 82: "大陣雨", 85: "陣雪", 86: "大陣雪", 95: "雷陣雨", 96: "雷陣雨伴冰雹", 99: "雷陣雨伴冰雹" }; return map[code] || "未知"; },
                getChineseLocationName(englishName) {
                    if (!englishName) return '';
                    for (const county in taiwanLocations) {
                        if (taiwanLocations[county].english.toLowerCase() === englishName.toLowerCase()) return county;
                        for (const district in taiwanLocations[county].districts) { if (taiwanLocations[county].districts[district].toLowerCase() === englishName.toLowerCase()) return district === county ? county : `${county}${district}`; }
                    }
                    return englishName.charAt(0).toUpperCase() + englishName.slice(1);
                }
            };