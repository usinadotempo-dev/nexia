# Modelos PP-OCR (não versionados)

Baixe do repositório oficial e salve **exatamente** com estes nomes (é o que
`src/offscreen.ts` carrega):

- `det.onnx`  ← `PP-OCRv6_tiny_det.onnx`  (pasta `detection/`)
- `rec.onnx`  ← `PP-OCRv6_tiny_rec.onnx`  (pasta `recognition/`)
- `dict.txt`  ← `ppocrv6_tiny_dict.txt`   (pasta `recognition/`)

Fonte: https://github.com/PT-Perkasa-Pilar-Utama/ppu-paddle-ocr-models

O `vite build` copia esta pasta para `dist/assets/models/`.
