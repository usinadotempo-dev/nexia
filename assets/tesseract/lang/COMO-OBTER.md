# Modelo de idioma do OCR (Tesseract)

O OCR local precisa do arquivo de idioma português `por.traineddata` nesta pasta.
Ele é grande (~15 MB) e por isso não é versionado (está no `.gitignore`).

Baixe uma vez, no cmd.exe, a partir da raiz do projeto:

```
curl -L -o assets\tesseract\lang\por.traineddata https://github.com/tesseract-ocr/tessdata_fast/raw/main/por.traineddata
```

Depois rode o build normalmente (`npm run build`); o arquivo é copiado para
`dist/libs/tesseract/lang/`. Sem ele, o OCR fica indisponível e os documentos
digitalizados são excluídos do conteúdo anonimizado (o restante funciona).
