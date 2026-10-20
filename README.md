# ComfyUI MOSS-Image BBox Studio

An ergonomic, interactive bounding box (BBox) layout manager and spatial prompt editor for **ComfyUI**, designed specifically for structured image conditioning models like **MOSS-Image**.

This custom node provides an intuitive HTML5 Canvas UI directly inside LiteGraph to visually layout spatial elements, adjust layer order (Z-index), select target aspect ratios, and construct complex multi-object scene prompts.

---

## 🎨 Features

- **Interactive Canvas Editor**: Draw, move, and resize bounding boxes with real-time visual feedback and corner handles.
- **Aspect Ratio Preview**: Toggle between standard ratios (`16:9`, `1:1`, `9:16`, `4:3`, `3:2`) to align your spatial layout with your final output resolution.
- **Z-Index Layering**: Easily swap layer priorities (`▲` / `▼`) to resolve overlapping objects and ensure proper background/foreground context.
- **Object & Text Classification**: Define region types (`object` or `text`) for targeted rendering (e.g., retro signage, logos, or character placements).
- **Global Summary Prompt**: Integrated top-level prompt editor for overall scene composition, style, and lighting.
- **State Persistence**: Full workflow saving and loading support (`onConfigure`/`onSerialize`). Bounding boxes and settings restore automatically when opening a saved JSON workflow.

---

## 📦 Installation

1. Navigate to your ComfyUI custom nodes folder:
   ```bash
   cd ComfyUI/custom_nodes/
   ```

2. Clone or place the node directory into your setup:
   ```text
   ComfyUI/
   └── custom_nodes/
       └── ComfyUI-MOSS-BBoxStudio/
           ├── __init__.py
           ├── node.py
           ├── README.md
           └── web/
               └── js/
                   └── bbox_studio.js
   ```

3. Restart **ComfyUI**.

---

## 🚀 Usage Guide

1. Add the node to your graph: Right-click on the canvas or double-click and search for **`MOSS-Image BBox Studio`** (under category `MOSS-Image`).
2. **Global Prompt**: Enter your overall scene prompt (style, lighting, medium) in the **Summary** text area.
3. **Aspect Ratio**: Select your target aspect ratio from the canvas header to match your latent dimensions (e.g., `16:9` for 1280x720).
4. **Drawing BBoxes**:
   - Click and drag on the canvas to draw a new bounding box.
   - Click an existing box on the canvas or card in the right pane to select it.
   - Drag the center of a box to reposition it, or drag corner handles to resize.
5. **Layer Order (Z-Index)**:
   - Use the `▲` and `▼` buttons on layer cards to move elements toward the foreground or background.
6. **Output Wiring**:
   - Connect **`json_prompt`** (`STRING`) to your `CLIPTextEncode` node or direct text input widget.
   - Alternatively, connect **`raw_json`** (`JSON`) if using a specialized native conditioning node.

---

## 📄 Output Format Example

The node outputs a structured JSON schema formatted for MOSS-Image:

```json
{
  "summary": {
    "caption": "masterpiece, 1970s TV show screenshot, retro 35mm film still, Kodak film grain..."
  },
  "bbox_format": "xywh",
  "bbox_coord_space": "relative",
  "items": [
    {
      "z_index": 0,
      "type": "object",
      "caption": "1970s vintage office desk with a brown rotary telephone",
      "bbox": [0.05, 0.40, 0.28, 0.50]
    },
    {
      "z_index": 1,
      "type": "object",
      "caption": "Diana Prince wearing large round vintage glasses and beige turtleneck sweater",
      "bbox": [0.35, 0.15, 0.30, 0.75]
    },
    {
      "z_index": 2,
      "type": "text",
      "caption": "WAR COUNCIL",
      "bbox": [0.68, 0.10, 0.25, 0.10]
    }
  ]
}
```

---

## 🔧 Troubleshooting

### Node is missing or not showing up in ComfyUI
- **Folder location check**: If using **ComfyUI Desktop**, ensure the custom node is installed in `AppData/Local/Comfy-Desktop/ComfyUI-Installs/ComfyUI/custom_nodes/` rather than the `Documents/` folder.
- **Check startup logs**: Verify your terminal output during startup for `Imported: ComfyUI-MOSS-BBoxStudio`. If an error is shown, check python dependencies or syntax errors in `node.py`.

### UI Canvas widget is not rendering (only raw text field visible)
- **Browser cache issues**: ComfyUI frontend extensions are aggressively cached by browsers. Perform a hard refresh in your browser/Electron app:
  - **Windows/Linux**: Press `Ctrl` + `Shift` + `R` or `Ctrl` + `F5`.
- **Module import failure**: If you see `Failed to fetch dynamically imported module` in DevTools (`F12`), ensure top-level imports in `bbox_studio.js` use absolute paths:
  ```javascript
  import { app } from "/scripts/app.js";
  ```
- **Web Directory Mapping**: Verify `__init__.py` properly exports the web path:
  ```python
  WEB_DIRECTORY = "./web"
  __all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
  ```

---

## 🛠️ Technical Details

- **Backend**: Python 3.x / ComfyUI Node System (`node.py`)
- **Frontend**: ES Module JavaScript, HTML5 Canvas 2D Context, Flexbox CSS (`bbox_studio.js`)
- **Compatibility**: Tested with ComfyUI Desktop, standalone Web UI (Electron/Chromium), and MOSS-Image models.

---

## 📜 License

MIT License. Feel free to modify, extend, and integrate into your custom workflows.