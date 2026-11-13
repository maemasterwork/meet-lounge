# 3D models

1. Put a binary glTF file here, for example `latte.glb` (under about 2 MB, Draco or Meshopt compressed, 1 unit = the cup's width).
2. List it in `index.json`: `{ "latte": "latte.glb", "cappuccino": "cappuccino.glb" }` (the key is the item id).
3. Rebuild or redeploy. That item's stage now shows the model; drag to rotate. Items without a model keep their picture.

Sizes scale the model with the same factor as the flat picture. If a file is missing or the device has no WebGL, the flat picture is shown instead.
