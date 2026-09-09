# tessdata

`mrz.traineddata` is the `tessdata_fast` model from [DoubangoTelecom/tesseractMRZ](https://github.com/DoubangoTelecom/tesseractMRZ),
trained on the OCR-B font used in machine-readable zones (passports, Turkish ID cards).
It gives far better results on card photos than the generic `eng` model.

The API loads it from `OCR_LANG_PATH` (default: this directory, `gzip: false`). If the file
for a language in `OCR_LANGUAGES` is missing here, tesseract.js downloads it from its CDN into
`OCR_CACHE_PATH` instead (used for the `eng` fallback).

## License of `mrz.traineddata`

BSD 3-Clause License — Copyright (c) 2019, DoubangoTelecom. All rights reserved.
Redistribution and use in source and binary forms, with or without modification, are permitted
provided that the conditions of the BSD 3-Clause License are met (see
https://github.com/DoubangoTelecom/tesseractMRZ/blob/master/LICENSE). This notice is kept with the
redistributed model file.
