import { app } from "/scripts/app.js";

app.registerExtension({
	name: "ComfyUI.MOSSBBoxStudio",
	async beforeRegisterNodeDef(nodeType, nodeData, app) {
		if (nodeData.name === "MOSSBBoxStudioNode") {
			const onNodeCreated = nodeType.prototype.onNodeCreated;

			nodeType.prototype.onNodeCreated = function () {
				if (onNodeCreated) onNodeCreated.apply(this, arguments);

				const node = this;

				// État local du composant
				this.studioState = {
					summary: "",
					aspect_ratio: "16:9",
					items: []
				};

				this.selectedItemIndex = -1;

				// Conteneur Principal
				const mainContainer = document.createElement("div");
				mainContainer.style.display = "flex";
				mainContainer.style.flexDirection = "column";
				mainContainer.style.width = "620px";
				mainContainer.style.height = "510px";
				mainContainer.style.gap = "8px";
				mainContainer.style.backgroundColor = "#1a1a1a";
				mainContainer.style.color = "#eee";
				mainContainer.style.padding = "10px";
				mainContainer.style.borderRadius = "6px";
				mainContainer.style.boxSizing = "border-box";
				mainContainer.style.fontFamily = "sans-serif";
				mainContainer.style.fontSize = "12px";

				// --- 1. ZONE PROMPT GLOBAL (SUMMARY) ---
				const summaryWrapper = document.createElement("div");
				summaryWrapper.style.display = "flex";
				summaryWrapper.style.flexDirection = "column";
				summaryWrapper.style.gap = "4px";

				const summaryLabel = document.createElement("label");
				summaryLabel.innerText = "📝 Summary (Prompt Global)";
				summaryLabel.style.fontWeight = "bold";
				summaryLabel.style.color = "#aaa";

				const summaryInput = document.createElement("textarea");
				summaryInput.placeholder = "masterpiece, 1970s TV show screenshot, retro 35mm film still...";
				summaryInput.style.height = "50px";
				summaryInput.style.backgroundColor = "#2a2a2a";
				summaryInput.style.color = "#fff";
				summaryInput.style.border = "1px solid #444";
				summaryInput.style.borderRadius = "4px";
				summaryInput.style.padding = "6px";
				summaryInput.style.resize = "none";

				summaryInput.addEventListener("input", (e) => {
					node.studioState.summary = e.target.value;
					node.updateOutputWidget();
				});

				// EMPÊCHER LITEGRAPH D'INTERCAPTER LA SOURIS ET LE CLAVIER
				["mousedown", "mouseup", "click", "keydown", "keyup"].forEach((eventType) => {
					summaryInput.addEventListener(eventType, (e) => {
						e.stopPropagation();
					});
				});

				summaryWrapper.appendChild(summaryLabel);
				summaryWrapper.appendChild(summaryInput);
				mainContainer.appendChild(summaryWrapper);

				// --- 2. ZONE CORPS (CANVAS + LISTE CALQUES) ---
				const bodyContainer = document.createElement("div");
				bodyContainer.style.display = "flex";
				bodyContainer.style.flexDirection = "row";
				bodyContainer.style.gap = "10px";
				bodyContainer.style.flex = "1";
				bodyContainer.style.minHeight = "0";

				// COLONNE GAUCHE: CANVAS & RATIO
				const canvasCol = document.createElement("div");
				canvasCol.style.display = "flex";
				canvasCol.style.flexDirection = "column";
				canvasCol.style.gap = "6px";
				canvasCol.style.width = "280px";

				// Header Canvas avec Ratio Selector
				const canvasHeader = document.createElement("div");
				canvasHeader.style.display = "flex";
				canvasHeader.style.justifyContent = "space-between";
				canvasHeader.style.alignItems = "center";

				const canvasTitle = document.createElement("span");
				canvasTitle.innerText = "🎨 Canvas";
				canvasTitle.style.fontWeight = "bold";
				canvasTitle.style.color = "#aaa";

				const ratioSelect = document.createElement("select");
				ratioSelect.style.backgroundColor = "#111";
				ratioSelect.style.color = "#fff";
				ratioSelect.style.border = "1px solid #555";
				ratioSelect.style.borderRadius = "3px";
				ratioSelect.style.fontSize = "11px";

				const ratios = {
					"16:9": [280, 157],
					"1:1": [280, 280],
					"9:16": [157, 280],
					"4:3": [280, 210],
					"3:2": [280, 186]
				};

				Object.keys(ratios).forEach(r => {
					const opt = document.createElement("option");
					opt.value = r;
					opt.innerText = r;
					if (r === "16:9") opt.selected = true;
					ratioSelect.appendChild(opt);
				});

				canvasHeader.appendChild(canvasTitle);
				canvasHeader.appendChild(ratioSelect);
				canvasCol.appendChild(canvasHeader);

				// Zone englobante fixe pour garder le layout stable
				const canvasBox = document.createElement("div");
				canvasBox.style.width = "280px";
				canvasBox.style.height = "280px";
				canvasBox.style.display = "flex";
				canvasBox.style.alignItems = "center";
				canvasBox.style.justifyContent = "center";
				canvasBox.style.backgroundColor = "#0d0d0d";
				canvasBox.style.border = "1px solid #333";
				canvasBox.style.borderRadius = "4px";

				const canvas = document.createElement("canvas");
				canvas.width = 280;
				canvas.height = 157;
				canvas.style.backgroundColor = "#000";
				canvas.style.border = "1px solid #555";
				canvas.style.cursor = "crosshair";

				const canvasCtx = canvas.getContext("2d");
				canvasBox.appendChild(canvas);
				canvasCol.appendChild(canvasBox);
				bodyContainer.appendChild(canvasCol);

				ratioSelect.addEventListener("change", (e) => {
					const selectedRatio = e.target.value;
					node.studioState.aspect_ratio = selectedRatio;
					const [w, h] = ratios[selectedRatio] || [280, 280];
					canvas.width = w;
					canvas.height = h;
					node.redrawCanvas(canvasCtx, canvas.width, canvas.height);
					node.updateOutputWidget();
				});

				// COLONNE DROITE: LISTE ITEMS & Z-INDEX
				const listCol = document.createElement("div");
				listCol.style.flex = "1";
				listCol.style.display = "flex";
				listCol.style.flexDirection = "column";
				listCol.style.gap = "6px";
				listCol.style.overflowY = "auto";

				const listHeader = document.createElement("div");
				listHeader.style.display = "flex";
				listHeader.style.justifyContent = "space-between";
				listHeader.style.alignItems = "center";

				const listTitle = document.createElement("span");
				listTitle.innerText = "📑 Calques (Z-Index)";
				listTitle.style.fontWeight = "bold";
				listTitle.style.color = "#aaa";

				const btnGroup = document.createElement("div");
				btnGroup.style.display = "flex";
				btnGroup.style.gap = "4px";

				const clearBtn = document.createElement("button");
				clearBtn.innerText = "Clear";
				clearBtn.style.backgroundColor = "#d32f2f";
				clearBtn.style.color = "#fff";
				clearBtn.style.border = "none";
				clearBtn.style.padding = "4px 8px";
				clearBtn.style.borderRadius = "3px";
				clearBtn.style.cursor = "pointer";

				clearBtn.addEventListener("click", () => {
					if (confirm("Voulez-vous effacer toutes les BBoxes ?")) {
						node.studioState.items = [];
						node.selectedItemIndex = -1;
						node.renderList(itemsContainer, canvasCtx, canvas);
						node.redrawCanvas(canvasCtx, canvas.width, canvas.height);
						node.updateOutputWidget();
					}
				});

				const addBtn = document.createElement("button");
				addBtn.innerText = "+ Ajouter";
				addBtn.style.backgroundColor = "#388e3c";
				addBtn.style.color = "#fff";
				addBtn.style.border = "none";
				addBtn.style.padding = "4px 8px";
				addBtn.style.borderRadius = "3px";
				addBtn.style.cursor = "pointer";

				btnGroup.appendChild(clearBtn);
				btnGroup.appendChild(addBtn);
				listHeader.appendChild(listTitle);
				listHeader.appendChild(btnGroup);
				listCol.appendChild(listHeader);

				const itemsContainer = document.createElement("div");
				itemsContainer.style.display = "flex";
				itemsContainer.style.flexDirection = "column";
				itemsContainer.style.gap = "6px";
				listCol.appendChild(itemsContainer);

				bodyContainer.appendChild(listCol);
				mainContainer.appendChild(bodyContainer);

				// --- LOGIQUE CANVAS DE DESSIN, DEPLACEMENT ET REDIMENSIONNEMENT ---
				let interactionMode = "none";
				let resizeHandle = null;
				let startX = 0, startY = 0;
				let initialBBox = null;

				const HANDLE_SIZE = 8;

				function getCanvasCoords(e) {
					const rect = canvas.getBoundingClientRect();
					return {
						x: (e.clientX - rect.left) / canvas.width,
						y: (e.clientY - rect.top) / canvas.height,
						px: e.clientX - rect.left,
						py: e.clientY - rect.top
					};
				}

				function checkHandles(px, py, item) {
					const [x, y, w, h] = item.bbox;
					const bx = x * canvas.width;
					const by = y * canvas.height;
					const bw = w * canvas.width;
					const bh = h * canvas.height;

					const handles = {
						tl: { x: bx, y: by },
						tr: { x: bx + bw, y: by },
						bl: { x: bx, y: by + bh },
						br: { x: bx + bw, y: by + bh }
					};

					const MARGIN = 12;

					for (const [key, pos] of Object.entries(handles)) {
						if (Math.abs(px - pos.x) <= MARGIN && Math.abs(py - pos.y) <= MARGIN) {
							return key;
						}
					}
					return null;
				}

				function isInsideItem(normX, normY, item) {
					const [x, y, w, h] = item.bbox;
					return normX >= x && normX <= x + w && normY >= y && normY <= y + h;
				}

				canvas.addEventListener("mousedown", (e) => {
					const coords = getCanvasCoords(e);
					startX = coords.x;
					startY = coords.y;

					if (node.selectedItemIndex >= 0 && node.selectedItemIndex < node.studioState.items.length) {
						const activeItem = node.studioState.items[node.selectedItemIndex];
						const handle = checkHandles(coords.px, coords.py, activeItem);
						if (handle) {
							interactionMode = "resize";
							resizeHandle = handle;
							initialBBox = [...activeItem.bbox];
							return;
						}
					}

					let clickedIndex = -1;
					const sortedIndices = node.studioState.items
						.map((item, index) => ({ index, z: item.z_index }))
						.sort((a, b) => b.z - a.z);

					for (const entry of sortedIndices) {
						if (isInsideItem(coords.x, coords.y, node.studioState.items[entry.index])) {
							clickedIndex = entry.index;
							break;
						}
					}

					if (clickedIndex !== -1) {
						node.selectedItemIndex = clickedIndex;
						interactionMode = "move";
						initialBBox = [...node.studioState.items[clickedIndex].bbox];
					} else {
						node.selectedItemIndex = -1;
						interactionMode = "draw";
					}

					node.renderList(itemsContainer, canvasCtx, canvas);
					node.redrawCanvas(canvasCtx, canvas.width, canvas.height);
				});

				canvas.addEventListener("mousemove", (e) => {
					const coords = getCanvasCoords(e);

					if (interactionMode === "none") {
						if (node.selectedItemIndex >= 0 && node.selectedItemIndex < node.studioState.items.length) {
							const handle = checkHandles(coords.px, coords.py, node.studioState.items[node.selectedItemIndex]);
							if (handle) {
								canvas.style.cursor = (handle === "tl" || handle === "br") ? "nwse-resize" : "nesw-resize";
								return;
							}
						}
						const isHovering = node.studioState.items.some(item => isInsideItem(coords.x, coords.y, item));
						canvas.style.cursor = isHovering ? "move" : "crosshair";
						return;
					}

					const dx = coords.x - startX;
					const dy = coords.y - startY;

					if (interactionMode === "move" && node.selectedItemIndex >= 0) {
						const item = node.studioState.items[node.selectedItemIndex];
						let newX = Math.max(0, Math.min(1 - initialBBox[2], initialBBox[0] + dx));
						let newY = Math.max(0, Math.min(1 - initialBBox[3], initialBBox[1] + dy));
						item.bbox[0] = parseFloat(newX.toFixed(2));
						item.bbox[1] = parseFloat(newY.toFixed(2));
					} else if (interactionMode === "resize" && node.selectedItemIndex >= 0) {
						const item = node.studioState.items[node.selectedItemIndex];
						let [x, y, w, h] = initialBBox;

						if (resizeHandle === "br") {
							w = Math.max(0.05, Math.min(1 - x, w + dx));
							h = Math.max(0.05, Math.min(1 - y, h + dy));
						} else if (resizeHandle === "bl") {
							const newX = Math.max(0, Math.min(x + w - 0.05, x + dx));
							w = w + (x - newX);
							x = newX;
							h = Math.max(0.05, Math.min(1 - y, h + dy));
						} else if (resizeHandle === "tr") {
							const newY = Math.max(0, Math.min(y + h - 0.05, y + dy));
							h = h + (y - newY);
							y = newY;
							w = Math.max(0.05, Math.min(1 - x, w + dx));
						} else if (resizeHandle === "tl") {
							const newX = Math.max(0, Math.min(x + w - 0.05, x + dx));
							w = w + (x - newX);
							x = newX;
							const newY = Math.max(0, Math.min(y + h - 0.05, y + dy));
							h = h + (y - newY);
							y = newY;
						}

						item.bbox = [
							parseFloat(x.toFixed(2)),
							parseFloat(y.toFixed(2)),
							parseFloat(w.toFixed(2)),
							parseFloat(h.toFixed(2))
						];
					} else if (interactionMode === "draw") {
						const x = Math.min(startX, coords.x);
						const y = Math.min(startY, coords.y);
						const w = Math.abs(coords.x - startX);
						const h = Math.abs(coords.y - startY);
						node.redrawCanvas(canvasCtx, canvas.width, canvas.height, [
							parseFloat(x.toFixed(2)),
							parseFloat(y.toFixed(2)),
							parseFloat(w.toFixed(2)),
							parseFloat(h.toFixed(2))
						]);
						return;
					}

					node.redrawCanvas(canvasCtx, canvas.width, canvas.height);
					node.updateOutputWidget();
				});

				canvas.addEventListener("mouseup", (e) => {
					const coords = getCanvasCoords(e);
					if (interactionMode === "draw") {
						const x = Math.min(startX, coords.x);
						const y = Math.min(startY, coords.y);
						const w = Math.abs(coords.x - startX);
						const h = Math.abs(coords.y - startY);
						if (w > 0.02 && h > 0.02) {
							node.addItem([
								parseFloat(x.toFixed(2)),
								parseFloat(y.toFixed(2)),
								parseFloat(w.toFixed(2)),
								parseFloat(h.toFixed(2))
							]);
						}
					}
					interactionMode = "none";
					resizeHandle = null;
					node.redrawCanvas(canvasCtx, canvas.width, canvas.height);
				});

				node.moveZIndex = function(itemIndex, direction) {
					const items = node.studioState.items;
					const targetIndex = itemIndex + direction;

					if (targetIndex < 0 || targetIndex >= items.length) return;

					const temp = items[itemIndex];
					items[itemIndex] = items[targetIndex];
					items[targetIndex] = temp;

					items.forEach((it, idx) => {
						it.z_index = idx;
					});

					if (node.selectedItemIndex === itemIndex) {
						node.selectedItemIndex = targetIndex;
					} else if (node.selectedItemIndex === targetIndex) {
						node.selectedItemIndex = itemIndex;
					}

					node.renderList(itemsContainer, canvasCtx, canvas);
					node.redrawCanvas(canvasCtx, canvas.width, canvas.height);
					node.updateOutputWidget();
				};

				node.addItem = function(bbox = [0.1, 0.1, 0.3, 0.3]) {
					const newZ = node.studioState.items.length;
					node.studioState.items.push({
						z_index: newZ,
						type: "object",
						caption: "",
						bbox: bbox
					});
					node.selectedItemIndex = node.studioState.items.length - 1;
					node.renderList(itemsContainer, canvasCtx, canvas);
					node.updateOutputWidget();
				};

				addBtn.addEventListener("click", () => node.addItem());

				node.redrawCanvas = function(ctx, width, height, tempRect = null) {
					ctx.clearRect(0, 0, width, height);

					node.studioState.items.forEach((item, idx) => {
						const [x, y, w, h] = item.bbox;
						const isSelected = idx === node.selectedItemIndex;

						ctx.strokeStyle = isSelected ? "#4caf50" : (item.type === "text" ? "#00bcd4" : "#ff9800");
						ctx.lineWidth = isSelected ? 3 : 2;
						ctx.strokeRect(x * width, y * height, w * width, h * height);

						ctx.fillStyle = ctx.strokeStyle;
						ctx.font = "10px sans-serif";
						ctx.fillText(`#${item.z_index} [${item.type}]`, x * width + 2, y * height + 12);

						if (isSelected) {
							ctx.fillStyle = "#ffffff";
							const bx = x * width;
							const by = y * height;
							const bw = w * width;
							const bh = h * height;

							const handles = [
								[bx, by],
								[bx + bw, by],
								[bx, by + bh],
								[bx + bw, by + bh]
							];

							handles.forEach(([hx, hy]) => {
								ctx.fillRect(hx - HANDLE_SIZE / 2, hy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
								ctx.strokeRect(hx - HANDLE_SIZE / 2, hy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
							});
						}
					});

					if (tempRect) {
						const [x, y, w, h] = tempRect;
						ctx.strokeStyle = "#4caf50";
						ctx.lineWidth = 1;
						ctx.setLineDash([4, 4]);
						ctx.strokeRect(x * width, y * height, w * width, h * height);
						ctx.setLineDash([]);
					}
				};

				node.renderList = function(container, ctx, canvas) {
					container.innerHTML = "";

					const sorted = [...node.studioState.items].sort((a, b) => b.z_index - a.z_index);

					sorted.forEach((item) => {
						const originalIndex = node.studioState.items.indexOf(item);
						const isSelected = originalIndex === node.selectedItemIndex;

						const card = document.createElement("div");
						card.style.backgroundColor = isSelected ? "#334155" : "#282828";
						card.style.border = isSelected ? "1px solid #4caf50" : "1px solid #444";
						card.style.borderRadius = "4px";
						card.style.padding = "6px";
						card.style.display = "flex";
						card.style.flexDirection = "column";
						card.style.gap = "4px";
						card.style.cursor = "pointer";

						card.addEventListener("click", (e) => {
							if (e.target.tagName !== "INPUT" && e.target.tagName !== "SELECT" && e.target.tagName !== "BUTTON") {
								node.selectedItemIndex = originalIndex;
								node.renderList(container, ctx, canvas);
								node.redrawCanvas(ctx, canvas.width, canvas.height);
							}
						});

						const ctrlRow = document.createElement("div");
						ctrlRow.style.display = "flex";
						ctrlRow.style.justifyContent = "space-between";
						ctrlRow.style.alignItems = "center";

						const zGroup = document.createElement("div");
						zGroup.style.display = "flex";
						zGroup.style.alignItems = "center";
						zGroup.style.gap = "4px";

						const zLabel = document.createElement("span");
						zLabel.innerText = `Z:${item.z_index}`;
						zLabel.style.fontWeight = "bold";
						zLabel.style.color = "#ff9800";

						const upBtn = document.createElement("button");
						upBtn.innerText = "▲";
						upBtn.title = "Monter (Premier plan)";
						upBtn.style.backgroundColor = "#444";
						upBtn.style.color = "#fff";
						upBtn.style.border = "none";
						upBtn.style.borderRadius = "3px";
						upBtn.style.cursor = "pointer";
						upBtn.style.fontSize = "10px";
						upBtn.style.padding = "2px 5px";

						upBtn.addEventListener("click", (e) => {
							e.stopPropagation();
							node.moveZIndex(originalIndex, 1);
						});

						const downBtn = document.createElement("button");
						downBtn.innerText = "▼";
						downBtn.title = "Descendre (Arrière-plan)";
						downBtn.style.backgroundColor = "#444";
						downBtn.style.color = "#fff";
						downBtn.style.border = "none";
						downBtn.style.borderRadius = "3px";
						downBtn.style.cursor = "pointer";
						downBtn.style.fontSize = "10px";
						downBtn.style.padding = "2px 5px";

						downBtn.addEventListener("click", (e) => {
							e.stopPropagation();
							node.moveZIndex(originalIndex, -1);
						});

						zGroup.appendChild(zLabel);
						zGroup.appendChild(upBtn);
						zGroup.appendChild(downBtn);

						const typeSelect = document.createElement("select");
						typeSelect.style.backgroundColor = "#111";
						typeSelect.style.color = "#fff";
						typeSelect.style.border = "1px solid #555";
						typeSelect.style.borderRadius = "3px";

						["object", "text"].forEach(t => {
							const opt = document.createElement("option");
							opt.value = t;
							opt.innerText = t;
							if (t === item.type) opt.selected = true;
							typeSelect.appendChild(opt);
						});

						typeSelect.addEventListener("change", (e) => {
							item.type = e.target.value;
							node.redrawCanvas(ctx, canvas.width, canvas.height);
							node.updateOutputWidget();
						});

						const delBtn = document.createElement("button");
						delBtn.innerText = "✕";
						delBtn.style.backgroundColor = "#d32f2f";
						delBtn.style.color = "#fff";
						delBtn.style.border = "none";
						delBtn.style.borderRadius = "3px";
						delBtn.style.cursor = "pointer";

						delBtn.addEventListener("click", (e) => {
							e.stopPropagation();
							node.studioState.items = node.studioState.items.filter(i => i !== item);
							node.selectedItemIndex = -1;
							node.renderList(container, ctx, canvas);
							node.redrawCanvas(ctx, canvas.width, canvas.height);
							node.updateOutputWidget();
						});

						ctrlRow.appendChild(zGroup);
						ctrlRow.appendChild(typeSelect);
						ctrlRow.appendChild(delBtn);
						card.appendChild(ctrlRow);

						const promptInput = document.createElement("textarea");
						promptInput.value = item.caption;
						promptInput.placeholder = "Description pour cet item...";
						promptInput.rows = 3;
						promptInput.style.backgroundColor = "#181818";
						promptInput.style.color = "#fff";
						promptInput.style.border = "1px solid #444";
						promptInput.style.borderRadius = "3px";
						promptInput.style.padding = "4px";
						promptInput.style.resize = "vertical";
						promptInput.style.minHeight = "45px";
						promptInput.style.fontFamily = "sans-serif";
						promptInput.style.fontSize = "11px";

						// EMPÊCHER LITEGRAPH D'INTERCAPTER LA SOURIS ET LE CLAVIER
						["mousedown", "mouseup", "click", "keydown", "keyup"].forEach((eventType) => {
							promptInput.addEventListener(eventType, (e) => {
								e.stopPropagation();
							});
						});

						promptInput.addEventListener("input", (e) => {
							item.caption = e.target.value;
							node.updateOutputWidget();
						});

						card.appendChild(promptInput);
						container.appendChild(card);
					});

					node.redrawCanvas(ctx, canvas.width, canvas.height);
				};

				node.updateOutputWidget = function() {
					const stringWidget = node.widgets.find(w => w.name === "bbox_studio_data");
					if (stringWidget) {
						stringWidget.value = JSON.stringify(node.studioState);
					}
				};

				node.restoreFromState = function() {
					const stringWidget = node.widgets.find(w => w.name === "bbox_studio_data");
					if (stringWidget && stringWidget.value) {
						try {
							const parsed = JSON.parse(stringWidget.value);
							if (parsed && typeof parsed === "object") {
								node.studioState = parsed;
								summaryInput.value = node.studioState.summary || "";
								if (node.studioState.aspect_ratio) {
									ratioSelect.value = node.studioState.aspect_ratio;
									const [w, h] = ratios[node.studioState.aspect_ratio] || [280, 157];
									canvas.width = w;
									canvas.height = h;
								}
								node.renderList(itemsContainer, canvasCtx, canvas);
								node.redrawCanvas(canvasCtx, canvas.width, canvas.height);
							}
						} catch (err) {
							console.warn("[MOSSBBoxStudio] Erreur de lecture du JSON sauvegardé", err);
						}
					}
				};

				this.onConfigure = function() {
					setTimeout(() => {
						node.restoreFromState();
					}, 50);
				};

				this.addDOMWidget("bbox_studio_gui", "btn", mainContainer, {
					getValue() { return JSON.stringify(node.studioState); },
					setValue(v) {}
				});

				this.setSize([640, 550]);
			};
		}
	}
});