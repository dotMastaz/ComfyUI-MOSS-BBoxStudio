import json

class MOSSBBoxStudioNode:
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "bbox_studio_data": ("STRING", {
                    "default": '{"summary": "", "items": []}',
                    "multiline": True
                }),
            }
        }

    RETURN_TYPES = ("STRING", "JSON")
    RETURN_NAMES = ("json_prompt", "raw_json")
    FUNCTION = "process_layout"
    CATEGORY = "BBox Studio"  # Catégorie isolée pour éviter les conflits

    def process_layout(self, bbox_studio_data):
        try:
            data = json.loads(bbox_studio_data)
        except Exception:
            data = {"summary": "", "items": []}

        summary_text = data.get("summary", "")
        raw_items = data.get("items", [])

        sorted_items = sorted(raw_items, key=lambda x: int(x.get("z_index", 0)))

        formatted_items = []
        for idx, item in enumerate(sorted_items):
            item_entry = {
                "z_index": item.get("z_index", idx),
                "type": item.get("type", "object"),
                "caption": item.get("caption", ""),
                "bbox": item.get("bbox", [0.0, 0.0, 1.0, 1.0])
            }
            formatted_items.append(item_entry)

        formatted_json = {
            "summary": {
                "caption": summary_text
            },
            "bbox_format": "xywh",
            "bbox_coord_space": "relative",
            "items": formatted_items
        }

        output_str = json.dumps(formatted_json, indent=2, ensure_ascii=False)
        return (output_str, formatted_json)

NODE_CLASS_MAPPINGS = {
    "MOSSBBoxStudioNode": MOSSBBoxStudioNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "MOSSBBoxStudioNode": "MOSS-Image BBox Studio"
}